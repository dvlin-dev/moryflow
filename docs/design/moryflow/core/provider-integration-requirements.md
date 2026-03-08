---
title: Provider 接入改造方案（AI SDK + OpenAI-Compatible）
date: 2026-03-01
scope: packages/model-bank + packages/agents-runtime + apps/moryflow/server + apps/anyhunt/server
status: completed
---

# 1. 当前状态

1. Provider 文件全部保留，但 chat runtime 的 adapter 选择已经改为显式映射，不再依赖 unknown/default fallback。
2. `packages/model-bank` 与 `packages/agents-runtime` 共同定义了“provider -> adapter”单一事实源；server 侧只消费解析结果。
3. 运行时未命中映射时直接 fail-fast 报错，不再静默回落到 `openai-compatible`。
4. 本文只保留当前接入策略与验证基线；执行进度和变更清单不再继续维护。

# 2. 冻结要求

1. 以 AI SDK Providers 官方能力为基线。
2. 可通过 `createOpenAICompatible` 稳定接入的 provider 视为支持。
3. 不允许运行时兜底；每个 provider 必须显式映射到 adapter。

# 3. 统一 adapter 集合（chat runtime）

- `openai`
- `openai-compatible`
- `openrouter`
- `anthropic`
- `google`

# 4. provider -> adapter 显式映射

- anthropic -> anthropic
- azure -> openai-compatible
- azureai -> openai-compatible
- bedrock -> openai-compatible
- cloudflare -> openai-compatible
- deepseek -> openai-compatible
- github -> openai-compatible
- google -> google
- groq -> openai-compatible
- huggingface -> openai-compatible
- hunyuan -> openai-compatible
- minimax -> openai-compatible
- mistral -> openai-compatible
- moonshot -> openai-compatible
- nvidia -> openai-compatible
- ollama -> openai-compatible
- openai -> openai
- openai-compatible -> openai-compatible
- openrouter -> openrouter
- perplexity -> openai-compatible
- qwen -> openai-compatible
- vertexai -> google
- volcengine -> openai-compatible
- xai -> openai-compatible
- zenmux -> openrouter
- zhipu -> openai-compatible
- fal -> fal（仅 image 链路；非 chat runtime）

# 5. 验收标准（DoD）

1. runtime 不再存在 unknown/default 自动回落 `openai-compatible` 的分支。
2. provider adapter 解析只接受显式映射或显式 alias，不依赖 `provider.id` 猜测。
3. `model-bank`、`agents-runtime`、Moryflow server、Anyhunt server 都围绕同一 adapter 解析结果工作。

# 6. 当前验证基线

1. `@moryflow/model-bank` 负责 provider sdkType、runtime/semantic adapter 解析回归。
2. `@moryflow/agents-runtime` 负责 model factory fail-fast 与 adapter 透传回归。
3. Moryflow/Anyhunt server 负责 `ModelProviderFactory` 接入与 provider thinking/runtime 参数映射回归。
