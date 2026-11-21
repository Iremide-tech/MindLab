"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const returnPath = getSafePostAuthPath(
        new URLSearchParams(window.location.search).get("redirect")
      );

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          redirect: returnPath,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        success?: boolean;
      } | null;

      if (response.ok && (data?.success || data?.message)) {
        setMessage(
          data?.message ||
            "Account created! Check your email to confirm your account, then sign in."
        );
        return;
      }

      // If the network reported failure but the body still looks like success, prefer success.
      if (data?.success || (data?.message && /check your email/i.test(data.message))) {
        setMessage(data.message || "Check your email to confirm your account, then sign in.");
        return;
      }

      setError(
        data?.error ||
          "Unable to create your account. If you got a confirmation email, open that link and sign in."
      );
    } catch {
      setError(
        "Network error after signup. If you received a confirmation email, open that link and sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,rgba(200,241,105,0.09),transparent_52%)] px-4 py-8 font-sans text-foreground sm:px-6 sm:py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-lab-surface/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-[-0.03em]">
            MindLab<span className="text-lab-lime">AI</span>
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Create your research workspace
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-lab-lime"
          />

          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-lab-lime"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-lab-lime py-3 font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-green-400">{message}</p>
        )}

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            href="/login"
            onClick={(event) => {
              const returnPath = getSafePostAuthPath(
                new URLSearchParams(window.location.search).get("redirect")
              );
              if (returnPath !== "/workspaces" && returnPath !== "/dashboard") {
                event.preventDefault();
                router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
              }
            }}
            className="text-lab-lime hover:text-lab-lime-light"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
