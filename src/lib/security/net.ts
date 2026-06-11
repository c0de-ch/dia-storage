/**
 * SSRF guard for outbound URLs that come from configuration or user input
 * (Ollama server, WhatsApp API, etc.).
 *
 * Rejects anything that is not plain http/https, and any host that resolves to
 * a loopback / link-local / private (RFC 1918) range or an obvious metadata
 * endpoint. This is a literal-host check: it does NOT defend against
 * DNS-rebinding (a public name that resolves to 127.0.0.1). For a small
 * single-tenant deployment that is acceptable; if you ever expose these
 * settings to untrusted users, resolve the host and re-check the resolved IP.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
]);

function isPrivateOrLocalIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 0) return true; // "this host"
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isLocalIpv6(host: string): boolean {
  const h = host.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  // IPv4-mapped (::ffff:127.0.0.1)
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped && mapped[1]) return isPrivateOrLocalIpv4(mapped[1]);
  return false;
}

/** Returns true if `raw` is a safe public http(s) URL to fetch. */
export function isSafeOutboundUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (isPrivateOrLocalIpv4(host)) return false;
  if (host.includes(":") || host.startsWith("[")) {
    if (isLocalIpv6(host)) return false;
  }
  return true;
}

/**
 * Throws if the URL is not safe to fetch server-side. Use at the call site
 * right before fetch().
 */
export function assertSafeOutboundUrl(raw: string): void {
  if (!isSafeOutboundUrl(raw)) {
    throw new Error("URL non consentito (deve essere un indirizzo pubblico http/https).");
  }
}

/**
 * Lenient guard for URLs that are EXPECTED to point at a local/LAN service
 * configured by an operator (e.g. a self-hosted Ollama at localhost:11434).
 * Allows loopback and private ranges, but still requires http/https and
 * blocks the cloud metadata endpoint (169.254.169.254) — the one local
 * address with real SSRF value. Use this only for admin-set service URLs;
 * use isSafeOutboundUrl() for anything that targets the public internet.
 */
export function isAllowedServiceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (!host) return false;
  // Block cloud-metadata regardless (link-local 169.254.x.x).
  if (/^169\.254\./.test(host)) return false;
  return true;
}
