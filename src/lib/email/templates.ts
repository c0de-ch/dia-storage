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
              <div style="text-align: center; padding: 20px 0;">
                <span style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b; background-color: #f4f4f5; padding: 16px 32px; border-radius: 8px; font-family: 'Courier New', monospace;">
                  ${code}
                </span>
              </div>
              ${magicLink ? `
              <div style="text-align: center; padding: 16px 0 0;">
                <a href="${magicLink}" style="display: inline-block; background-color: #18181b; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
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
