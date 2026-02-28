---
title: Anyhunt 核心边界与身份约束
date: 2026-02-28
scope: anyhunt.app, server.anyhunt.app
status: active
---

# 核心边界

- Anyhunt 与 Moryflow 永不互通，不共享账号、Token、数据库。
- Anyhunt API 统一入口：`https://server.anyhunt.app/api/v1`。
- 统一域名职责：
  - `anyhunt.app`：官网。
  - `server.anyhunt.app`：API。
  - `console.anyhunt.app`：开发者控制台。
  - `admin.anyhunt.app`：管理后台。
  - `docs.anyhunt.app`：对外产品文档站。

## 鉴权与身份

- Session 通道：`/api/v1/app/*`。
- 公共通道：`/api/v1/public/*`。
- API Key 通道：`/api/v1/*`（对外能力）。
- 旧路径 `console/*` 与旧 `digest/*` ApiKey 路由已移除，不做兼容。

## 租户与配额

- API Key 头：`Authorization: Bearer <apiKey>`。
- `tenantId` 由 apiKey 服务端推导，不信任客户端传入。
- Memox 查询默认要求 `namespace + externalUserId`，避免跨域召回。
- 配额策略使用动态策略集（`qps`、`concurrency`、`dailyWriteLimit`、`monthlyRequestLimit` 等）。

## 请求日志治理

- 统一日志为中间件自动采集，不允许业务代码散落埋点。
- 日志保留 30 天，按日清理。
- 严禁落库敏感字段：Authorization 原值、Cookie、请求/响应 body 明文。

## 文档治理约束（已生效）

- `archive` 不是文档保留机制；无价值历史文档直接删除。
- 删除前必须先把有效事实回写到当前文档。
