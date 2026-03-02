# Dockerfile for /admin
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/admin/www/Dockerfile

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# 统一复制 workspace，避免手工白名单导致依赖漂移
COPY . .

# 固定 hoisted node_modules，统一容器内依赖解析行为
RUN pnpm install --frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false

# 统一构建共享包（model-bank + agents-* + types/api 等）
RUN pnpm build:packages

WORKDIR /app/apps/anyhunt/admin/www

ARG VITE_API_URL=https://server.anyhunt.app
ARG VITE_AUTH_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL

RUN pnpm build

FROM nginx:alpine AS runner

COPY apps/anyhunt/admin/www/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/anyhunt/admin/www/dist /usr/share/nginx/html

RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
