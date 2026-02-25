# Dockerfile for /console
# 构建上下文：根目录 (.)
# Dockerfile 路径：apps/anyhunt/console/Dockerfile

FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json ./
COPY apps/anyhunt/console/package.json ./apps/anyhunt/console/
COPY packages/api/package.json ./packages/api/
COPY packages/sync/package.json ./packages/sync/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/embed/package.json ./packages/embed/
COPY packages/embed-react/package.json ./packages/embed-react/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/
COPY tooling/eslint-config/package.json ./tooling/eslint-config/

RUN pnpm install --no-frozen-lockfile --ignore-scripts --config.node-linker=hoisted --config.shamefully-hoist=false \
  --filter @anyhunt/console... \
  --filter @moryflow/types... \
  --filter @moryflow/typescript-config...

COPY apps/anyhunt/console ./apps/anyhunt/console
COPY packages/api ./packages/api
COPY packages/sync ./packages/sync
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY packages/embed ./packages/embed
COPY packages/embed-react ./packages/embed-react
COPY tooling/typescript-config ./tooling/typescript-config
COPY tooling/eslint-config ./tooling/eslint-config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.agents.json ./

WORKDIR /app/packages/types
RUN pnpm build

WORKDIR /app/packages/sync
RUN pnpm build

WORKDIR /app/packages/api
RUN pnpm build

WORKDIR /app/apps/anyhunt/console

ARG VITE_API_URL=https://server.anyhunt.app
ARG VITE_AUTH_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL

RUN pnpm build

FROM nginx:alpine AS runner

COPY apps/anyhunt/console/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/anyhunt/console/dist /usr/share/nginx/html

RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
