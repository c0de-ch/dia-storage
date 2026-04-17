import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { configSchema, type AppConfig } from "./schema";

let cachedConfig: AppConfig | null = null;

/**
 * Deep-merge two objects. `overrides` values take precedence.
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: Record<string, unknown>
): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    const val = overrides[key];
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>
      );
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

/**
 * Build overrides from environment variables.
 *
 * Mapping convention:
 *   DIA_APP__NAME           -> app.name
 *   DIA_AUTH__OTP_LENGTH     -> auth.otpLength
 *   DIA_EMAIL__HOST          -> email.host
 *   DIA_DATABASE__URL        -> database.url
 *   ...
 *
 * Double-underscore separates sections, single underscore is converted
 * to camelCase within the section key.
 */
function envOverrides(): Record<string, unknown> {
  const PREFIX = "DIA_";
  const overrides: Record<string, Record<string, unknown>> = {};

  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (!envKey.startsWith(PREFIX) || envVal === undefined) continue;

    const stripped = envKey.slice(PREFIX.length); // e.g. "APP__NAME"
    const parts = stripped.split("__"); // ["APP", "NAME"]
    if (parts.length !== 2) continue;
    const [rawSection, rawFieldUpper] = parts;
    if (!rawSection || !rawFieldUpper) continue;

    const section = rawSection.toLowerCase(); // "app"
    const rawField = rawFieldUpper.toLowerCase(); // "name"

    // Convert snake_case to camelCase
    const field = rawField.replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase()
    );

    if (!overrides[section]) overrides[section] = {};

    // Attempt to parse booleans and numbers
    let value: unknown = envVal;
    if (envVal === "true") value = true;
    else if (envVal === "false") value = false;
    else if (/^\d+$/.test(envVal)) value = parseInt(envVal, 10);
    else if (/^\d+\.\d+$/.test(envVal)) value = parseFloat(envVal);

    overrides[section][field] = value;
  }

  return overrides;
}

/**
 * Load and validate the application config.
 *
 * 1. Read config.yaml from the project root (if it exists).
 * 2. Merge environment variable overrides.
 * 3. Validate with Zod schema.
 * 4. Cache and return.
 */
export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  let fileConfig: Record<string, unknown> = {};

  // Try multiple candidate paths for the YAML config file
  const candidates = [
    process.env.CONFIG_PATH,
    path.resolve(process.cwd(), "config.yaml"),
    path.resolve(process.cwd(), "config.yml"),
    path.resolve("/etc/dia-storage/config.yaml"),
  ].filter(Boolean) as string[];

  for (const configPath of candidates) {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      fileConfig = (YAML.parse(raw) as Record<string, unknown>) ?? {};
      break;
    }
  }

  // Merge environment variable overrides on top of YAML config
  const merged = deepMerge(
    fileConfig as Record<string, unknown>,
    envOverrides()
  );

  // Also support DATABASE_URL as a top-level env (very common)
  if (process.env.DATABASE_URL && !merged.database) {
    merged.database = { url: process.env.DATABASE_URL };
  } else if (
    process.env.DATABASE_URL &&
    typeof merged.database === "object" &&
    merged.database !== null
  ) {
    (merged.database as Record<string, unknown>).url = process.env.DATABASE_URL;
  }

  const result = configSchema.parse(merged);
  cachedConfig = result;
  return result;
}

/**
 * Invalidate cached config (useful for testing).
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
