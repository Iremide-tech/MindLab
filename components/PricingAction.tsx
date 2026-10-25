"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { PlanCode } from "@/lib/paywall";

type BillingStatus = {
  planCode: PlanCode;
  status: string;
};

const usablePaidStatuses = new Set(["active", "trialing", "cancelled", "override"]);

export default function PricingAction({
  planCode,
  highlighted = false,
}: {
  planCode: PlanCode;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingStatus() {
      try {
        const response = await fetch("/api/payments/status", {
          cache: "no-store",
        });

        if (response.ok) {
          const result = (await response.json()) as BillingStatus;
          if (!cancelled) setBilling(result);
        }
      } catch (statusError) {
        console.error("Could not load billing status:", statusError);
      } finally {
        if (!cancelled) setStatusChecked(true);
      }
    }

    void loadBillingStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const isCurrentPlan =
    statusChecked &&
    billing?.planCode === planCode &&
    (planCode === "free" || usablePaidStatuses.has(billing.status));

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planCode }),
      });
      const result = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
      };

      if (response.status === 401) {
        router.push("/login?redirect=%2Fpricing");
        return;
      }

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error ?? "Checkout could not be started.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started. Please try again."
      );
      setLoading(false);
    }
  }

  if (planCode === "free") {
    return (
      <a
        href="/dashboard"
        className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        {isCurrentPlan ? "Current plan" : "Continue free"}
      </a>
    );
  }

  if (isCurrentPlan) {
    return (
      <button
        type="button"
        disabled
        aria-label={`${planCode} plan is active`}
        className="inline-flex w-full cursor-default items-center justify-center gap-2 rounded-lg border border-lab-lime/40 bg-lab-lime/10 px-4 py-3 text-sm font-semibold text-lab-lime"
      >
        <span aria-hidden="true">✓</span>
        Active
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading || !statusChecked}
        className={[
          "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
          highlighted
            ? "bg-lab-lime text-lab-ink hover:bg-lab-lime-light"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        ].join(" ")}
      >
        {loading
          ? "Opening Stripe Checkout..."
          : !statusChecked
            ? "Checking plan..."
            : "Choose plan"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
