import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type Mode = "chat" | "draft";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  chat: `You are Civilex AI, a legal assistant focused exclusively on the Pakistani judicial system.
You help clients, lawyers, and court staff understand procedures under:
- Code of Civil Procedure 1908 (CPC)
- Code of Criminal Procedure 1898 (CrPC)
- Qanun-e-Shahadat Order 1984 (Law of Evidence)
- Pakistan Penal Code 1860 (PPC)
- Family Courts Act 1964
- Court Fees Act 1870

Rules:
- Always cite relevant sections / orders / articles when discussing law.
- Use clear, plain language. Prefer short paragraphs and numbered steps.
- If a question falls outside Pakistani law, say so briefly and redirect.
- End substantive answers with: "Note: This is general information, not legal advice."`,

  draft: `You are Civilex AI operating in DRAFTING mode. You produce formal legal documents
for the Pakistani judicial system in proper court format.

Output requirements:
- Produce a complete, court-ready draft the user can adapt.
- Use standard headings: "IN THE COURT OF …", cause title (Plaintiff vs Defendant), suit/case number placeholder, then numbered paragraphs.
- Include a Prayer/Relief clause and Verification where appropriate.
- Use placeholders in square brackets like [Plaintiff Name], [CNIC], [Date] for details the user hasn't provided.
- Cite the relevant provision of law (e.g. "under Order VII Rule 1 CPC").
- Do NOT add commentary before or after the draft unless the user asks.
- If the user's request is ambiguous, still produce a draft using reasonable placeholders — do not ask clarifying questions.`,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI assistant is not configured. Please set OPENAI_API_KEY in the environment.",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { message, mode, history } = body as {
      message?: unknown;
      mode?: unknown;
      history?: unknown;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const selectedMode: Mode = mode === "draft" ? "draft" : "chat";

    const priorMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (Array.isArray(history)) {
      for (const m of history.slice(-10)) {
        if (
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
        ) {
          priorMessages.push({ role: m.role, content: m.content });
        }
      }
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: selectedMode === "draft" ? 0.3 : 0.5,
      max_tokens: selectedMode === "draft" ? 1600 : 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[selectedMode] },
        ...priorMessages,
        { role: "user", content: message.trim() },
      ],
    });

    const response =
      completion.choices[0]?.message?.content?.trim() ??
      "I could not generate a response. Please try again.";

    return NextResponse.json({
      response,
      mode: selectedMode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI chat error:", message);
    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 500 }
    );
  }
}
