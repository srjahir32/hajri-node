import { prisma } from '../lib/prisma';
import { forbidden } from '../lib/errors';
import { wrap } from '../lib/http';

export interface TrialState {
  expired: boolean;
  hasActiveSubscription: boolean;
  trialEndsAt: Date | null;
  message?: string;
  plan?: { plan: string; billingCycle: string; seats: number; startsAt: Date | null; expiresAt: Date | null };
}

export async function trialState(ownerId: number): Promise<TrialState> {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { trialEndsAt: true } });
  const trialEndsAt = owner?.trialEndsAt ?? null;
  const active = await prisma.subscription.findFirst({
    where: { userId: ownerId, status: 'active', expiresAt: { gt: new Date() } },
  });
  const trialOver = !!trialEndsAt && trialEndsAt < new Date();
  const expired = trialOver && !active;
  if (!expired) {
    return {
      expired: false,
      hasActiveSubscription: !!active,
      trialEndsAt,
      plan: active ? { plan: active.plan, billingCycle: active.billingCycle, seats: active.seats, startsAt: active.startsAt ?? active.createdAt, expiresAt: active.expiresAt } : undefined,
    };
  }
  const hadSub = await prisma.subscription.findFirst({ where: { userId: ownerId, status: { in: ['active', 'expired', 'cancelled'] } } });
  return {
    expired: true,
    hasActiveSubscription: false,
    trialEndsAt,
    message: hadSub
      ? 'Your Subscription Has Expired! To continue using all premium features, please subscribe to a plan that suits your needs.'
      : 'Your Free Trial Has Expired! To continue using all premium features, please subscribe to a plan that suits your needs.',
  };
}

/** Blocks the API once the owner's trial is over and no subscription is active. */
export const checkSubscription = wrap(async (req, _res, next) => {
  const ownerId = req.admin?.ownerId ?? (req.staff ? await ownerOfBusiness(req.staff.businessId) : undefined);
  if (!ownerId) return next();
  const state = await trialState(ownerId);
  if (state.expired) throw forbidden(state.message!, { is_expired: true });
  next();
});

export async function ownerOfBusiness(businessId: number): Promise<number | undefined> {
  const link = await prisma.businessUser.findFirst({
    where: { businessId, user: { isSubAdmin: false } },
    select: { userId: true },
  });
  return link?.userId;
}
