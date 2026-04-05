# Dia-Storage

Applicazione web per la gestione e archiviazione di diapositive 35mm digitalizzate tramite scanner Reflecta DigitDia Evolution.

## Panoramica

Dia-Storage permette di:
- Importare automaticamente le diapositive scannerizzate dalla scheda SD tramite l'app macOS companion **Dia-Uploader**
- Gestire una coda di diapositive in arrivo con revisione e archiviazione
- Aggiungere metadati (titolo, data, luogo, note) singolarmente o in batch
- Scrivere la data nei metadati EXIF del file JPEG originale
- Sfogliare la galleria con ricerca full-text in italiano
- Effettuare backup su storage S3-compatible e/o NAS/share di rete
- Gestire utenti con ruoli (admin/utente) e autenticazione passwordless (OTP via email/WhatsApp)
- Richiedere assistenza remota

## Architettura

```
┌──────────────────┐     ┌──────────────────────────────────────┐
│   macOS           │     │   VPS (Docker)                        │
│   Dia-Uploader    │────>│   ┌─────────┐  ┌──────────────────┐ │
│   (menu bar app)  │     │   │ Caddy    │  │ Next.js 16       │ │
│                   │     │   │ (HTTPS)  │─>│ App Router       │ │
│   SD card ─> API  │     │   └─────────┘  │ shadcn/ui        │ │
└──────────────────┘     │                 │ Drizzle ORM      │ │
                          │                 └────────┬─────────┘ │
                          │                          │            │
                          │                 ┌────────▼─────────┐ │
                          │                 │ PostgreSQL 17    │ │
                          │                 └──────────────────┘ │
                          │                                      │
                          │   /app/data/                         │
                          │     incoming/  originals/  thumbs/   │
                          └──────────────────────────────────────┘
```

## Workflow

1. **Scansione**: Lo scanner Reflecta DigitDia Evolution salva i file `PICTnnnn.JPG` su scheda SD
2. **Importazione**: L'app macOS Dia-Uploader rileva la SD card e carica automaticamente le immagini
3. **Coda in arrivo**: Le diapositive appaiono nella coda `/coda` nell'app web
4. **Revisione**: L'utente aggiunge metadati (titolo, data, luogo) e archivia il lotto
5. **Archiviazione**: I file vengono spostati nello storage organizzato con generazione di miniature e versioni medie
6. **Galleria**: Le diapositive archiviate sono navigabili e ricercabili in `/galleria`

## Tech Stack

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui v4 + Tailwind CSS v4 |
| Database | PostgreSQL 17 + Drizzle ORM |
| Auth | OTP passwordless (Email + WhatsApp) |
| Image Processing | Sharp + exifr |
| Backup | @aws-sdk/client-s3 (S3-compatible) + NAS |
| macOS App | Swift + SwiftUI (menu bar app) |
| Deployment | Docker + Docker Compose + Caddy |

## Scanner Supportato

**Reflecta DigitDia Evolution**
- File output: `PICTnnnn.JPG` su scheda SD (FAT32, max 128GB)
- Risoluzione: 14MP (4608x3072) o 22MP (5760x3840 interpolata)
- Formato: JPEG, bassa compressione (~15-25MB per file)
- Capacita caricatori: 36, 40, 50, 60, 80, 100 slot

## Requisiti

- **Server**: VPS Linux con Docker e Docker Compose
- **Client**: macOS con browser moderno (per l'app web)
- **macOS App**: macOS 13+ (Ventura o successivo)
- **Storage**: Almeno 250GB per ~5000 diapositive

## Installazione Rapida

### Server (Docker)

```bash
# Clona il repository
git clone git@github-c0de:c0de-ch/dia-storage.git
cd dia-storage

# Copia e configura
cp config.yaml.example config.yaml
# Modifica config.yaml con le tue impostazioni

# Avvia con Docker Compose
docker compose up -d

# Esegui le migrazioni e crea l'utente admin
docker compose exec app npx drizzle-kit push
docker compose exec app npx tsx scripts/seed.ts
```

### Sviluppo Locale

```bash
# Prerequisiti: Node.js 20+, PostgreSQL 17

# Installa dipendenze
npm install

# Copia configurazione
cp config.yaml.example config.yaml
cp .env.local.example .env.local

# Avvia PostgreSQL (Docker)
docker compose -f docker-compose.dev.yml up -d

# Migrazioni database
npx drizzle-kit push

# Seed utente admin
npx tsx scripts/seed.ts

# Avvia in sviluppo
npm run dev
```

### macOS Dia-Uploader

1. Apri `macos/DiaUploader.xcodeproj` in Xcode
2. Build e installa l'app
3. Configura: URL del server + chiave API (generata dall'admin nell'app web)

## Configurazione

Tutte le impostazioni sono nel file `config.yaml` e/o configurabili dalla pagina admin `/admin/impostazioni`.

Vedi `config.yaml.example` per la documentazione completa di tutte le opzioni.

Le variabili d'ambiente sovrascrivono i valori del file config:
- `DATABASE_URL`
- `EMAIL_SMTP_PASSWORD`
- `WHATSAPP_ACCESS_TOKEN`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

## Struttura del Progetto

```
dia-storage/
  src/
    app/              # Next.js App Router pages
    components/       # React components (shadcn/ui + custom)
    lib/              # Business logic, auth, DB, processing
    hooks/            # React hooks
  macos/              # macOS companion app (Swift)
  docker/             # Docker deployment files
  drizzle/            # Database migrations
  config.yaml         # System configuration
```

## Licenza

Progetto privato - tutti i diritti riservati.
