import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafePostAuthPath } from "@/lib/invitations/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnPath = getSafePostAuthPath(searchParams.get("redirect"));

  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(returnPath, origin));
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed`
  );
}