import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { case_id, token } = body;

    if (!case_id || !token) {
      return NextResponse.json({ error: "case_id and token are required" }, { status: 400 });
    }

    // Verify user is a client
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "client") {
      return NextResponse.json({ error: "Only clients can claim a case" }, { status: 403 });
    }

    // Fetch and validate the claim token
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, case_number, title, status, defendant_id, defendant_name, defendant_claim_token, defendant_claim_expires_at, plaintiff_id")
      .eq("id", case_id)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Validate token
    if (caseRow.defendant_claim_token !== token) {
      return NextResponse.json({ error: "Invalid or expired claim link" }, { status: 403 });
    }

    if (caseRow.defendant_claim_expires_at && new Date(caseRow.defendant_claim_expires_at) < new Date()) {
      return NextResponse.json({ error: "This claim link has expired" }, { status: 403 });
    }

    // Prevent plaintiff from claiming as defendant
    if (caseRow.plaintiff_id === user.id) {
      return NextResponse.json({ error: "You cannot claim this case as defendant — you are the plaintiff" }, { status: 403 });
    }

    // If already claimed by this user, return success
    if (caseRow.defendant_id === user.id) {
      return NextResponse.json({
        success: true,
        already_claimed: true,
        case_id: caseRow.id,
        case_number: caseRow.case_number,
        title: caseRow.title,
      });
    }

    // If already claimed by someone else
    if (caseRow.defendant_id && caseRow.defendant_id !== user.id) {
      return NextResponse.json({ error: "This case has already been claimed by another defendant" }, { status: 409 });
    }

    // Link defendant to the case
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        defendant_id: user.id,
        // Invalidate the token after use to prevent reuse
        defendant_claim_token: null,
        defendant_claim_expires_at: null,
      })
      .eq("id", case_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("case_activity_log").insert({
      case_id,
      actor_id: user.id,
      action: "defendant_claimed_case",
      details: { defendant_name: profile.full_name },
    });

    // Notify the admin court / magistrate who issued the summon
    const { data: adminUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin_court");

    if (adminUsers) {
      for (const admin of adminUsers) {
        await supabase.from("notifications").insert({
          user_id: admin.id,
          title: "Defendant Registered",
          message: `Defendant "${profile.full_name}" has registered and claimed case "${caseRow.title}" (${caseRow.case_number}).`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: case_id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      case_id: caseRow.id,
      case_number: caseRow.case_number,
      title: caseRow.title,
    });
  } catch (err) {
    console.error("Claim case error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
