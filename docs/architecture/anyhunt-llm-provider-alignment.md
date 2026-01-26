---
title: Anyhunt LLM Provider 对齐进度（AI SDK / Anthropic / Google）
date: 2026-01-27
scope: apps/anyhunt/server + apps/anyhunt/admin + apps/anyhunt/console
status: done
---

## 目标

- Anyhunt 的模型配置与运行时行为对齐 Moryflow：统一走 AI SDK 模型工厂。
- Provider 类型统一为：`openai` / `openai-compatible` / `openrouter` / `anthropic` / `google`。
- Agent + Extract + Digest 全部走同一套 LLM 路由与密钥解析。
- Console Agent Browser 支持单页多轮对话与模型选择。

## 进度清单

- [x] 后端 LLM Provider/Model 类型扩展（含 `openai-compatible` 命名统一）
- [x] 新增 AI SDK 模型工厂（参考 Moryflow ModelProviderFactory）
- [x] Agent 路由改为 AI SDK + `@openai/agents-extensions` 适配
- [x] Extract 改为 AI SDK（`generateText` / `generateObject` / `streamText`）
- [x] Digest 改为 AI SDK（`generateText`）
- [x] Admin LLM Provider 类型选项同步
- [x] Console Agent Browser 支持多轮对话输入
- [x] Console Agent Browser 模型选择器（对齐 Moryflow UI 组件）
- [x] Prisma 迁移 + DB 重置/初始化
- [x] 运行 lint/typecheck/test:unit

## 变更范围

- Server
  - `apps/anyhunt/server/src/llm/`：新增 AI SDK 模型工厂与语言模型解析器
  - `apps/anyhunt/server/src/agent/agent.service.ts`：注释对齐 AI SDK 语义
  - `apps/anyhunt/server/src/extract/`：Extract LLM 调用改为 AI SDK
  - `apps/anyhunt/server/src/digest/services/ai.service.ts`：Digest LLM 调用改为 AI SDK
  - `apps/anyhunt/server/prisma/main/schema.prisma`：providerType 注释更新
- Admin
  - `apps/anyhunt/admin/www/src/pages/llm/LlmProviderDialog.tsx`
  - `apps/anyhunt/admin/www/src/features/llm/types.ts`
- Console
  - `apps/anyhunt/console/src/features/agent-browser-playground/`

## 风险与注意事项

- 旧数据中的 `openai_compatible` 将被视为非法（不做兼容迁移）。
- LlmModel schema 变更涉及新增非空字段，需重置数据库或保证无旧数据。
- Extract/Digest 迁移后，Structured Outputs 由 `generateObject` 负责；需观察异常率。

## 验证计划

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 更新日志

- 2026-01-26：创建进度文档，记录 AI SDK 对齐实施范围。
- 2026-01-27：补齐 Extract structured 输出 LlmError 边界 + ModelProviderFactory 单测。
- 2026-01-27：补齐 Console Agent Browser 多轮对话 + 模型选择对齐项。
- 2026-01-27：完成迁移重置与 lint/typecheck/test:unit 验证。
