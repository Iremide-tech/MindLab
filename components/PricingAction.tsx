"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PlanCode } from "@/lib/paywall";

export default function PricingAction({
  planCode,
  highlighted = false,
}: {
  planCode: PlanCode;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        authorizationUrl?: string;
      };

      if (response.status === 401) {
        router.push("/login?redirect=%2Fpricing");
        return;
      }

      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error ?? "Checkout could not be started.");
      }

      window.location.assign(result.authorizationUrl);
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
        Continue free
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={[
          "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60",
          highlighted
            ? "bg-lab-lime text-lab-ink hover:bg-lab-lime-light"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        ].join(" ")}
      >
        {loading ? "Connecting to Paystack..." : "Choose plan"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
