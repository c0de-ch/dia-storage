import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { sendShareNotificationEmail } from '@/lib/email/transport';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const shareBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

// List the users the caller has shared their gallery with.
export const GET = withAuth(async (request: NextRequest) => {
  const me = (request as AuthenticatedRequest).user;
  const shares = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      createdAt: schema.galleryShares.createdAt,
    })
    .from(schema.galleryShares)
    .innerJoin(schema.users, eq(schema.galleryShares.sharedWithUserId, schema.users.id))
    .where(eq(schema.galleryShares.ownerUserId, me.id));
  return NextResponse.json({ success: true, shares });
});

// Share the caller's whole gallery with another registered user (by email).
export const POST = withAuth(async (request: NextRequest) => {
  const me = (request as AuthenticatedRequest).user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Corpo non valido.' }, { status: 400 });
  }
  const parsed = shareBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Indirizzo email non valido.' },
      { status: 400 }
    );
  }

  const [target] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);

  if (!target) {
    return NextResponse.json(
      { success: false, message: 'Nessun utente registrato con questa email.' },
      { status: 404 }
    );
  }
  if (target.id === me.id) {
    return NextResponse.json(
      { success: false, message: 'La galleria è già tua.' },
      { status: 400 }
    );
  }

  await db
    .insert(schema.galleryShares)
    .values({ ownerUserId: me.id, sharedWithUserId: target.id })
    .onConflictDoNothing();

  // Best-effort email notification.
  try {
    await sendShareNotificationEmail({
      to: target.email,
      sharerName: me.name || me.email,
      kind: 'gallery',
    });
  } catch (err) {
    console.error('Errore invio notifica condivisione galleria:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    { success: true, share: { userId: target.id, email: target.email, name: target.name } },
    { status: 201 }
  );
});

// Stop sharing the caller's gallery with a user (?userId=).
export const DELETE = withAuth(async (request: NextRequest) => {
  const me = (request as AuthenticatedRequest).user;
  const { searchParams } = new URL(request.url);
  const userId = Number(searchParams.get('userId'));
  if (!searchParams.get('userId') || !Number.isInteger(userId)) {
    return NextResponse.json(
      { success: false, message: 'ID utente obbligatorio.' },
      { status: 400 }
    );
  }
  await db
    .delete(schema.galleryShares)
    .where(
      and(
        eq(schema.galleryShares.ownerUserId, me.id),
        eq(schema.galleryShares.sharedWithUserId, userId)
      )
    );
  return NextResponse.json({ success: true });
});
