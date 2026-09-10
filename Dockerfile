# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY bun.lock* ./
RUN bun install

# Stage 2: Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# Stage 3: Lightweight Production Runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3200
ENV HOSTNAME="0.0.0.0"
ENV TZ="Asia/Kolkata"
ENV TIMEZONE="Asia/Kolkata"
ENV NODE_OPTIONS="--max-old-space-size=40"

# Persistent data directory
RUN mkdir -p /app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data

EXPOSE 3200

CMD ["bun", "server.js"]
