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

    const emailRedirectTo = getAuthCallbackUrl(redirectPath);

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      console.error("Supabase signUp error:", error.message, error.status);

      if (/already exists|already registered|duplicate key|user already/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              "An account already exists for this email. Sign in, or check your inbox for a confirmation link.",
          },
          { status: 400 }
        );
      }

      if (/rate limit|too many/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              "Too many signup attempts. Wait a minute, then try again (check your email — a link may already have been sent).",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Could not create your account. Check your details and try again.",
        },
        { status: 400 }
      );
    }

    // Supabase may return a user with empty identities when the email is already registered
    // (anti-enumeration). Treat a real new user / pending confirmation as success.
    const identities = data.user?.identities;
    if (data.user && Array.isArray(identities) && identities.length === 0) {
      return NextResponse.json(
        {
          error:
            "An account already exists for this email. Sign in, or check your inbox for a confirmation link.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Check your email to confirm your account, then sign in.",
      emailRedirectTo,
    });
  } catch (error) {
    console.error("Signup route failed:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong. If you got a confirmation email, open that link and sign in.",
      },
      { status: 500 }
    );
  }
}
