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

  // Opt-in escape hatch for dev SMTP servers with self-signed certs.
  // Default: full TLS cert validation.
  const allowInsecure = process.env.DIA_ALLOW_INSECURE_TLS === "true";

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    requireTLS: true,
    ...(config.email.user && config.email.password
      ? {
          auth: {
            user: config.email.user,
            pass: config.email.password,
          },
        }
      : {}),
    tls: {
      rejectUnauthorized: !allowInsecure,
    },
  });

  return transporter;
}

/**
 * Send an OTP email to the given address.
 */
export async function sendOtpEmail(
  email: string,
  code: string,
  origin?: string
): Promise<void> {
  const config = getConfig();
  const transport = getTransport();
  const baseUrl = origin ?? config.app.url;
  const magicLink = `${baseUrl}/api/v1/auth/magic-link?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
  const { subject, html, text } = getOtpEmailTemplate(code, magicLink);

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
