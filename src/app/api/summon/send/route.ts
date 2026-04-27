import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, generateSummonCode } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the user is admin_court or magistrate
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin_court", "magistrate"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { case_id } = body;

    if (!case_id) {
      return NextResponse.json({ error: "case_id is required" }, { status: 400 });
    }

    // Fetch case details
    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, case_number, title, case_type, defendant_name, defendant_email, defendant_phone, defendant_address, defendant_id, status, plaintiff:profiles!plaintiff_id(full_name)")
      .eq("id", case_id)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (!["registered", "summon_issued"].includes(caseRow.status)) {
      return NextResponse.json(
        { error: "Case must be in 'registered' status to issue summon" },
        { status: 400 }
      );
    }

    if (caseRow.defendant_id) {
      return NextResponse.json(
        { error: "Defendant has already responded to summons on this case" },
        { status: 400 }
      );
    }

    // Cap re-issues at 3 attempts (CPC norm before ex-parte)
    const MAX_SUMMONS = 3;
    const { data: priorSummons } = await supabase
      .from("summons")
      .select("id, summon_number, status")
      .eq("case_id", case_id)
      .order("summon_number", { ascending: false });

    const attemptsSoFar = priorSummons?.length ?? 0;
    if (attemptsSoFar >= MAX_SUMMONS) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_SUMMONS} summons already issued. The court may now declare the case ex-parte.`,
        },
        { status: 400 }
      );
    }

    const nextSummonNumber = (priorSummons?.[0]?.summon_number ?? 0) + 1;

    if (!caseRow.defendant_name) {
      return NextResponse.json(
        { error: "No defendant information on this case" },
        { status: 400 }
      );
    }

    if (!caseRow.defendant_email) {
      return NextResponse.json(
        { error: "Defendant email is required to issue summons" },
        { status: 400 }
      );
    }

    // Generate claim token (long URL token) + short summon code
    const claimToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const claimExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Re-roll the code on collision (extremely unlikely, but the column is unique)
    let summonCode = generateSummonCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("summon_code", summonCode)
        .maybeSingle();
      if (!existing) break;
      summonCode = generateSummonCode();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const registerUrl = `${appUrl}/register`;
    const claimByCodeUrl = `${appUrl}/summon/claim`;
    const claimUrl = `${appUrl}/summon/${case_id}?token=${claimToken}`;

    const plaintiff = caseRow.plaintiff as unknown as { full_name: string } | null;

    const summonText = `
COURT SUMMON NOTICE

To: ${caseRow.defendant_name}
${caseRow.defendant_address ? `Address: ${caseRow.defendant_address}` : ""}

Case Number: ${caseRow.case_number}
Case Title: ${caseRow.title}
Case Type: ${caseRow.case_type.charAt(0).toUpperCase() + caseRow.case_type.slice(1)}
Filed By: ${plaintiff?.full_name || "Plaintiff"}

You have been summoned in the above-referenced case. To respond:

  1. Register on the Civilex portal: ${registerUrl}
  2. Log in and visit: ${claimByCodeUrl}
  3. Enter your summon code:    ${summonCode}

(Or click the direct link to claim the case: ${claimUrl})

After claiming, you will be able to:
  - View the plaint and supporting documents filed against you
  - Hire a lawyer through the platform or self-represent
  - Submit your written statement before the first hearing
  - Track all hearings, orders, and proceedings

You must respond within 30 days of receiving this notice. Failure to
respond may result in an ex-parte decision against you.

This is an official court communication from the Civilex Judiciary
Management System.
`.trim();

    const summonHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: auto; color: #1f2937;">
  <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">Court Summon Notice</h2>
  <p><strong>To:</strong> ${escapeHtml(caseRow.defendant_name)}</p>
  ${caseRow.defendant_address ? `<p><strong>Address:</strong> ${escapeHtml(caseRow.defendant_address)}</p>` : ""}

  <table style="width:100%; border-collapse:collapse; margin: 16px 0; font-size: 14px;">
    <tr><td style="padding:6px; background:#f3f4f6;"><strong>Case Number</strong></td><td style="padding:6px;">${escapeHtml(caseRow.case_number)}</td></tr>
    <tr><td style="padding:6px; background:#f3f4f6;"><strong>Case Title</strong></td><td style="padding:6px;">${escapeHtml(caseRow.title)}</td></tr>
    <tr><td style="padding:6px; background:#f3f4f6;"><strong>Case Type</strong></td><td style="padding:6px;">${escapeHtml(caseRow.case_type)}</td></tr>
    <tr><td style="padding:6px; background:#f3f4f6;"><strong>Filed By</strong></td><td style="padding:6px;">${escapeHtml(plaintiff?.full_name || "Plaintiff")}</td></tr>
  </table>

  <p>You have been summoned in the above-referenced case. To respond:</p>
  <ol>
    <li>Register on the Civilex portal: <a href="${registerUrl}">${registerUrl}</a></li>
    <li>Log in and visit: <a href="${claimByCodeUrl}">${claimByCodeUrl}</a></li>
    <li>Enter your summon code below</li>
  </ol>

  <div style="background:#1e3a8a; color:#fff; padding:16px; border-radius:8px; text-align:center; margin: 16px 0;">
    <div style="font-size:12px; opacity:0.85; margin-bottom:6px;">YOUR SUMMON CODE</div>
    <div style="font-size:28px; font-weight:bold; letter-spacing:6px; font-family: monospace;">${summonCode}</div>
  </div>

  <p style="font-size:13px; color:#6b7280;">Or click here to go directly to the case:
    <a href="${claimUrl}">${claimUrl}</a>
  </p>

  <p>After claiming you can view the plaint, hire a lawyer or self-represent,
  and submit your written statement.</p>

  <p style="background:#fee2e2; border:1px solid #fca5a5; padding:10px; border-radius:6px; color:#991b1b;">
    You must respond within <strong>30 days</strong> of receiving this notice.
    Failure to respond may result in an ex-parte decision against you.
  </p>

  <hr style="margin-top:24px; border:none; border-top:1px solid #e5e7eb;" />
  <p style="font-size:12px; color:#9ca3af;">This is an official court communication from the Civilex Judiciary Management System.</p>
</div>
`.trim();

    // Persist summon state
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        status: "summon_issued",
        summon_sent_at: new Date().toISOString(),
        summon_sent_by: user.id,
        defendant_claim_token: claimToken,
        defendant_claim_expires_at: claimExpires,
        summon_code: summonCode,
      })
      .eq("id", case_id)
      .in("status", ["registered", "summon_issued"]);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Supersede any prior active summon
    if (priorSummons && priorSummons.length > 0) {
      const activeIds = priorSummons
        .filter((s) => s.status === "active")
        .map((s) => s.id);
      if (activeIds.length > 0) {
        await supabase
          .from("summons")
          .update({ status: "superseded", superseded_at: new Date().toISOString() })
          .in("id", activeIds);
      }
    }

    // Activity log
    await supabase.from("case_activity_log").insert({
      case_id,
      actor_id: user.id,
      action: "summon_issued",
      details: {
        defendant: caseRow.defendant_name,
        defendant_email: caseRow.defendant_email,
        summon_code: summonCode,
        summon_number: nextSummonNumber,
      },
    });

    // In-app notification if defendant already has an account
    if (caseRow.defendant_id) {
      await supabase.from("notifications").insert({
        user_id: caseRow.defendant_id,
        title: "Court Summon Issued",
        message: `You have been summoned in case "${caseRow.title}" (${caseRow.case_number}). Summon code: ${summonCode}. Please respond within 30 days.`,
        type: "summon_issued",
        reference_type: "case",
        reference_id: case_id,
      });
    }

    // Notify plaintiff
    const { data: plaintiffCase } = await supabase
      .from("cases")
      .select("plaintiff_id")
      .eq("id", case_id)
      .single();

    if (plaintiffCase?.plaintiff_id) {
      await supabase.from("notifications").insert({
        user_id: plaintiffCase.plaintiff_id,
        title: "Summon Issued to Defendant",
        message: `A court summon has been issued to the defendant in your case "${caseRow.title}" (${caseRow.case_number}).`,
        type: "case_status_changed",
        reference_type: "case",
        reference_id: case_id,
      });
    }

    // Notify assigned lawyers
    const { data: assignments } = await supabase
      .from("case_assignments")
      .select("lawyer_id")
      .eq("case_id", case_id)
      .eq("status", "accepted");

    if (assignments) {
      for (const a of assignments) {
        await supabase.from("notifications").insert({
          user_id: a.lawyer_id,
          title: "Summon Issued",
          message: `Court summon issued to defendant in case "${caseRow.title}" (${caseRow.case_number}).`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: case_id,
        });
      }
    }

    // Send the email
    const subjectPrefix =
      nextSummonNumber > 1 ? `Court Summon (Attempt ${nextSummonNumber})` : "Court Summon";
    const emailResult = await sendEmail({
      to: caseRow.defendant_email,
      subject: `${subjectPrefix} — Case ${caseRow.case_number}`,
      text: summonText,
      html: summonHtml,
    });

    // Persist the summon history row
    await supabase.from("summons").insert({
      case_id,
      summon_number: nextSummonNumber,
      code: summonCode,
      token: claimToken,
      expires_at: claimExpires,
      status: "active",
      sent_to_email: caseRow.defendant_email,
      email_delivered: emailResult.sent,
      email_provider: emailResult.provider,
      email_error: emailResult.error ?? null,
      sent_by: user.id,
    });

    return NextResponse.json({
      success: true,
      summon: {
        defendant_name: caseRow.defendant_name,
        defendant_email: caseRow.defendant_email,
        email_sent: emailResult.sent,
        email_provider: emailResult.provider,
        email_error: emailResult.error,
        notification_sent: !!caseRow.defendant_id,
        register_url: registerUrl,
        claim_url: claimUrl,
        summon_code: summonCode,
        summon_number: nextSummonNumber,
        attempts_remaining: MAX_SUMMONS - nextSummonNumber,
      },
      ...(process.env.NODE_ENV !== "production" ? { summon_text: summonText } : {}),
    });
  } catch (err) {
    console.error("Summon send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
