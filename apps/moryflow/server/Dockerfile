# Dockerfile for /moryflow-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/server/Dockerfile

FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# 依赖安装阶段 - 安装所有依赖（用于构建）
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/moryflow/server/package.json ./apps/moryflow/server/
COPY packages/api/package.json ./packages/api/
COPY packages/types/package.json ./packages/types/
COPY packages/sync/package.json ./packages/sync/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/server...

# 生产依赖阶段 - 仅安装生产依赖
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/moryflow/server/package.json ./apps/moryflow/server/
COPY packages/api/package.json ./packages/api/
COPY packages/types/package.json ./packages/types/
COPY packages/sync/package.json ./packages/sync/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/server... --prod

# 构建阶段
FROM deps AS builder
COPY apps/moryflow/server ./apps/moryflow/server
COPY packages/api ./packages/api
COPY packages/types ./packages/types
COPY packages/sync ./packages/sync
COPY tooling/typescript-config ./tooling/typescript-config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json tsconfig.agents.json ./

# 构建 types 包（api 构建前置）
WORKDIR /app/packages/types
RUN pnpm build

# 构建 sync 包
WORKDIR /app/packages/sync
RUN pnpm build

# 构建 api 包（server 构建前置）
WORKDIR /app/packages/api
RUN pnpm build

WORKDIR /app/apps/moryflow/server

# 为 Prisma 生成提供占位符环境变量（运行时会被真实值覆盖）
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

# 生成 Prisma Client
RUN pnpm exec prisma generate

# 构建应用
RUN pnpm build

# 生产运行阶段
FROM base AS runner
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 设置 pnpm 全局目录
ENV PNPM_HOME="/home/nestjs/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p $PNPM_HOME && chown -R nestjs:nodejs $PNPM_HOME

USER nestjs

# 以 nestjs 用户安装 prisma CLI
RUN pnpm add -g prisma

WORKDIR /app

# 复制根目录 node_modules（包含 .pnpm，保持符号链接结构完整）
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/moryflow/server/node_modules ./apps/moryflow/server/node_modules

# 复制 sync 包（运行时依赖）
COPY --from=builder --chown=nestjs:nodejs /app/packages/sync/dist ./packages/sync/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/sync/package.json ./packages/sync/
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/package.json ./packages/types/
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/package.json ./packages/api/

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/moryflow/server/dist ./apps/moryflow/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/moryflow/server/generated ./apps/moryflow/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/moryflow/server/prisma ./apps/moryflow/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/moryflow/server/package.json ./apps/moryflow/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/moryflow/server/prisma.config.ts ./apps/moryflow/server/
COPY --chown=nestjs:nodejs apps/moryflow/server/docker-entrypoint.sh ./apps/moryflow/server/

WORKDIR /app/apps/moryflow/server

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
