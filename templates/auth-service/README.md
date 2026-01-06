# Auth Service 模板

本模板用于快速落地一套可复用的 Auth 服务（独立部署），并与 `@aiget/auth-client` 配合完成注册/登录/刷新/登出与 Google/Apple 登录流程。

## 适用场景

- 新业务线需要独立用户系统（账号/Token/数据库隔离）。
- 需要快速复制一套“可部署 + 可复用”的认证服务。
- 计划开源，要求文档/配置/示例完整。

## 你会得到什么

- `/api/v1/auth/*` 标准化路由（Auth Facade）。
- Web/Native 统一的 refresh 行为（Cookie/响应体）。
- 可选 Google/Apple 登录（按业务线独立配置）。
- `@aiget/identity-db` 的 Prisma 数据模型与连接方式示例。

## 目录结构

```
src/
├── app.module.ts
├── main.ts
├── auth/
│   └── auth.module.ts
├── prisma/
│   └── prisma.module.ts
└── health/
    └── health.controller.ts
```

## 快速开始（本仓库内）

> 说明：`templates/` 默认不在 workspace 内。如需直接运行，请把模板移入 `apps/*/server` 或在 `pnpm-workspace.yaml` 中加入 `templates/*`。

```bash
cp .env.example .env

docker compose up -d

pnpm install
pnpm dev
```

## 快速开始（外部项目）

1. 复制 `templates/auth-service` 到你的项目根目录。
2. 将 `package.json` 内的 `@aiget/*` 依赖替换为可安装版本（已发布或本地路径）。
3. 准备数据库并同步 schema（详见下方“数据库”）。
4. 配置 `.env` 后启动服务。

## 数据库

- 使用 `@aiget/identity-db` 的 schema。
- 在本仓库内可直接执行：

```bash
pnpm --filter @aiget/identity-db prisma:push
```

> 外部项目请确保拿到 `identity-db` 的 schema（或复制 `packages/identity-db/prisma/schema.prisma`）。

## OAuth 配置

- Google：需要 `GOOGLE_CLIENT_ID` 与 `GOOGLE_CLIENT_SECRET`。
- Apple：需要 `APPLE_CLIENT_ID` 与 `APPLE_CLIENT_SECRET`（Apple JWT client secret）。

## 客户端接入

建议使用 `@aiget/auth-client`：

```ts
import { createAuthClient } from '@aiget/auth-client';

const auth = createAuthClient({
  baseUrl: 'https://app.moryflow.com/api/v1/auth',
  clientType: 'web',
});
```

## 示例配置

- `.env.example`：最小环境变量清单。
- `docker-compose.yml`：本地 Postgres 示例。

## 注意事项

- 生产环境必须设置 `TRUSTED_ORIGINS`，与前端域名保持一致。
- `COOKIE_DOMAIN` 用于跨子域 Cookie（生产环境建议配置成根域）。
- 需实现真实的 OTP 邮件发送逻辑（模板内仅占位）。
- Native 客户端需显式传 `X-Client-Type: native`。
