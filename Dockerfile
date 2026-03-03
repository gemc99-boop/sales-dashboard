# ── Stage 1: Build Vite frontend ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install all deps (including devDeps for Vite build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-slim AS runtime

WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend and server
COPY --from=builder /app/dist ./dist
COPY server.js .

# Environment defaults
ENV PORT=8080
ENV GOOGLE_CLOUD_PROJECT=instant-contact-479316-i4
ENV BIGQUERY_DATASET=zero_dataset
ENV BIGQUERY_TABLE=orders
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
