# Dockerfile for /moryflow-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/server/Dockerfile

FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# =============================================================================
# builder: install + build shared packages + build app + deploy runtime files
# =============================================================================
FROM base AS builder

# 统一复制 workspace，避免手工白名单导致依赖漂移
COPY . .

# 固定 hoisted node_modules，统一容器内依赖解析行为
RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false

# 统一构建共享包（model-bank + agents-* + types/api 等）
RUN pnpm build:packages

WORKDIR /app/apps/moryflow/server

# 为 Prisma 生成提供占位符环境变量（运行时会被真实值覆盖）
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm prisma:generate
RUN pnpm build

# 导出运行时目录，彻底避免手工拷贝 workspace 依赖
WORKDIR /app
RUN pnpm --filter @moryflow/server deploy --prod /opt/moryflow-server

# =============================================================================
# runner
# =============================================================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production

# 健康检查与 Prisma runtime 依赖
RUN apk add --no-cache wget openssl

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nestjs

WORKDIR /app

COPY --from=builder /opt/moryflow-server ./

RUN chown -R nestjs:nodejs /app \
    && chmod +x /app/docker-entrypoint.sh

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
