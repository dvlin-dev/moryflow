---
title: Anyhunt 核心边界与身份约束
date: 2026-03-07
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

## 协议主权与 Dogfooding

- `Mem0` 只作为功能和产品形态 benchmark，不作为 Anyhunt 的协议事实源。
- Anyhunt 对外售卖 API 的公开契约由 Anyhunt 自己定义和版本化。
- `Moryflow Server` 必须调用未来对外售卖的同一套 Memox 公网 API，不能再维护内部专用 memory 接口。
- `Moryflow PC` 不直接调用 Anyhunt Memox API，只调用 `Moryflow Server`。
- Moryflow 二期已冻结 `Moryflow Server -> Memox` 的 API Key 策略与 scope/source 映射；实现与 cutover 期间不得偏离该合同。

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
- 若 Moryflow 以服务端 gateway 形式接入，`apiKeyId` 与业务 scope 必须同时成文；不能只依赖其中一层表达隔离。

## Moryflow 二期冻结合同

### API Key 策略（固定）

- `Moryflow Server -> Memox` 采用“每环境一个服务 API Key”模型：`dev / staging / prod` 各自独立，`Moryflow PC` 不持有 Anyhunt API Key。
- 服务 key 仅存放在 `Moryflow Server` 机密存储；不得出现在 PC、日志、崩溃上报或同步 payload 中。
- 该 `apiKeyId` 表达的是 “Moryflow 环境级” 隔离，不表达单用户隔离；用户隔离必须继续依赖业务 scope。
- rotate 固定采用双 key：先发新 key、切换 `Moryflow Server`、验证通过、再 revoke 旧 key。
- 泄露处置固定为：先把旧 key 限流降为 0 或停用，再切换新 key 并 revoke 旧 key；如需追查影响范围，按该 `apiKeyId` 检查 request log、cleanup job 与 graph merge。
- 在 graph canonical merge 仍按 `apiKeyId` 归并的当前实现下，Moryflow Phase 2 固定关闭 graph：source / memory 写入不启用 graph projection，搜索请求固定 `include_graph_context = false`。

### Scope / Source Identity 映射（固定）

- `user_id = Moryflow userId`
- `project_id = Moryflow vaultId`
- `external_id = Moryflow fileId`
- `display_path = sync` 当前 canonical path
- `metadata.source_origin = 'moryflow_sync'`
- `metadata.content_hash =` 当前 `contentHash`
- `metadata.storage_revision =` 当前 `storageRevision`
- `source-identities` 一旦创建，`user_id / agent_id / app_id / run_id / org_id / project_id` 固定不可变；后续 resolve / upsert 必须重复证明所有已持久化的非空 scope 字段，缺失或不一致都返回 `409 SOURCE_IDENTITY_SCOPE_MISMATCH`；只允许更新 `title / display_path / mime_type / metadata`
- rename 只更新 `title / display_path / metadata`，不更换 `external_id`；delete 走 source delete，不通过 revoke API key 表达单文件删除。
- 若 `storageRevision + contentHash` 未变化，Moryflow bridge 只允许刷新 source identity，不创建 revision / finalize / reindex。
- `source_id` 只属于 Memox 资源标识；Moryflow 不建立本地长期 `source_id -> fileId` 事实表，稳定映射始终回到 `source_type + external_id`。

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
