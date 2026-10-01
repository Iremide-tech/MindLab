"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Invitation = {
  id: string;
  map_id: string;
  email: string;
  workspace_title: string;
  inviter_email: string | null;
  role: "collaborator";
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  expires_at: string;
};

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();

  const token = params.token as string;

  const [invitation, setInvitation] =
    useState<Invitation | null>(null);

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");
  const returnPath = `/invite/${encodeURIComponent(token)}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(returnPath)}`;
  const signupUrl = `/signup?redirect=${encodeURIComponent(returnPath)}`;

  useEffect(() => {
    async function loadInvitation() {
      try {
        const supabase = createClient();
        const [userResult, response] = await Promise.all([
          supabase.auth.getUser(),
          fetch(`/api/invitations/${encodeURIComponent(token)}`),
        ]);
        setUserEmail(userResult.data.user?.email?.trim().toLowerCase() ?? null);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invitation not found.");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError("Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  async function respondToInvitation(action: "accept" | "decline") {
    setResponding(action);
    setError("");

    try {
      const response = await fetch(
        `/api/invitations/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Unable to ${action} invitation.`);
        return;
      }

      if (action === "accept") {
        router.push(`/dashboard?map=${encodeURIComponent(data.mapId)}`);
      } else {
        setInvitation((current) => current ? { ...current, status: "declined" } : current);
      }
    } catch {
      setError(`Something went wrong trying to ${action} this invitation.`);
    } finally {
      setResponding(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-white/60">
          Loading invitation...
        </p>
      </main>
    );
  }

  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-lab-surface p-8 text-center">
          <h1 className="text-2xl font-semibold">
            Invitation unavailable
          </h1>

          <p className="mt-3 text-white/60">{error || "This invitation could not be found."}</p>
          <Link href="/" className="mt-6 inline-block text-sm text-lab-lime hover:text-lab-lime-light">
            Back to MindLab
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-lab-surface p-8 shadow-2xl">
        <div className="mb-6">
          <div className="text-sm text-lab-lime">
            MINDLAB
          </div>

          <h1 className="mt-3 text-3xl font-semibold">
            You&apos;ve been invited
          </h1>

          <p className="mt-3 text-white/60">You&apos;ve been invited to collaborate on this workspace.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-lab-canvas p-5">
          <div className="text-sm text-white/40">
            Invitation for
          </div>

          <div className="mt-1 font-medium">{invitation.workspace_title || "Research workspace"}</div>

          <div className="mt-4 text-sm text-white/40">
            Invited by
          </div>

          <div className="mt-1">{invitation.inviter_email || "A MindLab member"}</div>

          <div className="mt-4 text-sm text-white/40">Invitation for</div>
          <div className="mt-1">{invitation.email}</div>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}

        {invitation.status === "pending" && !userEmail && (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-6 text-white/55">Sign in or create an account with the invited email to continue.</p>
            <Link href={loginUrl} className="block w-full rounded-xl bg-lab-lime px-5 py-3 text-center font-medium text-lab-ink transition hover:bg-lab-lime-light">
              Sign in to accept
            </Link>
            <Link href={signupUrl} className="block text-center text-sm text-lab-lime hover:text-lab-lime-light">
              Create an account
            </Link>
          </div>
        )}

        {invitation.status === "pending" && userEmail && userEmail !== invitation.email.toLowerCase() && (
          <div className="mt-6 rounded-xl border border-lab-copper/25 bg-lab-copper/10 p-4">
            <p className="text-sm text-lab-copper-soft">
              You&apos;re signed in as {userEmail}. Sign in with {invitation.email} to accept this invitation.
            </p>
            <Link href={loginUrl} className="mt-3 inline-block text-sm text-lab-lime hover:text-lab-lime-light">
              Switch account
            </Link>
          </div>
        )}

        {invitation.status === "pending" && userEmail === invitation.email.toLowerCase() && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => respondToInvitation("decline")}
              disabled={responding !== null}
              className="rounded-xl border border-white/10 px-5 py-3 font-medium text-white/75 transition hover:bg-white/5 disabled:opacity-50"
            >
              {responding === "decline" ? "Declining..." : "Decline"}
            </button>
            <button
              onClick={() => respondToInvitation("accept")}
              disabled={responding !== null}
              className="rounded-xl bg-lab-lime px-5 py-3 font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:opacity-50"
            >
              {responding === "accept" ? "Accepting..." : "Accept"}
            </button>
          </div>
        )}

        {invitation.status !== "pending" && (
          <p role="status" className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm capitalize text-white/70">
            This invitation is {invitation.status} and can no longer be used.
          </p>
        )}
      </div>
    </main>
  );
}