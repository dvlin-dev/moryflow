---
title: Anyhunt Server：Admin 动态配置 LLM Providers/Models（参考 Moryflow）
date: 2026-01-20
scope: apps/anyhunt/server
status: draft
---

## 背景

Anyhunt Server 的 Agent/LLM 能力需要支持：

- **网页端动态配置**：管理员可在 Admin 后台配置 provider（API Key、Base URL、启用状态）、模型映射与默认模型。
- **调用方简单**：调用接口时只需要传 `model`（可选）；未传时使用管理员配置的默认模型。
- **不考虑历史兼容**：旧的 LLM 策略字段与代码路径可直接删除。

> 参考 Moryflow：通过 `AiProvider/AiModel` 将 provider 的 `apiKey/baseUrl` 入库，并在服务端执行路由与校验。

## 目标与非目标

### 目标

1. Admin 后台可管理：
   - LLM Provider（`providerType/name/apiKey/baseUrl/enabled/sortOrder`）
   - LLM Model（对外 `modelId` 与对上游 `upstreamId` 的映射、启用状态）
   - 全局默认模型（`defaultAgentModelId` / `defaultExtractModelId`）
2. API 层形态：
   - `model?: string`：可选，不传则走 default
   - `output`：延续现有 `text/json_schema` 输出约定
3. 安全最佳实践：
   - provider API Key **不以明文**存库（使用服务端主密钥加密后存储）。

### 非目标

- 不实现前端页面（只提供后端 API）；前端可后续按接口接入。
- 不实现复杂定价/配额策略（仅完成“可用性与路由”）。
- 不实现多业务线共享（Anyhunt Dev 与 Moryflow 永不互通）。

## 数据模型（Anyhunt 主库）

### `LlmProvider`

用于管理员管理 provider 运行时配置（可启用多个 provider）。

- `providerType`: `openai | openai_compatible | openrouter`
- `apiKeyEncrypted`: 加密存储（服务端解密后用于请求）
- `baseUrl`: 可选（未填则使用 provider 默认）
- `enabled/sortOrder`

### `LlmModel`

用于将“对外模型名”映射到“上游实际模型名”，解决不同网关对 model id 规则差异。

- `modelId`: 对外标准模型名（例如 `gpt-4o`）
- `upstreamId`: 上游模型名（例如原生 OpenAI：`gpt-4o`；某些网关：`openai/gpt-4o`）
- `enabled`
- `providerId` 外键

### `LlmSettings`（单行）

- `defaultAgentModelId`: Agent 默认模型（对外标准模型名，如 `gpt-4o`）
- `defaultExtractModelId`: Extract 默认模型（对外标准模型名，如 `gpt-4o-mini`）

## 后端模块设计（SRP）

新增 `src/llm/` 模块，拆分职责：

1. `LlmAdminService`：
   - Provider/Model/Settings 的 CRUD（仅 Admin endpoint 调用）
   - 写入时做结构校验（providerType 合法、字段长度、modelId 唯一等）
2. `LlmSecretService`：
   - `encryptApiKey()/decryptApiKey()`（AES-256-GCM）
   - 主密钥来自环境变量 `ANYHUNT_LLM_SECRET_KEY`
3. `LlmUpstreamResolverService`：
   - 只负责“查库 + 选路由 + 解密密钥”，输出 `{ apiKey, baseUrl, upstreamModelId }`
4. `LlmRoutingService`（给 Agent 用）：
   - `resolveAgentModel(model?)` / `resolveExtractModel(model?)` → 返回 agents-core `Model`
5. `LlmOpenAiClientService`（给 OpenAI SDK 场景用，如 Extract）：
   - `resolveClient({ purpose, requestedModelId })` → 返回 OpenAI client + upstreamModelId

## API 设计

### Admin（需要 session 登录 + admin 权限）

- `GET /api/v1/admin/llm/settings`
- `PUT /api/v1/admin/llm/settings`
- `GET /api/v1/admin/llm/providers`
- `POST /api/v1/admin/llm/providers`
- `PATCH /api/v1/admin/llm/providers/:id`
- `DELETE /api/v1/admin/llm/providers/:id`
- `GET /api/v1/admin/llm/models`
- `POST /api/v1/admin/llm/models`
- `PATCH /api/v1/admin/llm/models/:id`
- `DELETE /api/v1/admin/llm/models/:id`

> 注意：任何接口返回中都 **不返回明文 apiKey**，最多返回 `apiKeyStatus: set/unset` 或 `maskedPrefix`。

### 业务调用方（Console Playground / Public Agent API）

- Agent 请求 DTO 增加 `model?: string`
- 若不传：
  - Agent 使用 `LlmSettings.defaultAgentModelId`
  - Extract 使用 `LlmSettings.defaultExtractModelId`

## 运行时规则（核心）

1. `requestedModel`：
   - Agent：`dto.model ?? settings.defaultAgentModelId`
   - Extract：`dto.model ?? settings.defaultExtractModelId`
2. 在 `LlmModel` 中查找所有 `enabled=true` 且 `modelId=requestedModel` 的记录，并关联 provider（且 provider.enabled=true）
3. 若 0 个：返回 400（英文错误信息）
4. 若 1 个：使用该 provider + upstreamId
5. 若 >1：
   - 选择 `LlmProvider.sortOrder` 最大的 provider

## 迁移计划（不考虑兼容）

Phase 1（本次）：

- [x] Prisma：新增 `LlmProvider/LlmModel/LlmSettings`；删除 `ApiKey.llm*` 字段
- [x] Server：新增 `llm/` 模块与 Admin API
- [x] Agent：改为从 `LlmRoutingService` 获取 provider/model，不再读取 ApiKey LLM 字段
- [x] Extract：改为从 `LlmOpenAiClientService` 获取 OpenAI client，不再读取 OpenAI baseUrl/model env
- [x] 单测：覆盖路由选择（默认模型/歧义/不可用/disabled provider）与加解密

Phase 2（后续）：

- [ ] Admin Web：增加 LLM 配置页面
- [ ] Console：模型选择器（可选；不选则用 default）
