import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import type { Subscription, User } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { sendMail } from './comms.service';

// ───────────────────────────── Plans ─────────────────────────────

export interface PlanConfig {
  key: 'monthly' | 'yearly';
  label: string;
  cashfreePlanId: string;
  pricePerSeat: number;
  currency: 'INR';
  minSeats: number;
  maxSeats: number;
  months: number;
  features: string[];
}

export const PLANS: Record<'monthly' | 'yearly', PlanConfig> = {
  monthly: {
    key: 'monthly',
    label: 'Hajri Monthly Plan',
    cashfreePlanId: 'hajri_monthly_plan',
    pricePerSeat: 300,
    currency: 'INR',
    minSeats: 1,
    maxSeats: 500,
    months: 1,
    features: ['Pay month-to-month', 'All core features included', 'Attendance & GPS Tracking', 'Face Detection', 'Email Support', 'Cancel anytime'],
  },
  yearly: {
    key: 'yearly',
    label: 'Hajri Yearly Plan',
    cashfreePlanId: 'hajri_yearly_plan',
    pricePerSeat: 3000,
    currency: 'INR',
    minSeats: 1,
    maxSeats: 500,
    months: 12,
    features: ['Billed annually (save ₹600/seat)', 'All core features included', 'Attendance & GPS Tracking', 'Face Detection', 'Priority Support', 'Dedicated Account Manager'],
  },
};

/** Kelviq bills in USD with its own price points. */
const KELVIQ_PRICE = { monthly: 3, yearly: 30 };

// ───────────────────────────── Cashfree client ─────────────────────────────

const cfBase = () => (env.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com');

type CfResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; message: string; status: number; raw?: unknown };

async function cf<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; pg?: boolean } = {}): Promise<CfResult<T>> {
  if (!env.CASHFREE_CLIENT_ID || !env.CASHFREE_CLIENT_SECRET) {
    return { ok: false, message: 'Cashfree is not configured on this server', status: 503 };
  }
  try {
    const res = await fetch(`${cfBase()}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'x-client-id': env.CASHFREE_CLIENT_ID,
        'x-client-secret': env.CASHFREE_CLIENT_SECRET,
        ...(init.pg ? { 'x-api-version': env.CASHFREE_API_VERSION } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, message: String(json.message ?? `Cashfree error ${res.status}`), status: res.status, raw: json };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Cashfree request failed', status: 502 };
  }
}

async function ensurePlan(plan: PlanConfig, seats: number) {
  const planId = `${plan.cashfreePlanId}_${seats}_seats`;
  const res = await cf<{ status?: string }>('/api/v2/subscription-plans', {
    method: 'POST',
    body: {
      planId,
      planName: `${plan.label} - ${seats} Seats`,
      type: 'PERIODIC',
      recurringAmount: plan.pricePerSeat * seats,
      maxAmount: plan.key === 'yearly' ? 1500000 : 200000,
      intervals: 1,
      intervalType: plan.key === 'yearly' ? 'YEAR' : 'MONTH',
    },
  });
  if (!res.ok && res.status !== 409 && !JSON.stringify(res.raw ?? '').includes('ALREADY')) throw badRequest(`Could not prepare subscription plan: ${res.message}`);
  return planId;
}

export function verifyCashfreeSignature(rawBody: string, signature: string, timestamp: string): boolean {
  if (!env.CASHFREE_CLIENT_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.CASHFREE_CLIENT_SECRET).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ───────────────────────────── Queries ─────────────────────────────

export const subscriptionDto = (s: Subscription, activeStaff?: number) => ({
  id: s.id,
  plan: s.plan,
  plan_label: PLANS[s.plan as 'monthly' | 'yearly']?.label ?? s.plan,
  billing_cycle: s.billingCycle,
  seats: s.seats,
  active_staff: activeStaff ?? null,
  available_seats: activeStaff === undefined ? null : Math.max(0, s.seats - activeStaff),
  price_per_seat: Number(s.pricePerSeat),
  total_amount: Number(s.totalAmount),
  currency: s.paymentMethod === 'kelviq' ? 'USD' : 'INR',
  status: s.status,
  payment_method: s.paymentMethod,
  starts_at: s.startsAt?.toISOString() ?? null,
  expires_at: s.expiresAt?.toISOString() ?? null,
  paid_at: s.paidAt?.toISOString() ?? null,
  is_active: s.status === 'active' && !!s.expiresAt && s.expiresAt > new Date(),
  created_at: s.createdAt.toISOString(),
});

export async function overview(ownerId: number, businessId: number) {
  const [owner, current, activeStaff] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ownerId } }),
    prisma.subscription.findFirst({ where: { userId: ownerId, status: { in: ['active', 'pending'] } }, orderBy: { id: 'desc' } }),
    prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: false } }),
  ]);
  const transactions = current
    ? await prisma.paymentLog.findMany({ where: { subscriptionId: current.id }, orderBy: { id: 'desc' }, take: 50 })
    : [];
  const trialEnds = owner.trialEndsAt;
  return {
    subscription: current ? subscriptionDto(current, activeStaff) : null,
    active_staff_count: activeStaff,
    trial: {
      ends_at: trialEnds?.toISOString() ?? null,
      expired: !!trialEnds && trialEnds < new Date(),
      days_left: trialEnds ? Math.max(0, Math.ceil(DateTime.fromJSDate(trialEnds).diffNow('days').days)) : null,
    },
    plans: Object.values(PLANS).map((p) => ({ key: p.key, label: p.label, price_per_seat: p.pricePerSeat, currency: p.currency, min_seats: p.minSeats, max_seats: p.maxSeats, features: p.features })),
    kelviq: { enabled: !!env.KELVIQ_API_KEY || env.KELVIQ_SIMULATE, prices: KELVIQ_PRICE },
    cashfree: { enabled: !!env.CASHFREE_CLIENT_ID },
    transactions: transactions.map((t) => ({
      id: t.id,
      event_type: t.eventType,
      order_id: t.orderId,
      payment_id: t.paymentId,
      amount: t.amount ? Number(t.amount) : null,
      currency: t.currency,
      status: t.status,
      created_at: t.createdAt.toISOString(),
    })),
  };
}

// ───────────────────────────── Checkout ─────────────────────────────

async function assertCanSubscribe(owner: User, businessId: number, seats: number, plan: PlanConfig) {
  if (seats < plan.minSeats || seats > plan.maxSeats) throw badRequest(`Seats must be between ${plan.minSeats} and ${plan.maxSeats} for the ${plan.label}.`);
  const existing = await prisma.subscription.findFirst({ where: { userId: owner.id, status: { in: ['active', 'pending'] } }, orderBy: { id: 'desc' } });
  if (existing?.status === 'active' && existing.expiresAt && existing.expiresAt > new Date()) {
    throw badRequest('You already have an active subscription. Use Increase Seats to add more seats.');
  }
  const activeStaff = await prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: false } });
  if (seats < activeStaff) {
    throw badRequest(`You currently have ${activeStaff} active staff members but are subscribing for only ${seats} seats. Please deactivate ${activeStaff - seats} staff member(s) before continuing.`);
  }
}

export async function checkoutCashfree(owner: User, businessId: number, planKey: 'monthly' | 'yearly', seats: number) {
  const plan = PLANS[planKey];
  await assertCanSubscribe(owner, businessId, seats, plan);
  const total = plan.pricePerSeat * seats;
  const planId = await ensurePlan(plan, seats);
  const subscriptionId = `sub_${crypto.randomBytes(5).toString('hex')}_${Date.now()}`;
  const created = await cf<{ subscriptionId?: string; authLink?: string; status?: string; message?: string }>('/api/v2/subscriptions', {
    method: 'POST',
    body: {
      subscriptionId,
      planId,
      customerName: owner.name ?? 'Customer',
      customerEmail: owner.email ?? 'no-email@hajri.app',
      customerPhone: owner.phoneNumber,
      returnUrl: `${env.API_URL}/api/v1/admin/subscriptions/callback/cashfree?subscription_id=${subscriptionId}`,
      authAmount: total,
      expiresOn: DateTime.now().plus({ years: 5 }).toFormat('yyyy-MM-dd HH:mm:ss'),
    },
  });
  if (!created.ok || (created.data.status && created.data.status !== 'OK') || !created.data.authLink) {
    throw badRequest(`Could not create subscription: ${created.ok ? created.data.message ?? 'Unknown error' : created.message}`);
  }
  const sub = await prisma.subscription.create({
    data: {
      userId: owner.id,
      plan: planKey,
      billingCycle: planKey,
      seats,
      pricePerSeat: plan.pricePerSeat,
      totalAmount: total,
      status: 'pending',
      paymentMethod: 'cashfree',
      cashfreePlanId: planId,
      cashfreeSubscriptionId: subscriptionId,
      cashfreeAuthLink: created.data.authLink,
      cashfreeSubscriptionStatus: 'INITIALIZED',
      cashfreeResponse: created.data as object,
    },
  });
  return { subscription_id: sub.id, redirect_url: created.data.authLink };
}

export async function checkoutKelviq(owner: User, businessId: number, planKey: 'monthly' | 'yearly', seats: number) {
  const plan = PLANS[planKey];
  await assertCanSubscribe(owner, businessId, seats, plan);
  const customerId = `cust-${owner.id}`;
  const price = KELVIQ_PRICE[planKey];

  if (env.KELVIQ_SIMULATE || !env.KELVIQ_API_KEY) {
    const sub = await prisma.subscription.create({
      data: {
        userId: owner.id,
        plan: planKey,
        billingCycle: planKey,
        seats,
        pricePerSeat: price,
        totalAmount: price * seats,
        status: 'pending',
        paymentMethod: 'kelviq',
        customerId,
        kelviqSessionId: `sim-${crypto.randomBytes(6).toString('hex')}`,
        kelviqResponse: { simulated: true },
      },
    });
    return { subscription_id: sub.id, redirect_url: `${env.API_URL}/api/v1/admin/subscriptions/callback/kelviq?subscription_id=${sub.id}&simulated=1` };
  }

  const headers = { Authorization: `Bearer ${env.KELVIQ_API_KEY}`, 'X-API-KEY': env.KELVIQ_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' };
  // register / refresh the customer (non-fatal)
  await fetch(`${env.KELVIQ_API_URL}/customers/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ customerId, email: owner.email, name: owner.name, metadata: { source: 'hajri' } }),
  }).catch(() => undefined);

  const sub = await prisma.subscription.create({
    data: { userId: owner.id, plan: planKey, billingCycle: planKey, seats, pricePerSeat: price, totalAmount: price * seats, status: 'pending', paymentMethod: 'kelviq', customerId },
  });
  const res = await fetch(`${env.KELVIQ_API_URL}/checkout/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      planIdentifier: env.KELVIQ_PLAN_IDENTIFIER,
      successUrl: `${env.API_URL}/api/v1/admin/subscriptions/callback/kelviq?subscription_id=${sub.id}`,
      chargePeriod: planKey.toUpperCase(),
      customerId,
      features: [{ identifier: env.KELVIQ_FEATURE_IDENTIFIER, quantity: seats }],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; checkoutSessionId?: string; message?: string };
  if (!res.ok || !data.checkoutUrl) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'failed', kelviqResponse: data as object } });
    throw badRequest(`Kelviq error (${res.status}): ${data.message ?? 'No checkout URL returned'}`);
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { kelviqCheckoutUrl: data.checkoutUrl, kelviqSessionId: data.checkoutSessionId, kelviqResponse: data as object } });
  return { subscription_id: sub.id, redirect_url: data.checkoutUrl };
}

// ───────────────────────────── Activation ─────────────────────────────

const monthsFor = (s: Pick<Subscription, 'billingCycle'>) => (s.billingCycle === 'yearly' ? 12 : 1);

export async function activate(sub: Subscription, eventType = 'subscription_activated', extra: { orderId?: string; paymentId?: string; amount?: number; currency?: string } = {}) {
  if (sub.status === 'active' && sub.expiresAt && sub.expiresAt > new Date()) return sub;
  const now = new Date();
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'active', startsAt: now, expiresAt: DateTime.fromJSDate(now).plus({ months: monthsFor(sub) }).toJSDate(), paidAt: now },
  });
  await prisma.paymentLog.create({
    data: {
      userId: sub.userId,
      subscriptionId: sub.id,
      eventType,
      orderId: extra.orderId ?? sub.cashfreeSubscriptionId ?? sub.customerId,
      paymentId: extra.paymentId ?? sub.cashfreeSubscriptionId ?? sub.kelviqSessionId,
      amount: extra.amount ?? sub.totalAmount,
      currency: extra.currency ?? (sub.paymentMethod === 'kelviq' ? 'USD' : 'INR'),
      status: 'success',
    },
  });
  return updated;
}

/** Return URL after the customer authorises the Cashfree mandate. Returns where to send the browser. */
export async function cashfreeCallback(subscriptionId: string): Promise<{ kind: 'success' | 'error' | 'info'; message: string }> {
  const sub = await prisma.subscription.findUnique({ where: { cashfreeSubscriptionId: subscriptionId } });
  if (!sub) return { kind: 'error', message: 'Subscription record not found.' };
  const ref = (sub.cashfreeResponse as { subReferenceId?: string | number } | null)?.subReferenceId ?? subscriptionId;
  const res = await cf<{ subscription?: { status?: string } }>(`/api/v2/subscriptions/${ref}`);
  const status = res.ok ? res.data.subscription?.status ?? null : null;
  if (status) await prisma.subscription.update({ where: { id: sub.id }, data: { cashfreeSubscriptionStatus: status } });

  if (status && ['ACTIVE', 'BANK_APPROVAL_PENDING'].includes(status)) {
    await activate(sub);
    return { kind: 'success', message: 'Subscription activated successfully!' };
  }
  if (status && ['CANCELLED', 'FAILED', 'EXPIRED'].includes(status)) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'failed' } });
    return { kind: 'error', message: `Subscription authorisation failed (status: ${status}). Please try again.` };
  }
  // couldn't confirm — the SUBSCRIPTION_* webhook will activate it once Cashfree confirms
  return { kind: 'info', message: 'Your subscription is being verified. It will activate shortly.' };
}

export async function kelviqCallback(subscriptionId: number, simulated: boolean): Promise<{ kind: 'success' | 'error' | 'info'; message: string }> {
  const sub = await prisma.subscription.findFirst({ where: { id: subscriptionId, paymentMethod: 'kelviq' } });
  if (!sub) return { kind: 'error', message: 'Subscription record not found.' };
  const trusted = (simulated && (env.KELVIQ_SIMULATE || !env.KELVIQ_API_KEY)) || process.env.KELVIQ_TRUST_REDIRECT === 'true';
  if (!trusted) {
    return { kind: 'info', message: 'Your payment is being verified. Your subscription will activate shortly.' };
  }
  await activate(sub);
  return { kind: 'success', message: 'Subscription activated successfully!' };
}

// ───────────────────────────── Webhooks ─────────────────────────────

export async function handleCashfreeWebhook(payload: Record<string, any>) {
  const type: string = payload.type ?? '';
  if (!type.startsWith('SUBSCRIPTION_')) return;
  const subId = payload.data?.subscription?.subscription_id ?? payload.data?.subscriptionId;
  if (!subId) return;
  const sub = await prisma.subscription.findUnique({ where: { cashfreeSubscriptionId: String(subId) }, include: { user: true } });
  if (!sub) return;
  const cfStatus = payload.data?.subscription?.subStatus ?? payload.data?.subscription?.status ?? payload.data?.subStatus ?? payload.data?.status ?? null;
  const orderId = payload.data?.order?.order_id as string | undefined;
  const paymentId = payload.data?.payment?.cf_payment_id as string | undefined;
  const amount = payload.data?.payment?.payment_amount as number | undefined;

  const existing = await prisma.paymentLog.findFirst({ where: { subscriptionId: sub.id, eventType: type, ...(paymentId ? { paymentId: String(paymentId) } : {}) } });
  const logData = { orderId: orderId ?? sub.cashfreeSubscriptionId, paymentId: paymentId ? String(paymentId) : sub.cashfreeSubscriptionId, amount: amount ?? null, status: cfStatus, payload };
  if (existing) await prisma.paymentLog.update({ where: { id: existing.id }, data: logData });
  else await prisma.paymentLog.create({ data: { userId: sub.userId, subscriptionId: sub.id, eventType: type, ...logData } });
  await prisma.subscription.update({ where: { id: sub.id }, data: { cashfreeSubscriptionStatus: cfStatus } });

  if (type === 'SUBSCRIPTION_ACTIVATED') {
    await activate(sub, 'subscription_activated');
  } else if (type === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
    const now = new Date();
    const renewalDue = !sub.expiresAt || sub.expiresAt.getTime() - now.getTime() < 3 * 86400_000;
    if (sub.status !== 'active') {
      await activate(sub, 'subscription_activated');
    } else if (renewalDue && !existing) {
      // a recurring charge (not seen before) near the end of the paid period renews it
      const base = sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now;
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { expiresAt: DateTime.fromJSDate(base).plus({ months: monthsFor(sub) }).toJSDate(), paidAt: now },
      });
    }
  } else if (type === 'SUBSCRIPTION_PAYMENT_FAILED') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'payment_failed' } });
    if (sub.user.email) void sendMail(sub.user.email, 'Your Hajri subscription payment failed', '<p>We could not process your latest subscription payment. Please update your payment method to keep your plan active.</p>');
  } else if (type === 'SUBSCRIPTION_CANCELLED') {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'cancelled' } });
    if (sub.user.email) void sendMail(sub.user.email, 'Your Hajri subscription was cancelled', '<p>Your subscription has been cancelled. You can subscribe again at any time from the Subscriptions page.</p>');
  }
}

// ───────────────────────────── Management ─────────────────────────────

export async function cancel(ownerId: number) {
  const sub = await prisma.subscription.findFirst({ where: { userId: ownerId, status: { in: ['active', 'pending'] } }, orderBy: { id: 'desc' } });
  if (!sub) throw notFound('No active subscription found');
  if (sub.cashfreeSubscriptionId) {
    const ref = (sub.cashfreeResponse as { subReferenceId?: string | number } | null)?.subReferenceId ?? sub.cashfreeSubscriptionId;
    await cf(`/api/v2/subscriptions/${ref}/cancel`, { method: 'POST' });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'cancelled' } });
}

/** Change the number of seats on the active subscription (increase or decrease). */
export async function setSeats(ownerId: number, businessId: number, seats: number) {
  const sub = await prisma.subscription.findFirst({ where: { userId: ownerId, status: 'active' }, orderBy: { id: 'desc' } });
  if (!sub) throw badRequest('No active subscription found to change seats.');
  const plan = PLANS[sub.plan as 'monthly' | 'yearly'];
  if (!plan) throw badRequest('Unknown plan on this subscription');
  if (seats < plan.minSeats || seats > plan.maxSeats) throw badRequest(`Seats must be between ${plan.minSeats} and ${plan.maxSeats}.`);
  const activeStaff = await prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: false } });
  if (seats < activeStaff) throw badRequest(`You have ${activeStaff} active staff members. Deactivate ${activeStaff - seats} before reducing seats.`);

  const pricePerSeat = Number(sub.pricePerSeat);
  const total = pricePerSeat * seats;
  if (sub.cashfreeSubscriptionId) {
    const planId = await ensurePlan(plan, seats);
    const res = await cf(`/pg/subscriptions/${sub.cashfreeSubscriptionId}/manage`, {
      method: 'POST',
      pg: true,
      body: { subscription_id: sub.cashfreeSubscriptionId, action: 'CHANGE_PLAN', action_details: { plan_id: planId } },
    });
    if (!res.ok) throw badRequest(`Failed to update subscription seats: ${res.message}`);
    await prisma.subscription.update({ where: { id: sub.id }, data: { cashfreePlanId: planId } });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { seats, totalAmount: total } });
  if (seats > sub.seats) {
    await prisma.paymentLog.create({
      data: {
        userId: ownerId,
        subscriptionId: sub.id,
        eventType: 'seat_increase',
        orderId: `inc_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`,
        paymentId: `inc_pay_${crypto.randomBytes(4).toString('hex')}`,
        amount: pricePerSeat * (seats - sub.seats),
        currency: sub.paymentMethod === 'kelviq' ? 'USD' : 'INR',
        status: 'success',
      },
    });
  }
}

/** Hourly housekeeping: expire lapsed subscriptions. */
export async function expireLapsed() {
  const res = await prisma.subscription.updateMany({ where: { status: 'active', expiresAt: { lt: new Date() } }, data: { status: 'expired' } });
  return res.count;
}

/** 30 minutes before renewal, align the billed seats with the number of active staff (Cashfree plans). */
export async function syncSeatsBeforeRenewal() {
  const soon = DateTime.now().plus({ minutes: 30 }).toJSDate();
  const subs = await prisma.subscription.findMany({ where: { status: 'active', cashfreeSubscriptionId: { not: null }, expiresAt: { gt: new Date(), lte: soon } } });
  for (const sub of subs) {
    const owner = await prisma.businessUser.findMany({ where: { userId: sub.userId }, select: { businessId: true } });
    const activeStaff = await prisma.staff.count({ where: { businessId: { in: owner.map((o) => o.businessId) }, deletedAt: null, isDeactivated: false } });
    if (activeStaff > 0 && activeStaff !== sub.seats) {
      try {
        await setSeats(sub.userId, owner[0]?.businessId ?? 0, activeStaff);
      } catch (e) {
        console.error('[subscriptions] seat sync failed', sub.id, e);
      }
    }
  }
}

export const forbidSub = forbidden;

// ───────────────────────────── Transactions & invoices ─────────────────────────────

const pad = (n: number) => String(n).padStart(6, '0');
const ucfirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** One row per payment log, plus any subscription that never produced a log (so it still appears in history). */
export async function transactions(owner: User, business: { name: string; businessAddress: string | null } | null) {
  const [logs, subs, active] = await Promise.all([
    prisma.paymentLog.findMany({ where: { userId: owner.id }, include: { subscription: true }, orderBy: { id: 'desc' } }),
    prisma.subscription.findMany({ where: { userId: owner.id }, orderBy: { id: 'desc' } }),
    prisma.subscription.findFirst({ where: { userId: owner.id, status: 'active', expiresAt: { gt: new Date() } }, orderBy: { id: 'desc' } }),
  ]);
  const fmt = (d: Date) => DateTime.fromJSDate(d).toFormat('dd LLL yyyy, hh:mm a');
  const base = {
    user_name: owner.name,
    user_email: owner.email,
    user_phone: owner.phoneNumber,
    business_name: business?.name ?? 'Business',
    business_address: business?.businessAddress || 'Address not provided',
  };
  const out: Record<string, unknown>[] = [];
  const seenSubs = new Set<number>();
  const seenOrders = new Set<string>();

  for (const log of logs) {
    const sub = log.subscription;
    if (log.subscriptionId) seenSubs.add(log.subscriptionId);
    if (log.orderId) seenOrders.add(log.orderId);
    if (sub?.cashfreeSubscriptionId) seenOrders.add(sub.cashfreeSubscriptionId);
    if (sub?.kelviqSessionId) seenOrders.add(sub.kelviqSessionId);
    const pm = (sub?.paymentMethod ?? 'cashfree').toLowerCase();
    const kelviq = pm.includes('kelviq');
    const curr = kelviq ? 'USD' : log.currency || 'INR';
    out.push({
      id: log.id,
      is_log: true,
      order_id: log.orderId ?? sub?.cashfreeSubscriptionId ?? sub?.customerId ?? `ORD-${pad(log.id)}`,
      payment_id: kelviq ? log.orderId ?? sub?.customerId ?? `KVQ-${pad(log.id)}` : log.paymentId ?? `PAY-${pad(log.id)}`,
      event_type: log.eventType || 'PAYMENT_SUCCESS',
      plan_name: ucfirst(sub?.plan ?? active?.plan ?? 'Standard'),
      billing_cycle: ucfirst(sub?.billingCycle ?? active?.billingCycle ?? 'monthly'),
      seats: sub?.seats ?? active?.seats ?? 15,
      price_per_seat: sub ? Number(sub.pricePerSeat) : 0,
      amount: Number(log.amount ?? sub?.totalAmount ?? 0),
      currency: curr,
      currency_symbol: kelviq || curr.toUpperCase() === 'USD' || curr === '$' ? '$' : '₹',
      status: log.status || (sub ? sub.status.toUpperCase() : 'SUCCESS'),
      payment_method: sub?.paymentMethod ? ucfirst(sub.paymentMethod) : kelviq ? 'Kelviq' : 'Cashfree',
      created_at: fmt(log.createdAt),
      date_raw: DateTime.fromJSDate(log.createdAt).toFormat('yyyy-LL-dd'),
      ...base,
    });
  }
  for (const sub of subs) {
    if (seenSubs.has(sub.id)) continue;
    if (sub.cashfreeSubscriptionId && seenOrders.has(sub.cashfreeSubscriptionId)) continue;
    if (sub.kelviqSessionId && seenOrders.has(sub.kelviqSessionId)) continue;
    const kelviq = sub.paymentMethod.toLowerCase().includes('kelviq');
    out.push({
      id: sub.id,
      is_log: false,
      order_id: sub.cashfreeSubscriptionId ?? sub.kelviqSessionId ?? `ORD-${pad(sub.id)}`,
      payment_id: sub.customerId ?? `PAY-${pad(sub.id)}`,
      event_type: 'SUBSCRIPTION',
      plan_name: ucfirst(sub.plan),
      billing_cycle: ucfirst(sub.billingCycle),
      seats: sub.seats,
      price_per_seat: Number(sub.pricePerSeat),
      amount: Number(sub.totalAmount),
      currency: kelviq ? 'USD' : 'INR',
      currency_symbol: kelviq ? '$' : '₹',
      status: sub.status.toUpperCase(),
      payment_method: ucfirst(sub.paymentMethod),
      created_at: fmt(sub.createdAt),
      date_raw: DateTime.fromJSDate(sub.createdAt).toFormat('yyyy-LL-dd'),
      ...base,
    });
  }
  return out;
}

/** Tax invoice PDF for a payment-log row (`isLog`) or a bare subscription. */
export async function invoicePdf(owner: User, business: { name: string; businessAddress: string | null } | null, id: number, isLog: boolean) {
  const rows = (await transactions(owner, business)) as (Record<string, any> & { id: number; is_log: boolean })[];
  const t = rows.find((r) => r.id === id && r.is_log === isLog) ?? rows[0];
  if (!t) throw notFound('No invoice found');
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const sym = t.currency === 'USD' ? 'USD ' : 'INR ';
  const amount = `${sym}${Number(t.amount).toFixed(2)}`;
  const line = (label: string, value: string, y: number, x = 48) => {
    doc.fontSize(9).fillColor('#888').font('Helvetica').text(label, x, y, { width: 240 });
    doc.fontSize(11).fillColor('#111').font('Helvetica-Bold').text(value, x, y + 12, { width: 240 });
  };
  doc.fontSize(20).fillColor('#2F8CFF').font('Helvetica-Bold').text(env.APP_NAME, 48, 48);
  doc.fontSize(9).fillColor('#666').font('Helvetica').text('Attendance & Payroll System', 48, 72);
  doc.fontSize(10).fillColor('#111').font('Helvetica-Bold').text(`INVOICE #${t.order_id}`, 300, 52, { width: 247, align: 'right' });
  doc.fontSize(9).fillColor('#666').font('Helvetica').text(`Date: ${t.created_at}`, 300, 68, { width: 247, align: 'right' });
  doc.text(String(t.status).toUpperCase(), 300, 82, { width: 247, align: 'right' });
  doc.moveTo(48, 110).lineTo(547, 110).strokeColor('#ddd').stroke();
  line('BILLED TO', String(t.business_name), 126);
  doc.fontSize(9).fillColor('#444').font('Helvetica').text(`${t.user_name ?? ''}\n${t.user_email ?? 'N/A'} | ${t.user_phone ?? ''}\n${t.business_address}`, 48, 154, { width: 240 });
  line('BILLED BY', `${env.APP_NAME} Technologies`, 126, 320);
  doc.fontSize(9).fillColor('#444').font('Helvetica').text(`Payment Gateway: ${t.payment_method}\nPayment ID: ${t.payment_id}`, 320, 154, { width: 227 });
  let y = 230;
  doc.rect(48, y, 499, 24).fill('#f1f5f9');
  doc.fillColor('#333').font('Helvetica-Bold').fontSize(9);
  doc.text('Description', 56, y + 8, { width: 220 }).text('Billing Cycle', 280, y + 8, { width: 90, align: 'center' }).text('Seats', 370, y + 8, { width: 60, align: 'center' }).text('Amount', 440, y + 8, { width: 99, align: 'right' });
  y += 34;
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(`${t.plan_name} Plan Subscription`, 56, y, { width: 220 });
  doc.fillColor('#777').font('Helvetica').fontSize(8).text('User Seats Allowance License', 56, y + 13, { width: 220 });
  doc.fillColor('#333').fontSize(10).text(String(t.billing_cycle), 280, y, { width: 90, align: 'center' }).text(`${t.seats} Seats`, 370, y, { width: 60, align: 'center' });
  doc.font('Helvetica-Bold').text(amount, 440, y, { width: 99, align: 'right' });
  y += 50;
  doc.moveTo(48, y).lineTo(547, y).strokeColor('#ddd').stroke();
  doc.fillColor('#555').font('Helvetica').fontSize(9).text('Thank you for your business!\nThis is a computer-generated tax invoice.', 48, y + 14);
  doc.fillColor('#2F8CFF').font('Helvetica-Bold').fontSize(9).text('TOTAL PAID', 360, y + 14, { width: 80, align: 'right' });
  doc.fillColor('#0b2a66').fontSize(14).text(amount, 440, y + 10, { width: 99, align: 'right' });
  doc.end();
  return { buffer: await done, filename: `invoice-${t.order_id}.pdf` };
}
