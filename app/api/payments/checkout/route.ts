import { NextResponse } from "next/server";

import {
  createStripeClient,
  getExpectedPlanAmount,
  getStripePriceId,
  isPaidPlanCode,
} from "@/lib/stripe-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to continue." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 });
    }

    const requestedPlan = (body as Record<string, unknown>).plan;
    if (!isPaidPlanCode(requestedPlan)) {
      return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Your account needs an email address to check out." }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const priceId = getStripePriceId(requestedPlan);

    if (!secretKey || !siteUrl || !priceId) {
      return NextResponse.json(
        { error: "Stripe billing is not configured. Set the Stripe secret, monthly price IDs, and site URL." },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
      return NextResponse.json(
        { error: "Live billing requires a Stripe live secret key." },
        { status: 503 }
      );
    }
    if (process.env.NODE_ENV !== "production" && secretKey.startsWith("sk_live_")) {
      return NextResponse.json(
        { error: "Live Stripe keys are disabled in local development. Use test keys locally." },
        { status: 503 }
      );
    }

    let siteOrigin: string;
    try {
      const configuredUrl = new URL(siteUrl);
      if (configuredUrl.protocol !== "https:" && configuredUrl.hostname !== "localhost") {
        throw new Error("The site URL must use HTTPS.");
      }
      siteOrigin = configuredUrl.origin;
    } catch {
      return NextResponse.json({ error: "The site URL is not configured correctly." }, { status: 500 });
    }

    const stripe = createStripeClient();
    const price = await stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.unit_amount !== getExpectedPlanAmount(requestedPlan) ||
      price.currency !== "usd" ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    ) {
      return NextResponse.json(
        { error: "The Stripe price must match the displayed monthly USD plan." },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: existingPlan, error: customerLookupError } = await admin
      .from("user_plans")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerLookupError) {
      console.error("Unable to look up Stripe customer:", customerLookupError);
      return NextResponse.json(
        { error: "Billing data is not ready. Apply the Stripe billing migration and try again." },
        { status: 503 }
      );
    }

    const metadata = { user_id: user.id, plan: requestedPlan };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: new URL("/pricing?checkout=processing", siteOrigin).toString(),
      cancel_url: new URL("/pricing?checkout=cancelled", siteOrigin).toString(),
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      ...(existingPlan?.stripe_customer_id
        ? { customer: existingPlan.stripe_customer_id }
        : { customer_email: user.email }),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe could not create a checkout URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      plan: requestedPlan,
    });
  } catch (error) {
    console.error("Checkout route failed:", error);
    return NextResponse.json(
      { error: "We could not start the checkout flow. Please try again." },
      { status: 500 }
    );
  }
}
