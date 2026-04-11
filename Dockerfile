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

# Also carry the Prisma schema: `prisma migrate deploy` (run as an init
# Job before the Deployment starts) needs it at the path the adapter expects.
COPY --from=builder --chown=nextjs:nodejs /app/prisma        ./prisma

# The Prisma CLI is not imported by the app so Next.js standalone tracing
# does not include it automatically. Copy it and the full @prisma scope
# explicitly so the migration Job can run `prisma migrate deploy` inside
# this image. @prisma/engines and its siblings (@prisma/engines-version,
# @prisma/get-platform, etc.) are all required by the CLI at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma  ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
