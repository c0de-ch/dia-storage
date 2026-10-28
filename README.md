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
┌──────────────────┐     ┌──────────────────────────────────────────────┐
│   macOS           │     │   Kubernetes k8s01 (Argo CD + Helm)           │
│   Dia-Uploader    │────>│   ┌──────────┐   ┌──────────────────────┐   │
│   (menu bar app)  │     │   │ Gateway  │   │ Deployment           │   │
│                   │     │   │ (HTTP)   │──>│ Next.js 16 App Router│   │
│   SD card ─> API  │     │   └──────────┘   │ shadcn/ui, Drizzle   │   │
└──────────────────┘     │        ▲          └──────────┬───────────┘   │
   HTTPS via Caddy ───────┘        │                     │               │
   sul firewall                    │          ┌──────────▼───────────┐   │
                                   │          │ CloudNativePG        │   │
                                   │          │ PostgreSQL 17        │   │
                                   │          └──────────────────────┘   │
                                   │                                     │
                                   │   PVC /data (iSCSI, backup Velero)   │
                                   │     incoming/ originals/ thumbnails/ │
                                   │     medium/   db-dumps/              │
                                   └─────────────────────────────────────┘
```

Il deployment è GitOps: il chart Helm in `deploy/helm/dia-storage` viene
pubblicato su `oci://ghcr.io/c0de-ch/charts`, i valori per il cluster vivono in
[lab-k8s01-gitops](https://github.com/c0de-ch/lab-k8s01-gitops) (`apps/dia-storage`)
e Argo CD applica ogni merge su `main` di quel repository.

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
| Deployment | Kubernetes (k8s01) + Helm + Argo CD, immagine su GHCR |

## Scanner Supportato

**Reflecta DigitDia Evolution**
- File output: `PICTnnnn.JPG` su scheda SD (FAT32, max 128GB)
- Risoluzione: 14MP (4608x3072) o 22MP (5760x3840 interpolata)
- Formato: JPEG, bassa compressione (~15-25MB per file)
- Capacita caricatori: 36, 40, 50, 60, 80, 100 slot

## Requisiti

- **Server**: cluster Kubernetes con Argo CD, CloudNativePG, Gateway API e
  una StorageClass (k8s01, vedi lab-k8s01-gitops); in alternativa `helm install`
  su qualsiasi cluster con l'operatore CloudNativePG
- **Client**: macOS con browser moderno (per l'app web)
- **macOS App**: macOS 13+ (Ventura o successivo)
- **Storage**: Almeno 250GB per ~5000 diapositive

## Installazione Rapida

### Server (Kubernetes, k8s01)

Il deployment su k8s01 non richiede comandi: dopo un merge su `main` il workflow
`Publish & Deploy` costruisce l'immagine `ghcr.io/c0de-ch/dia-storage:sha-<commit>`,
pubblica il chart se la sua versione è nuova e apre una pull request su
lab-k8s01-gitops con il nuovo tag. Il merge di quella PR è il deploy; il revert
è il rollback. Lo schema del database (`drizzle-kit push`, `drizzle/*.sql`) e
l'utente admin (`seed.adminEmail`) vengono applicati da un init container a ogni
avvio.

Configurazione del cluster, in lab-k8s01-gitops:

- `apps/dia-storage/values.yaml`: URL pubblico, dimensione del volume, route
- `apps/dia-storage/sealed-secrets.yaml`: SMTP per i codici OTP (`DIA_EMAIL__*`)
- `applications/dia-storage.yaml`: l'Application Argo CD (versione del chart)

Vedi `deploy/helm/dia-storage/README.md` per un'installazione manuale con
`helm install` su un altro cluster.

### Immagine container

```bash
docker build -t dia-storage:local .
# l'immagine contiene il server standalone (/app), gli strumenti per il
# database in /opt/tools (drizzle-kit, tsx, schema, scripts) e pg_dump 17
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
  deploy/helm/        # Helm chart (published to oci://ghcr.io/c0de-ch/charts)
  Dockerfile          # Container image for Kubernetes
  drizzle/            # Database migrations
  config.yaml         # System configuration
```

## Licenza

Progetto privato - tutti i diritti riservati.
