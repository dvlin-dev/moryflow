---
title: AI SDK Provider 收敛与清理计划
date: 2026-03-01
scope: packages/model-bank + agents-runtime + moryflow/pc + moryflow/mobile + anyhunt/server + moryflow/server
status: in_progress
---

# 背景

当前仓库 Provider 列表仍然偏多，且大量 Provider 仅有元数据定义、没有稳定运行时接入。

本次按产品决策收敛为「优先 AI SDK 官方 Provider」，不做历史兼容。

# 本次目标

1. 只保留并接入 AI SDK 官方支持的主流 Provider（当前决策）：
   - `azure`
   - `bedrock`
   - `vertexai`
   - `huggingface`
   - `fal`
2. 其余 Provider 全部清理，不保留历史兼容代码与入口。

# 决策基线

1. 参考：AI SDK 官方 Provider 列表
   - https://ai-sdk.dev/providers/ai-sdk-providers
2. 策略：非 AI SDK 官方 Provider 不纳入本轮接入范围（OpenRouter 也不作为本轮保留目标）。

# 范围

## In Scope

1. Provider 收敛与清理：
   - 保留上述 5 个 Provider
   - 删除其余 Provider 的模型定义、Provider 卡片、枚举、注册与导出
2. 影响层同步：
   - `packages/model-bank`
   - `packages/agents-runtime`
   - `apps/moryflow/server`
   - `apps/anyhunt/server`
   - `apps/moryflow/pc`
   - `apps/moryflow/mobile`
3. 文档同步：
   - 本文档记录需求、清理边界与执行规划

## Out of Scope

1. 不新增清单外 Provider。
2. 不保留任何兼容层（legacy/旧字段映射/条件开关）。
3. 不讨论历史数据迁移策略（按零兼容执行）。

# 保留与删除清单

## 保留（仅 5 个）

- `azure`
- `bedrock`
- `vertexai`
- `huggingface`
- `fal`

## 删除（全部）

- `azureai`
- `cloudflare`
- `github`
- `ollama`
- `zenmux`
- 以及现有其余全部非保留 Provider（例如 `openai/openrouter/anthropic/google/...` 等）

# 执行策略

分两段执行：

1. **阶段 A（先执行）**：删除与清理
2. **阶段 B（待审核后执行）**：为保留 5 个 Provider 补齐运行时“明确接入”

# 按步骤执行规划

1. `model-bank` 删除非保留 Provider 的 `aiModels/*` 文件与 `modelProviders/*` 文件。
2. 收敛 `aiModels/index.ts`、`modelProviders/index.ts`、`const/modelProvider.ts` 仅保留 5 个 Provider。
3. 全仓检索并删除非保留 Provider 的直接导入/导出/注册入口，确保无悬挂引用。
4. 同步文档与 `CLAUDE.md`，记录收敛目标与已执行清理动作。
5. 运行最小校验（至少 `@moryflow/model-bank` 的 `typecheck/test:unit/build`）。
6. 提交“阶段 A 删除清理”到独立 commit 并推送分支。
7. 进入阶段 B：逐个补齐 5 个 Provider 的运行时接入（`agents-runtime + moryflow/anyhunt server`）。
8. 阶段 B 完成后做回归校验与第二次提交。

# 当前状态

- 阶段 A：进行中（本分支先落地删除与清理）
- 阶段 B：待你审核后执行
