import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getConfig } from "@/lib/config/loader";
import { getOtpEmailTemplate } from "./templates";

let transporter: Transporter | null = null;

/**
 * Get or create the Nodemailer transport singleton.
 */
function getTransport(): Transporter {
  if (transporter) return transporter;

  const config = getConfig();

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    ...(config.email.user && config.email.password
      ? {
          auth: {
            user: config.email.user,
            pass: config.email.password,
          },
        }
      : {}),
  });

  return transporter;
}

/**
 * Send an OTP email to the given address.
 */
export async function sendOtpEmail(
  email: string,
  code: string
): Promise<void> {
  const config = getConfig();
  const transport = getTransport();
  const { subject, html, text } = getOtpEmailTemplate(code);

  await transport.sendMail({
    from: `"${config.email.fromName}" <${config.email.from}>`,
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Verify SMTP connection (useful for health checks).
 */
export async function verifyEmailTransport(): Promise<boolean> {
  try {
    const transport = getTransport();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}
