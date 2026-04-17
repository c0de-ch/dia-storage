import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionFromCookies } from "./session";
import { hashApiKey } from "./api-key";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { t } from "@/lib/i18n";

type SessionUser = typeof users.$inferSelect;

export interface AuthenticatedRequest extends NextRequest {
  user: SessionUser;
}

export type RouteHandler = (
  req: NextRequest,
  context?: Record<string, unknown>
) => Promise<Response>;

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: Record<string, unknown>
) => Promise<Response>;

/**
 * Wrap an API route handler to require authentication via session cookie.
 * Injects `req.user` with the authenticated user.
 */
export function withAuth(handler: AuthenticatedHandler): RouteHandler {
  return async (req: NextRequest, context?: Record<string, unknown>) => {
    const user = await getSessionFromCookies();

    if (!user) {
      return NextResponse.json(
        { error: t("errors.unauthorized") },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: t("errors.accountDisabled") },
        { status: 403 }
      );
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = user;

    return handler(authReq, context);
  };
}

/**
 * Wrap an API route handler to require admin role.
 */
export function withAdmin(handler: AuthenticatedHandler): RouteHandler {
  return withAuth(async (req: AuthenticatedRequest, context) => {
    if (req.user.role !== "admin") {
      return NextResponse.json(
        { error: t("errors.adminRequired") },
        { status: 403 }
      );
    }

    return handler(req, context);
  });
}

/**
 * Wrap an API route handler to validate an API key from the X-Api-Key header.
 * Injects `req.user` with the key owner.
 */
export function withApiKey(handler: AuthenticatedHandler): RouteHandler {
  return async (req: NextRequest, context?: Record<string, unknown>) => {
    const key = req.headers.get("x-api-key");

    if (!key) {
      return NextResponse.json(
        { error: t("errors.apiKeyRequired") },
        { status: 401 }
      );
    }

    const hashedKey = hashApiKey(key);

    const rows = await db
      .select({
        apiKey: apiKeys,
        user: users,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(eq(apiKeys.key, hashedKey))
      .limit(1);

    const firstRow = rows[0];
    if (!firstRow) {
      return NextResponse.json(
        { error: t("errors.invalidApiKey") },
        { status: 401 }
      );
    }

    const { apiKey, user } = firstRow;

    if (!user.active) {
      return NextResponse.json(
        { error: t("errors.accountDisabled") },
        { status: 403 }
      );
    }

    // Update lastUsedAt
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    const authReq = req as AuthenticatedRequest;
    authReq.user = user;

    return handler(authReq, context);
  };
}
