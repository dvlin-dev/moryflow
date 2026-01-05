# Dockerfile for @moryflow/docs (TanStack Start SSR)
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/docs/Dockerfile

# =============================================================================
# Stage 1: 基础镜像
# =============================================================================
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# =============================================================================
# Stage 2: 安装依赖
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/docs/package.json ./apps/docs/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/docs...

# =============================================================================
# Stage 3: 构建应用
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules

COPY apps/docs ./apps/docs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

WORKDIR /app/apps/docs

RUN pnpm build

# =============================================================================
# Stage 4: 生产依赖（用于外部化模块）
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/docs/package.json ./apps/docs/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --prod --filter @moryflow/docs...

# =============================================================================
# Stage 5: 生产运行时
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

# 复制生产 node_modules（用于外部化的 React 等模块）
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/docs/node_modules ./apps/docs/node_modules

# 复制 Nitro 输出
COPY --from=builder /app/apps/docs/.output ./apps/docs/.output

# 运行时配置
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app/apps/docs

EXPOSE 3000

# 健康检查配置
# - interval: 每 30 秒检查一次
# - timeout: 每次检查最多等待 10 秒
# - start-period: 启动后 40 秒开始检查（给 SSR 应用足够启动时间）
# - retries: 连续 3 次失败才认为不健康
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
