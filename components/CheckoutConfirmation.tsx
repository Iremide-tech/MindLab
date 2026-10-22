"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BillingStatus = {
  planCode: "free" | "student" | "research";
  status: string;
};

const confirmedStatuses = new Set(["active", "trialing", "cancelled"]);
const maxAttempts = 15;
const pollingIntervalMs = 2_000;

export default function CheckoutConfirmation() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function checkBillingStatus() {
      try {
        const response = await fetch("/api/payments/status", { cache: "no-store" });
        if (response.ok) {
          const billing = (await response.json()) as BillingStatus;
          const hasPaidPlan = billing.planCode !== "free" && confirmedStatuses.has(billing.status);

          if (hasPaidPlan) {
            router.replace("/dashboard");
            router.refresh();
            return;
          }
        }
      } catch {
        // The next poll can recover from a brief network failure.
      }

      attempts += 1;
      if (cancelled) return;

      if (attempts >= maxAttempts) {
        setTimedOut(true);
        return;
      }

      timeoutId = setTimeout(checkBillingStatus, pollingIntervalMs);
    }

    void checkBillingStatus();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  if (timedOut) {
    return (
      <p role="status" className="mx-auto mt-5 max-w-2xl text-sm text-lab-lime-soft">
        Payment is still being confirmed. You can refresh this page or check your{" "}
        <Link href="/dashboard" className="underline hover:text-foreground">
          dashboard
        </Link>
        .
      </p>
    );
  }

  return (
    <p role="status" className="mx-auto mt-5 max-w-2xl text-sm text-lab-lime-soft">
      We are confirming your payment with Stripe. Your dashboard will open automatically once it is verified.
    </p>
  );
}
