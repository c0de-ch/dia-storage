import { nanoid } from "nanoid";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { userSessions, users } from "@/lib/db/schema";
import { getConfig } from "@/lib/config/loader";

const SESSION_COOKIE_NAME = "dia_session";

type SessionUser = typeof users.$inferSelect;

/**
 * Create a new session for a user. Returns the session token.
 */
export async function createSession(userId: number): Promise<string> {
  const config = getConfig();
  const token = nanoid(48);
  const expiresAt = new Date(
    Date.now() + config.auth.sessionExpiryDays * 24 * 60 * 60 * 1000
  );

  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Validate a session token. Returns the associated user if valid.
 */
export async function validateSession(
  token: string
): Promise<SessionUser | null> {
  const rows = await db
    .select({
      session: userSessions,
      user: users,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const { user } = rows[0];

  // Check if user is still active
  if (!user.active) {
    return null;
  }

  return user;
}

/**
 * Delete a session by token.
 */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

/**
 * Set the session cookie on the response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.app.url.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: config.auth.sessionExpiryDays * 24 * 60 * 60,
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Read the session from cookies and validate it.
 * Returns the user if the session is valid, null otherwise.
 */
export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return validateSession(token);
}

/**
 * Get the raw session token from cookies.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
