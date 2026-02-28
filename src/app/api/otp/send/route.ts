import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
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
    const { entity_type, document_id, judgment_id } = body;

    if (!entity_type || !["document", "judgment"].includes(entity_type)) {
      return NextResponse.json(
        { error: "Invalid entity_type. Must be 'document' or 'judgment'." },
        { status: 400 }
      );
    }

    if (entity_type === "document" && !document_id) {
      return NextResponse.json(
        { error: "document_id is required for document signing." },
        { status: 400 }
      );
    }

    if (entity_type === "judgment" && !judgment_id) {
      return NextResponse.json(
        { error: "judgment_id is required for judgment signing." },
        { status: 400 }
      );
    }

    // Get user profile for role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create signature record
    const { data: signature, error: sigError } = await supabase
      .from("otp_signatures")
      .insert({
        entity_type,
        document_id: entity_type === "document" ? document_id : null,
        judgment_id: entity_type === "judgment" ? judgment_id : null,
        signer_id: user.id,
        signer_role: profile.role,
        otp_hash: otpHash,
        otp_expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        user_agent: request.headers.get("user-agent") || null,
      })
      .select("id, otp_expires_at")
      .single();

    if (sigError) {
      console.error("Error creating signature record:", sigError);
      return NextResponse.json({ error: sigError.message }, { status: 500 });
    }

    // In production, send OTP via SMS/email. For this FYP, we simulate
    // by returning the OTP in the response for demo purposes.

    return NextResponse.json({
      success: true,
      signature_id: signature.id,
      expires_at: signature.otp_expires_at,
      // For demo/FYP: include OTP in response so the user can enter it
      demo_otp: otp,
    });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
