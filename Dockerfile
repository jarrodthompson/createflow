# CreateFlow — shared image for the Next.js app and the background worker.
# Multi-stage: install deps, build, then a lean runtime that carries node_modules
# (incl. tsx for the worker) + the build output.

FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders so `next build` / env validation pass; overridden at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV SESSION_SECRET="build-time-placeholder-secret-0123456789abcdef"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Carry the whole built app (node_modules incl. tsx/prisma, .next, source, prisma/).
COPY --from=builder /app ./
EXPOSE 3000
# Default command runs the web app; the worker service overrides it.
CMD ["npm", "start"]
