import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { API_KEY_PREFIX, generateApiKey, hashApiKey } from "@/lib/auth/api-key";

describe("generateApiKey", () => {
  it("produces a prefixed key of the expected length", () => {
    const key = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    // 32 random bytes -> 64 hex chars, plus prefix
    expect(key.length).toBe(API_KEY_PREFIX.length + 64);
  });

  it("produces a different key on each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).not.toBe(b);
  });
});

describe("hashApiKey", () => {
  it("returns the sha256 hex digest of the input", () => {
    const expected = createHash("sha256").update("hello").digest("hex");
    expect(hashApiKey("hello")).toBe(expected);
  });

  it("is deterministic", () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different digests for different keys", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});
