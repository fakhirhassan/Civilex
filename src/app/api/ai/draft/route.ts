import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { DRAFT_SECTION_LABELS, type DraftSectionKey } from "@/types/draft";

const SECTION_GUIDANCE: Record<DraftSectionKey, string> = {
  cause_title:
    "The cause title is the heading that names the court and venue. Format example: 'IN THE COURT OF LEARNED CIVIL JUDGE / FAMILY JUDGE [DISTRICT]'. Centered, all caps. Do not invent a court name — if the court is not provided in context, output a placeholder like 'IN THE COURT OF [SPECIFY COURT], [DISTRICT]' for the lawyer to fill.",
  parties_block:
    "List the plaintiff(s) on the left with full name, parentage (S/O, D/O, W/O), and address, ending with '...Plaintiff'. Then a centered 'Versus'. Then defendant(s) similarly ending '...Defendant'. Use only the parties given in context.",
  suit_subject:
    "A single line, all caps, underlined heading describing the suit. Example: 'SUIT FOR RECOVERY OF MAINTENANCE, DOWER AND DOWRY ARTICLES'. Keep concise.",
  jurisdiction_clause:
    "One sentence stating why this court has jurisdiction (territorial / pecuniary / subject-matter). Example: 'That the plaintiff is residing within the territorial limits of this Honourable Court, therefore this Honourable Court has jurisdiction to try and entertain this suit.'",
  facts:
    "Numbered factual paragraphs telling the story chronologically. Each starts with 'That ...'. Refer only to facts given in context. Use formal Pakistani court English. If a fact is missing, mark it '[MISSING: <what is needed>]' for the lawyer to fill.",
  cause_of_action:
    "One short paragraph stating when and how the cause of action accrued and that it is continuing. Example: 'That the cause of action accrued against the defendant on [DATE] when [EVENT], and is still continuing, hence this suit.'",
  limitation_clause:
    "One sentence stating the suit is filed within the limitation period prescribed by the Limitation Act 1908.",
  court_fees_paid:
    "One sentence: 'That the prescribed court fee has been affixed on the plaint.'",
  reliefs_sought:
    "The prayer clause. List the specific reliefs sought (decree for X amount, possession of Y, injunction restraining Z, etc.). End with 'Any other relief which this Hon'ble Court deems fit and proper may also be granted to the plaintiff.'",
  verification_clause:
    "Standard verification: 'Verified on oath at [PLACE] on [DATE] that the contents of the plaint are true and correct to the best of my knowledge and belief.' followed by 'Plaintiff' on the next line.",
};

const SYSTEM_PROMPT = `You are a legal drafting assistant for civil court plaints in Pakistan, working under the Code of Civil Procedure 1908 and Pakistani family / civil law conventions.

Rules:
- Use formal Pakistani court English. Write in the present-day plaint style: clear paragraphs, "That ..." for facts, "Hon'ble Court", etc.
- DO NOT invent facts, parties, dates, amounts, or addresses. Use ONLY what is supplied in the context. If a required detail is missing, write a clear placeholder in square brackets like [MISSING: defendant's address] for the human lawyer to fill in.
- DO NOT add legal advice or commentary outside the draft text — return only the section content the user asked for.
- Keep the output ready to drop straight into the plaint section.`;

interface RequestBody {
  caseId: string;
  section: DraftSectionKey;
  instruction?: string;     // optional freeform guidance from lawyer
  currentText?: string;     // optional existing text to refine
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const { caseId, section, instruction, currentText } = body;

    if (!caseId || !section) {
      return NextResponse.json(
        { error: "caseId and section are required" },
        { status: 400 }
      );
    }
    if (!(section in DRAFT_SECTION_LABELS)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI assistant is not configured. Please set OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    // Pull case context (title, type, description, parties)
    const { data: caseRow, error: caseErr } = await supabase
      .from("cases")
      .select(`
        case_number, title, case_type, case_category, description,
        plaintiff_name, plaintiff_phone, plaintiff_cnic, plaintiff_address,
        defendant_name, defendant_phone, defendant_cnic, defendant_address,
        plaintiff:profiles!plaintiff_id(full_name, city)
      `)
      .eq("id", caseId)
      .single();

    if (caseErr || !caseRow) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const plaintiffProfile = caseRow.plaintiff as unknown as {
      full_name?: string;
      city?: string;
    } | null;

    const contextLines = [
      `Case number: ${caseRow.case_number}`,
      `Case title: ${caseRow.title}`,
      `Case type: ${caseRow.case_type} (${caseRow.case_category})`,
      `Brief description: ${caseRow.description ?? "—"}`,
      "",
      "Plaintiff:",
      `  Name: ${caseRow.plaintiff_name ?? plaintiffProfile?.full_name ?? "—"}`,
      `  CNIC: ${caseRow.plaintiff_cnic ?? "—"}`,
      `  Phone: ${caseRow.plaintiff_phone ?? "—"}`,
      `  Address: ${caseRow.plaintiff_address ?? "—"}`,
      `  City (from profile): ${plaintiffProfile?.city ?? "—"}`,
      "",
      "Defendant:",
      `  Name: ${caseRow.defendant_name ?? "—"}`,
      `  CNIC: ${caseRow.defendant_cnic ?? "—"}`,
      `  Phone: ${caseRow.defendant_phone ?? "—"}`,
      `  Address: ${caseRow.defendant_address ?? "—"}`,
    ].join("\n");

    const sectionLabel = DRAFT_SECTION_LABELS[section];
    const sectionGuidance = SECTION_GUIDANCE[section];

    const userPrompt = [
      `## Case context`,
      contextLines,
      ``,
      `## Section to draft`,
      `Section: ${sectionLabel}`,
      `Guidance: ${sectionGuidance}`,
      ``,
      currentText
        ? `## Current text (to refine)\n${currentText}\n`
        : `## (No existing text — generate from scratch.)`,
      ``,
      instruction
        ? `## Lawyer's specific instruction\n${instruction}`
        : `## (No specific instruction — produce a default version of this section.)`,
      ``,
      `Output ONLY the draft text for this section. No headers, no commentary.`,
    ].join("\n");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const text =
      completion.choices[0]?.message?.content?.trim() ??
      "(no output)";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("AI draft error:", err);
    return NextResponse.json(
      { error: "AI draft request failed. Please try again." },
      { status: 500 }
    );
  }
}
