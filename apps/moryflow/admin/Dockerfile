# Dockerfile for @moryflow/admin
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/admin/Dockerfile

# 构建阶段
FROM node:20-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖文件
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/moryflow/admin/package.json ./apps/moryflow/admin/
COPY packages/api/package.json ./packages/api/
COPY packages/model-registry-data/package.json ./packages/model-registry-data/
COPY packages/sync/package.json ./packages/sync/
COPY packages/types/package.json ./packages/types/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/

# 安装依赖（使用 --ignore-scripts 跳过根目录的 postinstall，因为 admin 不依赖这些包）
RUN pnpm install --no-frozen-lockfile --ignore-scripts \
  --filter @moryflow/admin... \
  --filter @moryflow/model-registry-data... \
  --filter @moryflow/types...

# 复制源代码
COPY apps/moryflow/admin ./apps/moryflow/admin
COPY packages/api ./packages/api
COPY packages/model-registry-data ./packages/model-registry-data
COPY packages/sync ./packages/sync
COPY packages/types ./packages/types
COPY tooling/typescript-config ./tooling/typescript-config

# 先构建依赖的 workspace 包
WORKDIR /app/packages/model-registry-data
RUN pnpm build

WORKDIR /app/packages/types
RUN pnpm build

WORKDIR /app/packages/sync
RUN pnpm build

WORKDIR /app/packages/api
RUN pnpm build

WORKDIR /app/apps/moryflow/admin

# 构建生产版本
# 注意：环境变量在构建时注入，Vite 会将 VITE_* 变量嵌入到静态文件中
ARG VITE_API_URL=https://server.moryflow.com
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# 生产运行阶段 - 使用 Nginx 提供静态文件服务
FROM nginx:alpine AS runner

# 复制自定义 Nginx 配置
COPY apps/moryflow/admin/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/apps/moryflow/admin/dist /usr/share/nginx/html

# 添加健康检查脚本
RUN apk add --no-cache curl

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
