import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { t } from '@/lib/i18n';
import { eq } from 'drizzle-orm';

export const PATCH = withAdmin(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);
    const body = await request.json();
    const { email, phone, name, role, otpChannel } = body;

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, numericId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
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

    const updateData: Record<string, unknown> = {};
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (otpChannel !== undefined) updateData.otpChannel = otpChannel;
    updateData.updatedAt = new Date();

    const [updatedUser] = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdmin(async (request: NextRequest, context) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const numericId = Number(id);

    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, numericId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Utente non trovato.' },
        { status: 404 }
      );
    }

    const [deactivatedUser] = await db
      .update(schema.users)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(schema.users.id, numericId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Utente disattivato con successo.',
      user: deactivatedUser,
    });
  } catch (error) {
    console.error('Errore nella disattivazione dell\'utente:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server.' },
      { status: 500 }
    );
  }
});
