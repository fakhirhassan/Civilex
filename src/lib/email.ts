import nodemailer from "nodemailer";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendEmailResult {
  sent: boolean;
  provider: "gmail" | "console";
  error?: string;
}

/**
 * Send an email via Gmail SMTP if GMAIL_USER + GMAIL_APP_PASSWORD are
 * configured; otherwise log to the server console (FYP / development mode).
 *
 * Setup:
 *  1. Enable 2-Step Verification on the Google account.
 *  2. Create an App Password (https://myaccount.google.com/apppasswords).
 *  3. Set GMAIL_USER and GMAIL_APP_PASSWORD (no spaces) in .env.local.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const user = process.env.GMAIL_USER;
  // Strip any spaces in case the user pasted the App Password as Google
  // displays it ("abcd efgh ijkl mnop").
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.GMAIL_FROM_NAME
    ? `${process.env.GMAIL_FROM_NAME} <${user}>`
    : `Civilex Court <${user}>`;

  if (!user || !pass) {
    console.log("=== EMAIL (console fallback — Gmail SMTP not configured) ===");
    console.log(`To: ${input.to}`);
    console.log(`Subject: ${input.subject}`);
    console.log(input.text);
    console.log("=== END EMAIL ===");
    return { sent: false, provider: "console" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { sent: true, provider: "gmail" };
  } catch (err) {
    console.error("Gmail send failed:", err);
    return {
      sent: false,
      provider: "gmail",
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/**
 * Generate a short, human-friendly summon code: 8 chars, uppercase letters
 * + digits, with the visually ambiguous ones (0, O, 1, I, L) removed.
 */
export function generateSummonCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}
