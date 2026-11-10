import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in to leave a map." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const mapId = body && typeof body === "object"
      ? (body as Record<string, unknown>).mapId
      : null;

    if (typeof mapId !== "string" || !uuidPattern.test(mapId)) {
      return NextResponse.json({ error: "A valid map ID is required." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("leave_research_map", { p_map_id: mapId });
    if (error) throw error;

    if (!data?.success) {
      const messages: Record<string, string> = {
        not_member: "You no longer have access to this map.",
        owner_cannot_leave: "Map owners cannot leave their own map. Delete the map instead.",
      };
      return NextResponse.json(
        { error: messages[data?.code] ?? "Unable to leave this map." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to leave research map:", error);
    return NextResponse.json({ error: "Unable to leave this map. Please try again." }, { status: 500 });
  }
}
