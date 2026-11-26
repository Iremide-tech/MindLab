import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

/** Handles email confirmation and password-recovery redirects from Supabase. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnPath = getSafePostAuthPath(searchParams.get("redirect"));

  const code = searchParams.get("code");
  const authError = searchParams.get("error");

  if (authError || !code) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return NextResponse.redirect(new URL(returnPath, origin));
  }

  console.error("Auth callback session exchange failed.", {
    errorName: error.name,
    errorCode: error.code,
    errorStatus: error.status,
    errorMessage: error.message,
    hasAuthorizationCode: Boolean(code),
  });

  const errorCode = /already exists|duplicate key|auth_email_claims/i.test(error.message)
    ? "account_exists"
    : "auth_failed";

  return NextResponse.redirect(new URL(`/login?error=${errorCode}`, origin));
}
