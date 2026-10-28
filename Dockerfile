# syntax=docker/dockerfile:1
# Image for Kubernetes (deploy/helm/dia-storage). Three outputs:
#   /app        the Next.js standalone server (node server.js), run as uid 1001
#   /opt/tools  drizzle-kit, tsx, the schema and the scripts, so the chart's
#               init container can push the schema and seed the admin user
#               without npm or network access at runtime
#   heif-convert (libheif) for HEIC/HEIF uploads, pg_dump/pg_restore 17 for
#   the app's own database backup (src/lib/backup/database.ts)
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
ARG GIT_HASH=unknown
ENV GIT_HASH=$GIT_HASH
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Database tools ────────────────────────────────────────────────────────────
# The standalone output bundles drizzle-orm and postgres into the server, so
# nothing under /app/node_modules can be reused for the CLI. This stage is a
# self-contained mini project: the same versions as package-lock.json, plus
# the config, the schema, the SQL files and the scripts they need.
FROM base AS tools
WORKDIR /opt/tools
COPY package-lock.json /tmp/package-lock.json
RUN set -eu; \
    v() { node -p "require('/tmp/package-lock.json').packages['node_modules/$1'].version"; }; \
    echo '{"name":"dia-storage-tools","private":true}' > package.json; \
    npm install --omit=dev --no-audit --no-fund \
      "drizzle-kit@$(v drizzle-kit)" \
      "drizzle-orm@$(v drizzle-orm)" \
      "postgres@$(v postgres)" \
      "tsx@$(v tsx)"; \
    npm cache clean --force; \
    rm /tmp/package-lock.json
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY scripts ./scripts

# ─── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# heif-convert for HEIC/HEIF uploads (src/lib/images/heic.ts): bookworm's
# libheif 1.15 links libde265 directly (the plugin packages exist only from
# libheif 1.17 on). postgresql-client-17 from the PGDG repository, because
# bookworm's own client is 15 and pg_dump refuses a newer server.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates gnupg wget postgresql-common libheif-examples \
 && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
 && apt-get install -y --no-install-recommends postgresql-client-17 \
 && apt-get purge -y --auto-remove gnupg wget \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --home-dir /tmp --shell /usr/sbin/nologin nextjs \
 && mkdir -p /data /app/.next/cache \
 && chown -R nextjs:nodejs /data /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=tools   --chown=nextjs:nodejs /opt/tools /opt/tools

USER nextjs
EXPOSE 3000
# The chart mounts config.yaml at /etc/dia-storage/config.yaml (CONFIG_PATH)
# and the data volume at /data (STORAGE_PATH, DIA_STORAGE__BASE_PATH).
CMD ["node", "server.js"]
