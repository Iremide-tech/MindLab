import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (token.length < 32 || token.length > 128) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: invitation, error } = await supabase.rpc(
      "get_research_map_invitation",
      { p_token: token }
    );
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Unable to load invitation." }, { status: 500 });
    }
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    return NextResponse.json({
      invitation,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load invitation." },
      { status: 500 }
    );
  }
}