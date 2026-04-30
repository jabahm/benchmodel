FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ sqlite-dev
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate
RUN pnpm install --frozen-lockfile || pnpm install

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++ sqlite-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9.15.3 --activate
RUN pnpm build

FROM node:20-alpine AS runtime
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3737
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/data.db

RUN mkdir -p /data
VOLUME ["/data"]

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

EXPOSE 3737
CMD ["node", "server.js"]
