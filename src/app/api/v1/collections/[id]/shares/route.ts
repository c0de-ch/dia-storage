import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { canEditCollection } from '@/lib/auth/permissions';
import { sendShareNotificationEmail } from '@/lib/email/transport';
import { parseIdParam } from '@/lib/api/params';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const shareBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Load the collection and verify the requester may manage its shares
 * (owner / admin / editor). Returns the collection or a ready error response.
 */
async function loadManageable(
  request: NextRequest,
  idRaw: string
): Promise<
  | { ok: true; collectionId: number; collectionName: string }
  | { ok: false; response: NextResponse }
> {
  const parsed = parseIdParam(idRaw);
  if (!parsed.ok) return { ok: false, response: parsed.response };

  const [collection] = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, parsed.id))
    .limit(1);

  if (!collection) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: 'Collezione non trovata.' },
        { status: 404 }
      ),
    };
  }

  const user = (request as AuthenticatedRequest).user;
  if (!canEditCollection(user, collection.ownerUserId ?? undefined)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: 'Non hai i permessi per gestire la condivisione di questo album.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, collectionId: collection.id, collectionName: collection.name };
}

// List who an album is shared with.
export const GET = withAuth(async (request: NextRequest, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const access = await loadManageable(request, id);
  if (!access.ok) return access.response;

  const shares = await db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      createdAt: schema.collectionShares.createdAt,
    })
    .from(schema.collectionShares)
    .innerJoin(schema.users, eq(schema.collectionShares.sharedWithUserId, schema.users.id))
    .where(eq(schema.collectionShares.collectionId, access.collectionId));

  return NextResponse.json({ success: true, shares });
});

// Share an album with a registered user (by email).
export const POST = withAuth(async (request: NextRequest, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const access = await loadManageable(request, id);
  if (!access.ok) return access.response;

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

  const requester = (request as AuthenticatedRequest).user;

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
  if (target.id === requester.id) {
    return NextResponse.json(
      { success: false, message: "L'album è già tuo." },
      { status: 400 }
    );
  }

  await db
    .insert(schema.collectionShares)
    .values({
      collectionId: access.collectionId,
      sharedWithUserId: target.id,
      sharedByUserId: requester.id,
    })
    .onConflictDoNothing();

  // Best-effort email notification.
  try {
    await sendShareNotificationEmail({
      to: target.email,
      sharerName: requester.name || requester.email,
      kind: 'album',
      itemName: access.collectionName,
    });
  } catch (err) {
    console.error('Errore invio notifica condivisione album:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    {
      success: true,
      share: { userId: target.id, email: target.email, name: target.name },
    },
    { status: 201 }
  );
});

// Stop sharing an album with a user (?userId=).
export const DELETE = withAuth(async (request: NextRequest, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const access = await loadManageable(request, id);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const userIdRaw = searchParams.get('userId');
  const userId = Number(userIdRaw);
  if (!userIdRaw || !Number.isInteger(userId)) {
    return NextResponse.json(
      { success: false, message: 'ID utente obbligatorio.' },
      { status: 400 }
    );
  }

  await db
    .delete(schema.collectionShares)
    .where(
      and(
        eq(schema.collectionShares.collectionId, access.collectionId),
        eq(schema.collectionShares.sharedWithUserId, userId)
      )
    );

  return NextResponse.json({ success: true });
});
