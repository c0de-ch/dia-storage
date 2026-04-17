import crypto from "node:crypto";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { getConfig } from "@/lib/config/loader";
import { sendOtpEmail } from "@/lib/email/transport";
import { sendOtpWhatsApp } from "@/lib/whatsapp/client";

/**
 * Generate a random numeric OTP code.
 */
export function generateOtp(length?: number): string {
  const config = getConfig();
  const len = length ?? config.auth.otpLength;
  // Generate cryptographically secure random digits
  const max = Math.pow(10, len);
  const min = Math.pow(10, len - 1);
  const num = crypto.randomInt(min, max);
  return num.toString();
}

/**
 * Create an OTP code in the database and return it.
 */
export async function createOtpCode(
  email: string,
  channel: string = "email"
): Promise<string> {
  const config = getConfig();
  const code = generateOtp();
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.auth.otpExpiryMinutes * 60 * 1000
  );

  await db.transaction(async (tx) => {
    // Invalidate any prior unused, unexpired codes for this email so only the
    // latest code can authenticate — prevents stacking and shrinks guess surface.
    await tx
      .update(otpCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(otpCodes.email, normalizedEmail),
          isNull(otpCodes.usedAt),
          gt(otpCodes.expiresAt, now)
        )
      );

    await tx.insert(otpCodes).values({
      email: normalizedEmail,
      code,
      channel,
      expiresAt,
    });
  });

  return code;
}

/**
 * Validate an OTP code. If valid, marks it as used and returns true.
 */
export async function validateOtpCode(
  email: string,
  code: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, normalizedEmail),
        eq(otpCodes.code, code),
        isNull(otpCodes.usedAt),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return false;
  }

  const otpRecord = rows[0];

  // Mark as used
  await db
    .update(otpCodes)
    .set({ usedAt: new Date() })
    .where(eq(otpCodes.id, otpRecord.id));

  return true;
}

/**
 * Send an OTP code via the specified channel(s).
 */
export async function sendOtp(
  email: string,
  phone: string | null | undefined,
  channel: string = "email"
): Promise<{ code: string; channels: string[] }> {
  const code = await createOtpCode(email, channel);
  const sentChannels: string[] = [];

  if (channel === "email" || channel === "both") {
    await sendOtpEmail(email, code);
    sentChannels.push("email");
  }

  if ((channel === "whatsapp" || channel === "both") && phone) {
    await sendOtpWhatsApp(phone, code);
    sentChannels.push("whatsapp");
  }

  return { code, channels: sentChannels };
}
