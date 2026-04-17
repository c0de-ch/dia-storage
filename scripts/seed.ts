/**
 * Seed script - creates the initial admin user.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Environment:
 *   DATABASE_URL         - PostgreSQL connection string
 *   ADMIN_EMAIL          - Admin email (default: admin@dia-storage.local)
 *   ADMIN_NAME           - Admin name (default: Amministratore)
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users } from "../src/lib/db/schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://dia:dia@localhost:5432/dia_storage";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@dia-storage.local";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Amministratore";

async function seed() {
  console.log("Dia-Storage - Seed iniziale");
  console.log("===========================");
  console.log(`Database: ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}`);
  console.log(`Email admin: ${ADMIN_EMAIL}`);
  console.log(`Nome admin: ${ADMIN_NAME}`);
  console.log();

  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  try {
    // Check if admin user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    const user = existing[0];
    if (user) {
      console.log(`Utente admin già esistente (id: ${user.id})`);

      // Ensure role is admin
      if (user.role !== "admin") {
        await db
          .update(users)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(users.id, user.id));
        console.log("Ruolo aggiornato a 'admin'");
      }

      // Ensure user is active
      if (!user.active) {
        await db
          .update(users)
          .set({ active: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        console.log("Utente riattivato");
      }
    } else {
      // Create admin user
      const result = await db
        .insert(users)
        .values({
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          role: "admin",
          active: true,
          otpChannel: "email",
        })
        .returning({ id: users.id });

      const created = result[0];
      if (!created) throw new Error("Inserimento utente admin fallito.");
      console.log(`Utente admin creato con id: ${created.id}`);
    }

    console.log();
    console.log("Seed completato con successo!");
    console.log(
      `Accedi con l'email ${ADMIN_EMAIL} per ricevere un codice OTP.`
    );
  } catch (error) {
    console.error("Errore durante il seed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
