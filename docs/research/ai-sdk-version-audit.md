---
title: AI SDK 版本统一调研（现状 + 最新版本 + 兼容性）
date: 2026-01-26
scope: monorepo
status: updated
---

<!--
[INPUT]: 全仓 package.json（排除 archive）+ npm 最新版本查询
[OUTPUT]: 当前版本分布、最新版本、兼容性记录
[POS]: 升级 AI SDK 与 OpenAI Agents 官方包后的版本基线

[PROTOCOL]: 本文件变更时，需同步更新 docs/index.md 与 docs/CLAUDE.md（最近更新）。
-->

# 结论（更新）

- 已统一到最新版本：`ai@6.0.49`、`@ai-sdk/react@3.0.51`、`@ai-sdk/*@3.x/4.x`、`@openrouter/ai-sdk-provider@2.0.1`、`openai@6.16.0`。
- `apps/moryflow/admin` 的 `ai@5` / `@ai-sdk/react@2` 已升级到 v6/v3。
- OpenAI Agents 官方包固定 `@openai/agents* = 0.4.3`。
- Zod 统一到 `4.3.6`（满足 `@openai/agents-core` 的 peer 约束）。

# 当前版本（已统一）

| 包                          | 当前版本 |
| --------------------------- | -------- |
| ai                          | 6.0.49   |
| @ai-sdk/react               | 3.0.51   |
| @ai-sdk/openai              | 3.0.18   |
| @ai-sdk/anthropic           | 3.0.23   |
| @ai-sdk/google              | 3.0.13   |
| @ai-sdk/xai                 | 3.0.34   |
| @ai-sdk/openai-compatible   | 2.0.18   |
| @ai-sdk/provider            | 3.0.5    |
| @ai-sdk/provider-utils      | 4.0.9    |
| @openrouter/ai-sdk-provider | 2.0.1    |
| openai                      | 6.16.0   |
| @openai/agents\*            | 0.4.3    |
| zod                         | 4.3.6    |

# 兼容性记录

1. **ai v5 → v6 / @ai-sdk/react v2 → v3**
   - 管理端未直接依赖 `ai` API，仅升级版本即可。
   - Console/PC/Mobile 的 `useChat`/`UIMessage` 类型保持兼容。

2. **@openrouter/ai-sdk-provider v1 → v2**
   - `createOpenRouter` API 保持；现有 `openrouter.chat(...)` 调用无需改动。

3. **zod v3 → v4**
   - 前端继续使用 `zod/v3` 兼容层；运行时为 v4。
