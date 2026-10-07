
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setMessage(null);

    const returnPath = getSafePostAuthPath(
      new URLSearchParams(window.location.search).get("redirect")
    );
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("redirect", returnPath);

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setError(
        /already exists|already registered|duplicate key/i.test(error.message)
          ? "An account already exists for this Gmail address. Sign in to that account instead."
          : "Unable to create your account. Check your details and try again."
      );
    } else {
      setMessage(
        "Account created! Check your email to confirm your account."
      );
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-lab-surface/90 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            MindMap<span className="text-lab-lime">AI</span>
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
          Already have an account?{" "}
          <Link
            href="/login"
            onClick={(event) => {
              const returnPath = getSafePostAuthPath(
                new URLSearchParams(window.location.search).get("redirect")
              );
              if (returnPath !== "/dashboard") {
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