# Dockerfile for @memai/server
# 构建上下文：根目录 (.)
# Dockerfile 路径：Dockerfile

# 使用 slim 而非 alpine，因为 Playwright 需要 glibc
FROM node:22-slim AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依赖安装阶段 - 安装所有依赖（用于构建）
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @memai/server...

# 生产依赖阶段 - 仅安装生产依赖
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @memai/server... --prod \
    # 重建 Sharp 以获取正确的原生模块（WebP/SVG 支持）
    && cd apps/server && pnpm rebuild sharp

# 构建阶段
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY apps/server ./apps/server
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

WORKDIR /app/apps/server

# 为 Prisma 生成提供占位符环境变量（运行时会被真实值覆盖）
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

# 生成 Prisma Client
RUN pnpm exec prisma generate

# 构建应用
RUN pnpm build

# 生产运行阶段
FROM node:22-slim AS runner
ENV NODE_ENV=production

# 安装 Playwright 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Playwright/Chromium 依赖
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    # 字体（截图渲染需要）
    fonts-liberation \
    fonts-noto-cjk \
    # wget 用于健康检查
    wget \
    # 清理
    && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 创建非 root 用户（带 home 目录）
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nestjs

# 设置 pnpm 和 corepack 目录权限
ENV PNPM_HOME="/home/nestjs/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p $PNPM_HOME /home/nestjs/.cache \
    && chown -R nestjs:nodejs /home/nestjs

USER nestjs

# 以 nestjs 用户安装 prisma CLI
RUN pnpm add -g prisma

WORKDIR /app

# 复制 node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/server/node_modules ./apps/server/node_modules

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/generated ./apps/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/package.json ./apps/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma.config.ts ./apps/server/
COPY --chown=nestjs:nodejs apps/server/docker-entrypoint.sh ./apps/server/
RUN chmod +x ./apps/server/docker-entrypoint.sh

WORKDIR /app/apps/server

# 安装 Playwright 浏览器（仅 chromium）
RUN npx playwright install chromium

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
