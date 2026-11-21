import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSafePostAuthPath } from "@/lib/invitations/redirect";
import { getAuthCallbackUrl } from "@/lib/site-url";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid signup payload." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid signup payload." }, { status: 400 });
    }

    const emailRaw = (body as Record<string, unknown>).email;
    const passwordRaw = (body as Record<string, unknown>).password;
    const redirectRaw = (body as Record<string, unknown>).redirect;

    const email =
      typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";
    const redirectPath = getSafePostAuthPath(
      typeof redirectRaw === "string" ? redirectRaw : null
    );

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Choose a password with at least 6 characters." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Auth is not configured on the server." },
        { status: 503 }
      );
    }

    // Always resolve from server env — never from the browser origin.
    const emailRedirectTo = getAuthCallbackUrl(redirectPath);

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const message = /already exists|already registered|duplicate key/i.test(
        error.message
      )
        ? "An account already exists for this email. Sign in instead."
        : "Unable to create your account. Check your details and try again.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Account created! Check your email to confirm your account.",
      emailRedirectTo,
    });
  } catch (error) {
    console.error("Signup route failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
