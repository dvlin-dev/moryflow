# Dockerfile for @moryflow/server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/server/Dockerfile

FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依赖安装阶段 - 安装所有依赖（用于构建）
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared-sync/package.json ./packages/shared-sync/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/server...

# 生产依赖阶段 - 仅安装生产依赖
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared-sync/package.json ./packages/shared-sync/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/server... --prod

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared-sync/node_modules ./packages/shared-sync/node_modules
COPY apps/server ./apps/server
COPY packages/shared-sync ./packages/shared-sync
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.agents.json ./

# 构建 shared-sync 包
WORKDIR /app/packages/shared-sync
RUN pnpm build

WORKDIR /app/apps/server

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
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/server/node_modules ./apps/server/node_modules

# 复制 shared-sync 包（运行时依赖）
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-sync/dist ./packages/shared-sync/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-sync/package.json ./packages/shared-sync/
COPY --from=deps --chown=nestjs:nodejs /app/packages/shared-sync/node_modules ./packages/shared-sync/node_modules

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/generated ./apps/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/package.json ./apps/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma.config.ts ./apps/server/
COPY --chown=nestjs:nodejs apps/server/docker-entrypoint.sh ./apps/server/

WORKDIR /app/apps/server

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
