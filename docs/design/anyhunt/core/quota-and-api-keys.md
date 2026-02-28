---
title: Anyhunt Dev - 配额与 API Keys（tenantId + policy）
date: 2026-01-06
scope: anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: Anyhunt Dev 统一 API（server.anyhunt.app/api/v1）；控制台（console.anyhunt.app）管理策略；Memox/Agentsbox 等能力对外提供 API；支持 Google/Apple 登录；动态可调限流策略
[OUTPUT]: API Key、tenant、多租户隔离、namespace/metadata 约定与最小限流模型
[POS]: Anyhunt Dev 对外能力的安全与计量基座（不引入复杂计费）

[PROTOCOL]: 本文件变更时，需同步更新 `docs/design/anyhunt/core/auth-and-tokens.md`（索引与约束）。
-->

# 配额与 API Keys

本文件约定 Anyhunt Dev 对外能力（Memox/Agentsbox）的统一鉴权与隔离模型：**API Key + 动态策略**。

## 关键目标

- 对外 API 必须可控：可限流、可封禁、可审计。
- 企业/自有产品（例如 Moryflow）接入不特殊化：只是在控制台给更高策略。
- Memox 数据不串租户：隔离不依赖客户端传 `tenantId`。

## 鉴权（固定）

- Header：`Authorization: Bearer <apiKey>`
- 服务器行为：
  - 解析 apiKey → 定位 `apiKeyId`、`tenantId`、`scopes`、`status`
  - `tenantId` **只能从 apiKey 推导**（客户端不可传）

## tenant 与 apiKey

### tenantId 是什么

- `tenantId` 表示一个“客户/组织/产品方”的隔离与配额主体。
- 一个 `tenantId` 可以有多把 apiKey（dev/prod、不同服务账号等），共享同一套策略与用量统计。

### apiKeyId 是什么

- `apiKeyId` 是一把具体 key 的标识，用于轮换与追踪。
- 明文 apiKey 入库存储（`keyValue`），列表接口返回 `key`；控制台前端脱敏展示并禁止响应缓存。

## Memox 数据隔离（最小可用）

Memox 的每条数据至少绑定：

- `tenantId`（从 apiKey 推导）
- `namespace`（调用方自定义分区键；默认 `default`）
- `externalUserId`（调用方的用户标识，例如 moryflow userId）
- `metadata`（jsonb，自定义字段）

### namespace 与 metadata 的区别（固定）

- `namespace`：系统级分区键（稳定、可索引、强筛选）。
- `metadata`：自定义附加信息（可变、弱语义；筛选仅支持白名单字段）。

### 查询筛选建议

- 默认查询必须带：`namespace` + `externalUserId`（否则召回范围不可控）。
- 需要跨多个数据域时，允许 `namespaces: string[]`（服务端做 `IN (...)`）。
- metadata 过滤仅支持白名单字段（例如 `type/source/tags/docId`），避免 jsonb 任意索引导致复杂度爆炸。

## 动态限流策略（固定）

按 `tenantId` 绑定策略（示例字段）：

- `qps`
- `concurrency`
- `dailyWriteLimit`
- `monthlyRequestLimit`
- `maxTopK`
- `maxContentBytes`

控制台（`console.anyhunt.app`）允许你随时调整策略；所谓“企业版支持”只体现在策略值不同。

## Console 管理面约束（合并去重补充）

- API Key 列表可以返回完整 key，前端必须脱敏展示并提供复制能力。
- 响应需设置 `Cache-Control: no-store`，禁止缓存明文 key。
- 管理面与公网能力分层：管理走 Session（`/api/v1/app/*`），能力调用走 API Key（`Authorization: Bearer <apiKey>`）。
- Playground 不再依赖独立代理路径，统一直连公网 API。
