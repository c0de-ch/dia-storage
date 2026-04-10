import { createHash } from "node:crypto";
import { writeFileSync, unlinkSync, mkdtempSync, readdirSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { computeChecksum, computeChecksumFromBuffer } from "@/lib/images/checksum";

// ---------------------------------------------------------------------------
// computeChecksumFromBuffer — in-memory hash
// ---------------------------------------------------------------------------
describe("computeChecksumFromBuffer", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = computeChecksumFromBuffer(Buffer.from("hello"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the known SHA-256 of 'hello'", () => {
    const expected = createHash("sha256").update("hello").digest("hex");
    const result = computeChecksumFromBuffer(Buffer.from("hello"));
    expect(result).toBe(expected);
  });

  it("returns consistent results for the same input", () => {
    const buf = Buffer.from("consistent data");
    const hash1 = computeChecksumFromBuffer(buf);
    const hash2 = computeChecksumFromBuffer(buf);
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different input", () => {
    const hash1 = computeChecksumFromBuffer(Buffer.from("input A"));
    const hash2 = computeChecksumFromBuffer(Buffer.from("input B"));
    expect(hash1).not.toBe(hash2);
  });

  it("handles an empty buffer", () => {
    const expected = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
    const result = computeChecksumFromBuffer(Buffer.alloc(0));
    expect(result).toBe(expected);
  });

  it("handles binary data correctly", () => {
    const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const expected = createHash("sha256").update(binaryData).digest("hex");
    const result = computeChecksumFromBuffer(binaryData);
    expect(result).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// computeChecksum — streams a file from disk
// ---------------------------------------------------------------------------
describe("computeChecksum", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "dia-checksum-test-"));
  });

  afterAll(() => {
    // Clean up temp files created during tests
    try {
      for (const f of readdirSync(tmpDir)) {
        unlinkSync(join(tmpDir, f));
      }
      rmdirSync(tmpDir);
    } catch {
      // Best effort cleanup
    }
  });

  it("computes the correct SHA-256 for a file on disk", async () => {
    const filePath = join(tmpDir, "test.txt");
    const content = "file content for hashing";
    writeFileSync(filePath, content);

    const expected = createHash("sha256").update(content).digest("hex");
    const result = await computeChecksum(filePath);

    expect(result).toBe(expected);
  });

  it("returns the same hash as computeChecksumFromBuffer for identical content", async () => {
    const filePath = join(tmpDir, "compare.bin");
    const data = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    writeFileSync(filePath, data);

    const fromFile = await computeChecksum(filePath);
    const fromBuffer = computeChecksumFromBuffer(data);

    expect(fromFile).toBe(fromBuffer);
  });

  it("handles an empty file", async () => {
    const filePath = join(tmpDir, "empty.txt");
    writeFileSync(filePath, "");

    const expected = createHash("sha256").update("").digest("hex");
    const result = await computeChecksum(filePath);

    expect(result).toBe(expected);
  });

  it("rejects when file does not exist", async () => {
    await expect(
      computeChecksum(join(tmpDir, "nonexistent.txt"))
    ).rejects.toThrow();
  });
});
