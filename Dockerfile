# syntax=docker/dockerfile:1

# ---- builder ----------------------------------------------------------------
# Install all dependencies (postinstall runs `prisma generate`), then build.
FROM node:22-alpine AS builder
WORKDIR /app

# Copy manifests and Prisma schema first to exploit layer caching.
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Install all deps. The postinstall hook runs `prisma generate`,
# emitting the client to src/generated/prisma.
RUN npm ci

# Copy the rest of the source and build the Next.js standalone bundle.
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- migrator ---------------------------------------------------------------
# Dedicated image for the Kubernetes migration Job.
# Copies the full node_modules from the builder so the Prisma CLI has all of
# its runtime dependencies available without any manual cherry-picking.
FROM node:22-alpine AS migrator
WORKDIR /app

COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/prisma          ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated   ./src/generated

# ---- runner -----------------------------------------------------------------
# Minimal production image using the standalone output.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone bundle (includes a minimal node_modules and server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets and public directory must be copied alongside server.js
# (the standalone server serves them when a CDN is not in front)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

# ---- api-builder ------------------------------------------------------------
# Build the Rust API service as a separate target so it can be published as
# ghcr.io/<owner>/kiebex-api while the Next.js image remains unchanged.
FROM rust:1.95-slim AS api-builder
WORKDIR /app/backend

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/crates ./crates

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/backend/target \
    cargo build --locked --release -p api \
 && cp /app/backend/target/release/api /app/api

# ---- api-runner -------------------------------------------------------------
FROM debian:bookworm-slim AS api-runner
WORKDIR /app

ENV RUST_API_BIND_ADDR=0.0.0.0:4000
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --gid 1001 api \
 && useradd --uid 1001 --gid api --create-home --shell /usr/sbin/nologin api

COPY --from=api-builder --chown=api:api /app/api /app/api

USER api

EXPOSE 4000

CMD ["/app/api"]
