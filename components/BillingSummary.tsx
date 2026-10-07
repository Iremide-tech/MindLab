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

  if (!billing) return null;

  const usageLabel =
    billing.status === "cancelled"
      ? "Cancels at period end"
      : billing.dailyLimit === null
      ? "Unlimited generations"
      : billing.usageCount === null
        ? `${billing.dailyLimit} generations/day`
        : `${Math.max(0, billing.dailyLimit - billing.usageCount)} of ${billing.dailyLimit} left today`;

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 sm:gap-3 sm:px-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-white sm:text-xs">
          {billing.planName} plan
        </p>
        <p className="hidden text-[10px] text-white/45 sm:block">{usageLabel}</p>
      </div>
      {billing.planName !== "Research" ? (
        <Link
          href="/pricing"
          className="rounded-md bg-lab-lime px-2.5 py-1.5 text-[11px] font-semibold text-lab-ink transition hover:bg-lab-lime-light sm:text-xs"
        >
          Upgrade
        </Link>
      ) : (
        <Link
          href="/pricing"
          className="text-[11px] font-medium text-white/55 transition hover:text-white sm:text-xs"
        >
          Plans
        </Link>
      )}
    </div>
  );
}
