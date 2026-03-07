---
title: Anyhunt Dev - 配额与 API Keys（hash-only + apiKeyId 隔离）
date: 2026-03-07
scope: anyhunt.app, server.anyhunt.app
status: active
---

<!--
[INPUT]: Anyhunt Dev 统一 API（server.anyhunt.app/api/v1）；控制台（console.anyhunt.app）管理策略；Memox/Agentsbox 对外 API Key 鉴权
[OUTPUT]: API Key 存储策略、鉴权链路、配额与 Memox 隔离口径
[POS]: Anyhunt Dev 对外能力的安全与计量事实源

[PROTOCOL]: 本文件变更时，需同步更新 `docs/design/anyhunt/core/auth-and-tokens.md`（索引与约束）。
-->

# 配额与 API Keys

本文件约定 Anyhunt Dev 对外能力（Memox/Agentsbox）的统一鉴权与隔离模型：**API Key + 动态策略**。

## 鉴权（固定）

- Header：`Authorization: Bearer <apiKey>`
- 服务端行为：
  - 对明文 key 做 SHA256
  - 通过 `keyHash` 查询有效 key
  - 解析出 `apiKeyId` 与用户身份信息

## API Key 存储策略（hash-only）

- 明文 key **不入库**。
- 主库存储字段：`keyHash`、`keyPrefix`、`keyTail`。
- 创建接口（`POST /api/v1/app/api-keys`）仅一次性返回 `plainKey`。
- 列表/更新接口只返回 `keyPreview`（如 `ah_****abcd`）。
- 响应必须 `Cache-Control: no-store`。

## Console Playground 口径

- 新建 key 后立刻使用返回的 `plainKey`（一次性）。
- 列表接口无法恢复明文；丢失后只能 rotate 新 key。
- 推荐在客户端本地 keyring 保存 `plainKey`（服务端不保存）。

## Memox 隔离口径（当前实现）

Memox 记录按 `apiKeyId` 做隔离，并使用以下业务字段组织语义空间：

- `user_id`
- `agent_id`
- `app_id`
- `run_id`
- `org_id`
- `project_id`
- `metadata`

> 当前实现不使用 `namespace + externalUserId` 作为协议主口径。

## 配额策略（固定）

按调用主体绑定动态策略（示例）：

- `qps`
- `concurrency`
- `dailyWriteLimit`
- `monthlyRequestLimit`
- `maxTopK`
- `maxContentBytes`

控制台（`console.anyhunt.app`）可动态调整策略；企业/内部接入仅表现为策略值差异。

## 管理面与公网能力分层

- 管理面：Session（`/api/v1/app/*`）
- 对外能力：API Key（`Authorization: Bearer <apiKey>`）
- Playground 直连公网 API，不引入独立代理层。
- `Moryflow Server` 也是这套公网 API 的正式消费者；它可以作为服务端网关转发 Moryflow 用户请求，但不能绕过公开协议再维护一套内部专用 memory 接口。

## Moryflow 二期接入约束

- `Moryflow PC` 不直接持有 Anyhunt API Key。
- `Moryflow Server` 对 Memox 固定采用“每环境一个服务 API Key”模型：`dev / staging / prod` 各自独立，server 侧持有，PC 不可见。
- `apiKeyId` 在二期固定表达“环境级隔离”；cleanup、graph canonical merge 与 request log 追踪都按该 `apiKeyId` 收口。
- 用户与文件隔离固定依赖稳定业务 scope，而不是额外拆分 API key：`user_id = userId`、`project_id = vaultId`、`external_id = fileId`、`display_path = canonical path`。
- 服务 key 的 rotate 固定采用双 key：先签发新 key、切换 `Moryflow Server`、验证通过、再 revoke 旧 key。
- 服务 key 的泄露处置固定为：先把旧 key 限流降为 0 或停用，再切新 key 并 revoke 旧 key；如需清理具体用户/文件数据，必须走 `user_id / project_id / external_id` 对应的数据删除链路，不能把 revoke 服务 key 当作单用户清理手段。
