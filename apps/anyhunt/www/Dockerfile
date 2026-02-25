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

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json ./
COPY apps/anyhunt/www/package.json ./apps/anyhunt/www/
COPY packages/api/package.json ./packages/api/
COPY packages/sync/package.json ./packages/sync/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false \
  --filter @anyhunt/anyhunt-www... \
  --filter @moryflow/types... \
  --filter @moryflow/typescript-config...

# =============================================================================
# builder
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json ./
COPY apps/anyhunt/www ./apps/anyhunt/www
COPY packages/api ./packages/api
COPY packages/sync ./packages/sync
COPY packages/ui ./packages/ui
COPY packages/types ./packages/types
COPY tooling/typescript-config ./tooling/typescript-config

WORKDIR /app/packages/types
RUN pnpm build

WORKDIR /app/packages/sync
RUN pnpm build

WORKDIR /app/packages/api
RUN pnpm build

WORKDIR /app/apps/anyhunt/www

RUN pnpm build

# =============================================================================
# prod-deps (for externals)
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/www/package.json ./apps/anyhunt/www/
COPY packages/api/package.json ./packages/api/
COPY packages/sync/package.json ./packages/sync/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/anyhunt-www...

# =============================================================================
# runner
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/sync/dist ./packages/sync/dist
COPY --from=builder /app/packages/sync/package.json ./packages/sync/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

COPY --from=builder /app/apps/anyhunt/www/.output ./apps/anyhunt/www/.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/apps/anyhunt/www

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
