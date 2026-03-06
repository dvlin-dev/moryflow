---
title: Provider 接入改造方案（AI SDK + OpenAI-Compatible）
date: 2026-03-01
scope: packages/model-bank + packages/agents-runtime + apps/moryflow/server + apps/anyhunt/server
status: completed
---

# 背景

你确认的标准：

1. 以 AI SDK Providers 官方能力为基线。
2. 可通过 `createOpenAICompatible` 稳定接入的 provider 也算支持。
3. 不允许运行时兜底；每个 provider 必须显式映射到 adapter。

本次目标是“保留 provider、删除兜底行为、完成显式 adapter 接入”。

# 评估对象

目录：`packages/model-bank/src/aiModels`

当前 provider（26 个）：

- anthropic
- azure
- azureai
- bedrock
- cloudflare
- deepseek
- fal
- github
- google
- groq
- huggingface
- hunyuan
- minimax
- mistral
- moonshot
- nvidia
- ollama
- openai
- openrouter
- perplexity
- qwen
- vertexai
- volcengine
- xai
- zenmux
- zhipu

# 结论（最终）

## Provider 文件是否删除

- 不删 provider 文件（26 个全部保留）。

## 删除内容

删除的是“行为”，不是“provider 实体”：

1. 删除 runtime unknown/default 自动落 `openai-compatible` 的兜底分支。
2. 删除隐式 sdkType 推断路径（`provider.id`/`settings.sdkType` 随机命中）。
3. 删除不受控 alias 行为，改为显式映射表。

# 最终接入策略（已落地）

## 统一 adapter 集合（chat runtime）

- `openai`
- `openai-compatible`
- `openrouter`
- `anthropic`
- `google`

## provider -> adapter 显式映射（已实现）

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

# 执行进度（本次已完成）

## 阶段 0：锁定映射表

- [x] 完成 `providerId -> adapterType` 显式映射收口。

## 阶段 1：runtime 去兜底

- [x] `packages/agents-runtime/src/model-factory.ts` 删除 default fallback。
- [x] 未命中映射时直接抛错（显式报错 provider 缺失 adapter）。

## 阶段 2：provider 显式接入

- [x] `packages/model-bank/src/thinking/resolver.ts` 接入显式映射表。
- [x] `packages/model-bank/src/registry/index.ts` 使用显式 runtime/semantic sdkType。
- [x] `apps/moryflow/server` 与 `apps/anyhunt/server` 的 `ModelProviderFactory` 通过 `resolveRuntimeChatSdkType` 自动命中新映射（无需兜底分支改造）。

## 阶段 3：thinking / adapter 对齐

- [x] `resolveProviderSdkType` 与 `resolveRuntimeChatSdkType` 解耦并显式化。
- [x] `vertexai -> google`、`zenmux -> openrouter` 等语义映射已固定。

## 阶段 4：测试回归

- [x] `@moryflow/model-bank`：`typecheck` / `test:unit` / `build` 全通过。
- [x] `@moryflow/agents-runtime`：`test:unit` 全通过。
- [x] `@moryflow/server`：`test src/ai-proxy/providers/model-provider.factory.thinking.spec.ts` 通过，`typecheck` 通过。
- [x] `@anyhunt/anyhunt-server`：`test:unit` 通过，`typecheck` 通过。

## 阶段 5：文档与协作同步

- [x] 本文档更新为 completed。
- [x] 相关目录 `CLAUDE.md` 已同步本次改造事实。

# 代码变更清单

1. `packages/model-bank/src/thinking/resolver.ts`
   - 新增 provider 显式映射表。
   - `resolveProviderSdkType` 改为“只认显式映射/显式 alias”，不再隐式 fallback。
2. `packages/model-bank/src/registry/index.ts`
   - provider `sdkType` 改为显式 runtime/semantic 解析。
3. `packages/agents-runtime/src/model-factory.ts`
   - 删除 runtime default fallback。
   - 未命中 adapter 显式抛错。
4. 测试补充：
   - `packages/model-bank/src/thinking/resolver.test.ts`
   - `packages/agents-runtime/src/__tests__/model-factory.test.ts`
   - `apps/anyhunt/server/src/llm/__tests__/model-provider.factory.spec.ts`
   - `apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.thinking.spec.ts`

# 验收结论

1. 任一 provider 都必须先命中显式 adapter 才能进入 runtime。
2. unknown provider 不再自动成功（不再兜底）。
3. provider 相关错误可定位到具体 provider + adapter 缺失原因。
4. 本次方案已按当前标准完成。

# 参考来源

- AI SDK Providers: https://ai-sdk.dev/providers/
- AI SDK OpenAI-Compatible Providers: https://ai-sdk.dev/providers/openai-compatible-providers
- GitHub Models Quickstart: https://docs.github.com/en/github-models/quickstart
- 腾讯混元 OpenAI SDK 兼容说明: https://cloud.tencent.com/document/product/1729/111007
- 火山引擎方舟 OpenAI SDK 兼容说明: https://www.volcengine.com/docs/6492/2192012
- ZenMux Quickstart: https://zenmux.ai/docs/guide/quickstart.html
