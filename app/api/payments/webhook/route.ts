import Stripe from "stripe";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createStripeClient,
  getStripePriceId,
  isPaidPlanCode,
  mapStripeSubscriptionStatus,
  type PaidPlanCode,
} from "@/lib/stripe-billing";

async function syncSubscription({
  admin,
  subscription,
  userId,
  planCode,
  customerEmail,
}: {
  admin: ReturnType<typeof createAdminClient>;
  subscription: Stripe.Subscription;
  userId: string;
  planCode: PaidPlanCode;
  customerEmail?: string | null;
}): Promise<void> {
  const expectedPriceId = getStripePriceId(planCode);
  if (
    !expectedPriceId ||
    subscription.items.data.length !== 1 ||
    subscription.items.data[0]?.price.id !== expectedPriceId
  ) {
    console.error("Stripe subscription price did not match the configured plan.", {
      subscriptionId: subscription.id,
      planCode,
    });
    return;
  }

  const status = mapStripeSubscriptionStatus(
    subscription.status,
    subscription.cancel_at_period_end
  );
  if (!status) return;

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const periodEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;
  const planRecord: Record<string, unknown> = {
    user_id: userId,
    plan_code: planCode,
    status,
    provider: "stripe",
    provider_reference: subscription.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };
  if (customerEmail) planRecord.customer_email = customerEmail;

  const { error } = await admin
    .from("user_plans")
    .upsert(planRecord, { onConflict: "user_id" });
  if (error) throw error;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return new NextResponse("Stripe webhook is not configured.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing Stripe signature.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = createStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    console.warn("Stripe webhook signature or payload validation failed:", error);
    return new NextResponse("Invalid Stripe webhook.", { status: 400 });
  }

  try {
    const stripe = createStripeClient();
    const admin = createAdminClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const planCode = session.metadata?.plan;

      if (session.mode !== "subscription" || !subscriptionId || !userId || !isPaidPlanCode(planCode)) {
        console.warn("Ignoring Stripe checkout with incomplete plan metadata.", {
          sessionId: session.id,
        });
        return new NextResponse("ok", { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscription({
        admin,
        subscription,
        userId,
        planCode,
        customerEmail: session.customer_details?.email ?? session.customer_email,
      });
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const eventSubscription = event.data.object as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
      const userId = subscription.metadata.user_id;
      const planCode = subscription.metadata.plan;

      if (!userId || !isPaidPlanCode(planCode)) {
        console.warn("Ignoring Stripe subscription with incomplete plan metadata.", {
          subscriptionId: subscription.id,
        });
        return new NextResponse("ok", { status: 200 });
      }

      await syncSubscription({ admin, subscription, userId, planCode });
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return new NextResponse("Unable to process Stripe webhook.", { status: 500 });
  }
}