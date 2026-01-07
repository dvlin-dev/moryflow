# Dockerfile for @aiget/aiget-server
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/aiget/server/Dockerfile

FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# =============================================================================
# deps: install workspace deps required for building this app
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/aiget/server/package.json ./apps/aiget/server/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @aiget/aiget-server...

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

RUN pnpm exec prisma generate
RUN pnpm build

# =============================================================================
# runner: minimal runtime + prisma cli for db push
# =============================================================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

ENV PNPM_HOME="/home/nestjs/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p $PNPM_HOME && chown -R nestjs:nodejs $PNPM_HOME

USER nestjs

# entrypoint uses `prisma db push`
RUN pnpm add -g prisma

WORKDIR /app

COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/aiget/server/node_modules ./apps/aiget/server/node_modules

COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/dist ./apps/aiget/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/generated ./apps/aiget/server/generated
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/prisma ./apps/aiget/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/package.json ./apps/aiget/server/
COPY --from=builder --chown=nestjs:nodejs /app/apps/aiget/server/prisma.config.ts ./apps/aiget/server/
COPY --chown=nestjs:nodejs apps/aiget/server/docker-entrypoint.sh ./apps/aiget/server/

WORKDIR /app/apps/aiget/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]

