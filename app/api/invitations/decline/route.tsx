import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const errorResponses: Record<string, { status: number; message: string }> = {
  unauthenticated: { status: 401, message: "You must be logged in to decline an invitation." },
  email_unverified: { status: 403, message: "Verify your account email before responding to this invitation." },
  email_mismatch: { status: 403, message: "This invitation was sent to a different email address." },
  not_found: { status: 404, message: "Invitation not found." },
  expired: { status: 410, message: "This invitation has expired." },
  revoked: { status: 410, message: "This invitation was revoked." },
  accepted: { status: 409, message: "This invitation has already been accepted." },
  declined: { status: 409, message: "This invitation has already been declined." },
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: errorResponses.unauthenticated.message },
        { status: errorResponses.unauthenticated.status }
      );
    }

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
      "decline_research_map_invitation",
      { p_token: token }
    );
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Unable to decline invitation." }, { status: 500 });
    }
    if (!result?.success) {
      const response = errorResponses[result?.code] ?? {
        status: 409,
        message: "This invitation is no longer available.",
      };
      return NextResponse.json({ error: response.message }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}