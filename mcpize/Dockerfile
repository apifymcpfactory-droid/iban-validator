# Multi-stage build for minimal image size
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code (includes src/core/, synced from the repo-root shared core —
# see ../scripts/sync-core.mjs — and committed here so this directory is a fully
# self-contained Docker build context).
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Run as non-root user (Cloud Run best practice)
USER node

# Cloud Run requires PORT 8080
ENV PORT=8080
EXPOSE 8080

# Every validation is a synchronous, deterministic ISO 13616 check against a small
# bundled registry (~76 countries) — no network calls, no buffering, no per-request
# growth. bulk_check_iban caps at 1000 items, each a few hundred bytes; nothing here
# resembles the ~70MB-per-refresh problem that hit our sanctions-screening server.

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
