# Stage 1: Install production dependencies
FROM node:20-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build the application
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install heif-convert for HEIC/HEIF image support
RUN apt-get update && apt-get install -y --no-install-recommends \
    libheif-examples \
    libheif-plugin-libde265 \
  && rm -rf /var/lib/apt/lists/*

# Copy built application and production node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Create directories for data and config
RUN mkdir -p /app/data /app/config

EXPOSE 3000

CMD ["npm", "start"]
