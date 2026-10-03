import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanCode } from "@/lib/paywall";

const planAmountsUsdCents = {
  student: 1200,
  research: 2900,
} as const;

function nextMonthlyPeriod(paidAt?: string) {
  const end = paidAt ? new Date(paidAt) : new Date();
  if (Number.isNaN(end.getTime())) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return new NextResponse("Webhook not configured.", { status: 503 });
  }

  if (!signature || !/^[a-f\d]{128}$/i.test(signature)) {
    return new NextResponse("Missing signature.", { status: 400 });
  }

  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    return new NextResponse("Invalid signature.", { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as {
      event?: string;
      data?: {
        metadata?: { user_id?: string; plan?: string };
        reference?: string;
        customer?: { email?: string; customer_code?: string };
        amount?: number;
        currency?: string;
        paid_at?: string;
        status?: string;
        subscription_code?: string;
        plan?: { plan_code?: string };
        next_payment_date?: string;
      };
    };

    const eventName = event.event;
    const data = event.data ?? {};
    const admin = createAdminClient();

    if (eventName === "charge.success") {
      if (!data.reference) {
        return new NextResponse("Missing transaction reference.", { status: 400 });
      }

      const verificationResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
      );
      if (!verificationResponse.ok) {
        return new NextResponse("Unable to verify transaction.", { status: 502 });
      }

      const verification = (await verificationResponse.json()) as {
        status?: boolean;
        data?: { status?: string; amount?: number; currency?: string; paid_at?: string };
      };
      if (
        !verification.status ||
        verification.data?.status !== "success" ||
        verification.data.currency !== "USD"
      ) {
        return new NextResponse("Payment verification failed.", { status: 400 });
      }

      const { data: checkout, error: checkoutError } = await admin
        .from("paystack_checkout_sessions")
        .select("reference, user_id, plan_code, completed_at")
        .eq("reference", data.reference)
        .maybeSingle();

      let userId = checkout?.user_id as string | undefined;
      let planCode = checkout?.plan_code as "student" | "research" | undefined;

      if (!checkout && data.customer?.customer_code) {
        const { data: existingPlan, error: planLookupError } = await admin
          .from("user_plans")
          .select("user_id, plan_code")
          .eq("paystack_customer_code", data.customer.customer_code)
          .maybeSingle();
        if (planLookupError) {
          console.error("Unable to match recurring Paystack customer:", planLookupError);
          return new NextResponse("Unable to match customer.", { status: 500 });
        }
        userId = existingPlan?.user_id as string | undefined;
        planCode = existingPlan?.plan_code as "student" | "research" | undefined;
      }

      if (checkoutError) {
        console.error("Unable to read Paystack checkout reference:", checkoutError);
        return new NextResponse("Unable to find checkout.", { status: 500 });
      }

      if (!userId || !planCode) {
        return new NextResponse("No matching checkout.", { status: 200 });
      }

      if (verification.data.amount !== planAmountsUsdCents[planCode]) {
        console.error("Paystack amount does not match configured plan:", data.reference);
        return new NextResponse("Payment amount does not match the plan.", { status: 400 });
      }

      const { error: planWriteError } = await admin.from("user_plans").upsert(
        {
          user_id: userId,
          plan_code: normalizePlanCode(planCode),
          status: "active",
          provider: "paystack",
          provider_reference: data.reference,
          customer_email: data.customer?.email ?? null,
          paystack_customer_code: data.customer?.customer_code ?? null,
          current_period_end: nextMonthlyPeriod(verification.data.paid_at ?? data.paid_at),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (planWriteError) {
        console.error("Unable to activate paid plan:", planWriteError);
        return new NextResponse("Unable to activate plan.", { status: 500 });
      }

      if (checkout) {
        const { error: completeError } = await admin
          .from("paystack_checkout_sessions")
          .update({ completed_at: new Date().toISOString() })
          .eq("reference", data.reference);
        if (completeError) {
          console.error("Unable to mark checkout complete:", completeError);
        }
      }
    } else if (["subscription.create", "subscription.update", "subscription.not_renew", "subscription.disable"].includes(eventName ?? "")) {
      const customerCode = data.customer?.customer_code;
      if (customerCode) {
        const { data: existingPlan, error: lookupError } = await admin
          .from("user_plans")
          .select("user_id")
          .eq("paystack_customer_code", customerCode)
          .maybeSingle();
        if (lookupError) {
          console.error("Unable to match Paystack subscription:", lookupError);
          return new NextResponse("Unable to match subscription.", { status: 500 });
        }
        if (existingPlan?.user_id) {
          const status = eventName === "subscription.disable"
            ? "expired"
            : eventName === "subscription.not_renew"
              ? "cancelled"
              : "active";
          const updates: Record<string, unknown> = {
            status,
            paystack_subscription_code: data.subscription_code ?? null,
            updated_at: new Date().toISOString(),
          };
          if (data.next_payment_date) {
            updates.current_period_end = data.next_payment_date;
          }
          const { error: updateError } = await admin
            .from("user_plans")
            .update(updates)
            .eq("user_id", existingPlan.user_id);
          if (updateError) {
            console.error("Unable to update subscription status:", updateError);
            return new NextResponse("Unable to update subscription.", { status: 500 });
          }
        }
      }
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error) {
    console.error("Paystack webhook failed:", error);
    return new NextResponse("bad payload", { status: 400 });
  }
}
