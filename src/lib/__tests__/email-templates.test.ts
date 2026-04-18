import { getOtpEmailTemplate } from "@/lib/email/templates";

// Mock the config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    app: { name: "Dia-Storage" },
    auth: { otpExpiryMinutes: 10 },
  })),
}));

import { getConfig } from "@/lib/config/loader";

const mockedGetConfig = vi.mocked(getConfig);

// ---------------------------------------------------------------------------
// getOtpEmailTemplate
// ---------------------------------------------------------------------------
describe("getOtpEmailTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic structure", () => {
    it("returns an object with subject, html, and text", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");
    });

    it("subject includes the app name", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.subject).toBe("Dia-Storage - Il tuo codice di accesso");
    });
  });

  describe("OTP code in output", () => {
    it("includes each digit of the code as its own slot in the HTML body", () => {
      const result = getOtpEmailTemplate("987654");
      // Code is rendered as 6 individual <td> slots (matching InputOTP layout
      // on /accesso). Assert every digit appears inside such a slot.
      for (const digit of "987654") {
        expect(result.html).toMatch(
          new RegExp(`<td[^>]*>\\s*${digit}\\s*</td>`)
        );
      }
    });

    it("renders a separator between the 3rd and 4th digit slots", () => {
      const result = getOtpEmailTemplate("987654");
      expect(result.html).toContain("&ndash;");
    });

    it("includes the code in the text body", () => {
      const result = getOtpEmailTemplate("987654");
      expect(result.text).toContain("987654");
    });

    it("text body contains a clear line with the code", () => {
      const result = getOtpEmailTemplate("555111");
      expect(result.text).toContain(
        "Il tuo codice di accesso è: 555111"
      );
    });
  });

  describe("magic link", () => {
    it("includes the magic link in HTML when provided", () => {
      const link = "https://example.com/accesso?token=abc123";
      const result = getOtpEmailTemplate("123456", link);
      expect(result.html).toContain(link);
      expect(result.html).toContain("Accedi direttamente");
    });

    it("includes the magic link in text when provided", () => {
      const link = "https://example.com/accesso?token=abc123";
      const result = getOtpEmailTemplate("123456", link);
      expect(result.text).toContain(link);
      expect(result.text).toContain("Oppure accedi direttamente");
    });

    it("omits the magic link block from HTML when not provided", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.html).not.toContain("Accedi direttamente");
    });

    it("omits the magic link line from text when not provided", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.text).not.toContain("Oppure accedi direttamente");
    });

    it("omits the magic link when passed undefined", () => {
      const result = getOtpEmailTemplate("123456", undefined);
      expect(result.html).not.toContain("Accedi direttamente");
      expect(result.text).not.toContain("Oppure accedi direttamente");
    });
  });

  describe("app name and expiry from config", () => {
    it("reads app name from config", () => {
      mockedGetConfig.mockReturnValueOnce({
        app: { name: "Archivio Diapositive" },
        auth: { otpExpiryMinutes: 10 },
      } as ReturnType<typeof getConfig>);

      const result = getOtpEmailTemplate("123456");
      expect(result.subject).toBe(
        "Archivio Diapositive - Il tuo codice di accesso"
      );
      expect(result.html).toContain("Archivio Diapositive");
      expect(result.text).toContain("Archivio Diapositive");
    });

    it("reads expiry minutes from config", () => {
      mockedGetConfig.mockReturnValueOnce({
        app: { name: "Dia-Storage" },
        auth: { otpExpiryMinutes: 5 },
      } as ReturnType<typeof getConfig>);

      const result = getOtpEmailTemplate("123456");
      expect(result.html).toContain("5 minuti");
      expect(result.text).toContain("5 minuti");
    });

    it("uses the custom expiry value 15 from config", () => {
      mockedGetConfig.mockReturnValueOnce({
        app: { name: "Dia-Storage" },
        auth: { otpExpiryMinutes: 15 },
      } as ReturnType<typeof getConfig>);

      const result = getOtpEmailTemplate("123456");
      expect(result.html).toContain("15 minuti");
      expect(result.text).toContain("15 minuti");
    });
  });

  describe("HTML structure", () => {
    it("starts with DOCTYPE and html lang=it", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.html).toMatch(/^<!DOCTYPE html>/);
      expect(result.html).toContain('lang="it"');
    });

    it("contains the security notice in Italian", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.html).toContain(
        "Non condividere questo codice con nessuno"
      );
    });

    it("contains the ignore notice in Italian", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.html).toContain(
        "Se non hai richiesto questo codice, puoi ignorare questa email"
      );
    });
  });

  describe("text body structure", () => {
    it("contains the security notice", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.text).toContain(
        "Non condividere questo codice con nessuno."
      );
    });

    it("contains the ignore notice", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.text).toContain(
        "Se non hai richiesto questo codice, puoi ignorare questa email."
      );
    });

    it("starts with the app name header", () => {
      const result = getOtpEmailTemplate("123456");
      expect(result.text.startsWith("Dia-Storage")).toBe(true);
    });
  });
});
