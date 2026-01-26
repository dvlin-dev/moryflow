---
title: Anyhunt Server Agent/LLM/Embedding Code Review
date: 2026-01-26
scope: apps/anyhunt/server (agent/llm/embedding)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/agent, apps/anyhunt/server/src/llm, apps/anyhunt/server/src/embedding
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P1 模块审查记录（Anyhunt Server：Agent/LLM/Embedding）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Agent/LLM/Embedding Code Review

## 范围

- Agent 模块：`apps/anyhunt/server/src/agent/`
  - L3 API：`agent.controller.ts`
  - 核心执行：`agent.service.ts`, `agent-stream.processor.ts`
  - 计费与进度：`agent-billing.service.ts`, `agent-task.progress.store.ts`
  - 持久化：`agent-task.repository.ts`
  - Tools：`tools/*`
  - DTO：`dto/*.schema.ts`
- LLM 模块：`apps/anyhunt/server/src/llm/`
  - Admin API：`llm-admin.controller.ts`, `llm-admin.service.ts`
  - 运行时路由：`llm-upstream-resolver.service.ts`, `llm-routing.service.ts`
  - 密钥管理：`llm-secret.service.ts`
  - AI SDK 语言模型工厂：`llm-language-model.service.ts`
  - DTO：`dto/*.schema.ts`
- Embedding 模块：`apps/anyhunt/server/src/embedding/`
  主要入口：

- `POST /api/v1/agent`
- `GET /api/v1/agent/:id`
- `DELETE /api/v1/agent/:id`
- `POST /api/v1/agent/estimate`
- `GET/PUT /api/v1/admin/llm/settings`
- `GET/POST/PATCH/DELETE /api/v1/admin/llm/providers`
- `GET/POST/PATCH/DELETE /api/v1/admin/llm/models`

关键依赖：

- `ANYHUNT_LLM_SECRET_KEY`（LLM Provider 密钥加解密）
- `EMBEDDING_OPENAI_*`（Embedding Provider）
- `QuotaService`（Agent 计费与扣费）

## 结论摘要

- 高风险问题（P0）：0
- 中风险问题（P1）：0
- 低风险/规范问题（P2）：0
- 状态：修复完成

## 发现（按严重程度排序）

- [P1] **Agent 流式路径在 LLM 路由失败时不会清理进度缓存（已修复）**
  - 现象：`executeTaskStream` 在解析 LLM 路由之前写入 Redis 进度；如果解析失败，只清理 cancel 标记，不清理 progress。`GET /agent/:id` 会优先返回 Redis 进度，导致失败任务仍显示 credits/toolCall 进度。
  - 修复：LLM 路由失败路径补 `clearProgress`，确保失败任务不残留 Redis 进度。
  - 文件：`apps/anyhunt/server/src/agent/agent.service.ts`

- [P1] **运行时依赖的 LLM Settings 可能未初始化，导致首请求 500（已修复）**
  - 现象：`LlmUpstreamResolverService` 只读 `llmSettings`，未命中时直接抛 500。新库未手动访问 Admin 设置时，Agent/Extract 会不可用。
  - 修复：运行时解析器使用 upsert 自动补齐默认 `LlmSettings`，避免首请求 500。
  - 文件：`apps/anyhunt/server/src/llm/llm-upstream-resolver.service.ts`

- [P2] **部分关键文件缺少 [PROTOCOL] 头部约束说明（已修复）**
  - 影响：违反仓库强制的文件头规范，后续改动易漏同步 CLAUDE.md。
  - 修复：补齐 [PROTOCOL] 段落并同步模块 CLAUDE.md。
  - 文件：`apps/anyhunt/server/src/embedding/embedding.service.ts`, `apps/anyhunt/server/src/embedding/embedding.module.ts`

## 已确认不处理

- EmbeddingService 的 `cosineSimilarity` 先保留（按需求确认，后续单独处理，不在本轮删除/清理）。

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/agent/__tests__/agent.service.spec.ts`
  - `apps/anyhunt/server/src/agent/__tests__/agent-stream.processor.spec.ts`
  - `apps/anyhunt/server/src/agent/__tests__/agent.schema.spec.ts`
  - `apps/anyhunt/server/src/llm/__tests__/llm-admin.service.spec.ts`
  - `apps/anyhunt/server/src/llm/__tests__/llm-routing.service.spec.ts`
  - `apps/anyhunt/server/src/llm/__tests__/llm-upstream-resolver.service.spec.ts`
  - `apps/anyhunt/server/src/llm/__tests__/llm-secret.service.spec.ts`
  - `apps/anyhunt/server/src/embedding/__tests__/embedding.service.spec.ts`

- 缺口建议：已补齐（无新增）

## 修复计划与进度

- 状态：**修复完成**
- 备注：EmbeddingService 的清理项已确认不做

## 修复记录

- 2026-01-26：修复流式路径 LLM 路由失败的进度清理；运行时补齐默认 `LlmSettings`；补齐 [PROTOCOL] 文件头并同步模块文档
