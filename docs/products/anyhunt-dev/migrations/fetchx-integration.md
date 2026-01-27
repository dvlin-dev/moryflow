---
title: Fetchx 接入方案（Anyhunt Dev 试点）
date: 2026-01-27
scope: anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: 现有 Anyhunt monorepo + external-repos/fetchx；两条业务线独立 Auth；零兼容改造
[OUTPUT]: Fetchx 官网/Console/Admin 的接入方案（含 apps 目录重构、Auth 方案、部署与验收）
[POS]: Anyhunt Dev 产品线内迁移方案（Fetchx 试点）

[PROTOCOL]: 本文件变更需同步更新 `docs/products/anyhunt-dev/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Fetchx 接入方案（Anyhunt Dev 试点）

> 目标：以 Fetchx 为试点，先落地 Anyhunt Dev 的统一口径：
>
> - 官网：`anyhunt.app`（模块页：`/fetchx`）
> - 控制台：`console.anyhunt.app`
> - 管理后台：`admin.anyhunt.app`
> - API：`https://server.anyhunt.app/api/v1/*`
>
> **不做历史兼容与迁移**，Memox 暂不接入。

## 一、调研结论（现状）

### 1) 当前 monorepo 结构（已分层）

- 已存在：
  - `apps/anyhunt/www`：Anyhunt Dev 官网（模块页：`/fetchx`、`/memox`）
  - `apps/anyhunt/server`：Anyhunt Dev 统一后端（包含 Fetchx API，含自建 Auth 模块）
  - `apps/anyhunt/console`：Anyhunt Dev 用户控制台（来自 Fetchx console）
  - `apps/anyhunt/admin/www`：Anyhunt Dev 管理后台前端（来自 Fetchx admin）
  - `apps/moryflow/admin`：Moryflow 管理后台前端
- 约束：
  - `pnpm-workspace.yaml` 已支持 `apps/*/*/server`、`apps/*/*/www` 等路径

### 2) 外部仓库快照（可复用）

- `external-repos/fetchx/apps/console`：Fetchx 控制台（可作为 console 基础模板）
- `external-repos/fetchx/apps/admin`：Fetchx 管理后台（已迁入 `apps/anyhunt/admin/www`）
- `external-repos/fetchx/apps/www`：Fetchx 官网（已合并到 `apps/anyhunt/www`）
- `external-repos/fetchx/apps/server`：Fetchx 服务端（已迁入 `apps/anyhunt/server`）

### 3) 风险提示（当前差距）

- Fetchx 现有 Auth 与新方案冲突：需清理旧 Auth 逻辑，统一到 `apps/anyhunt/server/src/auth`。
- console/admin 已迁入，但需改造接入 Auth Client 与新域名。
- apps 目录重构会影响 workspace 匹配规则与构建脚本。

## 二、目标结构（按业务线分层）

```
apps/
├── anyhunt/
│   ├── server/           # Anyhunt Dev 统一后端（server.anyhunt.app/api/v1）
│   ├── www/              # Anyhunt Dev 官网（anyhunt.app；/fetchx、/memox）
│   ├── console/          # console.anyhunt.app 用户控制台（Web）
│   └── admin/
│       └── www/          # admin.anyhunt.app 管理后台（Web；API 复用 anyhunt/server）
└── moryflow/
    └── ...               # 现有 Moryflow 结构原样迁移
```

> 说明：Anyhunt Dev 统一 API 入口固定 `https://server.anyhunt.app/api/v1`；console/admin 作为独立 Web 前端跨域调用该 API。

## 三、接入目标（本次只做 Fetchx）

- 官网模块页：`anyhunt.app/fetchx` → `apps/anyhunt/www`
- 用户控制台：`console.anyhunt.app` → `apps/anyhunt/console`
- 管理后台：`admin.anyhunt.app` → `apps/anyhunt/admin/www`（API 走 `apps/anyhunt/server` 的 `/api/v1/admin/*`）
- API：Anyhunt Dev 统一后端（`https://server.anyhunt.app/api/v1/*`）
- Memox：暂不接入

## 四、接入方案（不兼容、从新方案落地）

### Phase 0：目录重构准备（已完成）

- 已完成 `apps/anyhunt` 与 `apps/moryflow` 分层。
- 已更新 `pnpm-workspace.yaml`（支持 `apps/*/*/server`、`apps/*/*/www`、`apps/*/*`）。
- 待检查 `turbo.json`（若有路径依赖或 cache key）。
- 已更新相关 CLAUDE 文档索引。

### Phase 1：Fetchx 官网接入（已迁入）

- Fetchx 官网已合并进 `apps/anyhunt/www`（路由：`/fetchx`）。
- 待补 `PUBLIC_BASE_URL` / API 基础地址配置。
- 待部署到 `anyhunt.app/fetchx`。

### Phase 2：Console 接入（用户控制台）

- `apps/anyhunt/console` 已完成迁入并接入内置 auth client（`apps/anyhunt/console/src/lib/auth-client.ts`）。
- 认证细节（已落地）：
  - `baseUrl=https://server.anyhunt.app/api/auth`
  - `clientType=web`
  - access token 仅内存，refresh token 走 HttpOnly Cookie
  - 401 时触发 refresh 重试一次
- 连接 Fetchx API：
  - `https://server.anyhunt.app/api/v1/*`（如 `/scrape`、`/crawl`、`/extract`、`/search`）
- 控制台能力优先级：
  - 注册/登录/退出
  - API Key 管理（生成/轮换/禁用）
  - 基础用量/配额信息展示

### Phase 3：Admin 接入（管理后台）

- `apps/anyhunt/admin/www` 已完成迁入并接入内置 auth client（`apps/anyhunt/admin/www/src/lib/auth-client.ts`，管理端 API 统一由 `apps/anyhunt/server` 提供）。
- 认证细节（已落地）：
  - `baseUrl=https://server.anyhunt.app/api/auth`
  - `clientType=web`
  - access token 仅内存，refresh token 走 HttpOnly Cookie
  - 401 时触发 refresh 重试一次
  - 登录需 `isAdmin=true`
- 管理功能优先级：
  - 用户管理
  - API Key 管理
  - 额度/订单/操作日志（若已有）

### Phase 4：Auth 模块统一（内置）

- 认证模块统一在 `apps/anyhunt/server/src/auth` 内维护（不再引入独立认证服务）。
- console/admin 统一走 accessToken（`/api/auth`）+ API Key 双轨鉴权。
- 统一配置 OAuth/域名/cookie 域相关环境变量（以 Anyhunt Dev 为准）。

### Phase 5：Fetchx Server 权限切换与清理

- 清理旧 Fetchx Auth 路由与中间件，确保 AuthGuard 与 ApiKeyGuard 生效。
- 对外能力保持 API Key (`Authorization: Bearer <apiKey>`) + 限流。

## 五、删除清单（零兼容）

- 删除 Fetchx 旧 Auth 模块与旧登录路由。
- 删除旧的跨业务线假设与“统一身份”文档描述。

## 六、部署与路由

- `anyhunt.app` → 官网（静态站）
- `server.anyhunt.app` → 统一 API（`/api/v1`）
- `anyhunt.app/fetchx` → Fetchx 模块页（`apps/anyhunt/www`）
- `console.anyhunt.app` → Console 前端（Web）
- `admin.anyhunt.app` → Admin 前端（Web）
- `server.anyhunt.app/api/auth/*` → Anyhunt Server Auth（内置）
- `server.anyhunt.app/api/v1/*` → Anyhunt Server（Fetchx 模块）

## 七、验收标准

- 官网可访问；控制台/管理后台可登录。
- 登录/刷新/登出全流程通过（Google/Apple 可选）。
- API Key 流程可用（生成/轮换/禁用）。
- JWT 与 API Key 权限边界清晰，不能跨业务线访问。

## 八、待补充调研项

- Fetchx console/admin 当前路由与 API 依赖清单（对照 external repo）。
- Fetchx Server 目前 API 分层与 admin 权限边界是否可直接复用。
- admin-server 是否已具备用户/订单/额度等必要能力（不足部分补齐）。
