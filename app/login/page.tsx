"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Unable to sign in with those credentials. Check your email and password, then try again.");
      setLoading(false);
      return;
    }

    setMessage("Login successful! Redirecting...");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const returnPath = getSafePostAuthPath(
      new URLSearchParams(window.location.search).get("redirect")
    );
    router.replace(returnPath);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const returnPath = getSafePostAuthPath(
      new URLSearchParams(window.location.search).get("redirect")
    );
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirect", returnPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setError("Unable to sign in with that provider. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-lab-surface/90 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">MindLab</h1>
          </Link>

          <p className="mt-2 text-sm text-white/50">
            Enter your research workspace
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-lab-lime"
          />

          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-lab-lime"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-lab-lime py-3 font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:opacity-50"
          >
            {loading ? "Entering..." : "Login"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-medium transition hover:bg-white/10 disabled:opacity-50"
        >
          Continue with Google
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-green-400">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-white/50">
          First time?{" "}
          <Link
            href="/signup"
            onClick={(event) => {
              const returnPath = getSafePostAuthPath(
                new URLSearchParams(window.location.search).get("redirect")
              );
              if (returnPath !== "/dashboard") {
                event.preventDefault();
                router.push(`/signup?redirect=${encodeURIComponent(returnPath)}`);
              }
            }}
            className="text-lab-lime hover:text-lab-lime-light"
          >
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-white/30 transition hover:text-white/60"
          >
            ← Back to MindLab
          </Link>
        </p>
      </div>
    </main>
  );
}