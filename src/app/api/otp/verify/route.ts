import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

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
    const { signature_id, otp } = body;

    if (!signature_id || !otp) {
      return NextResponse.json(
        { error: "signature_id and otp are required." },
        { status: 400 }
      );
    }

    // Fetch the signature record
    const { data: signature, error: fetchError } = await supabase
      .from("otp_signatures")
      .select("*")
      .eq("id", signature_id)
      .eq("signer_id", user.id)
      .single();

    if (fetchError || !signature) {
      return NextResponse.json(
        { error: "Signature record not found." },
        { status: 404 }
      );
    }

    // Check if already verified
    if (signature.otp_verified) {
      return NextResponse.json(
        { error: "OTP already verified." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(signature.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check max attempts
    if (signature.attempts >= signature.max_attempts) {
      return NextResponse.json(
        { error: "Maximum attempts exceeded. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpHash = hashOtp(otp);
    if (otpHash !== signature.otp_hash) {
      // Increment attempts
      await supabase
        .from("otp_signatures")
        .update({ attempts: signature.attempts + 1 })
        .eq("id", signature_id);

      return NextResponse.json(
        {
          error: `Invalid OTP. ${signature.max_attempts - signature.attempts - 1} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    // OTP is valid - mark as verified
    const now = new Date().toISOString();
    await supabase
      .from("otp_signatures")
      .update({
        otp_verified: true,
        otp_verified_at: now,
        attempts: signature.attempts + 1,
      })
      .eq("id", signature_id);

    // Update the signed entity
    if (signature.entity_type === "document" && signature.document_id) {
      await supabase
        .from("documents")
        .update({
          is_signed: true,
          signed_by: user.id,
          signed_at: now,
        })
        .eq("id", signature.document_id);
    } else if (signature.entity_type === "judgment" && signature.judgment_id) {
      await supabase
        .from("judgment_records")
        .update({
          is_signed: true,
          signed_by: user.id,
          signed_at: now,
        })
        .eq("id", signature.judgment_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
