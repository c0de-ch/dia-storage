import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { eq, count, desc } from 'drizzle-orm';

export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ total: count() }).from(schema.users);
    const total = totalResult?.total ?? 0;

    const users = await db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, phone, name, role, otpChannel } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, message: 'Email e nome sono obbligatori.' },
        { status: 400 }
      );
    }

    if (role && !['admin', 'operator', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Ruolo non valido. Valori ammessi: admin, operator, viewer.' },
        { status: 400 }
      );
    }

    if (otpChannel && !['email', 'whatsapp'].includes(otpChannel)) {
      return NextResponse.json(
        { success: false, message: 'Canale OTP non valido. Valori ammessi: email, whatsapp.' },
        { status: 400 }
      );
    }

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Un utente con questa email esiste già.' },
        { status: 409 }
      );
    }

    const [user] = await db
      .insert(schema.users)
      .values({
        email,
        phone: phone || null,
        name,
        role: role || 'operator',
        otpChannel: otpChannel || 'email',
      })
      .returning();

    return NextResponse.json(
      { success: true, user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Errore nella creazione dell\'utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
