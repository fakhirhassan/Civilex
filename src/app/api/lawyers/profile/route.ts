import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      bar_license_number,
      specialization,
      experience_years,
      bio,
      hourly_rate,
      is_available,
      location,
    } = body;

    if (!user_id || !bar_license_number) {
      return NextResponse.json(
        { error: "User ID and bar license number are required" },
        { status: 400 }
      );
    }

    // Try to verify auth via session cookie first
    let authenticatedUserId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authenticatedUserId = user?.id ?? null;
    } catch {
      // Cookie may not be set yet right after signup
    }

    const adminClient = createAdminClient();

    // If session cookie isn't set (can happen right after signup),
    // verify the user_id exists as a lawyer in profiles as fallback.
    // The duplicate check below prevents creating extra profiles.
    if (!authenticatedUserId) {
      // Profile may not exist yet if the DB trigger hasn't fired;
      // retry a few times with a short delay
      let profile = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await adminClient
          .from("profiles")
          .select("id, role")
          .eq("id", user_id)
          .eq("role", "lawyer")
          .single();
        profile = data;
        if (profile) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!profile) {
        return NextResponse.json(
          { error: "User not found or not a lawyer" },
          { status: 403 }
        );
      }
    } else if (authenticatedUserId !== user_id) {
      return NextResponse.json(
        { error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Check if lawyer_profiles row already exists
    const { data: existing } = await adminClient
      .from("lawyer_profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    const { error } = await adminClient.from("lawyer_profiles").insert({
      id: user_id,
      bar_license_number,
      specialization: specialization || [],
      experience_years: experience_years || 0,
      bio: bio || null,
      hourly_rate: hourly_rate || null,
      is_available: is_available ?? true,
      location: location || null,
    });

    if (error) {
      console.error("Error creating lawyer profile:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lawyer profile creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
