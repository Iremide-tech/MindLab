import { NextResponse } from "next/server";

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
    if (requestedPlan !== "student" && requestedPlan !== "research") {
      return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Your account needs an email address to check out." }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const planCode =
      requestedPlan === "student"
        ? process.env.PAYSTACK_STUDENT_PLAN_CODE
        : process.env.PAYSTACK_RESEARCH_PLAN_CODE;

    if (!secretKey || !siteUrl || !planCode) {
      return NextResponse.json(
        { error: "Live billing is not configured. Set the Paystack secret, site URL, and monthly plan codes." },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
      return NextResponse.json(
        { error: "Live billing requires a Paystack live secret key." },
        { status: 503 }
      );
    }
    if (process.env.NODE_ENV !== "production" && secretKey.startsWith("sk_live_")) {
      return NextResponse.json(
        { error: "Live Paystack keys are disabled in local development. Use test keys locally." },
        { status: 503 }
      );
    }

    const expectedAmount = requestedPlan === "student" ? 1200 : 2900;
    const configuredPlanResponse = await fetch(
      `https://api.paystack.co/plan/${encodeURIComponent(planCode)}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" }
    );
    if (!configuredPlanResponse.ok) {
      console.error("Paystack monthly plan lookup failed:", await configuredPlanResponse.text());
      return NextResponse.json({ error: "The selected payment plan is unavailable." }, { status: 503 });
    }

    const configuredPlan = (await configuredPlanResponse.json()) as {
      status?: boolean;
      data?: { amount?: number; currency?: string; interval?: string };
    };
    if (
      !configuredPlan.status ||
      configuredPlan.data?.amount !== expectedAmount ||
      configuredPlan.data.currency !== "USD" ||
      configuredPlan.data.interval !== "monthly"
    ) {
      return NextResponse.json(
        { error: "The Paystack plan must match the displayed USD monthly price." },
        { status: 503 }
      );
    }

    let callbackUrl: string;
    try {
      const configuredUrl = new URL(siteUrl);
      if (configuredUrl.protocol !== "https:" && configuredUrl.hostname !== "localhost") {
        throw new Error("The site URL must use HTTPS.");
      }
      callbackUrl = new URL("/pricing?checkout=processing", configuredUrl.origin).toString();
    } catch {
      return NextResponse.json({ error: "The site URL is not configured correctly." }, { status: 500 });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        plan: planCode,
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan: requestedPlan,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Paystack checkout failed:", errorText);
      return NextResponse.json(
        { error: "We could not start the upgrade checkout. Please try again." },
        { status: 502 }
      );
    }

    const result = (await response.json()) as {
      status?: boolean;
      data?: { authorization_url?: string; reference?: string };
      message?: string;
    };

    const authorizationUrl = result.data?.authorization_url;
    const reference = result.data?.reference;
    if (!result.status || !authorizationUrl || !reference) {
      return NextResponse.json(
        { error: result.message ?? "Checkout session could not be created." },
        { status: 502 }
      );
    }

    const admin = createAdminClient();
    const { error: saveError } = await admin.from("paystack_checkout_sessions").insert({
      reference,
      user_id: user.id,
      plan_code: requestedPlan,
    });

    if (saveError) {
      console.error("Unable to save Paystack checkout reference:", saveError);
      return NextResponse.json(
        { error: "We could not prepare the checkout. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl,
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
