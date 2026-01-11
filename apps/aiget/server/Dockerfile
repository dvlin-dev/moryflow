# Dockerfile for @aiget/aiget-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/aiget/server/Dockerfile

# 使用 slim 而非 alpine，因为 Playwright 需要 glibc
FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# =============================================================================
# deps: 安装所有依赖（用于构建）
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/server/package.json ./apps/aiget/server/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @aiget/aiget-server...

# =============================================================================
# prod-deps: 仅安装生产依赖（用于运行时）
# =============================================================================
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/server/package.json ./apps/aiget/server/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @aiget/aiget-server... --prod \
    # 重建 Sharp 以获取正确的原生模块（WebP/SVG 支持）
    && cd apps/aiget/server && pnpm rebuild sharp

# =============================================================================
# builder: prisma generate + nest build
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/aiget/server/node_modules ./apps/aiget/server/node_modules

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/aiget/server ./apps/aiget/server

WORKDIR /app/apps/aiget/server

# 为 Prisma 生成提供占位符环境变量（运行时会被真实值覆盖）
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm prisma:generate
RUN pnpm build

# =============================================================================
# runner: minimal runtime + playwright
# =============================================================================
FROM node:20-slim AS runner

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
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# 创建非 root 用户（带 home 目录）
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nestjs

# 设置 pnpm 和 corepack 目录权限
ENV PNPM_HOME="/home/nestjs/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p $PNPM_HOME /home/nestjs/.cache \
    && chown -R nestjs:nodejs /home/nestjs

USER nestjs

WORKDIR /app

# 复制生产依赖（从 prod-deps）
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/aiget/server/node_modules ./apps/aiget/server/node_modules

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/dist ./apps/aiget/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/generated ./apps/aiget/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/prisma ./apps/aiget/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/package.json ./apps/aiget/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/prisma.main.config.ts ./apps/aiget/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/prisma.vector.config.ts ./apps/aiget/server/
COPY --chown=nestjs:nodejs apps/aiget/server/docker-entrypoint.sh ./apps/aiget/server/
RUN chmod +x ./apps/aiget/server/docker-entrypoint.sh

WORKDIR /app/apps/aiget/server

# 安装 Playwright 浏览器（仅 chromium）
RUN npx playwright install chromium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
