import crypto from "node:crypto";

export const API_KEY_PREFIX = "dia_";

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
