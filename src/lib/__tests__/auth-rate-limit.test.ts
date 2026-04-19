import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const insertValues = vi.fn(() => Promise.resolve());
const insert = vi.fn(() => ({ values: insertValues }));

// select(...).from(...).where(...) returns a promise of count rows.
const selectWhere = vi.fn();
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

vi.mock("@/lib/db", () => ({
  db: {
    insert: (table: unknown) => insert(table),
    select: (shape: unknown) => select(shape),
  },
}));

const mockGetConfig = vi.fn();
vi.mock("@/lib/config/loader", () => ({
  getConfig: () => mockGetConfig(),
}));

import {
  recordAuthAttempt,
  checkAuthRateLimit,
  clientIp,
} from "@/lib/auth/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthConfig(overrides?: {
  maxOtpAttempts?: number;
  otpCooldownSeconds?: number;
  otpExpiryMinutes?: number;
}) {
  return {
    auth: {
      maxOtpAttempts: overrides?.maxOtpAttempts ?? 5,
      otpCooldownSeconds: overrides?.otpCooldownSeconds ?? 60,
      otpExpiryMinutes: overrides?.otpExpiryMinutes ?? 10,
    },
  };
}

/**
 * Configure the two sequential select() queries that checkAuthRateLimit("login")
 * issues: first the 1h window count, then the cooldown count.
 */
function mockLoginCounts(opts: { hourly: number; cooldown: number }) {
  selectWhere
    .mockResolvedValueOnce([{ count: opts.hourly }])
    .mockResolvedValueOnce([{ count: opts.cooldown }]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("recordAuthAttempt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalises the identifier to lowercase/trimmed", async () => {
    await recordAuthAttempt("  Kim@Example.COM  ", "login", true, "1.2.3.4");

    expect(insertValues).toHaveBeenCalledWith({
      identifier: "kim@example.com",
      kind: "login",
      success: true,
      ipAddress: "1.2.3.4",
    });
  });

  it("defaults ipAddress to null when omitted", async () => {
    await recordAuthAttempt("user@example.com", "verify", false);

    expect(insertValues).toHaveBeenCalledWith({
      identifier: "user@example.com",
      kind: "verify",
      success: false,
      ipAddress: null,
    });
  });

  it("stores null when ipAddress is explicitly null", async () => {
    await recordAuthAttempt("user@example.com", "login", true, null);

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: null }),
    );
  });
});

describe("checkAuthRateLimit – login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(makeAuthConfig());
  });

  it("allows when neither the hourly cap nor the cooldown has been hit", async () => {
    mockLoginCounts({ hourly: 2, cooldown: 0 });

    const result = await checkAuthRateLimit("user@example.com", "login");

    expect(result).toEqual({ allowed: true });
  });

  it("denies when the hourly attempt cap has been reached", async () => {
    // hourly >= maxOtpAttempts (5) → denied on first check
    selectWhere.mockResolvedValueOnce([{ count: 5 }]);

    const result = await checkAuthRateLimit("user@example.com", "login");

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("denies when an attempt happened within the cooldown window", async () => {
    mockLoginCounts({ hourly: 1, cooldown: 1 });

    const result = await checkAuthRateLimit("user@example.com", "login");

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("treats a missing count row as 0 (allows)", async () => {
    selectWhere.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await checkAuthRateLimit("user@example.com", "login");

    expect(result).toEqual({ allowed: true });
  });

  it("normalises the identifier before querying", async () => {
    mockLoginCounts({ hourly: 0, cooldown: 0 });

    await checkAuthRateLimit("  USER@Example.com  ", "login");

    // Two queries ran
    expect(selectWhere).toHaveBeenCalledTimes(2);
  });
});

describe("checkAuthRateLimit – verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue(makeAuthConfig());
  });

  it("allows when the failed-verify count is below the cap", async () => {
    selectWhere.mockResolvedValueOnce([{ count: 2 }]);

    const result = await checkAuthRateLimit("user@example.com", "verify");

    expect(result).toEqual({ allowed: true });
  });

  it("denies when the failed-verify count reaches the cap", async () => {
    selectWhere.mockResolvedValueOnce([{ count: 5 }]);

    const result = await checkAuthRateLimit("user@example.com", "verify");

    // otpExpiryMinutes * 60 = 10 * 60 = 600
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 600 });
  });

  it("treats a missing count row as 0 on verify", async () => {
    selectWhere.mockResolvedValueOnce([]);

    const result = await checkAuthRateLimit("user@example.com", "verify");

    expect(result).toEqual({ allowed: true });
  });

  it("uses otpExpiryMinutes from the config for the retry hint", async () => {
    mockGetConfig.mockReturnValue(
      makeAuthConfig({ otpExpiryMinutes: 15, maxOtpAttempts: 3 }),
    );
    selectWhere.mockResolvedValueOnce([{ count: 3 }]);

    const result = await checkAuthRateLimit("user@example.com", "verify");

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 900 });
  });
});

describe("clientIp", () => {
  it("prefers the first entry in x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(h)).toBe("1.2.3.4");
  });

  it("trims whitespace around the first forwarded entry", () => {
    const h = new Headers({ "x-forwarded-for": "   9.9.9.9   , 1.1.1.1" });
    expect(clientIp(h)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const h = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(clientIp(h)).toBe("10.0.0.1");
  });

  it("returns null when neither header is present", () => {
    const h = new Headers();
    expect(clientIp(h)).toBeNull();
  });
});
