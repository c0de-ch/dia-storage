import { findBestMatch } from "@/lib/help-bot/matcher";

describe("help-bot matcher", () => {
  describe("known queries", () => {
    it("matches 'come caricare' to the upload entry", () => {
      const result = findBestMatch("come caricare");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("upload");
    });

    it("matches 'backup' to the backup entry", () => {
      const result = findBestMatch("backup");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("backup");
    });

    it("matches 'galleria' to the gallery entry", () => {
      const result = findBestMatch("galleria");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("galleria");
    });

    it("matches 'come accedere' to the login entry", () => {
      const result = findBestMatch("come accedere");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("how-login");
    });

    it("matches 'ricerca' to the search entry", () => {
      const result = findBestMatch("ricerca");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("ricerca");
    });

    it("matches 'collezioni' to the collections entry", () => {
      const result = findBestMatch("collezioni");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("collezioni");
    });

    it("matches 'caricatore' to the magazines entry", () => {
      const result = findBestMatch("caricatore slot");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("caricatori");
    });

    it("matches 'utenti gestire' to the users entry", () => {
      const result = findBestMatch("utenti gestire");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("utenti");
    });

    it("matches 'dati exif' to the exif entry", () => {
      const result = findBestMatch("dati exif");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("exif");
    });

    it("matches 'scheda sd' to the sd upload entry", () => {
      const result = findBestMatch("scheda sd scanner");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("upload-sd");
    });
  });

  describe("no match", () => {
    it("returns null for random nonsense", () => {
      expect(findBestMatch("xyzzy frobnicator blarg")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(findBestMatch("")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(findBestMatch("   ")).toBeNull();
    });

    it("returns null for single character tokens (filtered out)", () => {
      expect(findBestMatch("a b c")).toBeNull();
    });
  });

  describe("partial/fuzzy matching", () => {
    it("matches prefix 'carica' to upload-related entry", () => {
      const result = findBestMatch("carica immagini");
      expect(result).not.toBeNull();
      expect(result!.category).toBe("caricamento");
    });

    it("matches 'duplicato' via prefix to duplicates entry", () => {
      const result = findBestMatch("duplicato doppio");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("duplicates");
    });

    it("matches 'formato immagine' to the formats entry", () => {
      const result = findBestMatch("formato immagine");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("formats");
    });

    it("matches 'registro attivita' to the audit log entry", () => {
      const result = findBestMatch("registro attivita");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("registro");
    });

    it("matches 'chiave api' to the API keys entry", () => {
      const result = findBestMatch("chiave api");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("api-keys");
    });
  });

  describe("result structure", () => {
    it("returns a well-formed HelpEntry with all fields", () => {
      const result = findBestMatch("backup");
      expect(result).not.toBeNull();
      expect(result!.id).toEqual(expect.any(String));
      expect(result!.question).toEqual(expect.any(String));
      expect(result!.answer).toEqual(expect.any(String));
      expect(result!.voiceAnswer).toEqual(expect.any(String));
      expect(result!.keywords).toEqual(expect.any(Array));
      expect(result!.category).toEqual(expect.any(String));
    });
  });
});
