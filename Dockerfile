# ──────────────────────────────────────────────────────────
# Recipe Management — Multi-stage Docker build
#
# Single container serves both the API and static client.
# Designed for reproducible deployment across kitchen nodes.
#
# Follows Bun's official Docker guide (bun.sh/guides/ecosystem/docker):
# - Install deps in /temp for layer caching
# - Separate dev install (for build) from prod install (for runtime)
# - Alpine base for minimal image size (~50MB base vs ~800MB Debian)
# ──────────────────────────────────────────────────────────

FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

# ─── Stage 1: Install all dependencies (for building) ────
FROM base AS install

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/shared/package.json /temp/dev/packages/shared/
COPY packages/server/package.json /temp/dev/packages/server/
COPY packages/client/package.json /temp/dev/packages/client/
COPY packages/e2e/package.json /temp/dev/packages/e2e/
RUN cd /temp/dev && bun install --frozen-lockfile

# Separate production-only install in /temp/prod
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY packages/shared/package.json /temp/prod/packages/shared/
COPY packages/server/package.json /temp/prod/packages/server/
COPY packages/client/package.json /temp/prod/packages/client/
COPY packages/e2e/package.json /temp/prod/packages/e2e/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# ─── Stage 2: Build the client ───────────────────────────
FROM base AS build

COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/packages/shared/node_modules packages/shared/node_modules
COPY --from=install /temp/dev/packages/client/node_modules packages/client/node_modules

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/client/ ./packages/client/

RUN cd packages/client && bun run build

# ─── Stage 3: Production image ──────────────────────────
FROM base AS production

# Non-root user for security
RUN addgroup --system app && adduser --system --ingroup app --no-create-home app

# Copy production node_modules from install stage
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/packages/shared/node_modules packages/shared/node_modules
COPY --from=install /temp/prod/packages/server/node_modules packages/server/node_modules

# Copy workspace config + application source
COPY package.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Copy built client from build stage
COPY --from=build /usr/src/app/packages/client/dist ./packages/client/dist

# Create data directory for SQLite with proper permissions
RUN mkdir -p /usr/src/app/data && chown -R app:app /usr/src/app/data

USER app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/usr/src/app/data/recipe-management.db
ENV STATIC_DIR=packages/client/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD bun -e "const r = await fetch('http://localhost:3000/api/health'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", "run", "packages/server/src/index.ts"]
