---
title: Anyhunt API 通道与路由规范（app/public/apikey）
date: 2026-02-02
scope: anyhunt
status: implemented
---

<!--
[INPUT]: Anyhunt www/console/server 的认证通道与路由冲突现状
[OUTPUT]: app/public/apikey 三通道的路由与认证规范 + 迁移清单（不做兼容）
[POS]: Anyhunt 统一路由与鉴权入口规范

[PROTOCOL]: 本文件变更需同步更新 docs/design/index.md 与 docs/CLAUDE.md（若影响全局需更新根 CLAUDE.md）。
-->

# Anyhunt API 通道与路由规范（app/public/apikey）

## 背景

近期 Anyhunt Console API 改造将多条接口统一切换到 ApiKeyGuard，导致 www（C 端）仍使用 Session 鉴权的调用全部报错。根因是：

- 同一路径混用 ApiKey 与 Session 两种通道，且两者均使用 `Authorization: Bearer`。
- Digest 相关路由出现 **同路径/同方法重复声明**，造成路由覆盖与鉴权不确定性。
- `/api/v1/console/*` 已被移除，但前端仍在调用，导致 404。

因此需要明确三类访问通道，并通过 **路径隔离** 解决冲突。

## 目标

- 明确三条通道：**public（无登录）**、**app（Session）**、**apikey（API Key）**。
- www（C 端）与 console（开发者平台）统一使用 `app` 通道做用户级操作。
- 对外 API 服务统一走 `apikey` 通道（保持 `/api/v1/*`）。
- 公开话题内容无需登录，利于 SEO。
- **不做历史兼容**，旧路由直接删除。

## 非目标

- 不引入新的身份系统或计费模型。
- 不改变业务逻辑，仅调整路由与鉴权归属。

## 通道定义

| 通道   | 受众                   | 鉴权方式             | 路由前缀           | 备注                                  |
| ------ | ---------------------- | -------------------- | ------------------ | ------------------------------------- |
| public | SEO / 未登录访问       | 无                   | `/api/v1/public/*` | 只允许无登录访问的接口                |
| app    | www + console 登录用户 | Session access token | `/api/v1/app/*`    | `Authorization: Bearer <accessToken>` |
| apikey | 对外 API 服务          | ApiKeyGuard          | `/api/v1/*`        | `Authorization: Bearer <apiKey>`      |

> 说明：`Authorization: Bearer` 在 app 与 apikey 通道重复使用，但通过 **路径隔离** 明确语义。

## 路由规范

1. **public 通道**：所有无需登录的接口必须放入 `/api/v1/public/*`。
2. **app 通道**：所有 Session 鉴权接口必须放入 `/api/v1/app/*`。
3. **apikey 通道**：对外 API 服务保持在 `/api/v1/*`，不再与 public/app 混用。
4. **特殊路径保留**：
   - `/api/v1/auth/*`：认证相关（`version: '1'`）。
   - `/api/v1/admin/*`：后台管理（AdminGuard）。
   - `/health`：健康检查（版本中立）。
   - `/api/v1/webhooks/creem`：支付回调（`version: '1'`）。

## Digest 路由拆分（核心修复点）

### public（SEO 浏览）

- `GET /api/v1/public/digest/topics`
- `GET /api/v1/public/digest/topics/:slug`
- `GET /api/v1/public/digest/topics/:slug/editions`
- `GET /api/v1/public/digest/topics/:slug/editions/:editionId`
- `POST /api/v1/public/digest/topics/:slug/report`
- `GET /api/v1/public/digest/welcome`
- `GET /api/v1/public/digest/welcome/pages/:slug`

### app（用户操作）

- `GET /api/v1/app/digest/subscriptions`
- `POST /api/v1/app/digest/subscriptions`
- `PATCH /api/v1/app/digest/subscriptions/:id`
- `DELETE /api/v1/app/digest/subscriptions/:id`
- `POST /api/v1/app/digest/subscriptions/:id/toggle`
- `POST /api/v1/app/digest/subscriptions/:id/run`
- `GET /api/v1/app/digest/inbox`
- `GET /api/v1/app/digest/inbox/stats`
- `PATCH /api/v1/app/digest/inbox/:id`
- `POST /api/v1/app/digest/inbox/mark-all-read`
- `GET /api/v1/app/digest/inbox/:id/content`
- `GET /api/v1/app/digest/topics`
- `POST /api/v1/app/digest/topics`
- `PATCH /api/v1/app/digest/topics/:id`
- `DELETE /api/v1/app/digest/topics/:id`
- `POST /api/v1/app/digest/topics/:slug/follow`
- `DELETE /api/v1/app/digest/topics/:slug/follow`

### apikey（移除 Digest 旧路由）

- `DELETE`：`/api/v1/digest/*`（全部移除，防止与 public/app 冲突）

## app 通道路由归并（替代 console）

所有 Session 认证的控制台能力统一进入 `app` 前缀：

- `/api/v1/console/api-keys` → `/api/v1/app/api-keys`
- `/api/v1/user/*` → `/api/v1/app/user/*`
- `/api/v1/payment/*` → `/api/v1/app/payment/*`
- `/api/v1/console/digest/*` → `/api/v1/app/digest/*`（一次性替换）

## public 通道路由归并

- `/api/v1/demo/*` → `/api/v1/public/demo/*`
- `/api/v1/digest/welcome*` → `/api/v1/public/digest/welcome*`
- `/api/v1/digest/topics*`（公开浏览类） → `/api/v1/public/digest/topics*`

## apikey 通道（保持现状）

以下能力继续使用 ApiKeyGuard 且维持 `/api/v1/*`：

- Scraper/Crawler/Map/Extract/Search/Batch
- Browser/Agent
- Memox Memories/Entities/Exports/Feedback
- Webhooks/OEmbed/Quota

> 说明：该列表不含 Digest（已归入 app/public）。

## apps/anyhunt 需要同步修改的应用

> 本节以 **apps/anyhunt** 目录为范围，列出必须同步改造的应用，避免漏改。

### server

- 将 Session 认证接口迁移到 `/api/v1/app/*`（`user`、`payment`、`console/api-keys`、Digest 订阅/Inbox/用户 Topics）。
- public 端点迁移到 `/api/v1/public/*`（Digest public topics/welcome、Demo）。
- 移除 `/api/v1/console/*` 与 `/api/v1/digest/*`（旧 ApiKey 版本）。
- 更新 Swagger/OpenAPI 与模块内 `CLAUDE.md` 路由说明。

### www（C 端）

- public 内容：`/api/v1/public/digest/*`、`/api/v1/public/demo/*`。
- 登录用户操作：`/api/v1/app/digest/*`、`/api/v1/app/user/me`。

### console（开发者平台）

- Session 相关：`/api/v1/app/user/me`、`/api/v1/app/payment/*`。
- API Key 管理：`/api/v1/app/api-keys`。
- Playground 仍走 apikey 通道（`/api/v1/*`），无需改动。

### admin（运营后台）

- Session 相关：`/api/v1/app/user/me`（用于校验登录/权限）。
- 管理接口保持 `/api/v1/admin/*` 不变。

### docs（Anyhunt Dev Docs）

- 若存在示例或路径说明，统一替换为新前缀（`app/public/apikey`）。
- 若当前无引用，可跳过。

## 迁移清单（不做兼容）

### Server

- 新增 `/api/v1/public/*` 与 `/api/v1/app/*` 路由前缀。
- Digest：拆分 public 与 app 控制器；移除 `/api/v1/digest/*`（旧 ApiKey 版本）。
- Console：`api-keys` 路由移动至 `/api/v1/app/api-keys`。
- `user/payment` 路由统一归入 `/api/v1/app/*`。
- 更新 Swagger/OpenAPI 分组与安全声明。

### www

- Digest 公共浏览：改用 `/api/v1/public/digest/*`。
- Digest 用户操作：改用 `/api/v1/app/digest/*`。
- Demo/Playground：改用 `/api/v1/public/demo/*`。

### console

- API Key 管理改用 `/api/v1/app/api-keys`。
- Session 相关接口统一 `/api/v1/app/*`。

## 删除清单（无兼容）

- `/api/v1/console/*` 全部移除。
- `/api/v1/digest/*`（旧 ApiKey 版本）全部移除。
- 旧文档与示例中 `/api/v1/console/*`、`/api/v1/digest/*` 直连路径全部更新。

## 执行进度（按模块）

- ✅ server：app/public 路由拆分完成，旧路径移除，模块文档同步。
- ✅ www：public/app 路由切换完成，Digest/Demo 对齐。
- ✅ console：Session 路由统一 `/api/v1/app/*`，API Keys 管理迁移。
- ✅ admin：登录校验改为 `/api/v1/app/user/me`。
- ✅ docs：路径说明与示例已统一更新。

## 验证与发布

- 必须同时发布 server + www + console，避免路径不一致。
- 发布后验证：
  - www 未登录访问 public topics 可用
  - www 登录后订阅/收件箱可用
  - console 管理 API Key 可用
  - API Key 端点仍可调用（scrape/crawl/extract/search 等）

## 风险与控制

- **路由全量替换**：需要一次性部署三端，避免 404/401。
- **CORS**：确认 `ALLOWED_ORIGINS` 覆盖 `anyhunt.app` 与 `console.anyhunt.app`。
- **鉴权冲突**：通过路径隔离彻底消除 bearer 语义冲突。

## 执行计划（按步骤）

1. **Server 路由迁移**
   - 新增 app/public 前缀控制器与模块路由；移除 `/api/v1/console/*` 与 `/api/v1/digest/*` 旧路由。
   - 更新 `apps/anyhunt/server/**/CLAUDE.md` 路由说明。
2. **www 前端迁移**
   - public API 改为 `/api/v1/public/*`，用户操作改为 `/api/v1/app/*`。
3. **console 前端迁移**
   - Session 相关改为 `/api/v1/app/*`；API Key 管理改为 `/api/v1/app/api-keys`。
4. **admin 前端迁移**
   - 登录态 `user/me` 改为 `/api/v1/app/user/me`，其余 admin 路由不动。
5. **清理与验证**
   - 删除旧路径引用与示例；更新 docs 索引/CLAUDE。
   - 执行 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。
