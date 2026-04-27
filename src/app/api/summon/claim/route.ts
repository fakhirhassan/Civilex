import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Claim is gated by knowing the secret summon code (or case_id + token
    // from the email link). Until the defendant is linked to the case, RLS
    // hides the case from them, which would block the lookup AND the linking
    // update. Use the service role for those operations after we've verified
    // the user's session and role with the user-scoped client.
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { case_id, token, code } = body as {
      case_id?: string;
      token?: string;
      code?: string;
    };

    if (!code && !(case_id && token)) {
      return NextResponse.json(
        { error: "Provide a summon code, or open the link from the summon email." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "client") {
      return NextResponse.json({ error: "Only clients can claim a case" }, { status: 403 });
    }

    // Look up the case by code or by id+token using the service role so RLS
    // doesn't hide a case the defendant has not yet been linked to.
    let caseRow;
    if (code) {
      const normalized = code.trim().toUpperCase();
      const { data, error } = await admin
        .from("cases")
        .select("id, case_number, title, status, defendant_id, defendant_name, defendant_claim_token, defendant_claim_expires_at, summon_code, plaintiff_id")
        .eq("summon_code", normalized)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Invalid summon code" }, { status: 404 });
      }
      caseRow = data;
    } else {
      const { data, error } = await admin
        .from("cases")
        .select("id, case_number, title, status, defendant_id, defendant_name, defendant_claim_token, defendant_claim_expires_at, summon_code, plaintiff_id")
        .eq("id", case_id!)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }
      if (data.defendant_claim_token !== token) {
        return NextResponse.json({ error: "Invalid or expired claim link" }, { status: 403 });
      }
      caseRow = data;
    }

    if (
      caseRow.defendant_claim_expires_at &&
      new Date(caseRow.defendant_claim_expires_at) < new Date()
    ) {
      return NextResponse.json({ error: "This summon has expired" }, { status: 403 });
    }

    if (caseRow.plaintiff_id === user.id) {
      return NextResponse.json(
        { error: "You cannot claim this case as defendant — you are the plaintiff" },
        { status: 403 }
      );
    }

    if (caseRow.defendant_id === user.id) {
      return NextResponse.json({
        success: true,
        already_claimed: true,
        case_id: caseRow.id,
        case_number: caseRow.case_number,
        title: caseRow.title,
      });
    }

    if (caseRow.defendant_id && caseRow.defendant_id !== user.id) {
      return NextResponse.json(
        { error: "This case has already been claimed by another defendant" },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from("cases")
      .update({
        defendant_id: user.id,
        defendant_claim_token: null,
        defendant_claim_expires_at: null,
        summon_code: null,
      })
      .eq("id", caseRow.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark active summon for this case as responded (admin client so we are
    // not blocked by RLS even though the defendant_id update above just
    // unlocked the row for the user-scoped client).
    await admin
      .from("summons")
      .update({ status: "responded", responded_at: new Date().toISOString() })
      .eq("case_id", caseRow.id)
      .eq("status", "active");

    await admin.from("case_activity_log").insert({
      case_id: caseRow.id,
      actor_id: user.id,
      action: "defendant_claimed_case",
      details: { defendant_name: profile.full_name, via: code ? "code" : "link" },
    });

    const { data: adminUsers } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin_court");

    if (adminUsers) {
      for (const a of adminUsers) {
        await admin.from("notifications").insert({
          user_id: a.id,
          title: "Defendant Registered",
          message: `Defendant "${profile.full_name}" has registered and claimed case "${caseRow.title}" (${caseRow.case_number}).`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseRow.id,
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
