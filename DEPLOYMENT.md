# Dia-Storage — Publishing & Security Guide

How to put Dia-Storage on the public internet **without leaking anyone's
photos**. Read the whole thing once, then use the [pre-publish checklist](#9-pre-publish-checklist)
as your go-live gate.

> **Audience:** the operator (you). The app UI is Italian; this ops guide is in
> English. Commands assume the native LXC / VPS deployment (systemd + Postgres
> 17 + Caddy). A Docker path is noted where it differs.

---

## 1. How "no images leak" is actually enforced

Image leakage is prevented by **four independent layers**. If any one holds,
photos stay private; you want all four.

| Layer | What it does | Where |
|------|--------------|-------|
| **Authentication** | Every `/api/v1/**` route (including every image route) requires a valid session cookie or API key. There is no anonymous access and no public file serving. | `withAuth` / `withApiKey` in `src/lib/auth/middleware.ts` |
| **Per-user authorization** | A logged-in user can only see/serve **their own** slides; admins and editors see all. Image bytes, metadata, search, lists, albums and magazines are all scoped. | `canViewSlide` / `slideVisibilityCondition` |
| **Transport (TLS)** | Caddy terminates HTTPS and sets HSTS, so images never travel in cleartext and the session cookie is `Secure`. | `docker/Caddyfile` + `config.app.url` |
| **Network isolation** | Postgres and the app's storage directory are never reachable from the internet — only Caddy's 443 is. | firewall + `STORAGE_PATH` |

**Critical fact about the session cookie:** it is marked `Secure` only when
`config.app.url` starts with `https://` (`src/lib/auth/session.ts`). If you
deploy on a real domain but leave `app.url` as `http://…`, the cookie is sent
in cleartext. **Set `app.url` to your `https://` URL** (Step 3).

**Registration is invite-only by design:** there is no public signup. Accounts
are created only by an admin (`/api/v1/users` is admin-only), and login merely
emails an OTP to an address that already has an account. Do not add a public
registration route.

---

## 2. Prerequisites

- A VPS or LXC container with a public IPv4 (and ideally IPv6).
- A **domain name** you control (e.g. `dia.example.com`). TLS needs a real
  hostname — you cannot get a publicly-trusted certificate for a bare IP.
- Node.js 20+, PostgreSQL 17, and Caddy 2 (or Docker + Docker Compose).
- SMTP credentials (the app emails OTP login codes — without working email,
  nobody can log in).

---

## 3. Environment & configuration

Secrets come from the environment (and optional `config.yaml`); **never commit
them**. `config.yaml` and `.env*` are already git-ignored — keep it that way.

Create `/srv/dia/.env` (readable only by the service user, `chmod 600`):

```bash
# Database — DEDICATED credentials. In production the app now REFUSES to start
# without DATABASE_URL (no more dia:dia fallback), so set a strong password.
DATABASE_URL="postgres://dia_app:<LONG-RANDOM-PASSWORD>@127.0.0.1:5432/dia_storage"

# Absolute storage path OUTSIDE any web-served directory.
STORAGE_PATH="/srv/dia/data"

# Public HTTPS URL — drives Secure cookies, OTP links and CSRF origin checks.
# MUST be https in production.
DIA_APP__URL="https://dia.example.com"

# SMTP (OTP delivery)
DIA_EMAIL__HOST="smtp.example.com"
DIA_EMAIL__PORT=587
DIA_EMAIL__SECURE=false
DIA_EMAIL__USER="postmaster@example.com"
DIA_EMAIL__PASSWORD="<smtp-password>"
DIA_EMAIL__FROM="Dia-Storage <noreply@example.com>"

# Optional AI description (leave unset to disable). If set, restrict spend.
# ANTHROPIC_API_KEY="sk-ant-..."

# Optional Google Maps key for the location picker — see Step 8 (MUST be
# referrer-restricted in Google Cloud; it is exposed to the browser by design).
# GOOGLE_MAPS_API_KEY="..."

NODE_ENV=production
```

Generate the DB password and the like with `openssl rand -base64 33`.

---

## 4. PostgreSQL

```sql
CREATE USER dia_app WITH PASSWORD '<LONG-RANDOM-PASSWORD>';
CREATE DATABASE dia_storage OWNER dia_app;
```

Then **bind Postgres to localhost only** so it is never exposed:

- `postgresql.conf`: `listen_addresses = 'localhost'`
- `pg_hba.conf`: allow only `127.0.0.1/32` (and `::1/128`) with `scram-sha-256`.
- Confirm from outside: `nc -vz <public-ip> 5432` must **fail**.

Apply the schema and seed the first admin:

```bash
npx drizzle-kit push          # create tables
npx tsx scripts/seed.ts       # create the admin user (set ADMIN_EMAIL/ADMIN_NAME)
```

---

## 5. Reverse proxy + TLS (Caddy)

The shipped `docker/Caddyfile` listens on `:443`. Change the site address to
your **domain** so Caddy auto-provisions a Let's Encrypt certificate, and keep
the security headers that are already there:

```caddy
dia.example.com {
	reverse_proxy 127.0.0.1:3000      # or app:3000 under Docker

	request_body {
		max_size 200MB
	}

	header {
		X-Frame-Options "DENY"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
		-Server
	}
}
```

Caddy obtains and renews the certificate automatically once DNS points at the
host. The app itself listens on `3000` and must **not** be exposed directly —
only Caddy should reach it.

---

## 6. Run the app

**systemd (native LXC):** `/etc/systemd/system/dia-storage.service`

```ini
[Unit]
Description=Dia-Storage
After=network.target postgresql.service

[Service]
Type=simple
User=dia
WorkingDirectory=/srv/dia/app
EnvironmentFile=/srv/dia/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/srv/dia/data
# Cap memory so a decode-bomb can't take the host down
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

```bash
npm ci && npm run build
sudo systemctl enable --now dia-storage
```

**Docker path:** build with `docker/Dockerfile` (already runs as a non-root
`appuser` and ships a healthcheck), pass the env file, and mount a volume at
the container's `/app/data`. Keep `3000` internal to the compose network;
publish only Caddy's `443`.

---

## 7. Firewall & network

- Allow inbound **80 and 443 only** (80 just for the ACME challenge / redirect).
- Block everything else, especially **5432 (Postgres)** and **3000 (app)**.
- `ufw` example:
  ```bash
  ufw default deny incoming
  ufw allow 80,443/tcp
  ufw enable
  ```

---

## 8. Google Maps key (if you use the location picker)

A Maps **JavaScript** key is delivered to the browser by design, so the
`/api/v1/config/google-maps-key` endpoint returning it to a logged-in user is
expected. The real control is in Google Cloud Console:

- Restrict the key by **HTTP referrer** to `https://dia.example.com/*`.
- Restrict it to the **Maps JavaScript API** only (no Geocoding/Places server
  scopes on this key).
- Set a billing quota/alert.

Never reuse a server-side Google key here.

---

## 9. Pre-publish checklist

Go-live gate — every box must be checked:

- [ ] `DIA_APP__URL` is your `https://` domain (Secure cookies depend on it).
- [ ] TLS works: `https://…` is green; plain `http://` redirects to HTTPS.
- [ ] `DATABASE_URL` uses a strong, dedicated password (app refuses to boot in
      prod without it).
- [ ] Postgres is **not** reachable from the internet (`nc -vz <ip> 5432` fails).
- [ ] App port 3000 is **not** exposed; only Caddy 443 is public.
- [ ] `STORAGE_PATH` is an absolute path outside any static/web-served dir.
- [ ] `config.yaml` / `.env` are not committed (`git status` clean; `git ls-files`
      shows neither).
- [ ] SMTP works — you received a real OTP email and logged in.
- [ ] Only intended people have accounts (admin-created; no public signup).
- [ ] Google Maps key (if set) is referrer- and API-restricted.
- [ ] Backups run and are stored **encrypted in a private** destination (Step 10).
- [ ] Legacy slide ownership backfilled if you imported data before this release
      (Step 10).
- [ ] Cross-user isolation verified with two accounts (Step 11).

---

## 10. Backups & legacy data

**Backups.** The backup subsystem (`src/lib/backup/*`) can target S3/NAS.
Wherever the images go:
- The S3 bucket / NAS share must be **private** (no public read, no listing).
- Enable encryption at rest; use credentials scoped to that one bucket.
- Test a restore (`scripts/restore-db.ts`) before you rely on it.

**Legacy ownership backfill.** Per-user isolation keys on `slides.uploaded_by`.
Any slide imported before this release may have `uploaded_by = NULL`, which then
shows up only for admins. If everything currently belongs to you (the admin),
that is fine. To explicitly assign existing data to a user:

```sql
-- Assign all unowned slides/magazines/collections to user id 1 (your admin).
UPDATE slides       SET uploaded_by   = 1 WHERE uploaded_by   IS NULL;
UPDATE magazines    SET owner_user_id = 1 WHERE owner_user_id IS NULL;
UPDATE collections  SET owner_user_id = 1 WHERE owner_user_id IS NULL;
```

---

## 11. Verify no images leak (do this after deploy)

1. Create **two** non-admin accounts, A and B. Upload a slide as A; note its id.
2. Log in as **B**. In the browser console (so B's cookie is used), run:
   ```js
   await fetch('/api/v1/slides/<A_slide_id>/original').then(r => r.status) // expect 404
   await fetch('/api/v1/slides/<A_slide_id>/thumbnail').then(r => r.status) // expect 404
   await fetch('/api/v1/slides/<A_slide_id>').then(r => r.status)           // expect 404
   await fetch('/api/v1/search?q=').then(r => r.json())                     // must NOT contain A's slides
   ```
   All image/metadata reads of A's slide must return **404** for B.
3. Log out entirely and hit any `/api/v1/slides/<id>/original` — expect **401**.
4. Confirm an admin account still sees everything (admins are intentionally global).

If step 2 returns image bytes or A's metadata, **stop** — isolation is broken;
do not keep the instance public.

---

## 12. Ongoing maintenance

- Watch `GET /api/v1/health` (already used by the Docker healthcheck) from an
  uptime monitor.
- Keep dependencies patched: `npm audit`, and rebuild on Next.js/Sharp updates.
- Rotate SMTP / API keys periodically; rotating leaks is cheap insurance.
- Review the audit findings summary in the PR before each major change.

---

## Appendix — what this release hardened

The security pass that accompanies this guide fixed, among others: a command
injection (RCE) in the EXIF writer, cross-user image/metadata access (IDOR) on
every slide read/serve/mutate endpoint, missing ownership checks on batch and
album operations, SSRF on outbound (Ollama/WhatsApp) URLs, CSRF on
state-changing requests, login account-enumeration, and image
decompression-bomb limits. See the commit history on
`fix/ux-and-security-hardening` for specifics.
