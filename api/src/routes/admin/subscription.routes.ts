import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { forbidden } from '../../lib/errors';
import { env } from '../../config/env';
import { int } from '../../lib/validation';
import * as subs from '../../services/subscription.service';
import { prisma } from '../../lib/prisma';

/** Authenticated subscription management (mounted under /admin/subscriptions). */
export const subscriptionRouter = Router();

subscriptionRouter.get('/', can('view_subscription'), wrap(async (req, res) => {
  ok(res, await subs.overview(req.admin!.ownerId, adminBusinessId(req)));
}));

subscriptionRouter.get('/transactions', can('view_subscription'), wrap(async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: adminBusinessId(req) }, select: { name: true, businessAddress: true } });
  ok(res, await subs.transactions(req.admin!.owner, business));
}));

subscriptionRouter.get('/invoice', can('view_subscription'), wrap(async (req, res) => {
  const q = z.object({ id: int, is_log: z.enum(['1', '0', 'true', 'false']).default('1') }).parse(req.query);
  const business = await prisma.business.findUnique({ where: { id: adminBusinessId(req) }, select: { name: true, businessAddress: true } });
  const pdf = await subs.invoicePdf(req.admin!.owner, business, q.id, q.is_log === '1' || q.is_log === 'true');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
  res.send(pdf.buffer);
}));

subscriptionRouter.post('/checkout', can('view_subscription'), wrap(async (req, res) => {
  const a = req.admin!;
  if (a.user.isSubAdmin) throw forbidden('Only the business owner can manage billing');
  const b = z.object({ plan: z.enum(['monthly', 'yearly']), seats: int.pipe(z.number().min(1).max(500)), payment_method: z.enum(['cashfree', 'kelviq']).default('cashfree') }).parse(req.body);
  const businessId = adminBusinessId(req);
  const out = b.payment_method === 'kelviq' ? await subs.checkoutKelviq(a.owner, businessId, b.plan, b.seats) : await subs.checkoutCashfree(a.owner, businessId, b.plan, b.seats);
  ok(res, out);
}));

subscriptionRouter.post('/seats', can('view_subscription'), wrap(async (req, res) => {
  const a = req.admin!;
  if (a.user.isSubAdmin) throw forbidden('Only the business owner can manage billing');
  const b = z.object({ seats: int.pipe(z.number().min(1).max(500)) }).parse(req.body);
  await subs.setSeats(a.ownerId, adminBusinessId(req), b.seats);
  ok(res, null, 'Subscription seats updated successfully.');
}));

subscriptionRouter.post('/cancel', can('view_subscription'), wrap(async (req, res) => {
  if (req.admin!.user.isSubAdmin) throw forbidden('Only the business owner can manage billing');
  await subs.cancel(req.admin!.ownerId);
  ok(res, null, 'Subscription cancelled successfully.');
}));

/** Public endpoints: browser redirects + payment gateway webhooks (mounted under /public/subscriptions). */
export const subscriptionPublicRouter = Router();

const back = (kind: string, message: string) =>
  `${env.WEB_URL}/subscriptions?${new URLSearchParams({ [kind]: message }).toString()}`;

subscriptionPublicRouter.all('/callback/cashfree', wrap(async (req, res) => {
  const id = String(req.query.subscription_id ?? req.body?.subscription_id ?? req.body?.subscriptionId ?? '');
  if (!id) return res.redirect(back('error', 'Invalid callback: missing subscription_id'));
  const r = await subs.cashfreeCallback(id);
  res.redirect(back(r.kind, r.message));
}));

subscriptionPublicRouter.get('/callback/kelviq', wrap(async (req, res) => {
  const id = Number(req.query.subscription_id);
  if (!id) return res.redirect(back('error', 'Invalid callback'));
  const r = await subs.kelviqCallback(id, req.query.simulated === '1');
  res.redirect(back(r.kind, r.message));
}));

// raw body is required to verify the Cashfree signature
subscriptionPublicRouter.post('/webhook/cashfree', express.raw({ type: '*/*', limit: '1mb' }), wrap(async (req, res) => {
  const raw = (req.body as Buffer).toString('utf8');
  const sig = req.header('x-webhook-signature');
  const ts = req.header('x-webhook-timestamp');
  if (!sig || !ts || !subs.verifyCashfreeSignature(raw, sig, ts)) return res.status(401).json({ error: 'Invalid signature' });
  await subs.handleCashfreeWebhook(JSON.parse(raw));
  res.json({ received: true });
}));

export const _p = prisma;
