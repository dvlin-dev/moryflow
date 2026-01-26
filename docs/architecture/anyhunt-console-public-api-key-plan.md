---
title: Anyhunt Dev Console 公共 API 化与 API Key 明文存储方案
date: 2026-02-01
scope: apps/anyhunt/server, apps/anyhunt/console
status: active
---

## 背景与现状

- Console 既有 Session 管理接口（`/api/v1/console/*`）用于 API Key 管理。
- Console 之前存在专用代理（Console Playground）转发公网能力，前端以 `apiKeyId` 调用。
- 公网能力已覆盖 Fetchx/Memox/Agent/Browser/Digest/OEmbed 等模块。
- API Key 之前仅存 hash/prefix，前端无法复制完整 Key。

## 目标

1. Console 直接调用公网 API，不再依赖 Console 代理接口。
2. 公网 API 统一使用 `Authorization: Bearer <apiKey>`。
3. API Key 明文存储（`keyValue`），列表接口返回完整 Key，前端负责脱敏显示与复制。
4. Console 默认使用第一把可用 Key（`isActive desc, createdAt desc`）。
5. 不做历史兼容，可直接重置数据库并重新初始化。
6. 删除无用代码与代理路径。

## 非目标

- 不调整计费模型或配额策略。
- 不做业务线互通（Anyhunt Dev / Moryflow 仍隔离）。
- 不保留旧 Console Session API 兼容层（仅保留 API Key 管理）。

## 最终方案（已确定）

### API 路由与鉴权

- **管理面（Session）**
  - `POST /api/v1/console/api-keys`
  - `GET /api/v1/console/api-keys`
  - `PATCH /api/v1/console/api-keys/:id`
  - `DELETE /api/v1/console/api-keys/:id`

- **公网 API（ApiKeyGuard）**
  - Fetchx：`/api/v1/scrape`、`/api/v1/crawl`、`/api/v1/map`、`/api/v1/extract`、`/api/v1/search`、`/api/v1/batch/scrape`
  - Browser：`/api/v1/browser/session/*`
  - Agent：`/api/v1/agent/*`（含 `/api/v1/agent/models`）
  - Digest：`/api/v1/digest/*`
  - Webhooks：`/api/v1/webhooks`
  - OEmbed：`/api/v1/oembed`

### API Key 存储与返回

- Prisma `ApiKey` 使用明文字段 `keyValue`（unique）。
- 移除 `keyHash` 与 `keyPrefix` 的持久化字段。
- 列表接口直接返回 `key`，前端脱敏展示（`prefix + ****** + suffix`）。
- 接口响应设置 `Cache-Control: no-store`，避免缓存明文 Key。

### Console 交互

- API Key 列表展示脱敏 Key，并提供 Copy 全量 Key。
- Playground/管理页面默认使用第一把 active Key。
- 无可用 Key 时提示前往 API Keys 页面创建。

### 数据重置与初始化

- 不做历史兼容，允许直接执行 DB reset（主库/向量库）。
- **不在启动时自动生成 Key**：用户登录 Console 后手动创建第一把 Key。

### 清理项

- 删除 Console Playground 代理模块与相关 DTO/路由。
- 移除前端 `apiKeyId` 传参与 `CONSOLE_PLAYGROUND_API` 常量。

## 风险与防护

- 明文存储属于明确权衡：
  - 仅通过 Session 管理接口读取 Key。
  - 响应禁止缓存（`no-store`）。
  - 日志中禁止输出 `keyValue`。

## 验收清单

1. Console 所有业务请求均改为公网 API + API Key 鉴权。
2. API Key 列表与创建接口返回完整 Key，前端脱敏展示与复制可用。
3. 无 Console Playground 代理模块残留。
4. 关键页面默认选择第一把 active Key。
5. `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过。
