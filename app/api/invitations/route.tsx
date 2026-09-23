import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

export async function POST(request: Request) {
  try {
    const { mapId, email, role = "editor" } = await request.json();

    if (!mapId || !email) {
      return NextResponse.json(
        { error: "Map ID and email are required." },
        { status: 400 }
      );
    }

    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }

    // Get the current authenticated user
    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Cookie updates aren't always available in this context.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    // Privileged client — NEVER expose this key to the browser.
    const admin = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Make sure the current user owns the map.
    const { data: map, error: mapError } = await admin
      .from("research_maps")
      .select("id, user_id, title")
      .eq("id", mapId)
      .maybeSingle();

    if (mapError) {
      console.error(mapError);

      return NextResponse.json(
        { error: "Could not verify the research map." },
        { status: 500 }
      );
    }

    if (!map) {
      return NextResponse.json(
        { error: "Research map not found." },
        { status: 404 }
      );
    }

    if (map.user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the owner can invite collaborators." },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look for an existing account with this email.
    const {
      data: usersData,
      error: usersError,
    } = await admin.auth.admin.listUsers();

    if (usersError) {
      console.error(usersError);

      return NextResponse.json(
        { error: "Could not check the invited user." },
        { status: 500 }
      );
    }

    const existingUser = usersData.users.find(
      (existingUser) =>
        existingUser.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      if (existingUser.id === user.id) {
        return NextResponse.json(
          { error: "You cannot invite yourself." },
          { status: 400 }
        );
      }

      const { error: memberError } = await admin
        .from("research_map_members")
        .upsert(
          {
            map_id: mapId,
            user_id: existingUser.id,
            role,
          },
          {
            onConflict: "map_id,user_id",
          }
        );

      if (memberError) {
        console.error(memberError);

        return NextResponse.json(
          { error: "Could not add collaborator." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Collaborator added successfully.",
      });
    }

    // User doesn't have an account yet.
    // Send them a Supabase invitation email.
    const { error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`,
      });

    if (inviteError) {
      console.error(inviteError);

      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}