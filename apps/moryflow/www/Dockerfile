# Dockerfile for @moryflow/www
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/www/Dockerfile
#
# TanStack Start SSR 应用（Nitro 输出是自包含的）

# 基础镜像
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
WORKDIR /app

# 依赖安装阶段
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/moryflow/www/package.json ./apps/moryflow/www/
COPY packages/ui/package.json ./packages/ui/

# 安装依赖（包含 /ui 组件库）
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter @moryflow/www...

# 构建阶段
FROM base AS builder

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/moryflow/www/node_modules ./apps/moryflow/www/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# 复制源代码
COPY apps/moryflow/www ./apps/moryflow/www
COPY packages/ui ./packages/ui
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# 构建 www 应用（/ui 直接导出 TS 源码，Vite 会处理）
WORKDIR /app/apps/moryflow/www

# 构建时环境变量（Vite 会将 VITE_* 变量嵌入到静态文件中）
ARG VITE_API_URL=https://server.moryflow.com
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# 生产运行阶段 - Nitro 输出是自包含的，不需要 node_modules
FROM node:22-slim AS runner

WORKDIR /app

# 复制构建产物（Nitro 输出是自包含的）
COPY --from=builder /app/apps/moryflow/www/.output ./.output

# 运行时环境变量
ENV NODE_ENV=production
ENV PORT=3000
# 关键：监听所有接口，否则 Docker 外部无法访问
ENV HOST=0.0.0.0

EXPOSE 3000

# 启动 Nitro SSR 服务器
CMD ["node", ".output/server/index.mjs"]
