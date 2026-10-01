import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function invitationError(code: string) {
  const messages: Record<string, { status: number; error: string }> = {
    unauthenticated: { status: 401, error: "You must be logged in to accept an invitation." },
    email_unverified: { status: 403, error: "Verify your account email before accepting this invitation." },
    email_mismatch: { status: 403, error: "This invitation was sent to a different email address." },
    not_found: { status: 404, error: "Invitation not found." },
    expired: { status: 410, error: "This invitation has expired." },
    revoked: { status: 410, error: "This invitation was revoked." },
    accepted: { status: 409, error: "This invitation has already been accepted." },
    declined: { status: 409, error: "This invitation has already been declined." },
  };
  const response = messages[code] ?? { status: 409, error: "This invitation is no longer available." };
  return NextResponse.json({ error: response.error, code }, { status: response.status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return invitationError("unauthenticated");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const token = body && typeof body === "object"
      ? (body as Record<string, unknown>).token
      : null;
    if (typeof token !== "string" || token.length < 32 || token.length > 128) {
      return NextResponse.json({ error: "A valid invitation token is required." }, { status: 400 });
    }

    const { data: result, error } = await supabase.rpc(
      "accept_research_map_invitation",
      { p_token: token }
    );
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Unable to accept invitation." }, { status: 500 });
    }
    if (!result?.success) return invitationError(result?.code ?? "unavailable");

    return NextResponse.json({
      success: true,
      mapId: result.map_id,
      alreadyMember: result.code === "already_member",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}