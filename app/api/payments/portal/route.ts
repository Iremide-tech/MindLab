import { NextResponse } from "next/server";

import {
  createStripeClient,
  getStripeSecretKey,
  isLiveStripeSecretKey,
} from "@/lib/stripe-billing";
import { getSiteUrl } from "@/lib/site-url";
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
        { error: "You must be logged in to manage billing." },
        { status: 401 }
      );
    }

    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe billing is not configured. Set STRIPE_SECRET_KEY in Vercel." },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === "production" && !isLiveStripeSecretKey(secretKey)) {
      return NextResponse.json(
        {
          error:
            "Live billing requires STRIPE_SECRET_KEY to start with sk_live_. Update it under Vercel → Project → Settings → Environment Variables (Production), then redeploy.",
        },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: planRow, error: lookupError } = await admin
      .from("user_plans")
      .select("stripe_customer_id, plan_code, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Portal customer lookup failed:", lookupError);
      return NextResponse.json(
        { error: "Unable to load your billing account." },
        { status: 503 }
      );
    }

    const customerId =
      typeof planRow?.stripe_customer_id === "string"
        ? planRow.stripe_customer_id.trim()
        : "";

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe billing account found. Subscribe to a paid plan first, then you can manage or cancel it here.",
        },
        { status: 400 }
      );
    }

    let returnOrigin: string;
    try {
      returnOrigin = getSiteUrl(new URL(request.url).origin);
    } catch {
      return NextResponse.json(
        { error: "The site URL is not configured correctly." },
        { status: 500 }
      );
    }

    const stripe = createStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: new URL("/dashboard", returnOrigin).toString(),
    });

    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Stripe could not open the billing portal." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error("Billing portal route failed:", error);
    return NextResponse.json(
      {
        error:
          "We could not open the subscription manager. Confirm the Stripe Customer Portal is enabled, then try again.",
      },
      { status: 500 }
    );
  }
}
