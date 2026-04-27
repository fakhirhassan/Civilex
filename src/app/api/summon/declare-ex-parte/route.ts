import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_SUMMONS_BEFORE_EX_PARTE = 3;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin_court", "magistrate"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { case_id, reason } = body as { case_id?: string; reason?: string };

    if (!case_id) {
      return NextResponse.json({ error: "case_id is required" }, { status: 400 });
    }

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select(
        "id, case_number, title, status, defendant_id, defendant_name, plaintiff_id"
      )
      .eq("id", case_id)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (caseRow.status !== "summon_issued") {
      return NextResponse.json(
        { error: "Case must be in 'summon_issued' status to be declared ex-parte" },
        { status: 400 }
      );
    }

    if (caseRow.defendant_id) {
      return NextResponse.json(
        { error: "Defendant has already responded — ex-parte cannot be declared" },
        { status: 400 }
      );
    }

    const { data: summons } = await supabase
      .from("summons")
      .select("id, summon_number, status")
      .eq("case_id", case_id);

    const total = summons?.length ?? 0;
    if (total < MIN_SUMMONS_BEFORE_EX_PARTE) {
      return NextResponse.json(
        {
          error: `At least ${MIN_SUMMONS_BEFORE_EX_PARTE} summons must be issued before declaring ex-parte. Current: ${total}.`,
        },
        { status: 400 }
      );
    }

    const responded = summons?.some((s) => s.status === "responded");
    if (responded) {
      return NextResponse.json(
        { error: "Defendant responded to a prior summon — ex-parte cannot be declared" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Disposed in defendant's absence (ex parte). The plaintiff's claim
    // proceeds without a defence on record.
    const { data: updated, error: updateError } = await supabase
      .from("cases")
      .update({
        status: "disposed",
        ex_parte_at: now,
        ex_parte_by: user.id,
        ex_parte_reason: reason?.trim() || null,
      })
      .eq("id", case_id)
      .eq("status", "summon_issued")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Case status could not be updated" },
        { status: 409 }
      );
    }

    // Expire any still-active summon
    await supabase
      .from("summons")
      .update({ status: "expired" })
      .eq("case_id", case_id)
      .eq("status", "active");

    await supabase.from("case_activity_log").insert({
      case_id,
      actor_id: user.id,
      action: "ex_parte_declared",
      details: {
        summons_issued: total,
        reason: reason?.trim() || null,
      },
    });

    if (caseRow.plaintiff_id) {
      await supabase.from("notifications").insert({
        user_id: caseRow.plaintiff_id,
        title: "Case Declared Ex-Parte",
        message: `Your case "${caseRow.title}" (${caseRow.case_number}) has been declared ex-parte. The defendant failed to respond to ${total} summons. The matter will proceed in their absence.`,
        type: "case_status_changed",
        reference_type: "case",
        reference_id: case_id,
      });
    }

    const { data: assignments } = await supabase
      .from("case_assignments")
      .select("lawyer_id")
      .eq("case_id", case_id)
      .eq("status", "accepted");

    if (assignments) {
      for (const a of assignments) {
        await supabase.from("notifications").insert({
          user_id: a.lawyer_id,
          title: "Case Declared Ex-Parte",
          message: `The court has declared case "${caseRow.title}" (${caseRow.case_number}) ex-parte after ${total} unanswered summons.`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: case_id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summons_issued: total,
    });
  } catch (err) {
    console.error("Ex-parte declaration error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
