import { and, eq, gt, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { authAttempts } from "@/lib/db/schema";
import { getConfig } from "@/lib/config/loader";

export type AttemptKind = "login" | "verify";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

function normalize(identifier: string): string {
  return identifier.toLowerCase().trim();
}

/**
 * Record an auth attempt for later rate-limit checks and audit.
 */
export async function recordAuthAttempt(
  identifier: string,
  kind: AttemptKind,
  success: boolean,
  ipAddress?: string | null
): Promise<void> {
  await db.insert(authAttempts).values({
    identifier: normalize(identifier),
    kind,
    success,
    ipAddress: ipAddress ?? null,
  });
}

/**
 * Check whether an auth attempt should be allowed.
 *
 * Logic:
 *  - `login`: deny if the most recent attempt was within `otpCooldownSeconds`,
 *    OR if >= `maxOtpAttempts` attempts happened in the last hour.
 *  - `verify`: deny if >= `maxOtpAttempts` *failed* attempts happened in the
 *    last `otpExpiryMinutes` minutes.
 */
export async function checkAuthRateLimit(
  identifier: string,
  kind: AttemptKind
): Promise<RateLimitResult> {
  const config = getConfig();
  const norm = normalize(identifier);
  const now = Date.now();

  if (kind === "login") {
    const cooldownMs = config.auth.otpCooldownSeconds * 1000;
    const windowStart = new Date(now - 60 * 60 * 1000); // 1 hour

    const recent = await db
      .select({ count: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.identifier, norm),
          eq(authAttempts.kind, "login"),
          gt(authAttempts.createdAt, windowStart)
        )
      );

    const recentCount = recent[0]?.count ?? 0;
    if (recentCount >= config.auth.maxOtpAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: config.auth.otpCooldownSeconds,
      };
    }

    // Enforce cooldown since last login attempt.
    const cooldownStart = new Date(now - cooldownMs);
    const withinCooldown = await db
      .select({ count: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.identifier, norm),
          eq(authAttempts.kind, "login"),
          gt(authAttempts.createdAt, cooldownStart)
        )
      );

    if ((withinCooldown[0]?.count ?? 0) >= 1) {
      return {
        allowed: false,
        retryAfterSeconds: config.auth.otpCooldownSeconds,
      };
    }

    return { allowed: true };
  }

  // verify
  const windowStart = new Date(
    now - config.auth.otpExpiryMinutes * 60 * 1000
  );

  const failed = await db
    .select({ count: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.identifier, norm),
        eq(authAttempts.kind, "verify"),
        eq(authAttempts.success, false),
        gt(authAttempts.createdAt, windowStart)
      )
    );

  if ((failed[0]?.count ?? 0) >= config.auth.maxOtpAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: config.auth.otpExpiryMinutes * 60,
    };
  }

  return { allowed: true };
}

function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip");
}

export { clientIp };
