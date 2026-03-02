# Dockerfile for @moryflow/admin
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/moryflow/admin/Dockerfile

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# 统一复制 workspace，避免手工白名单导致依赖漂移
COPY . .

# 固定 hoisted node_modules，统一容器内依赖解析行为
RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false

# 统一构建共享包（model-bank + agents-* + types/api 等）
RUN pnpm build:packages

WORKDIR /app/apps/moryflow/admin

# 构建时环境变量（Vite 会将 VITE_* 变量嵌入到静态文件中）
ARG VITE_API_URL=https://server.moryflow.com
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

FROM nginx:alpine AS runner

COPY apps/moryflow/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/moryflow/admin/dist /usr/share/nginx/html

RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
