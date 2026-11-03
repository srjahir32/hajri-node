import fs from 'node:fs';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

// ───────────── WhatsApp Cloud API ─────────────

async function whatsapp(to: string, template: string, bodyParams: string[], urlButtonParam?: string) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[whatsapp:disabled] ${template} -> ${to} ${JSON.stringify(bodyParams)}`);
    return false;
  }
  const components: unknown[] = [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }];
  if (urlButtonParam) {
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: urlButtonParam }] });
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: template, language: { code: 'en' }, components },
      }),
    });
    console.log(`[whatsapp] ${template} -> ${to} ${JSON.stringify(bodyParams)} ${urlButtonParam ? `url=${urlButtonParam}` : ''}`);
    if (!res.ok) console.error('[whatsapp] failed', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('[whatsapp] error', e);
    return false;
  }
}

export const digits = (countryCode: string | null | undefined, phone: string) =>
  `${(countryCode ?? '').replace(/\D/g, '')}${phone.replace(/\D/g, '')}`;

export async function sendOtp(countryCode: string | null | undefined, phone: string, otp: string) {
  if (env.OTP_DEV_MODE) console.log(`[otp] ${digits(countryCode, phone)} -> ${otp}`);
  return whatsapp(digits(countryCode, phone), 'verify_otp', [otp], otp);
}

export function sendStaffOnboarding(countryCode: string | null | undefined, phone: string, staffName: string, businessName: string) {
  return whatsapp(digits(countryCode, phone), 'staff_on_boarding', [staffName, businessName]);
}

// ───────────── Mail ─────────────

let transporter: Transporter | null | undefined;
function mailer() {
  if (transporter !== undefined) return transporter;
  transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string) {
  const t = mailer();
  if (!t) {
    console.log(`[mail:disabled] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await t.sendMail({ from: env.MAIL_FROM, to, subject, html });
    return true;
  } catch (e) {
    console.error('[mail] failed', e);
    return false;
  }
}

export function sendStaffWelcomeMail(to: string, company: string, staffName: string, phone: string) {
  return sendMail(
    to,
    `Welcome to ${company}`,
    `<p>Hi ${staffName},</p><p><b>${company}</b> has added you to ${env.APP_NAME}. Log in with your phone number <b>${phone}</b> using the ${env.APP_NAME} app or ${env.WEB_URL}/employee/login to mark your attendance.</p>`,
  );
}

// ───────────── Push (FCM) ─────────────

let messaging: import('firebase-admin/messaging').Messaging | null | undefined;
async function getMessaging() {
  if (messaging !== undefined) return messaging;
  if (!env.FIREBASE_SERVICE_ACCOUNT || !fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT)) {
    messaging = null;
    return null;
  }
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app');
  const { getMessaging: getFcm } = await import('firebase-admin/messaging');
  const account = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT, 'utf8'));
  const app = getApps().length ? getApp() : initializeApp({ credential: cert(account) });
  messaging = getFcm(app);
  return messaging;
}

export async function sendPush(token: string | null | undefined, title: string, body: string, data: Record<string, string> = {}) {
  if (!token) return false;
  try {
    const m = await getMessaging();
    if (!m) return false;
    await m.send({ token, notification: { title, body }, data: { language: 'en', ...data } });
    return true;
  } catch (e) {
    console.error('[push] failed', e);
    return false;
  }
}

// ───────────── In-app notifications ─────────────

interface NotifyInput {
  title?: string;
  message: string;
  action: string;
  actionId?: number;
}

/** Store a notification for a business owner (+ push). */
export async function notifyUser(userId: number | null | undefined, n: NotifyInput) {
  if (!userId) return;
  const title = n.title ?? env.APP_NAME;
  await prisma.notification.create({ data: { userId, title, message: n.message, action: n.action, actionId: n.actionId } });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { fcmId: true } });
  void sendPush(u?.fcmId, title, n.message, { action: n.action, ...(n.actionId ? { action_id: String(n.actionId) } : {}) });
}

export async function notifyStaff(staffId: number, n: NotifyInput) {
  const title = n.title ?? env.APP_NAME;
  await prisma.notification.create({ data: { staffId, title, message: n.message, action: n.action, actionId: n.actionId } });
  const s = await prisma.staff.findUnique({ where: { id: staffId }, select: { fcmId: true } });
  void sendPush(s?.fcmId, title, n.message, { action: n.action, ...(n.actionId ? { action_id: String(n.actionId) } : {}) });
}

export async function businessOwnerId(businessId: number): Promise<number | null> {
  const link = await prisma.businessUser.findFirst({ where: { businessId, user: { isSubAdmin: false } }, select: { userId: true } });
  return link?.userId ?? null;
}

/** Notify the owner and every active sub-admin of a business. */
export async function notifyBusinessAdmins(businessId: number, n: NotifyInput) {
  const ownerId = await businessOwnerId(businessId);
  if (!ownerId) return;
  await notifyUser(ownerId, n);
}
