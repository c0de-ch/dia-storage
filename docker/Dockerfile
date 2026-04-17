# Stage 1: Install production dependencies
FROM node:20.18-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build the application
FROM node:20.18-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:20.18-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# heif-convert for HEIC image support; postgresql-client for pg_dump/pg_restore
# used by the backup/restore scripts.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libheif-examples \
    libheif-plugin-libde265 \
    postgresql-client \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Non-root user for the app. UID 1001 avoids collisions with the node user
# (UID 1000) that the base image already ships.
RUN groupadd --system --gid 1001 appuser \
  && useradd --system --uid 1001 --gid appuser --home-dir /app --shell /usr/sbin/nologin appuser

COPY --from=builder --chown=appuser:appuser /app/.next ./.next
COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=appuser:appuser /app/package.json ./package.json
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules

RUN mkdir -p /app/data /app/config \
  && chown -R appuser:appuser /app/data /app/config

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/api/v1/health || exit 1

CMD ["npm", "start"]
