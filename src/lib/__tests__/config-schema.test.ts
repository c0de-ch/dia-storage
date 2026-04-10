import { configSchema } from "@/lib/config/schema";

describe("configSchema", () => {
  describe("defaults", () => {
    it("parses an empty object successfully with all defaults", () => {
      const result = configSchema.parse({});

      expect(result.app.name).toBe("Dia-Storage");
      expect(result.app.port).toBe(3000);
      expect(result.app.timezone).toBe("Europe/Rome");
      expect(result.app.logLevel).toBe("info");

      expect(result.auth.otpLength).toBe(6);
      expect(result.auth.otpExpiryMinutes).toBe(10);
      expect(result.auth.sessionExpiryDays).toBe(30);
      expect(result.auth.defaultChannel).toBe("email");

      expect(result.email.host).toBe("localhost");
      expect(result.email.port).toBe(587);
      expect(result.email.secure).toBe(false);
      expect(result.email.from).toBe("noreply@localhost");

      expect(result.whatsapp.enabled).toBe(false);
      expect(result.whatsapp.templateName).toBe("otp_login");

      expect(result.storage.basePath).toBe("/data");
      expect(result.storage.thumbnailWidth).toBe(400);
      expect(result.storage.thumbnailQuality).toBe(80);
      expect(result.storage.mediumWidth).toBe(1600);
      expect(result.storage.mediumQuality).toBe(85);

      expect(result.database.maxConnections).toBe(10);

      expect(result.backup.enabled).toBe(false);
      expect(result.backup.schedule).toBe("0 2 * * *");
      expect(result.backup.destinations).toEqual([]);
      expect(result.backup.retainDays).toBe(90);
      expect(result.backup.includeDatabase).toBe(true);

      expect(result.remoteHelp.enabled).toBe(false);
      expect(result.remoteHelp.provider).toBe("none");
    });
  });

  describe("partial config", () => {
    it("merges partial config with defaults", () => {
      const result = configSchema.parse({
        app: { name: "My Slides" },
      });

      // Overridden
      expect(result.app.name).toBe("My Slides");
      // Defaults still present
      expect(result.app.port).toBe(3000);
      expect(result.app.timezone).toBe("Europe/Rome");
      // Other sections still fully defaulted
      expect(result.auth.otpLength).toBe(6);
      expect(result.storage.basePath).toBe("/data");
    });

    it("allows setting only a few fields in a section", () => {
      const result = configSchema.parse({
        auth: { otpLength: 8, maxOtpAttempts: 3 },
      });

      expect(result.auth.otpLength).toBe(8);
      expect(result.auth.maxOtpAttempts).toBe(3);
      // Other auth defaults
      expect(result.auth.otpExpiryMinutes).toBe(10);
      expect(result.auth.sessionExpiryDays).toBe(30);
    });
  });

  describe("custom values override defaults", () => {
    it("overrides app settings", () => {
      const result = configSchema.parse({
        app: {
          name: "Archivio Diapositive",
          url: "https://slides.example.com",
          port: 8080,
          timezone: "America/New_York",
          logLevel: "debug",
        },
      });

      expect(result.app.name).toBe("Archivio Diapositive");
      expect(result.app.url).toBe("https://slides.example.com");
      expect(result.app.port).toBe(8080);
      expect(result.app.timezone).toBe("America/New_York");
      expect(result.app.logLevel).toBe("debug");
    });

    it("overrides storage settings", () => {
      const result = configSchema.parse({
        storage: {
          basePath: "/mnt/slides",
          thumbnailWidth: 300,
          thumbnailQuality: 70,
          mediumWidth: 1200,
          mediumQuality: 90,
          maxUploadSizeMb: 200,
        },
      });

      expect(result.storage.basePath).toBe("/mnt/slides");
      expect(result.storage.thumbnailWidth).toBe(300);
      expect(result.storage.thumbnailQuality).toBe(70);
      expect(result.storage.mediumWidth).toBe(1200);
      expect(result.storage.mediumQuality).toBe(90);
      expect(result.storage.maxUploadSizeMb).toBe(200);
    });

    it("overrides backup with destinations", () => {
      const result = configSchema.parse({
        backup: {
          enabled: true,
          schedule: "0 4 * * 0",
          destinations: [
            { type: "s3", bucket: "my-slides", region: "eu-west-1" },
            { type: "local", path: "/mnt/backup" },
          ],
          retainDays: 180,
        },
      });

      expect(result.backup.enabled).toBe(true);
      expect(result.backup.schedule).toBe("0 4 * * 0");
      expect(result.backup.destinations).toHaveLength(2);
      expect(result.backup.destinations[0].type).toBe("s3");
      expect(result.backup.destinations[0].bucket).toBe("my-slides");
      expect(result.backup.destinations[1].type).toBe("local");
      expect(result.backup.destinations[1].path).toBe("/mnt/backup");
      expect(result.backup.retainDays).toBe(180);
    });
  });

  describe("validation rejects invalid values", () => {
    it("rejects an invalid app.url", () => {
      expect(() =>
        configSchema.parse({ app: { url: "not-a-url" } })
      ).toThrow();
    });

    it("rejects an invalid email.from address", () => {
      expect(() =>
        configSchema.parse({ email: { from: "not-an-email" } })
      ).toThrow();
    });

    it("rejects an invalid logLevel", () => {
      expect(() =>
        configSchema.parse({ app: { logLevel: "verbose" } })
      ).toThrow();
    });

    it("rejects otpLength below minimum (4)", () => {
      expect(() =>
        configSchema.parse({ auth: { otpLength: 2 } })
      ).toThrow();
    });

    it("rejects otpLength above maximum (8)", () => {
      expect(() =>
        configSchema.parse({ auth: { otpLength: 12 } })
      ).toThrow();
    });

    it("rejects thumbnailQuality above 100", () => {
      expect(() =>
        configSchema.parse({ storage: { thumbnailQuality: 150 } })
      ).toThrow();
    });

    it("rejects thumbnailQuality below 1", () => {
      expect(() =>
        configSchema.parse({ storage: { thumbnailQuality: 0 } })
      ).toThrow();
    });

    it("rejects an invalid backup destination type", () => {
      expect(() =>
        configSchema.parse({
          backup: { destinations: [{ type: "ftp" }] },
        })
      ).toThrow();
    });

    it("rejects an invalid defaultChannel", () => {
      expect(() =>
        configSchema.parse({ auth: { defaultChannel: "sms" } })
      ).toThrow();
    });
  });

  describe("transform produces all required sections", () => {
    it("produces all 8 sections from an empty input", () => {
      const result = configSchema.parse({});
      const sections = Object.keys(result);

      expect(sections).toContain("app");
      expect(sections).toContain("auth");
      expect(sections).toContain("email");
      expect(sections).toContain("whatsapp");
      expect(sections).toContain("storage");
      expect(sections).toContain("database");
      expect(sections).toContain("backup");
      expect(sections).toContain("remoteHelp");
      expect(sections).toHaveLength(8);
    });

    it("produces all 8 sections when only some are provided", () => {
      const result = configSchema.parse({
        app: { name: "Test" },
        backup: { enabled: true },
      });

      expect(result.app).toBeDefined();
      expect(result.auth).toBeDefined();
      expect(result.email).toBeDefined();
      expect(result.whatsapp).toBeDefined();
      expect(result.storage).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.backup).toBeDefined();
      expect(result.remoteHelp).toBeDefined();
    });
  });
});
