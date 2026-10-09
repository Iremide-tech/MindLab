import Stripe from "stripe";

export type PaidPlanCode = "student" | "research";
export type UserPlanStatus = "active" | "trialing" | "cancelled" | "expired";

const planAmountsUsdCents: Record<PaidPlanCode, number> = {
  student: 1200,
  research: 2900,
};

export function isPaidPlanCode(value: unknown): value is PaidPlanCode {
  return value === "student" || value === "research";
}

export function getExpectedPlanAmount(plan: PaidPlanCode): number {
  return planAmountsUsdCents[plan];
}

export function getStripePriceId(plan: PaidPlanCode): string | null {
  const priceId = plan === "student"
    ? process.env.STRIPE_STUDENT_PRICE_ID
    : process.env.STRIPE_RESEARCH_PRICE_ID;
  return priceId?.trim() || null;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean
): UserPlanStatus | null {
  if (status === "active") {
    return cancelAtPeriodEnd ? "cancelled" : "active";
  }
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "cancelled";
  if (status === "canceled" || status === "unpaid" || status === "paused") {
    return "expired";
  }
  return null;
}

export function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured.");
  }
  return new Stripe(secretKey, { maxNetworkRetries: 2 });
}