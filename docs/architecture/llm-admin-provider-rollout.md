---
title: Anyhunt Server：LLM Admin 配置改造进度（Agent + Extract）
date: 2026-01-26
scope: apps/anyhunt/server
status: active
---

## 目标（不考虑历史兼容）

- Admin 后台动态配置：LLM Provider（baseUrl/apiKey/enabled）+ Model 映射 + 默认模型
- 调用方只传 `model`（可选）；不传则使用 Admin 配置的默认模型
- Agent 与 Extract 都走同一套 LLM 路由/密钥/模型映射

## 当前实现状态

- [x] `llm/`：Provider/Model/Settings 的 CRUD（不返回明文 apiKey）
- [x] `llm/`：路由解析器 `LlmUpstreamResolverService`（查库 + 选路由 + 解密）
- [x] Agent：`LlmRoutingService.resolveAgentModel(model?)`
- [x] Extract：`LlmLanguageModelService` + `extract/ExtractLlmClient`
- [x] Settings 拆分默认值：`defaultAgentModelId` / `defaultExtractModelId`
- [x] Console：Agent 模型选择 + 多轮对话输入

## 数据库变更与升级

本次涉及主库 Prisma 迁移（`apps/anyhunt/server/prisma/main`）：

- [x] 既有迁移：创建 `LlmProvider/LlmModel/LlmSettings(defaultModelId)`（历史）
- [x] 新增迁移：将 `LlmSettings.defaultModelId` 拆分为：
  - `defaultAgentModelId`
  - `defaultExtractModelId`
- [x] 新增迁移：扩展 `LlmModel` 字段（displayName/pricing/tier/limits/capabilitiesJson）

部署时需要执行：

- `pnpm --filter @anyhunt/anyhunt-server prisma migrate deploy --schema=prisma/main/schema.prisma`
- `pnpm --filter @anyhunt/anyhunt-server prisma migrate deploy --schema=prisma/vector/schema.prisma`

## 需要的运行时配置

- [必选] `ANYHUNT_LLM_SECRET_KEY`：用于加密/解密 Provider API Key（AES-256-GCM，32 bytes base64）
- [必选] `DATABASE_URL` / `VECTOR_DATABASE_URL` / `REDIS_URL`：按 `apps/anyhunt/server/.env.example` 配置

## 后续（可选）

- [x] Admin Web：增加 LLM 配置页面（providers/models/settings）
- [x] Console：模型选择器（不选则用 default）
