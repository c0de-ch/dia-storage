import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth/middleware';
import { collectionsSharedWith } from '@/lib/auth/sharing';
import { eq } from 'drizzle-orm';

/**
 * Everything shared WITH the caller: whole galleries (by owner) and individual
 * albums. Powers the "Condivisi con me" page.
 */
export const GET = withAuth(async (request: NextRequest) => {
  const me = (request as AuthenticatedRequest).user;

  const [galleries, albums] = await Promise.all([
    db
      .select({
        ownerId: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.galleryShares)
      .innerJoin(schema.users, eq(schema.galleryShares.ownerUserId, schema.users.id))
      .where(eq(schema.galleryShares.sharedWithUserId, me.id)),
    collectionsSharedWith(me.id),
  ]);

  return NextResponse.json({ success: true, galleries, albums });
});
