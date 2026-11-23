"use client";

import { useState } from "react";
import BillingSummary from "@/components/BillingSummary";

export type DashboardHomeMap = {
  id: string;
  title: string;
  nodes?: unknown[];
  created_at?: string;
};

type Props = {
  userEmail: string | null;
  loadingMaps: boolean;
  savedMaps: DashboardHomeMap[];
  onCreate: () => void;
  onOpen: (map: DashboardHomeMap) => void;
  onLogout: () => void;
};

export default function DashboardHome({
  userEmail,
  loadingMaps,
  savedMaps,
  onCreate,
  onOpen,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-lab-surface/80 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-white">
              MindLab<span className="text-lab-lime">AI</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-white/60">
              {userEmail ? `Signed in as ${userEmail}` : "Your workspaces"}
            </p>
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 sm:flex">
            <BillingSummary />
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-red-400/25 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200"
            >
              Log out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 sm:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span
              className={
                menuOpen
                  ? "block h-0.5 w-5 translate-y-2 rotate-45 bg-white transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
            />
            <span
              className={
                menuOpen
                  ? "block h-0.5 w-5 bg-white opacity-0 transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
            />
            <span
              className={
                menuOpen
                  ? "block h-0.5 w-5 -translate-y-2 -rotate-45 bg-white transition"
                  : "block h-0.5 w-5 bg-white transition"
              }
            />
          </button>
        </div>

        {menuOpen ? (
          <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:hidden">
            <div className="flex justify-stretch">
              <div className="w-full [&_>div]:items-stretch [&_>div]:w-full [&_>div>div]:w-full [&_>div>div]:justify-between">
                <BillingSummary />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="min-h-11 w-full rounded-xl border border-red-400/25 bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-200"
            >
              Log out
            </button>
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lab-lime">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Your workspaces
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/65">
              Open a saved map or start a new research workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lab-lime px-5 py-2.5 text-sm font-semibold text-lab-ink transition hover:bg-lab-lime-light"
          >
            + Create new workspace
          </button>
        </div>

        {loadingMaps ? (
          <p className="text-sm text-white/60">Loading your maps…</p>
        ) : savedMaps.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-lab-card/80 px-6 py-16 text-center">
            <p className="text-base font-medium text-white">No saved maps yet</p>
            <p className="mt-2 max-w-sm text-sm text-white/60">
              Create a workspace, generate a map from a topic or notes, then save it here.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="mt-6 rounded-xl bg-lab-lime px-5 py-2.5 text-sm font-semibold text-lab-ink transition hover:bg-lab-lime-light"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedMaps.map((map) => (
              <li key={map.id}>
                <button
                  type="button"
                  onClick={() => onOpen(map)}
                  className="group flex h-full w-full flex-col rounded-2xl border border-white/12 bg-lab-card p-4 text-left transition hover:border-lab-lime/50 hover:bg-lab-root"
                >
                  <span className="line-clamp-2 text-sm font-semibold text-white group-hover:text-lab-lime">
                    {map.title || "Untitled research map"}
                  </span>
                  <span className="mt-3 text-xs text-white/55">
                    {Array.isArray(map.nodes) ? map.nodes.length : 0} nodes
                    {" · "}
                    {map.created_at
                      ? new Date(map.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Saved"}
                  </span>
                  <span className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-white/50 group-hover:text-lab-lime">
                    Open workspace →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
