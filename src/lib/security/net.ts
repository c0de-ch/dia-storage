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
 *
 * Node's URL parser already folds decimal/hex IPv4 (e.g. 2130706433,
 * 0x7f000001) to dotted form, but it keeps IPv6 in bracketed, hex-compressed
 * form (`[::ffff:7f00:1]`) and preserves a trailing-dot FQDN (`localhost.`).
 * normalizeHost() + mappedIpv4() undo those so the range checks can't be
 * bypassed by encoding.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
]);

/** Lowercase, strip IPv6 brackets and a trailing FQDN dot. */
function normalizeHost(hostname: string): string {
  let h = hostname.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  while (h.endsWith(".")) h = h.slice(0, -1);
  return h;
}

function isPrivateOrLocalIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a > 255 || b > 255) return false;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 0) return true; // "this host"
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/**
 * If `h` is an IPv4-mapped IPv6 address, return its dotted-quad IPv4 form,
 * handling both the dotted (`::ffff:127.0.0.1`) and the hex-compressed
 * (`::ffff:7f00:1`) representations Node produces. Otherwise null.
 */
function mappedIpv4(h: string): string | null {
  const dotted = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted && dotted[1]) return dotted[1];
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex && hex[1] && hex[2]) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  }
  return null;
}

function isLocalIpv6(h: string): boolean {
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
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

  const host = normalizeHost(url.hostname);
  if (!host) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return false;

  // IPv4-mapped IPv6 → check the embedded IPv4 against the private ranges.
  const mapped = mappedIpv4(host);
  if (mapped && isPrivateOrLocalIpv4(mapped)) return false;

  if (isPrivateOrLocalIpv4(host)) return false;
  if ((host.includes(":") || mapped) && isLocalIpv6(host)) return false;
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
  const host = normalizeHost(url.hostname);
  if (!host) return false;
  // Block cloud-metadata regardless of encoding (link-local 169.254.x.x,
  // including its IPv4-mapped IPv6 form).
  if (/^169\.254\./.test(host)) return false;
  const mapped = mappedIpv4(host);
  if (mapped && /^169\.254\./.test(mapped)) return false;
  return true;
}
