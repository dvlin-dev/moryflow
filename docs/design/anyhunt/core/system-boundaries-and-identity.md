---
title: Anyhunt 核心边界与身份约束
date: 2026-03-06
scope: anyhunt.app, server.anyhunt.app
status: active
---

# 核心边界

- Anyhunt 与 Moryflow 永不互通，不共享账号、Token、数据库。
- Anyhunt API 统一入口：`https://server.anyhunt.app/api/v1`。
- 统一域名职责：
  - `anyhunt.app`：官网
  - `server.anyhunt.app`：API
  - `console.anyhunt.app`：开发者控制台
  - `admin.anyhunt.app`：管理后台
  - `docs.anyhunt.app`：文档站

## 鉴权与身份

- Session 通道：`/api/v1/app/*`
- 公共通道：`/api/v1/public/*`
- API Key 通道：`/api/v1/*`（对外能力）
- API Key 鉴权统一：`Authorization: Bearer <apiKey>`
- API Key 存储策略：hash-only（`keyHash/keyPrefix/keyTail`）

## Memox 身份与隔离（当前实现）

- 系统隔离维度：`apiKeyId`
- 业务维度字段：`user_id/agent_id/app_id/run_id/org_id/project_id`
- 辅助上下文：`metadata`
- 查询/写入协议以以上字段为准，不使用 `namespace + externalUserId` 口径。

## 配额与策略

- 配额策略采用动态策略集（`qps`、`concurrency`、`dailyWriteLimit`、`monthlyRequestLimit` 等）。
- 管理面策略调整走 Session 通道；公网能力调用走 API Key 通道。

## 请求日志治理

- 统一日志由中间件自动采集，不允许业务代码散落埋点。
- 日志保留 30 天，按日清理。
- 严禁落库敏感字段：Authorization 原值、Cookie、请求/响应 body 明文。

## 文档治理约束（已生效）

- `archive` 不是文档保留机制；无价值历史文档直接删除。
- 删除前必须先把有效事实回写到当前文档。
