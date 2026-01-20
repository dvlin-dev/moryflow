# Dockerfile for @anyhunt/anyhunt-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/server/Dockerfile

# 使用 slim 而非 alpine，因为 Playwright 需要 glibc
FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Prisma 在容器内需要 OpenSSL 以正确选择 engine（否则会警告并可能导致不兼容）
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =============================================================================
# builder: prisma generate + nest build
# =============================================================================
FROM base AS builder

# 先复制 manifests 以最大化 Docker layer cache（源码变更不会导致依赖层失效）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json ./
COPY apps/anyhunt/server/package.json ./apps/anyhunt/server/
COPY packages/agents-core/package.json ./packages/agents-core/
COPY packages/agents-model-registry/package.json ./packages/agents-model-registry/
COPY packages/agents-openai/package.json ./packages/agents-openai/

# 注意：不要在 stage 之间 COPY node_modules（workspace symlink 会被 Docker 解引用，导致 @anyhunt/* 变成“只剩 package.json”的空壳包）。
# 正确做法是在同一个 stage 内安装依赖，让 pnpm 生成的 workspace links 指向最终的 /app/packages/*。
RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/anyhunt-server...

# 再复制源码（依赖已缓存）
COPY packages/agents-core ./packages/agents-core
COPY packages/agents-model-registry ./packages/agents-model-registry
COPY packages/agents-openai ./packages/agents-openai
COPY apps/anyhunt/server ./apps/anyhunt/server

# Docker 构建中默认 `--ignore-scripts`，workspace 包不会自动生成 dist；
# 这里用 tsc-multi 正确生成 `.js`(CJS) + `.mjs`(ESM) 的 dist，匹配 packages/* 的 exports 约定。
#
# 注意：`@anyhunt/agents-openai` 依赖 `@anyhunt/agents-core` 的 dist（含 subpath exports），
# 必须先构建 agents-core，再构建 agents-openai；否则会在编译期出现 TS2307 等错误。
RUN cat > /app/tsc-multi.agents-core.json <<'EOF'
{
  "targets": [
    { "extname": ".js", "module": "commonjs", "moduleResolution": "node" },
    { "extname": ".mjs", "module": "esnext" }
  ],
  "projects": ["packages/agents-core/tsconfig.json"]
}
EOF

RUN pnpm dlx tsc-multi@1.1.0 --config /app/tsc-multi.agents-core.json

RUN cat > /app/tsc-multi.agents-model-registry.json <<'EOF'
{
  "targets": [
    { "extname": ".js", "module": "commonjs", "moduleResolution": "node" },
    { "extname": ".mjs", "module": "esnext" }
  ],
  "projects": ["packages/agents-model-registry/tsconfig.json"]
}
EOF

RUN pnpm dlx tsc-multi@1.1.0 --config /app/tsc-multi.agents-model-registry.json

RUN cat > /app/tsc-multi.agents-openai.json <<'EOF'
{
  "targets": [
    { "extname": ".js", "module": "commonjs", "moduleResolution": "node" },
    { "extname": ".mjs", "module": "esnext" }
  ],
  "projects": ["packages/agents-openai/tsconfig.json"]
}
EOF

RUN pnpm dlx tsc-multi@1.1.0 --config /app/tsc-multi.agents-openai.json

WORKDIR /app/apps/anyhunt/server

# 为 Prisma 生成提供占位符环境变量（运行时会被真实值覆盖）
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm prisma:generate
RUN pnpm build

# =============================================================================
# runner: minimal runtime + playwright
# =============================================================================
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
    # Prisma engine 检测/兼容性
    openssl \
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
    && chown -R nestjs:nodejs /home/nestjs \
    && mkdir -p /app \
    && chown -R nestjs:nodejs /app

USER nestjs

# 以 nestjs 用户安装 prisma CLI（用于入口脚本迁移）
RUN pnpm add -g prisma

WORKDIR /app

# 安装生产依赖（避免跨 stage COPY node_modules 导致 workspace symlink 被解引用）
COPY --chown=nestjs:nodejs pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --chown=nestjs:nodejs apps/anyhunt/server/package.json ./apps/anyhunt/server/
COPY --chown=nestjs:nodejs packages/agents-core/package.json ./packages/agents-core/
COPY --chown=nestjs:nodejs packages/agents-model-registry/package.json ./packages/agents-model-registry/
COPY --chown=nestjs:nodejs packages/agents-openai/package.json ./packages/agents-openai/

RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false --filter @anyhunt/anyhunt-server... --prod \
    # 重建 Sharp 以获取正确的原生模块（WebP/SVG 支持）
    && cd apps/anyhunt/server && pnpm rebuild sharp

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/dist ./apps/anyhunt/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/generated ./apps/anyhunt/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/prisma ./apps/anyhunt/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/package.json ./apps/anyhunt/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/prisma.main.config.ts ./apps/anyhunt/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/anyhunt/server/prisma.vector.config.ts ./apps/anyhunt/server/
COPY --from=builder --chown=nestjs:nodejs /app/packages/agents-core ./packages/agents-core
COPY --from=builder --chown=nestjs:nodejs /app/packages/agents-model-registry ./packages/agents-model-registry
COPY --from=builder --chown=nestjs:nodejs /app/packages/agents-openai ./packages/agents-openai
COPY --chown=nestjs:nodejs apps/anyhunt/server/docker-entrypoint.sh ./apps/anyhunt/server/
RUN chmod +x ./apps/anyhunt/server/docker-entrypoint.sh

WORKDIR /app/apps/anyhunt/server

# 安装 Playwright 浏览器
RUN npx playwright install chromium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
