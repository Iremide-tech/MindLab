"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Temporary stub while full dashboard is restored. */
export default function DashboardStub() {
  const router = useRouter();
  useEffect(() => {
    // Force clients to hard-refresh after restore deploys.
  }, [router]);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-lab-ink p-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold tracking-tight">
          MindLab<span className="text-lab-lime">AI</span>
        </p>
        <p className="mt-4 text-sm text-white/60">
          Dashboard is being restored. Please refresh in a moment.
        </p>
      </div>
    </main>
  );
}
