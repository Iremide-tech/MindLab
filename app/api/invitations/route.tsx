import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/invitations/email";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^@\s]+@[^@\s]+(\.[^@\s]+)+$/;

function errorResponse(code: string) {
  const responses: Record<string, { status: number; message: string }> = {
    unauthenticated: { status: 401, message: "You must be logged in." },
    owner_required: { status: 403, message: "Only the workspace owner can manage invitations." },
    invalid_role: { status: 400, message: "Invalid collaboration role." },
    invalid_email: { status: 400, message: "Please enter a valid email address." },
    invalid_token: { status: 400, message: "Could not create a secure invitation." },
    self_invite: { status: 400, message: "You cannot invite yourself." },
    already_member: { status: 409, message: "This user already has workspace access." },
    already_pending: { status: 409, message: "An invitation is already pending for this email." },
  };
  const response = responses[code] ?? { status: 500, message: "Invitation request failed." };
  return NextResponse.json({ error: response.message, code }, { status: response.status });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("unauthenticated");

    const mapId = new URL(request.url).searchParams.get("mapId");
    if (!mapId || !uuidPattern.test(mapId)) {
      return NextResponse.json({ error: "A valid mapId is required." }, { status: 400 });
    }

    const { data: isOwner, error: ownerError } = await supabase.rpc(
      "is_research_map_owner",
      { p_map_id: mapId }
    );
    if (ownerError) return NextResponse.json({ error: "Unable to verify workspace ownership." }, { status: 500 });
    if (!isOwner) return errorResponse("owner_required");

    const { error: expiryError } = await supabase.rpc(
      "expire_research_map_invitations",
      { p_map_id: mapId }
    );
    if (expiryError) return NextResponse.json({ error: "Unable to refresh invitation status." }, { status: 500 });

    const [invitationsResult, membersResult] = await Promise.all([
      supabase
        .from("research_map_invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("map_id", mapId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("research_map_members")
        .select("user_id, email, role, created_at")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true }),
    ]);

    if (invitationsResult.error || membersResult.error) {
      return NextResponse.json({ error: "Unable to load workspace collaborators." }, { status: 500 });
    }

    return NextResponse.json({
      invitations: invitationsResult.data ?? [],
      members: membersResult.data ?? [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("unauthenticated");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid invitation details." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const mapId = input.mapId;
    const email = input.email;
    const role = input.role ?? "collaborator";

    if (typeof mapId !== "string" || !uuidPattern.test(mapId)) {
      return NextResponse.json({ error: "A valid mapId is required." }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 254 || !emailPattern.test(email.trim())) {
      return errorResponse("invalid_email");
    }
    if (role !== "collaborator") return errorResponse("invalid_role");
    if (!user.email) return NextResponse.json({ error: "Your account needs a verified email address." }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    let siteOrigin: string;
    try {
      if (!siteUrl) throw new Error("Missing site URL");
      const parsedSiteUrl = new URL(siteUrl);
      if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") {
        throw new Error("Site URL must use HTTPS.");
      }
      siteOrigin = parsedSiteUrl.origin;
    } catch {
      return NextResponse.json({ error: "The site URL is not configured correctly." }, { status: 500 });
    }

    const { data: map, error: mapError } = await supabase
      .from("research_maps")
      .select("title")
      .eq("id", mapId)
      .single();
    if (mapError || !map) return errorResponse("owner_required");

    const { data: result, error: createError } = await supabase.rpc(
      "create_research_map_invitation",
      {
        p_map_id: mapId,
        p_email: email.trim().toLowerCase(),
        p_role: role,
      }
    );

    if (createError) {
      console.error(createError);
      return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 });
    }
    if (!result?.success) return errorResponse(result?.code ?? "create_failed");

    const token = result.invitation?.token;
    if (typeof token !== "string" || token.length < 32) {
      return NextResponse.json({ error: "Invitation created without a secure link." }, { status: 500 });
    }
    const invitationUrl = new URL(`/invite/${token}`, siteOrigin).toString();
    try {
      const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
      const inviterName = typeof metadataName === "string" ? metadataName.trim() : "";
      await sendInvitationEmail({
        recipientEmail: email.trim().toLowerCase(),
        inviterEmail: user.email,
        inviterName: inviterName || user.email,
        workspaceTitle: map.title,
        invitationUrl,
        expiresAt: result.invitation.expires_at,
      });
    } catch (emailError) {
      console.error("Invitation email provider failed:", emailError);
      const { data: revokeResult, error: revokeError } = await supabase.rpc(
        "revoke_research_map_invitation",
        { p_invitation_id: result.invitation.id }
      );
      const cleanupFailed = revokeError || !revokeResult?.success;
      if (cleanupFailed) {
        console.error("Unable to cancel undelivered invitation:", revokeError ?? revokeResult);
      }
      return NextResponse.json(
        {
          error: cleanupFailed
            ? "We couldn't send or cancel the invitation. Revoke the pending invitation before trying again."
            : "We couldn't send the invitation email, so the invitation was canceled. Check the email configuration and try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        role: result.invitation.role,
        status: result.invitation.status,
        expires_at: result.invitation.expires_at,
      },
      invitationUrl,
      emailSent: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("unauthenticated");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const invitationId =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).invitationId
        : null;
    if (typeof invitationId !== "string" || !uuidPattern.test(invitationId)) {
      return NextResponse.json({ error: "A valid invitationId is required." }, { status: 400 });
    }

    const { data: result, error } = await supabase.rpc(
      "revoke_research_map_invitation",
      { p_invitation_id: invitationId }
    );
    if (error) return NextResponse.json({ error: "Failed to revoke invitation." }, { status: 500 });
    if (!result?.success) {
      return NextResponse.json({ error: "This invitation is no longer pending or you are not its owner." }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}