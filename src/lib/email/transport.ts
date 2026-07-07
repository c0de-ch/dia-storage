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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Notify a user that an album or whole gallery has been shared with them.
 * Best-effort: callers should not fail the share if the email can't be sent.
 */
export async function sendShareNotificationEmail(opts: {
  to: string;
  sharerName: string;
  kind: "album" | "gallery";
  itemName?: string;
}): Promise<void> {
  const config = getConfig();
  const transport = getTransport();
  const url = `${config.app.url}/condivisi`;
  const whatText =
    opts.kind === "album"
      ? `l'album "${opts.itemName ?? ""}"`
      : "la sua galleria di diapositive";
  const subject =
    opts.kind === "album"
      ? `${opts.sharerName} ha condiviso un album con te`
      : `${opts.sharerName} ha condiviso la sua galleria con te`;
  const text = `${opts.sharerName} ha condiviso ${whatText} con te su Dia-Storage.\n\nApri: ${url}`;
  const html =
    `<p>${escapeHtml(opts.sharerName)} ha condiviso ${escapeHtml(whatText)} con te su Dia-Storage.</p>` +
    `<p><a href="${url}">Apri Dia-Storage</a></p>`;

  await transport.sendMail({
    from: `"${config.email.fromName}" <${config.email.from}>`,
    to: opts.to,
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
