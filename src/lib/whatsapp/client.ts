import { getConfig } from "@/lib/config/loader";

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Send an OTP code via WhatsApp Business Cloud API.
 *
 * Uses template messages for OTP delivery.
 * The template must be pre-approved in Meta Business Manager.
 */
export async function sendOtpWhatsApp(
  phone: string,
  code: string
): Promise<void> {
  const config = getConfig();

  if (!config.whatsapp.enabled) {
    throw new Error("WhatsApp non è abilitato nella configurazione");
  }

  if (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken) {
    throw new Error(
      "WhatsApp: phoneNumberId e accessToken sono obbligatori"
    );
  }

  // Normalize phone number: ensure it starts with country code, no spaces/dashes
  const normalizedPhone = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");

  const url = `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: config.whatsapp.templateName,
      language: {
        code: config.whatsapp.templateLanguage,
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
        // OTP button component (auto-fill)
        {
          type: "button",
          sub_type: "url",
          index: 0,
          parameters: [
            {
              type: "text",
              text: code,
            },
          ],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Errore invio WhatsApp (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as WhatsAppMessageResponse;

  if (!data.messages || data.messages.length === 0) {
    throw new Error("WhatsApp: nessun messaggio inviato");
  }
}

/**
 * Verify WhatsApp API credentials (health check).
 */
export async function verifyWhatsAppConfig(): Promise<boolean> {
  const config = getConfig();

  if (!config.whatsapp.enabled) return false;
  if (!config.whatsapp.phoneNumberId || !config.whatsapp.accessToken) {
    return false;
  }

  try {
    const url = `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
