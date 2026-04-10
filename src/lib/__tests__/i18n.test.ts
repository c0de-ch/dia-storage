import { t, getTranslations } from "@/lib/i18n";

describe("i18n", () => {
  describe("t()", () => {
    it("returns correct translation for nav.gallery", () => {
      expect(t("nav.gallery")).toBe("Galleria");
    });

    it("returns correct translation for errors.notFound", () => {
      expect(t("errors.notFound")).toBe("Risorsa non trovata");
    });

    it("returns correct translation for deeply nested keys", () => {
      expect(t("app.name")).toBe("Dia-Storage");
      expect(t("auth.loginTitle")).toBe("Accedi a Dia-Storage");
      expect(t("status.incoming")).toBe("In arrivo");
      expect(t("fileSize.megabytes")).toBe("MB");
    });

    it("returns the key string for unknown keys", () => {
      // Cast to bypass TypeScript strict key checking
      expect(t("nonexistent.key" as never)).toBe("nonexistent.key");
      expect(t("nav.doesNotExist" as never)).toBe("nav.doesNotExist");
      expect(t("a.b.c.d" as never)).toBe("a.b.c.d");
    });

    it("replaces {param} placeholders with provided values", () => {
      expect(t("auth.otpSentTo", { email: "test@example.com" })).toBe(
        "Codice inviato a test@example.com"
      );
      expect(t("auth.resendIn", { seconds: 30 })).toBe("Reinvia tra 30s");
      expect(t("upload.filesSelected", { count: 5 })).toBe(
        "5 file selezionati"
      );
    });

    it("replaces multiple placeholders in the same string", () => {
      expect(t("metadata.widthXHeight", { width: 4000, height: 3000 })).toBe(
        "4000 \u00d7 3000 px"
      );
    });

    it("leaves unreplaced placeholders intact when param is missing", () => {
      // Only provide one of two expected params
      expect(t("metadata.widthXHeight", { width: 4000 })).toBe(
        "4000 \u00d7 {height} px"
      );
    });

    it("returns value without replacement when no params provided", () => {
      // A string with placeholders but no params object
      expect(t("auth.otpSentTo")).toBe("Codice inviato a {email}");
    });

    it("handles top-level section keys by returning the key", () => {
      // "nav" alone is an object, not a string
      expect(t("nav" as never)).toBe("nav");
    });
  });

  describe("getTranslations()", () => {
    it("returns the full dictionary object", () => {
      const dict = getTranslations();
      expect(dict).toBeDefined();
      expect(typeof dict).toBe("object");
    });

    it("contains all top-level sections", () => {
      const dict = getTranslations();
      expect(dict.app).toBeDefined();
      expect(dict.nav).toBeDefined();
      expect(dict.actions).toBeDefined();
      expect(dict.auth).toBeDefined();
      expect(dict.upload).toBeDefined();
      expect(dict.gallery).toBeDefined();
      expect(dict.errors).toBeDefined();
      expect(dict.success).toBeDefined();
      expect(dict.status).toBeDefined();
      expect(dict.search).toBeDefined();
      expect(dict.backup).toBeDefined();
    });

    it("returns typed values that match t() results", () => {
      const dict = getTranslations();
      expect(dict.nav.gallery).toBe(t("nav.gallery"));
      expect(dict.errors.notFound).toBe(t("errors.notFound"));
      expect(dict.app.name).toBe(t("app.name"));
    });
  });
});
