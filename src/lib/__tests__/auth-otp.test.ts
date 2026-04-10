import { vi } from "vitest";
import { db } from "@/lib/db";

// Mock config loader
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    auth: {
      otpLength: 6,
      otpExpiryMinutes: 10,
    },
  })),
}));

// Mock email and WhatsApp transports
vi.mock("@/lib/email/transport", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/whatsapp/client", () => ({
  sendOtpWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

import { generateOtp, createOtpCode, validateOtpCode, sendOtp } from "@/lib/auth/otp";
import { getConfig } from "@/lib/config/loader";
import { sendOtpEmail } from "@/lib/email/transport";
import { sendOtpWhatsApp } from "@/lib/whatsapp/client";

// ---------------------------------------------------------------------------
// generateOtp — pure logic (only depends on config for length)
// ---------------------------------------------------------------------------
describe("generateOtp", () => {
  it("returns a 6-digit string by default", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("respects explicit length parameter", () => {
    const otp = generateOtp(8);
    expect(otp).toMatch(/^\d{8}$/);
  });

  it("returns a 4-digit code when length is 4", () => {
    const otp = generateOtp(4);
    expect(otp).toMatch(/^\d{4}$/);
  });

  it("never starts with leading zeros (min bound ensures this)", () => {
    // The code uses randomInt(min, max) where min = 10^(len-1).
    // For length=6: min=100000, so leading zeros are impossible.
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp(6);
      expect(otp.length).toBe(6);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThan(1000000);
    }
  });

  it("uses config otpLength when no argument provided", () => {
    vi.mocked(getConfig).mockReturnValue({
      auth: { otpLength: 4 },
    } as ReturnType<typeof getConfig>);

    const otp = generateOtp();
    expect(otp).toMatch(/^\d{4}$/);

    // Reset to default
    vi.mocked(getConfig).mockReturnValue({
      auth: { otpLength: 6, otpExpiryMinutes: 10 },
    } as ReturnType<typeof getConfig>);
  });

  it("generates varying codes (not always the same)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateOtp());
    }
    // With 6-digit codes, 20 draws should produce at least 2 distinct values
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// createOtpCode — database interaction (mocked)
// ---------------------------------------------------------------------------
describe("createOtpCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      auth: { otpLength: 6, otpExpiryMinutes: 10 },
    } as ReturnType<typeof getConfig>);
  });

  it("inserts a code into the database and returns it", async () => {
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const code = await createOtpCode("Test@Example.com");

    expect(code).toMatch(/^\d{6}$/);
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com", // normalised to lower case and trimmed
        code: expect.stringMatching(/^\d{6}$/),
        channel: "email",
        expiresAt: expect.any(Date),
      })
    );
  });

  it("normalises email to lowercase and trims whitespace", async () => {
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    await createOtpCode("  User@DOMAIN.com  ");

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@domain.com" })
    );
  });

  it("uses the specified channel", async () => {
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    await createOtpCode("test@example.com", "whatsapp");

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "whatsapp" })
    );
  });

  it("sets expiry based on config otpExpiryMinutes", async () => {
    vi.mocked(getConfig).mockReturnValue({
      auth: { otpLength: 6, otpExpiryMinutes: 15 },
    } as ReturnType<typeof getConfig>);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

    const before = Date.now();
    await createOtpCode("test@example.com");
    const after = Date.now();

    const passedValues = mockValues.mock.calls[0][0];
    const expiresAt = passedValues.expiresAt as Date;
    const expectedMin = before + 15 * 60 * 1000;
    const expectedMax = after + 15 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});

// ---------------------------------------------------------------------------
// validateOtpCode — database interaction (mocked)
// ---------------------------------------------------------------------------
describe("validateOtpCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true and marks code as used when found", async () => {
    const mockWhere = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 42, code: "123456" }]),
    });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const mockUpdateWhere = vi.fn().mockResolvedValue({});
    const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockUpdateSet } as never);

    const result = await validateOtpCode("test@example.com", "123456");

    expect(result).toBe(true);
    expect(db.update).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) })
    );
  });

  it("returns false when no matching code is found", async () => {
    const mockWhere = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    const result = await validateOtpCode("test@example.com", "000000");

    expect(result).toBe(false);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("normalises email before querying", async () => {
    const mockWhere = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

    await validateOtpCode("  User@DOMAIN.COM  ", "123456");

    // We can't easily assert on the drizzle `where` clause content,
    // but we verify the function completes without error and the
    // select chain was called (normalisation happens internally).
    expect(db.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sendOtp — orchestrates createOtpCode + email/whatsapp
// ---------------------------------------------------------------------------
describe("sendOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      auth: { otpLength: 6, otpExpiryMinutes: 10 },
    } as ReturnType<typeof getConfig>);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
  });

  it("sends via email by default", async () => {
    const result = await sendOtp("test@example.com", null);

    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.channels).toEqual(["email"]);
    expect(sendOtpEmail).toHaveBeenCalledWith("test@example.com", result.code);
    expect(sendOtpWhatsApp).not.toHaveBeenCalled();
  });

  it("sends via whatsapp when channel is whatsapp and phone is present", async () => {
    const result = await sendOtp("test@example.com", "+41791234567", "whatsapp");

    expect(result.channels).toEqual(["whatsapp"]);
    expect(sendOtpWhatsApp).toHaveBeenCalledWith("+41791234567", result.code);
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("sends via both channels when channel is 'both'", async () => {
    const result = await sendOtp("test@example.com", "+41791234567", "both");

    expect(result.channels).toEqual(["email", "whatsapp"]);
    expect(sendOtpEmail).toHaveBeenCalled();
    expect(sendOtpWhatsApp).toHaveBeenCalled();
  });

  it("skips whatsapp when channel is 'both' but phone is null", async () => {
    const result = await sendOtp("test@example.com", null, "both");

    expect(result.channels).toEqual(["email"]);
    expect(sendOtpEmail).toHaveBeenCalled();
    expect(sendOtpWhatsApp).not.toHaveBeenCalled();
  });

  it("skips whatsapp when channel is 'whatsapp' but phone is undefined", async () => {
    const result = await sendOtp("test@example.com", undefined, "whatsapp");

    expect(result.channels).toEqual([]);
    expect(sendOtpWhatsApp).not.toHaveBeenCalled();
  });
});
