# Dockerfile for @anyhunt/anyhunt-www (TanStack Start SSR)
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/www/Dockerfile

FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# =============================================================================
# deps
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/www/package.json ./apps/anyhunt/www/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/anyhunt-www...

# =============================================================================
# builder
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/anyhunt/www/node_modules ./apps/anyhunt/www/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/www ./apps/anyhunt/www
COPY packages/ui ./packages/ui

WORKDIR /app/apps/anyhunt/www

RUN pnpm build

# =============================================================================
# prod-deps (for externals)
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/www/package.json ./apps/anyhunt/www/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/anyhunt-www...

# =============================================================================
# runner
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/anyhunt/www/node_modules ./apps/anyhunt/www/node_modules

COPY --from=builder /app/apps/anyhunt/www/.output ./apps/anyhunt/www/.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/apps/anyhunt/www

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
