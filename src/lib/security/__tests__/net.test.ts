import { describe, it, expect } from "vitest";
import {
  isSafeOutboundUrl,
  assertSafeOutboundUrl,
  isAllowedServiceUrl,
} from "@/lib/security/net";

describe("isSafeOutboundUrl (strict, public-only)", () => {
  it("allows public http/https hosts", () => {
    for (const u of [
      "http://example.com",
      "https://api.openai.com/v1",
      "http://8.8.8.8",
      "http://[2606:4700:4700::1111]",
      "https://sub.domain.example.org:8443/path",
    ]) {
      expect(isSafeOutboundUrl(u), u).toBe(true);
    }
  });

  it("blocks loopback, private, link-local and metadata addresses", () => {
    for (const u of [
      "http://localhost",
      "http://localhost.", // trailing-dot FQDN
      "http://127.0.0.1",
      "http://10.1.2.3",
      "http://192.168.0.5",
      "http://172.16.0.1",
      "http://169.254.169.254", // cloud metadata
      "http://100.64.0.1", // CGNAT
      "http://0.0.0.0",
      "http://[::1]",
      "http://api.local",
    ]) {
      expect(isSafeOutboundUrl(u), u).toBe(false);
    }
  });

  it("blocks IPv4-mapped IPv6 in Node's hex-normalized form", () => {
    for (const u of [
      "http://[::ffff:127.0.0.1]",
      "http://[::ffff:169.254.169.254]",
      "http://[::ffff:192.168.1.1]",
      "http://[::ffff:10.0.0.1]",
    ]) {
      expect(isSafeOutboundUrl(u), u).toBe(false);
    }
  });

  it("blocks decimal/hex IPv4 encodings of loopback", () => {
    expect(isSafeOutboundUrl("http://2130706433")).toBe(false); // 127.0.0.1
    expect(isSafeOutboundUrl("http://0x7f000001")).toBe(false);
  });

  it("rejects non-http(s) schemes and malformed input", () => {
    for (const u of ["ftp://example.com", "file:///etc/passwd", "not a url", ""]) {
      expect(isSafeOutboundUrl(u), u).toBe(false);
    }
  });

  it("assertSafeOutboundUrl throws on unsafe and is silent on safe", () => {
    expect(() => assertSafeOutboundUrl("http://127.0.0.1")).toThrow();
    expect(() => assertSafeOutboundUrl("https://example.com")).not.toThrow();
  });
});

describe("isAllowedServiceUrl (lenient, local services allowed)", () => {
  it("allows localhost/LAN service URLs (e.g. Ollama)", () => {
    for (const u of [
      "http://localhost:11434",
      "http://127.0.0.1:11434",
      "http://192.168.1.50:11434",
      "https://ollama.example.com",
    ]) {
      expect(isAllowedServiceUrl(u), u).toBe(true);
    }
  });

  it("still blocks the cloud metadata endpoint (v4 and IPv4-mapped v6)", () => {
    expect(isAllowedServiceUrl("http://169.254.169.254")).toBe(false);
    expect(isAllowedServiceUrl("http://[::ffff:169.254.169.254]")).toBe(false);
  });

  it("rejects non-http(s) and malformed", () => {
    expect(isAllowedServiceUrl("ftp://localhost")).toBe(false);
    expect(isAllowedServiceUrl("garbage")).toBe(false);
  });
});
