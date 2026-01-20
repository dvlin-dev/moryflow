# LLM

> This folder structure changes require updating this document.

## Overview

Anyhunt Dev 的 LLM 配置与运行时路由模块：管理员在后台动态维护 Provider / Model / Default Models；运行时由 `LlmRoutingService` 为不同用途（Agent/Extract）解析请求的 `model`（可选）并构建可用的 LLM provider 实例（含 ModelProvider）。

## Responsibilities

- 管理后台（session + admin）对 LLM Provider/Model/Settings 的 CRUD
- Provider 凭证（`apiKey`）的加密入库与解密使用（AES-256-GCM）
- 运行时模型路由：
  - 用户请求不传 `model` → 按用途使用 `LlmSettings.defaultAgentModelId` / `LlmSettings.defaultExtractModelId`
  - 用户请求传 `model` → 解析为已启用的 `LlmModel`
  - provider/model 不可用 → fail-fast（在扣费/创建浏览器 session 前）
  - 同名 model 存在多个 provider → 选择 `LlmProvider.sortOrder` 最大的 provider

## Constraints

- `LlmProvider.apiKeyEncrypted` 只存密文，API 响应不得返回明文 apiKey
- 加密主密钥来自环境变量 `ANYHUNT_LLM_SECRET_KEY`（base64 32 bytes）
- 不在 API Key 上配置模型开关；API Key 仅用于鉴权与计费归属
- 不做历史兼容：旧的 API Key LLM policy 字段已移除

## File Structure

| File                               | Type       | Description                                    |
| ---------------------------------- | ---------- | ---------------------------------------------- |
| `llm.module.ts`                    | Module     | NestJS module definition                       |
| `llm-admin.controller.ts`          | Controller | Admin API：providers/models/settings           |
| `llm-admin.service.ts`             | Service    | Admin 业务逻辑 + Prisma 持久化                 |
| `llm-upstream-resolver.service.ts` | Service    | 查库/选路由/解密（共享解析器）                 |
| `llm-routing.service.ts`           | Service    | 运行时模型解析与 provider 构建                 |
| `llm-openai-client.service.ts`     | Service    | OpenAI SDK client 工厂（给 Extract）           |
| `llm-secret.service.ts`            | Service    | 加密/解密（AES-256-GCM）                       |
| `dto/*`                            | DTO        | Zod schemas + 推断类型（admin 输入）           |
| `llm.types.ts`                     | Types      | 运行时结构（ResolvedModel/ResolvedProvider）   |
| `__tests__/*`                      | Tests      | `LlmSecretService` 与 `LlmRoutingService` 单测 |

## Runtime Routing (High Level)

1. 业务模块读取 `model?`（可选）
2. `LlmRoutingService.resolveAgentModel(model?)` / `resolveExtractModel(model?)`：
   - 未传 → 使用对应用途的默认模型
   - 已传 → 查找 `LlmModel.modelId`
   - 校验 model/provider 启用状态
3. `LlmUpstreamResolverService` 负责查库/选路由/解密；上层再构建具体 provider/client
