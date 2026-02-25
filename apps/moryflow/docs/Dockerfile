# Dockerfile for @moryflow/docs (TanStack Start SSR)
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/docs/Dockerfile

# =============================================================================
# Stage 1: 基础镜像
# =============================================================================
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# =============================================================================
# Stage 2: 安装依赖
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json .npmrc ./
COPY apps/moryflow/docs/package.json ./apps/moryflow/docs/
COPY packages/api/package.json ./packages/api/
COPY packages/sync/package.json ./packages/sync/
COPY packages/types/package.json ./packages/types/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/

RUN pnpm install --no-frozen-lockfile --ignore-scripts \
  --filter @moryflow/docs... \
  --filter @moryflow/types... \
  --filter @moryflow/typescript-config...

# =============================================================================
# Stage 3: 构建应用
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

COPY scripts ./scripts
COPY apps/moryflow/docs ./apps/moryflow/docs
COPY packages/api ./packages/api
COPY packages/sync ./packages/sync
COPY packages/types ./packages/types
COPY tooling/typescript-config ./tooling/typescript-config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json .npmrc ./

WORKDIR /app/packages/types
RUN pnpm build

WORKDIR /app/packages/sync
RUN pnpm build

WORKDIR /app/packages/api
RUN pnpm build

WORKDIR /app/apps/moryflow/docs

RUN pnpm build

# =============================================================================
# Stage 4: 生产依赖（用于外部化模块）
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/moryflow/docs/package.json ./apps/moryflow/docs/
COPY packages/api/package.json ./packages/api/
COPY packages/sync/package.json ./packages/sync/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --filter @moryflow/docs...

# =============================================================================
# Stage 5: 生产运行时
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

# 复制生产 node_modules（用于外部化的 React 等模块）
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/sync/dist ./packages/sync/dist
COPY --from=builder /app/packages/sync/package.json ./packages/sync/
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/

# 复制 Nitro 输出
COPY --from=builder /app/apps/moryflow/docs/.output ./apps/moryflow/docs/.output

# 运行时配置
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app/apps/moryflow/docs

EXPOSE 3000

# 健康检查配置
# - interval: 每 30 秒检查一次
# - timeout: 每次检查最多等待 10 秒
# - start-period: 启动后 40 秒开始检查（给 SSR 应用足够启动时间）
# - retries: 连续 3 次失败才认为不健康
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
