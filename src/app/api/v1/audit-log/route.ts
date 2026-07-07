import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { and, count, desc, eq, gte, lt } from 'drizzle-orm';

// Paginated audit trail for /admin/registro. Filters: action, from/to (dates).
export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const offset = (page - 1) * limit;

    const conditions = [];
    const action = searchParams.get('action');
    if (action) conditions.push(eq(schema.auditLog.action, action));

    const from = searchParams.get('from');
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      conditions.push(gte(schema.auditLog.createdAt, new Date(`${from}T00:00:00`)));
    }
    const to = searchParams.get('to');
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      // Exclusive upper bound: include the whole "to" day.
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      conditions.push(lt(schema.auditLog.createdAt, end));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.auditLog)
      .where(where);
    const total = totalResult?.total ?? 0;

    const rows = await db
      .select({
        id: schema.auditLog.id,
        userId: schema.auditLog.userId,
        action: schema.auditLog.action,
        entityType: schema.auditLog.entityType,
        entityId: schema.auditLog.entityId,
        details: schema.auditLog.details,
        createdAt: schema.auditLog.createdAt,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
      .where(where)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const entries = rows.map(({ userName, userEmail, ...entry }) => ({
      ...entry,
      user: userEmail ? { name: userName, email: userEmail } : undefined,
    }));

    return NextResponse.json({
      success: true,
      entries,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Errore nel recupero del registro attività:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
