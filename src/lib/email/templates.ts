import { getConfig } from "@/lib/config/loader";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate the OTP email template in Italian.
 */
export function getOtpEmailTemplate(code: string, magicLink?: string): EmailTemplate {
  const config = getConfig();
  const appName = config.app.name;
  const expiryMinutes = config.auth.otpExpiryMinutes;

  const subject = `${appName} - Il tuo codice di accesso`;

  // Render each digit in its own square, mirroring the InputOTP layout on /accesso.
  // Tables + inline styles only, for broad email client support.
  const digits = code.split("");
  const slot = (digit: string | undefined) => `
    <td align="center" valign="middle" width="52" height="60" style="
      width: 52px; height: 60px;
      border: 1px solid #e0d4c2;
      border-radius: 8px;
      background-color: #fffdf8;
      font-family: 'Courier New', monospace;
      font-size: 30px;
      font-weight: 700;
      color: #2a1d0e;
      text-align: center;
      vertical-align: middle;
    ">${digit ?? ""}</td>`;
  const spacer = `<td width="8" style="width: 8px;">&nbsp;</td>`;
  const separator = `<td width="16" align="center" style="width: 16px; color: #b8a78c; font-weight: 700;">&ndash;</td>`;
  const codeRow = [
    slot(digits[0]),
    spacer,
    slot(digits[1]),
    spacer,
    slot(digits[2]),
    separator,
    slot(digits[3]),
    spacer,
    slot(digits[4]),
    spacer,
    slot(digits[5]),
  ].join("");

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                ${appName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #3f3f46;">
                Ecco il tuo codice di accesso:
              </p>
              <table role="presentation" align="center" style="margin: 20px auto; border-collapse: separate; border-spacing: 0;">
                <tr>${codeRow}</tr>
              </table>
              ${magicLink ? `
              <div style="text-align: center; padding: 16px 0 0;">
                <a href="${magicLink}" style="display: inline-block; background-color: #c97a3a; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                  Accedi direttamente
                </a>
              </div>
              ` : ''}
              <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.5; color: #71717a;">
                Questo codice scade tra <strong>${expiryMinutes} minuti</strong>.
                Non condividere questo codice con nessuno.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0 0 16px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa; text-align: center;">
                Se non hai richiesto questo codice, puoi ignorare questa email.
                <br>
                &copy; ${new Date().getFullYear()} ${appName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    `${appName} - Codice di accesso`,
    "",
    `Il tuo codice di accesso è: ${code}`,
    "",
    ...(magicLink ? [`Oppure accedi direttamente: ${magicLink}`, ""] : []),
    `Questo codice scade tra ${expiryMinutes} minuti.`,
    "Non condividere questo codice con nessuno.",
    "",
    "Se non hai richiesto questo codice, puoi ignorare questa email.",
  ].join("\n");

  return { subject, html, text };
}
