---
title: Provider 接入与清理需求说明
date: 2026-03-01
scope: packages/model-bank + agents-runtime + moryflow/pc + moryflow/mobile + anyhunt/server + moryflow/server
status: in_progress
---

# 背景

当前仓库的 Provider 管理已经完成一轮清理（`moryflow provider` 与 `MODEL_BANK_ENABLE_BUSINESS_FEATURES` 相关实现已删除），现阶段核心问题是：

1. **元数据接入** 与 **运行时接入** 存在分层不一致。
2. 指定的 10 个 Provider 在不同链路（PC/Mobile runtime、Moryflow Server、Anyhunt Server、Image 链路）状态不一致。
3. 需要基于 LobeHub 做对照，给出“哪些是明确接入、哪些只是定义了但未完整打通”的结论。

# 本次目标

1. 对以下 10 个 Provider 给出当前仓库“明确接入”现状调研结论：
   - `azure`
   - `azureai`
   - `bedrock`
   - `cloudflare`
   - `fal`
   - `github`
   - `huggingface`
   - `ollama`
   - `vertexai`
   - `zenmux`
2. 对照 LobeHub 的实现方式，识别差距（仅结论，不展开技术方案）。

# 参考基线

- 参考仓库：`https://github.com/lobehub/lobehub`
- 参考原则：
  - 使用其“`model-bank` 元数据 + `model-runtime` 运行时适配”分层作为对照基线。
  - 仅吸收与当前仓库目标一致的接入模式，不要求追求 LobeHub 全量覆盖。
- 本次对照版本（本地）：`/Users/bowling/code/me/lobehub`，`canary@902a265`（2026-03-01）。

# 范围

## In Scope

1. 10 个目标 Provider 的多层状态盘点：
   - `packages/model-bank`
   - `packages/agents-runtime`
   - `apps/moryflow/server`
   - `apps/anyhunt/server`
   - `apps/moryflow/server` 的 `ai-image`（仅与 `fal` 相关）
2. 与 LobeHub 的同名 Provider 实现对照（`packages/model-bank` + `packages/model-runtime`）。
3. 输出可评审的“现状结论与缺口清单”。

## Out of Scope

1. 本文不提供具体技术改造方案、代码步骤与接口设计。
2. 本文不扩展到清单外 Provider。
3. 本文不包含迁移排期与人力拆分。

# 调研方法

1. 以代码事实源判定“明确接入”：
   - 仅在 `model-bank` 有 Provider 卡片/模型定义，判定为“元数据接入”。
   - 在运行时存在该 Provider 的稳定识别与专门适配（非默认兜底），判定为“运行时明确接入”。
2. 重点检查两个运行时入口：
   - PC/Mobile：`packages/agents-runtime/src/model-factory.ts`
   - Server：`apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.ts` 与 `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`
3. 对照 LobeHub：
   - `packages/model-runtime/src/runtimeMap.ts` 与各 provider 实现目录。

# 现状矩阵（本仓库）

| Provider    | model-bank 元数据                              | agents-runtime（PC/Mobile）                            | Server Chat（Moryflow/Anyhunt）                            | Image 链路（Moryflow）                                   | 结论                                                     |
| ----------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| azure       | 已定义（`sdkType: azure`）                     | 无 `azure` 专门分支，落到默认 `openai-compatible` 兜底 | `resolveRuntimeChatSdkType` 严格集合不含 `azure`，不可识别 | 不适用                                                   | 未明确接入（仅元数据）                                   |
| azureai     | 已定义（`sdkType: azureai`）                   | 无 `azureai` 专门分支，落到默认兜底                    | 严格集合不含 `azureai`，不可识别                           | 不适用                                                   | 未明确接入（仅元数据）                                   |
| bedrock     | 已定义（`sdkType: bedrock`）                   | 无 `bedrock` 专门分支，落到默认兜底                    | 严格集合不含 `bedrock`，不可识别                           | 不适用                                                   | 未明确接入（仅元数据）                                   |
| cloudflare  | 已定义（`sdkType: cloudflare`）                | 无 `cloudflare` 专门分支，落到默认兜底                 | 严格集合不含 `cloudflare`，不可识别                        | 不适用                                                   | 未明确接入（仅元数据）                                   |
| fal         | 已定义（图片模型）                             | Chat runtime 无 `fal` 分支                             | Chat factory 无 `fal` 分支                                 | **已接入**（`ImageSdkType: 'fal'` + `FalImageProvider`） | 仅图片链路明确接入                                       |
| github      | 已定义（`sdkType: azure`）                     | 无 `github` 专门分支，按 `azure` 语义落默认兜底        | 严格集合不含 `azure/github`，不可识别                      | 不适用                                                   | 未明确接入（仅元数据）                                   |
| huggingface | 已定义（`sdkType: huggingface`）               | 无 `huggingface` 专门分支，落默认兜底                  | 严格集合不含 `huggingface`，不可识别                       | 不适用                                                   | 未明确接入（仅元数据）                                   |
| ollama      | 已定义（`sdkType: ollama`）                    | 无 `ollama` 专门分支，落默认兜底                       | 严格集合不含 `ollama`，不可识别                            | 不适用                                                   | 未明确接入（仅元数据）                                   |
| vertexai    | 已定义（未显式 `sdkType`，按 providerId 推导） | 无 `vertexai` 专门分支，落默认兜底                     | 严格集合不含 `vertexai`，测试已覆盖 `undefined`            | 不适用                                                   | 未明确接入（仅元数据）                                   |
| zenmux      | 已定义（`sdkType: router`）                    | 传输层无 `zenmux` 专门分支；语义层可归一到 openrouter  | **可识别**：`router -> openrouter`，走 `openrouter` 分支   | 不适用                                                   | Chat 链路部分明确接入（Server 明确，PC/Mobile 仍偏兜底） |

## 补充观察

1. `model-bank` 已覆盖这 10 个 Provider 的卡片/模型定义，但这不等于运行时已打通。
2. 两个 Server 的 `getSdkType` 都依赖 `resolveRuntimeChatSdkType`，严格集合当前仅：
   - `openai`
   - `openai-compatible`
   - `openrouter`
   - `anthropic`
   - `google`
3. Moryflow/Anyhunt 的管理端预设 Provider 目前也仅包含：
   - `openai`
   - `anthropic`
   - `google`
   - `openrouter`
   - `zenmux`

# LobeHub 对照结论

同一批 Provider 在 LobeHub（`/Users/bowling/code/me/lobehub`）中，均存在独立运行时映射与实现入口：

1. `runtimeMap` 明确映射（示例）：
   - `azure -> LobeAzureOpenAI`
   - `azureai -> LobeAzureAI`
   - `bedrock -> LobeBedrockAI`
   - `cloudflare -> LobeCloudflareAI`
   - `fal -> LobeFalAI`
   - `github -> LobeGithubAI`
   - `huggingface -> LobeHuggingFaceAI`
   - `ollama -> LobeOllamaAI`
   - `vertexai -> LobeVertexAI`
   - `zenmux -> LobeZenMuxAI`
2. 结论：LobeHub 对这 10 个 Provider 的运行时接入是“按 provider 显式实现”，不是“依赖默认兜底”。

# 本轮结论（供评审）

1. 你当前仓库这 10 个 Provider 里，**明确接入**可判定为：
   - `fal`（仅图片链路）
   - `zenmux`（Server Chat 链路）
2. 其余 8 个（`azure / azureai / bedrock / cloudflare / github / huggingface / ollama / vertexai`）目前都属于：
   - 元数据已接入
   - 运行时未明确接入（或依赖默认兜底）
3. 如果下一阶段目标是“和 LobeHub 一样的明确接入语义”，需要把判定标准从“有 provider 定义”升级为“有 provider 级 runtime 适配与可识别路径”。

# 后续工作（占位）

后续将基于本调研文档，补充“Provider 明确接入技术方案文档”（单独文档），按批次推进实现与测试。
