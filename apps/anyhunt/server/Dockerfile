# Dockerfile for @anyhunt/anyhunt-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/server/Dockerfile

# 使用 slim 而非 alpine，因为 Playwright 需要 glibc
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Prisma 在容器内需要 OpenSSL 以正确选择 engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =============================================================================
# builder: install + build dependency closure + deploy runtime files
# =============================================================================
FROM base AS builder

# 统一复制 workspace，避免手工白名单导致依赖漂移
COPY . .

# 固定 hoisted node_modules，统一容器内依赖解析行为
RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false

# 按依赖闭包构建 server（包含 @moryflow/api 等运行时依赖包）
RUN pnpm --filter @anyhunt/anyhunt-server... build

# 导出运行时目录，彻底避免手工拷贝 workspace 依赖
WORKDIR /app
RUN pnpm --filter @anyhunt/anyhunt-server deploy --prod /opt/anyhunt-server

# Fail-fast: Prisma generated client version must equal runtime @prisma/client/prisma
RUN node /app/scripts/assert-prisma-runtime-version.cjs \
  /opt/anyhunt-server/dist/generated/prisma-main/internal/class.js \
  /opt/anyhunt-server/node_modules/@prisma/client/package.json \
  /opt/anyhunt-server/node_modules/prisma/package.json \
  && node /app/scripts/assert-prisma-runtime-version.cjs \
  /opt/anyhunt-server/dist/generated/prisma-vector/internal/class.js \
  /opt/anyhunt-server/node_modules/@prisma/client/package.json \
  /opt/anyhunt-server/node_modules/prisma/package.json

# =============================================================================
# runner: minimal runtime + playwright
# =============================================================================
FROM node:22-slim AS runner

ENV NODE_ENV=production

# 安装 Playwright 运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    fonts-liberation \
    fonts-noto-cjk \
    openssl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户（带 home 目录）
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nestjs

WORKDIR /app

COPY --from=builder /opt/anyhunt-server ./

RUN chown -R nestjs:nodejs /app \
    && chmod +x /app/docker-entrypoint.sh

USER nestjs

# 安装 Playwright 浏览器
RUN npx playwright install chromium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
