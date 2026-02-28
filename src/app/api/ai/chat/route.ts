import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Placeholder responses for the AI assistant
const PLACEHOLDER_RESPONSES: Record<string, string> = {
  case: "Based on the Pakistan Civil Procedure Code (CPC), I can help you understand case filing requirements. A civil suit must include a properly drafted plaint (Order VII), relevant documents, and court fees. Would you like me to explain any specific aspect?",
  hearing: "Court hearings in Pakistan follow a structured process. The judge calls the case, both sides present arguments, and the court records proceedings. Key hearing types include preliminary hearings, evidence recording, and final arguments. What specific hearing information do you need?",
  evidence: "Under the Qanun-e-Shahadat Order 1984 (Pakistan's evidence law), evidence must be relevant, admissible, and properly documented. Documentary evidence should be original or certified copies. Would you like guidance on a specific type of evidence?",
  bail: "Bail in Pakistan is governed by Sections 496-502 of the CrPC. Pre-arrest bail (anticipatory bail) and post-arrest bail have different requirements. The court considers the nature of the offense, likelihood of absconding, and past criminal record. What specific bail information do you need?",
  payment: "Court fees in Pakistan are governed by the Court Fees Act 1870. Fees vary by court, case type, and relief sought. Lawyer fees are typically agreed upon between the client and lawyer. Can I help you understand a specific payment aspect?",
  judgment: "A judgment in Pakistan must contain a concise statement of facts, points for determination, the decision on each point with reasons, and the final order. Appeals can be filed within 30 days of judgment in most cases. What would you like to know more about?",
  default: "I'm Civilex AI, your legal assistant for Pakistani judiciary matters. I can help with questions about case filing, court procedures, evidence requirements, bail provisions, payment guidance, and general legal information. Please note that my responses are for informational purposes only and do not constitute legal advice. How can I assist you today?",
};

function getPlaceholderResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("case") || lower.includes("file") || lower.includes("plaint") || lower.includes("suit")) {
    return PLACEHOLDER_RESPONSES.case;
  }
  if (lower.includes("hearing") || lower.includes("court date") || lower.includes("proceedings")) {
    return PLACEHOLDER_RESPONSES.hearing;
  }
  if (lower.includes("evidence") || lower.includes("exhibit") || lower.includes("proof") || lower.includes("document")) {
    return PLACEHOLDER_RESPONSES.evidence;
  }
  if (lower.includes("bail") || lower.includes("arrest") || lower.includes("criminal")) {
    return PLACEHOLDER_RESPONSES.bail;
  }
  if (lower.includes("payment") || lower.includes("fee") || lower.includes("cost") || lower.includes("money")) {
    return PLACEHOLDER_RESPONSES.payment;
  }
  if (lower.includes("judgment") || lower.includes("verdict") || lower.includes("order") || lower.includes("appeal")) {
    return PLACEHOLDER_RESPONSES.judgment;
  }

  return PLACEHOLDER_RESPONSES.default;
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

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Simulate a small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 800));

    const response = getPlaceholderResponse(message);

    return NextResponse.json({
      response,
      disclaimer: "This is a placeholder AI response for demonstration purposes. In production, this would be powered by a real AI model.",
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
