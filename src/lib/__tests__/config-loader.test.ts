import fs from "node:fs";
import { getConfig, clearConfigCache } from "@/lib/config/loader";

// Mock the filesystem
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => ""),
  },
}));

const mockedFs = vi.mocked(fs);

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------
describe("getConfig", () => {
  // Store original env and restore after each test
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearConfigCache();
    vi.clearAllMocks();
    // Reset environment — remove any DIA_ prefixed vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("DIA_") || key === "DATABASE_URL" || key === "CONFIG_PATH") {
        delete process.env[key];
      }
    }
    // Ensure no config file is found by default
    mockedFs.existsSync.mockReturnValue(false);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // -------------------------------------------------------------------------
  // Defaults
  // -------------------------------------------------------------------------
  describe("defaults when no config.yaml exists", () => {
    it("returns a valid config with all default values", () => {
      const config = getConfig();

      expect(config.app.name).toBe("Dia-Storage");
      expect(config.app.port).toBe(3000);
      expect(config.app.timezone).toBe("Europe/Rome");
      expect(config.auth.otpLength).toBe(6);
      expect(config.auth.otpExpiryMinutes).toBe(10);
      expect(config.email.host).toBe("localhost");
      expect(config.email.port).toBe(587);
      expect(config.storage.basePath).toBe("/data");
      expect(config.database.maxConnections).toBe(10);
      expect(config.backup.enabled).toBe(false);
    });

    it("returns all 8 config sections", () => {
      const config = getConfig();
      const sections = Object.keys(config);

      expect(sections).toContain("app");
      expect(sections).toContain("auth");
      expect(sections).toContain("email");
      expect(sections).toContain("whatsapp");
      expect(sections).toContain("storage");
      expect(sections).toContain("database");
      expect(sections).toContain("backup");
      expect(sections).toContain("remoteHelp");
    });
  });

  // -------------------------------------------------------------------------
  // Environment variable overrides
  // -------------------------------------------------------------------------
  describe("environment variable overrides", () => {
    it("overrides app.name via DIA_APP__NAME", () => {
      process.env.DIA_APP__NAME = "My Slides";
      const config = getConfig();
      expect(config.app.name).toBe("My Slides");
    });

    it("overrides email.host via DIA_EMAIL__HOST", () => {
      process.env.DIA_EMAIL__HOST = "smtp.example.com";
      const config = getConfig();
      expect(config.email.host).toBe("smtp.example.com");
    });

    it("overrides email.port via DIA_EMAIL__PORT with numeric parsing", () => {
      process.env.DIA_EMAIL__PORT = "465";
      const config = getConfig();
      expect(config.email.port).toBe(465);
    });

    it("overrides email.secure via DIA_EMAIL__SECURE with boolean parsing", () => {
      process.env.DIA_EMAIL__SECURE = "true";
      const config = getConfig();
      expect(config.email.secure).toBe(true);
    });

    it("overrides auth.otpExpiryMinutes via DIA_AUTH__OTP_EXPIRY_MINUTES", () => {
      process.env.DIA_AUTH__OTP_EXPIRY_MINUTES = "15";
      const config = getConfig();
      expect(config.auth.otpExpiryMinutes).toBe(15);
    });

    it("overrides database.maxConnections via DIA_DATABASE__MAX_CONNECTIONS", () => {
      process.env.DIA_DATABASE__MAX_CONNECTIONS = "20";
      const config = getConfig();
      expect(config.database.maxConnections).toBe(20);
    });

    it("supports DATABASE_URL as a top-level env override", () => {
      process.env.DATABASE_URL = "postgres://user:pass@db:5432/test";
      const config = getConfig();
      expect(config.database.url).toBe("postgres://user:pass@db:5432/test");
    });

    it("ignores env vars that do not match the DIA_ prefix", () => {
      process.env.NOT_DIA_APP__NAME = "Ignored";
      const config = getConfig();
      expect(config.app.name).toBe("Dia-Storage");
    });

    it("ignores env vars with wrong nesting (no double-underscore)", () => {
      process.env.DIA_APPNAME = "Ignored";
      const config = getConfig();
      expect(config.app.name).toBe("Dia-Storage");
    });
  });

  // -------------------------------------------------------------------------
  // CamelCase conversion
  // -------------------------------------------------------------------------
  describe("camelCase conversion", () => {
    it("converts OTP_EXPIRY_MINUTES to otpExpiryMinutes", () => {
      process.env.DIA_AUTH__OTP_EXPIRY_MINUTES = "20";
      const config = getConfig();
      expect(config.auth.otpExpiryMinutes).toBe(20);
    });

    it("converts OTP_LENGTH to otpLength", () => {
      process.env.DIA_AUTH__OTP_LENGTH = "8";
      const config = getConfig();
      expect(config.auth.otpLength).toBe(8);
    });

    it("converts MAX_CONNECTIONS to maxConnections", () => {
      process.env.DIA_DATABASE__MAX_CONNECTIONS = "5";
      const config = getConfig();
      expect(config.database.maxConnections).toBe(5);
    });

    it("converts IDLE_TIMEOUT to idleTimeout", () => {
      process.env.DIA_DATABASE__IDLE_TIMEOUT = "30";
      const config = getConfig();
      expect(config.database.idleTimeout).toBe(30);
    });
  });

  // -------------------------------------------------------------------------
  // Caching / singleton behavior
  // -------------------------------------------------------------------------
  describe("caching", () => {
    it("returns the same object on subsequent calls", () => {
      const first = getConfig();
      const second = getConfig();
      expect(first).toBe(second);
    });

    it("does not re-read the filesystem on the second call", () => {
      getConfig();
      getConfig();
      // existsSync is called for each candidate path on the first call only
      const firstCallCount = mockedFs.existsSync.mock.calls.length;
      getConfig();
      expect(mockedFs.existsSync.mock.calls.length).toBe(firstCallCount);
    });

    it("re-reads config after clearConfigCache()", () => {
      const first = getConfig();
      clearConfigCache();

      // Change an env var before re-loading
      process.env.DIA_APP__NAME = "Reloaded";
      const second = getConfig();

      expect(first).not.toBe(second);
      expect(second.app.name).toBe("Reloaded");
    });
  });

  // -------------------------------------------------------------------------
  // YAML file reading
  // -------------------------------------------------------------------------
  describe("YAML config file", () => {
    it("reads and parses config.yaml when it exists", () => {
      mockedFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("config.yaml") && !String(p).startsWith("/etc")
      );
      mockedFs.readFileSync.mockReturnValue(
        'app:\n  name: "Da File"\n  port: 8080\n'
      );

      const config = getConfig();
      expect(config.app.name).toBe("Da File");
      expect(config.app.port).toBe(8080);
    });

    it("env overrides take precedence over YAML values", () => {
      mockedFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("config.yaml") && !String(p).startsWith("/etc")
      );
      mockedFs.readFileSync.mockReturnValue(
        'app:\n  name: "From YAML"\n'
      );
      process.env.DIA_APP__NAME = "From Env";

      const config = getConfig();
      expect(config.app.name).toBe("From Env");
    });
  });

  // -------------------------------------------------------------------------
  // Boolean and number parsing
  // -------------------------------------------------------------------------
  describe("type coercion for env values", () => {
    it('parses "true" as boolean true', () => {
      process.env.DIA_BACKUP__ENABLED = "true";
      const config = getConfig();
      expect(config.backup.enabled).toBe(true);
    });

    it('parses "false" as boolean false', () => {
      process.env.DIA_EMAIL__SECURE = "false";
      const config = getConfig();
      expect(config.email.secure).toBe(false);
    });

    it("parses integer strings as numbers", () => {
      process.env.DIA_APP__PORT = "9090";
      const config = getConfig();
      expect(config.app.port).toBe(9090);
    });

    it("keeps non-numeric strings as strings", () => {
      process.env.DIA_APP__NAME = "hello123";
      const config = getConfig();
      expect(config.app.name).toBe("hello123");
    });
  });
});
