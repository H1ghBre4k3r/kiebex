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
