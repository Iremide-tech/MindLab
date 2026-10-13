"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

const supabase = createClient();

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [callbackErrorDismissed, setCallbackErrorDismissed] = useState(false);
  const callbackError = searchParams.get("error");
  const callbackErrorMessage =
    callbackError === "gmail_account_exists"
      ? "A MindLab account already exists for this Gmail address. Sign in using that account instead."
      : callbackError === "google_signin_failed"
        ? "Google sign-in could not be completed. Try again or sign in with your email and password."
        : null;
  const visibleError = error ?? (callbackErrorDismissed ? null : callbackErrorMessage);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveringPassword(true);
          setMessage("Choose a new password to finish resetting your account.");
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCallbackErrorDismissed(true);
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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

  async function handlePasswordReset() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter your email first, then request a password reset.");
      return;
    }

    setResettingPassword(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError("We couldn’t send a password reset email. Please try again in a moment.");
      setResettingPassword(false);
      return;
    }

    setMessage("Check your inbox for a password reset link.");
    setResettingPassword(false);
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      setError("Choose a new password with at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError("We couldn’t update your password. Please try again.");
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting to your workspace...");
    setLoading(false);
    setRecoveringPassword(false);

    await new Promise((resolve) => setTimeout(resolve, 500));
    router.replace("/dashboard");
    router.refresh();
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

        {recoveringPassword ? (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Choose a new password
              </label>
              <input
                type="password"
                placeholder="New password"
                required
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-lab-lime"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-lab-lime py-3 font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <button
              type="button"
              onClick={() => setRecoveringPassword(false)}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              Back to login
            </button>
          </form>
        ) : (
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resettingPassword || loading}
                className="text-sm text-lab-lime transition hover:text-lab-lime-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resettingPassword ? "Sending..." : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-lab-lime py-3 font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:opacity-50"
            >
              {loading ? "Entering..." : "Login"}
            </button>
          </form>
        )}

        {visibleError && (
          <p className="mt-4 text-center text-sm text-red-400">
            {visibleError}
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