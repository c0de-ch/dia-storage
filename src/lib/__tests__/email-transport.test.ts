import { vi } from "vitest";

// Mock config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    app: { name: "Dia-Storage", url: "https://dia.example.com" },
    auth: { otpExpiryMinutes: 10 },
    email: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "user@example.com",
      password: "secret",
      from: "noreply@example.com",
      fromName: "Dia-Storage",
    },
  })),
}));

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "abc123" });
const mockVerify = vi.fn().mockResolvedValue(true);
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (...args: unknown[]) => mockCreateTransport(...args),
  },
}));

// Mock email templates
vi.mock("@/lib/email/templates", () => ({
  getOtpEmailTemplate: vi.fn((_code: string, _magicLink?: string) => ({
    subject: "Dia-Storage - Il tuo codice di accesso",
    html: "<html>OTP: 123456</html>",
    text: "OTP: 123456",
  })),
}));

// Import after mocks are set up
import { sendOtpEmail, verifyEmailTransport } from "@/lib/email/transport";
import { getOtpEmailTemplate } from "@/lib/email/templates";

// ---------------------------------------------------------------------------
// sendOtpEmail
// ---------------------------------------------------------------------------
describe("sendOtpEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the transporter singleton by re-requiring
    // (the module caches the transporter, but clearAllMocks resets the mock fns)
  });

  it("calls sendMail with correct from, to, subject, html, and text", async () => {
    await sendOtpEmail("user@test.com", "654321");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Dia-Storage" <noreply@example.com>',
      to: "user@test.com",
      subject: "Dia-Storage - Il tuo codice di accesso",
      html: "<html>OTP: 123456</html>",
      text: "OTP: 123456",
    });
  });

  it("calls getOtpEmailTemplate with the code and magic link", async () => {
    await sendOtpEmail("user@test.com", "654321");

    expect(getOtpEmailTemplate).toHaveBeenCalledWith(
      "654321",
      expect.stringContaining("user%40test.com")
    );
  });

  it("builds the magic link with the origin when provided", async () => {
    await sendOtpEmail("user@test.com", "654321", "https://custom.example.com");

    expect(getOtpEmailTemplate).toHaveBeenCalledWith(
      "654321",
      expect.stringContaining("https://custom.example.com/api/v1/auth/magic-link")
    );
  });

  it("uses the app URL from config when no origin is provided", async () => {
    await sendOtpEmail("user@test.com", "654321");

    expect(getOtpEmailTemplate).toHaveBeenCalledWith(
      "654321",
      expect.stringContaining("https://dia.example.com/api/v1/auth/magic-link")
    );
  });

  it("encodes the email and code in the magic link", async () => {
    await sendOtpEmail("user@test.com", "654321");

    const callArgs = vi.mocked(getOtpEmailTemplate).mock.calls[0];
    const magicLink = callArgs[1] as string;
    expect(magicLink).toContain("email=user%40test.com");
    expect(magicLink).toContain("code=654321");
  });
});

// ---------------------------------------------------------------------------
// verifyEmailTransport
// ---------------------------------------------------------------------------
describe("verifyEmailTransport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when transport.verify() succeeds", async () => {
    mockVerify.mockResolvedValue(true);

    const result = await verifyEmailTransport();
    expect(result).toBe(true);
  });

  it("returns false when transport.verify() throws", async () => {
    mockVerify.mockRejectedValue(new Error("Connection refused"));

    const result = await verifyEmailTransport();
    expect(result).toBe(false);
  });
});
