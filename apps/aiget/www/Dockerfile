# Dockerfile for @aiget/aiget-www (TanStack Start SSR)
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/aiget/www/Dockerfile

FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

WORKDIR /app

# =============================================================================
# deps
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/www/package.json ./apps/aiget/www/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @aiget/aiget-www...

# =============================================================================
# builder
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/aiget/www/node_modules ./apps/aiget/www/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/www ./apps/aiget/www
COPY packages/ui ./packages/ui

WORKDIR /app/apps/aiget/www

RUN pnpm build

# =============================================================================
# prod-deps (for externals)
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/www/package.json ./apps/aiget/www/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --filter @aiget/aiget-www...

# =============================================================================
# runner
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/aiget/www/node_modules ./apps/aiget/www/node_modules

COPY --from=builder /app/apps/aiget/www/.output ./apps/aiget/www/.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/apps/aiget/www

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

