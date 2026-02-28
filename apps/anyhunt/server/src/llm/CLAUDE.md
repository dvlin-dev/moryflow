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
- `LlmRoutingService` 使用 AI SDK + `@openai/agents-extensions` 进行模型适配
- Provider 类型：`openai` / `openai-compatible` / `openrouter` / `anthropic` / `google`

## File Structure

| File                               | Type       | Description                                                               |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `llm.module.ts`                    | Module     | NestJS module definition                                                  |
| `llm-admin.controller.ts`          | Controller | Admin API：providers/models/settings                                      |
| `llm-admin.service.ts`             | Service    | Admin 业务逻辑 + Prisma 持久化                                            |
| `llm.constants.ts`                 | Constants  | 默认模型与预设 Provider 列表                                              |
| `llm-upstream-resolver.service.ts` | Service    | 查库/选路由/解密（共享解析器）                                            |
| `llm-routing.service.ts`           | Service    | 运行时模型解析与 provider 构建                                            |
| `llm-language-model.service.ts`    | Service    | AI SDK LanguageModel 工厂（给 Extract/Digest）                            |
| `llm-secret.service.ts`            | Service    | 加密/解密（AES-256-GCM）                                                  |
| `llm.errors.ts`                    | Errors     | LLM 模块异常（unsupported provider）                                      |
| `dto/*`                            | DTO        | Zod schemas + 推断类型（admin 输入）                                      |
| `llm.types.ts`                     | Types      | 运行时结构（ResolvedModel/ResolvedProvider）                              |
| `providers/*`                      | Factory    | AI SDK 模型工厂实现                                                       |
| `__tests__/*`                      | Tests      | `LlmSecretService` / `LlmRoutingService` / `LlmLanguageModelService` 单测 |

## Runtime Routing (High Level)

1. 业务模块读取 `model?`（可选）
2. `LlmRoutingService.resolveAgentModel(model?)` / `resolveExtractModel(model?)`：
   - 未传 → 使用对应用途的默认模型
   - 已传 → 查找 `LlmModel.modelId`
   - 校验 model/provider 启用状态
3. `LlmUpstreamResolverService` 负责查库/选路由/解密；上层再构建具体 provider/client

## 最近更新

- 2026-02-28：`thinking-profile.util` 重写为 `@moryflow/model-bank` contract 包装层（删除本地重复解析）；`providerType` thinking 语义统一走 `resolveProviderSdkType` canonical 化路径。
- 2026-02-27：LLM Admin 端 reasoning 输入改为 thinking level 合同驱动；服务端继续消费兼容 `reasoning` 字段（effort/maxTokens/includeThoughts/rawConfig），映射职责保持在前端单点方法，后端仅执行协议适配。
- 2026-02-27：修复 Google thinking `includeThoughts` 端到端透传（`thinking_profile.visibleParams -> resolveReasoningFromThinkingSelection -> ModelProviderFactory.createGoogle`），并补齐 util/factory/service 回归测试
- 2026-02-27：Thinking 规则统一收口 `@moryflow/model-bank`：`thinking-profile.util` 与 `ModelProviderFactory` 改为消费 model-bank 解析器，移除 `@moryflow/api` `thinking-defaults` 路径，消除 Anyhunt/Moryflow/PC/runtime 多处硬编码漂移风险
- 2026-02-26：Thinking 契约重构完成：`thinking-profile.util` 改为 `thinking_profile + visibleParams` 单一路径；无预设模型强制 `off-only`；请求校验统一错误码 `THINKING_LEVEL_INVALID` / `THINKING_NOT_SUPPORTED`；`LlmLanguageModelService` 增加 requested/resolved thinking 结构化日志
- 2026-02-26：`thinking-profile.util` 合并顺序修正为 `generic -> provider -> direct`，确保 provider patch 不会被通用默认覆盖；新增 `thinking-profile.util.spec.ts` 回归
- 2026-02-24：`aisdk` 导入改回 `@openai/agents-extensions` 顶层导出，以适配当前 `moduleResolution=node` 构建链路
- 2026-02-01：ModelProviderFactory 单测在隔离关闭时通过 resetModules 确保 mock 生效
- 2026-01-27：LlmLanguageModelService 透传模型上下限（maxContext/maxOutput），供调用侧统一裁剪
- 2026-01-26：运行时解析器补齐默认 `LlmSettings` 兜底（避免首次请求 500）；新增单测覆盖
- 2026-01-26：LLM 运行时改为 AI SDK 工厂（支持 openai/openrouter/anthropic/google）
- 2026-01-27：LlmRoutingService 固化 AI SDK ModelProvider 行为（静态模型适配）
- 2026-01-27：LanguageModel 类型收敛到 AI SDK V2/V3（兼容 agents `aisdk`）
- 2026-01-27：ModelProviderFactory 支持 OpenRouter reasoning 配置（effort/maxTokens/rawConfig）
- 2026-01-27：LlmLanguageModelService 单测改为 spy 断言（避免 mock 未生效）
- 2026-01-27：ModelProviderFactory provider 分支单测补齐（openai/openrouter/anthropic/google）
