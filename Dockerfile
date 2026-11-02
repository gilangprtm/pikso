# syntax=docker/dockerfile:1
# Debian/glibc keeps sharp and @napi-rs/canvas on the same native ABI in all stages.
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
# Root postinstall copies the PDF worker, so its script must exist before npm ci.
COPY scripts/copy-pdf-worker.mjs ./scripts/copy-pdf-worker.mjs
RUN npm ci --include=dev --include=optional

# Keep production dependencies for both Next and the compiled bootstrap scripts.
FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --include=optional --ignore-scripts

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# No production credentials or database connectivity required during build.
RUN npm run build \
    && ./node_modules/.bin/tsc --target ES2022 --module commonjs --moduleResolution node \
       --rootDir . --outDir /app/bootstrap --skipLibCheck --esModuleInterop --types node \
       scripts/migrate.ts scripts/create-admin.ts \
    && rm -f .next/standalone/.env .next/standalone/.env.*

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_DIR=/app/storage

# Canvas font fallback; no browser or full PDF renderer required in the image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Bootstrap uses pg, Better Auth crypto and zod too. Include production deps only,
# with all PDF resources/native addons; no tsx/TypeScript needed at runtime.
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/bootstrap ./bootstrap
COPY --from=builder --chown=node:node /app/db ./db
COPY --chown=node:node scripts/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/storage /app/.next/cache \
    && chown node:node /app/storage /app/.next/cache
USER node
EXPOSE 3000

# Liveness only: DB readiness must be checked separately before public cutover.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
