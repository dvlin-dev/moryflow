---
title: Fetchx 接入方案（Aiget Dev 试点）
date: 2026-01-06
scope: aiget.dev, server.aiget.dev
status: active
---

<!--
[INPUT]: 现有 Aiget monorepo + archive/external-repos/fetchx；两条业务线独立 Auth；零兼容改造
[OUTPUT]: Fetchx 官网/Console/Admin 的接入方案（含 apps 目录重构、Auth 方案、部署与验收）
[POS]: 用户系统接入文档（Fetchx 试点）

[PROTOCOL]: 本文件变更需同步更新 docs/features/index.md、docs/CLAUDE.md 与根 CLAUDE.md。
-->

# Fetchx 接入方案（Aiget Dev 试点）

> 目标：以 Fetchx 为试点，先落地 Aiget Dev 的统一口径：
>
> - 官网：`aiget.dev`（模块页：`/fetchx`）
> - 控制台：`console.aiget.dev`
> - 管理后台：`admin.aiget.dev`
> - API：`https://server.aiget.dev/api/v1/*`
>
> **不做历史兼容与迁移**，Memox 暂不接入。

## 一、调研结论（现状）

### 1) 当前 monorepo 结构（已分层）

- 已存在：
  - `apps/aiget/www`：Aiget Dev 官网（模块页：`/fetchx`、`/memox`）
  - `apps/aiget/server`：Aiget Dev 统一后端（包含 Fetchx API，含自建 Auth 模块）
  - `apps/aiget/console`：Aiget Dev 用户控制台（来自 Fetchx console）
  - `apps/aiget/admin/www`：Aiget Dev 管理后台前端（来自 Fetchx admin）
  - `apps/moryflow/admin`：Moryflow 管理后台前端
- 约束：
  - `pnpm-workspace.yaml` 已支持 `apps/*/*/server`、`apps/*/*/www` 等路径

### 2) 外部仓库快照（可复用）

- `archive/external-repos/fetchx/apps/console`：Fetchx 控制台（可作为 console 基础模板）
- `archive/external-repos/fetchx/apps/admin`：Fetchx 管理后台（已迁入 `apps/aiget/admin/www`）
- `archive/external-repos/fetchx/apps/www`：Fetchx 官网（已合并到 `apps/aiget/www`）
- `archive/external-repos/fetchx/apps/server`：Fetchx 服务端（已迁入 `apps/aiget/server`）

### 3) 风险提示（当前差距）

- Fetchx 现有 Auth 与新方案冲突：`apps/aiget/server/src/auth` 需删除并切到 `@aiget/auth-server` + Auth Service。
- console/admin 已迁入，但需改造接入 Auth Client 与新域名。
- apps 目录重构会影响 workspace 匹配规则与构建脚本。

## 二、目标结构（按业务线分层）

```
apps/
├── aiget/
│   ├── server/           # Aiget Dev 统一后端（server.aiget.dev/api/v1）
│   ├── www/              # Aiget Dev 官网（aiget.dev；/fetchx、/memox）
│   ├── console/          # console.aiget.dev 用户控制台（Web）
│   └── admin/
│       └── www/          # admin.aiget.dev 管理后台（Web；API 复用 aiget/server）
└── moryflow/
    └── ...               # 现有 Moryflow 结构原样迁移
```

> 说明：Aiget Dev 统一 API 入口固定 `https://server.aiget.dev/api/v1`；console/admin 作为独立 Web 前端跨域调用该 API。

## 三、接入目标（本次只做 Fetchx）

- 官网模块页：`aiget.dev/fetchx` → `apps/aiget/www`
- 用户控制台：`console.aiget.dev` → `apps/aiget/console`
- 管理后台：`admin.aiget.dev` → `apps/aiget/admin/www`（API 走 `apps/aiget/server` 的 `/api/v1/admin/*`）
- API：Aiget Dev 统一后端（`https://server.aiget.dev/api/v1/*`）
- Memox：暂不接入

## 四、接入方案（不兼容、从新方案落地）

### Phase 0：目录重构准备（已完成）

- 已完成 `apps/aiget` 与 `apps/moryflow` 分层。
- 已更新 `pnpm-workspace.yaml`（支持 `apps/*/*/server`、`apps/*/*/www`、`apps/*/*`）。
- 待检查 `turbo.json`（若有路径依赖或 cache key）。
- 已更新相关 CLAUDE 文档索引。

### Phase 1：Fetchx 官网接入（已迁入）

- Fetchx 官网已合并进 `apps/aiget/www`（路由：`/fetchx`）。
- 待补 `PUBLIC_BASE_URL` / API 基础地址配置。
- 待部署到 `aiget.dev/fetchx`。

### Phase 2：Console 接入（用户控制台）

- `apps/aiget/console` 已完成迁入并接入 `@aiget/auth-client`。
- 认证细节（已落地）：
  - `baseUrl=https://server.aiget.dev/api/v1/auth`
  - `clientType=web`
  - access token 仅内存，refresh token 走 HttpOnly Cookie
  - 401 时触发 refresh 重试一次
- 连接 Fetchx API：
  - `https://server.aiget.dev/api/v1/*`（如 `/scrape`、`/crawl`、`/extract`、`/search`）
- 控制台能力优先级：
  - 注册/登录/退出
  - API Key 管理（生成/轮换/禁用）
  - 基础用量/配额信息展示

### Phase 3：Admin 接入（管理后台）

- `apps/aiget/admin/www` 已完成迁入并接入 `@aiget/auth-client`（管理端 API 统一由 `apps/aiget/server` 提供）。
- 认证细节（已落地）：
  - `baseUrl=https://server.aiget.dev/api/v1/auth`
  - `clientType=web`
  - access token 仅内存，refresh token 走 HttpOnly Cookie
  - 401 时触发 refresh 重试一次
  - 登录需 `isAdmin=true`
- 管理功能优先级：
  - 用户管理
  - API Key 管理
  - 额度/订单/操作日志（若已有）

### Phase 4：Auth Service 落地

- 使用 `templates/auth-service` 部署 Aiget Dev 的 Auth：
  - `BETTER_AUTH_URL=https://server.aiget.dev/api/v1/auth`
  - `COOKIE_DOMAIN=.aiget.dev`
  - `TRUSTED_ORIGINS=https://console.aiget.dev,https://admin.aiget.dev`
- Google/Apple 登录按 Aiget Dev 独立配置。
- Fetchx Server 不再自带 auth 模块，仅做业务 API。

### Phase 5：Fetchx Server 与权限切换

- 移除 `apps/aiget/server/src/auth`，切到新 Auth/JWKS。
- 内部接口：`JwtGuard`（Auth Service 签发 access token）
- 对外能力：API Key (`Authorization: Bearer <apiKey>`) + 限流

## 五、删除清单（零兼容）

- 删除 Fetchx 旧 Auth 模块与旧登录路由。
- 删除旧的跨业务线假设与“统一身份”文档描述。

## 六、部署与路由

- `aiget.dev` → 官网（静态站）
- `server.aiget.dev` → 统一 API（`/api/v1`）
- `aiget.dev/fetchx` → Fetchx 模块页（`apps/aiget/www`）
- `console.aiget.dev` → Console 前端（Web）
- `admin.aiget.dev` → Admin 前端（Web）
- `server.aiget.dev/api/v1/auth/*` → Auth Service（同域挂载）
- `server.aiget.dev/api/v1/*` → Aiget Server（Fetchx 模块）

## 七、验收标准

- 官网可访问；控制台/管理后台可登录。
- 登录/刷新/登出全流程通过（Google/Apple 可选）。
- API Key 流程可用（生成/轮换/禁用）。
- JWT 与 API Key 权限边界清晰，不能跨业务线访问。

## 八、待补充调研项

- Fetchx console/admin 当前路由与 API 依赖清单（对照 external repo）。
- Fetchx Server 目前 API 分层与 admin 权限边界是否可直接复用。
- admin-server 是否已具备用户/订单/额度等必要能力（不足部分补齐）。
