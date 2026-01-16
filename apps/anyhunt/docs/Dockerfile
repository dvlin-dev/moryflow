# Dockerfile for /docs (TanStack Start SSR)
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/docs/Dockerfile

FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# =============================================================================
# deps
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/docs/package.json ./apps/anyhunt/docs/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/docs...

# =============================================================================
# builder
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/anyhunt/docs/node_modules ./apps/anyhunt/docs/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY scripts ./scripts
COPY apps/anyhunt/docs ./apps/anyhunt/docs

WORKDIR /app/apps/anyhunt/docs

RUN pnpm build

# =============================================================================
# prod-deps (for externals)
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/anyhunt/docs/package.json ./apps/anyhunt/docs/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/docs...

# =============================================================================
# runner
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/anyhunt/docs/node_modules ./apps/anyhunt/docs/node_modules

COPY --from=builder /app/apps/anyhunt/docs/.output ./apps/anyhunt/docs/.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app/apps/anyhunt/docs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

