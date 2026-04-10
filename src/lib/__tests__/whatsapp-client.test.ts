import { vi } from "vitest";

// Mock config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    whatsapp: {
      enabled: true,
      apiUrl: "https://graph.facebook.com/v21.0",
      phoneNumberId: "123456789",
      accessToken: "test-access-token",
      templateName: "otp_login",
      templateLanguage: "it",
    },
  })),
}));

import { sendOtpWhatsApp, verifyWhatsAppConfig } from "@/lib/whatsapp/client";
import { getConfig } from "@/lib/config/loader";

// ---------------------------------------------------------------------------
// sendOtpWhatsApp
// ---------------------------------------------------------------------------
describe("sendOtpWhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: true,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "123456789",
        accessToken: "test-access-token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);
  });

  it("sends a POST request to the WhatsApp API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messaging_product: "whatsapp",
        contacts: [{ input: "41791234567", wa_id: "41791234567" }],
        messages: [{ id: "wamid.123" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendOtpWhatsApp("+41 79 123 4567", "654321");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456789/messages");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({
      Authorization: "Bearer test-access-token",
      "Content-Type": "application/json",
    });
  });

  it("normalizes phone number by removing spaces, dashes, and leading +", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messaging_product: "whatsapp",
        contacts: [],
        messages: [{ id: "wamid.123" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendOtpWhatsApp("+41 (79) 123-4567", "123456");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toBe("41791234567");
  });

  it("includes the OTP code in the template body and button components", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messaging_product: "whatsapp",
        contacts: [],
        messages: [{ id: "wamid.123" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendOtpWhatsApp("+41791234567", "999888");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.template.name).toBe("otp_login");
    expect(body.template.language.code).toBe("it");
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [{ type: "text", text: "999888" }],
      },
      {
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{ type: "text", text: "999888" }],
      },
    ]);
  });

  it("throws when WhatsApp is disabled in config", async () => {
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: false,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "123456789",
        accessToken: "test-access-token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);

    await expect(sendOtpWhatsApp("+41791234567", "123456")).rejects.toThrow(
      /WhatsApp non è abilitato/
    );
  });

  it("throws when phoneNumberId is missing", async () => {
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: true,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "",
        accessToken: "token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);

    await expect(sendOtpWhatsApp("+41791234567", "123456")).rejects.toThrow(
      /phoneNumberId e accessToken sono obbligatori/
    );
  });

  it("throws when accessToken is missing", async () => {
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: true,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "123",
        accessToken: "",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);

    await expect(sendOtpWhatsApp("+41791234567", "123456")).rejects.toThrow(
      /phoneNumberId e accessToken sono obbligatori/
    );
  });

  it("throws when the API returns a non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error": "Invalid phone"}'),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(sendOtpWhatsApp("+41791234567", "123456")).rejects.toThrow(
      /Errore invio WhatsApp \(400\)/
    );
  });

  it("throws when the API returns no messages", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messaging_product: "whatsapp",
        contacts: [],
        messages: [],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(sendOtpWhatsApp("+41791234567", "123456")).rejects.toThrow(
      /nessun messaggio inviato/
    );
  });
});

// ---------------------------------------------------------------------------
// verifyWhatsAppConfig
// ---------------------------------------------------------------------------
describe("verifyWhatsAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: true,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "123456789",
        accessToken: "test-access-token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);
  });

  it("returns true when API responds OK", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyWhatsAppConfig();

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/123456789",
      {
        headers: {
          Authorization: "Bearer test-access-token",
        },
      }
    );
  });

  it("returns false when API responds with error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyWhatsAppConfig();
    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyWhatsAppConfig();
    expect(result).toBe(false);
  });

  it("returns false when WhatsApp is disabled", async () => {
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: false,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "123",
        accessToken: "token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);

    const result = await verifyWhatsAppConfig();
    expect(result).toBe(false);
  });

  it("returns false when phoneNumberId is missing", async () => {
    vi.mocked(getConfig).mockReturnValue({
      whatsapp: {
        enabled: true,
        apiUrl: "https://graph.facebook.com/v21.0",
        phoneNumberId: "",
        accessToken: "token",
        templateName: "otp_login",
        templateLanguage: "it",
      },
    } as ReturnType<typeof getConfig>);

    const result = await verifyWhatsAppConfig();
    expect(result).toBe(false);
  });
});
