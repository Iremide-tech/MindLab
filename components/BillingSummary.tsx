"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BillingStatus = {
  planName: string;
  status: string;
  usageCount: number | null;
  dailyLimit: number | null;
};

export default function BillingSummary() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBilling() {
      try {
        const response = await fetch("/api/payments/status", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as BillingStatus;
        if (active) setBilling(data);
      } catch {
        if (active) setBilling(null);
      }
    }

    void loadBilling();
    window.addEventListener("focus", loadBilling);
    return () => {
      active = false;
      window.removeEventListener("focus", loadBilling);
    };
  }, []);

  async function openBillingPortal() {
    setPortalError(null);
    setPortalLoading(true);

    try {
      const response = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json().catch(() => null)) as
        | { portalUrl?: string; error?: string }
        | null;

      if (!response.ok || !data?.portalUrl) {
        throw new Error(
          data?.error || "Unable to open subscription management."
        );
      }

      window.location.assign(data.portalUrl);
    } catch (error) {
      setPortalError(
        error instanceof Error
          ? error.message
          : "Unable to open subscription management."
      );
      setPortalLoading(false);
    }
  }

  if (!billing) return null;

  const isPaidPlan =
    billing.planName === "Student" || billing.planName === "Research";

  const usageLabel =
    billing.status === "cancelled"
      ? "Cancels at period end"
      : billing.dailyLimit === null
        ? "Unlimited generations"
        : billing.usageCount === null
          ? `${billing.dailyLimit} generations/day`
          : `${Math.max(0, billing.dailyLimit - billing.usageCount)} of ${billing.dailyLimit} left today`;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 sm:gap-3 sm:px-3">
        <Link
          href="/workspaces"
          className="hidden rounded-md px-2 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white sm:inline sm:text-xs"
        >
          Workspaces
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-white sm:text-xs">
            {billing.planName} plan
          </p>
          <p className="hidden text-[10px] text-white/45 sm:block">{usageLabel}</p>
        </div>

        {isPaidPlan ? (
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={portalLoading}
            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/85 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 sm:text-xs"
          >
            {portalLoading ? "Opening…" : "Manage / Cancel"}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="rounded-md bg-lab-lime px-2.5 py-1.5 text-[11px] font-semibold text-lab-ink transition hover:bg-lab-lime-light sm:text-xs"
          >
            Upgrade
          </Link>
        )}
      </div>

      {portalError ? (
        <p className="max-w-[14rem] text-right text-[10px] leading-4 text-red-300">
          {portalError}
        </p>
      ) : null}
    </div>
  );
}
