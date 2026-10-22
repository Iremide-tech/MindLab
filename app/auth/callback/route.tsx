import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnPath = getSafePostAuthPath(searchParams.get("redirect"));

  const code = searchParams.get("code");
  const authError = searchParams.get("error");

  if (authError || !code) {
    return NextResponse.redirect(new URL("/login?error=google_signin_failed", origin));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return NextResponse.redirect(new URL(returnPath, origin));
  }

  console.error("Google OAuth session exchange failed.", {
    errorName: error.name,
    errorCode: error.code,
    errorStatus: error.status,
    errorMessage: error.message,
    hasAuthorizationCode: Boolean(code),
    hasFlowId: Boolean(searchParams.get("sb_flow_id")),
  });

  const errorCode = /already exists|duplicate key|auth_email_claims/i.test(error.message)
    ? "gmail_account_exists"
    : "google_signin_failed";
  return NextResponse.redirect(new URL(`/login?error=${errorCode}`, origin));
}
