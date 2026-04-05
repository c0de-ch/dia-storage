# Dia-Storage - Project Conventions

## Overview
Web application for managing scanned 35mm slides from a Reflecta DigitDia Evolution scanner.
Italian UI, passwordless OTP auth, Docker deployment.

## Tech Stack
- Next.js 16 (App Router) + TypeScript (strict mode)
- shadcn/ui v4 (New York style) + Tailwind CSS v4
- Drizzle ORM + PostgreSQL 17
- Sharp (image processing) + exifr (EXIF reading)
- Docker + Docker Compose + Caddy

## Code Conventions
- All UI text in Italian - use `src/lib/i18n.ts` dictionary
- Use Server Components by default, `"use client"` only when needed
- API routes under `src/app/api/v1/`
- Server Actions under `src/actions/`
- Database schema in `src/lib/db/schema.ts`
- Auth middleware: `withAuth()` wrapper from `src/lib/auth/middleware.ts`
- Validate inputs with Zod schemas
- Config loaded from `config.yaml` via `src/lib/config/loader.ts`

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript check
- `npx drizzle-kit push` - Push schema to DB
- `npx drizzle-kit generate` - Generate migration
- `npx tsx scripts/seed.ts` - Seed admin user

## File Organization
- Pages use Italian route names: `/galleria`, `/coda`, `/caricamento`, `/ricerca`, `/accesso`
- Components in `src/components/` - shadcn in `ui/`, custom at root level
- Business logic in `src/lib/` organized by domain (auth, images, backup, etc.)
- Hooks in `src/hooks/`

## Image Pipeline
- Scanner outputs: `PICTnnnn.JPG` (14MP or 22MP JPEG)
- Upload -> incoming queue (`status='incoming'`, `/data/incoming/`)
- Archive -> permanent storage (`status='active'`, `/data/originals/{YYYY}/{MM}/`)
- Thumbnails: 400px wide, q80
- Medium: 1600px wide, q85

## Database
- Use serial PKs (not UUID)
- Timestamps: `createdAt`, `updatedAt`
- Soft delete via `status` field, not row deletion
- Full-text search: PostgreSQL `tsvector` with `italian` dictionary
