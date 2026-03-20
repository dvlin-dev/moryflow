---
title: Provider Reasoning 与 Tool Call 兼容性基线
date: 2026-03-20
scope: packages/model-bank, packages/agents-runtime, apps/moryflow/pc, apps/moryflow/server, apps/anyhunt/server
status: active
---

# Provider Reasoning 与 Tool Call 兼容性基线

## 目标

统一收口多 Provider 场景下的 thinking / reasoning、assistant tool-call 历史重放、以及 OpenAI-compatible 代理接入的稳定约束，避免多轮工具调用在推理模型上触发 `400 Bad Request`。

## 当前约束

- 对 OpenAI-compatible 推理模型，assistant 触发 tool call 的历史消息必须在同一条 assistant message 上保留 `reasoning_content`，不能把 reasoning item 单独拆成前一条消息。
- `openai-compatible` transport 的 thinking 参数必须经由 `modelSettings.providerData.providerOptions.openaiCompatible` 下发，不能依赖模型构造时的第二个 `settings` 参数。
- 当预设 `openai` provider 配置了自定义 `baseUrl` 时，transport 视为 OpenAI-compatible 代理链路；不得继续使用 `@ai-sdk/openai` 的消息序列化假设。
- 对以 `enableReasoning` 或 `thinkingMode` 建模的 provider，`thinking: off` 不能等价为“不下发参数”；必须显式发送禁用语义。
- Search / Knowledge Search 的本地索引依赖 Electron ABI 对齐的 `better-sqlite3`；Node CLI 安装出的原生模块不得直接复用于 Electron 主进程。

## 触发条件

以下任一条件成立，都可能导致 provider 返回 `400 Bad Request` 或历史重放失真：

- 推理模型在上一轮产生了 reasoning item，并在同一轮触发了 tool call，但下一轮重放时 assistant tool-call message 丢失 `reasoning_content`。
- `thinking off` 仅在 UI/运行时状态层生效，没有被编码为 provider 可识别的禁用参数，导致模型仍以默认推理模式运行。
- 使用预设 `openai` provider + 自定义 `baseUrl` 对接 SiliconFlow / 其他 OpenAI-compatible 代理，但 transport 仍走 `@ai-sdk/openai`。
- `openai-compatible` 模型希望通过 `enableReasoning`、`thinkingMode` 或同类布尔控制开关推理模式，但运行时只会传 `reasoningEffort`，或者根本没有把参数发出去。
- Electron 主进程加载了由不同 Node ABI 编译的 `better-sqlite3.node`，导致 search-index 初始化失败，Knowledge Search 退化为 unavailable。

## 根因分层

### 1. reasoning_content 与 tool-call 历史没有一起重放

- `@ai-sdk/openai-compatible` 已支持把 assistant message 中的 reasoning part 编码为 `reasoning_content`。
- `@openai/agents-extensions` 默认只对 DeepSeek 特判，把 reasoning item 合并回 assistant tool-call message。
- 对 Kimi / GLM / Qwen / 其他要求同类连续性的推理模型，如果运行时不显式要求该合并动作，历史重放会把 reasoning 与 tool call 拆成两条 assistant turn，provider 会拒绝该消息序列。

### 2. openai-compatible 的 thinking 参数下发通道错误

- 当前 AI SDK 版本的 `createOpenAICompatible(...)` 返回的 chat model 不接收模型构造阶段的第二个 `settings` 参数。
- 运行时如果把 `reasoningEffort`、`enableReasoning` 等参数塞进模型构造调用，参数会被静默丢弃。
- `openai-compatible` 链路下，thinking 参数只能经由 `modelSettings.providerData.providerOptions.openaiCompatible` 传入请求体。

### 3. OpenAI 预设 provider 的自定义代理链路使用了错误 transport

- `@ai-sdk/openai` 的 chat message converter 不会为 assistant message 编码 `reasoning_content`。
- 当 `openai` provider 实际对接的是 SiliconFlow 之类的 OpenAI-compatible endpoint 时，继续使用 OpenAI transport 会丢失这段协议语义。
- 这类链路必须切换到 OpenAI-compatible transport，再由 runtime 继续沿用统一的 providerOptions / message conversion 规则。

### 4. thinking off 缺少显式 disable 语义

- 对 `enableReasoning` / `thinkingMode` 型 provider，很多模型默认是推理开启。
- 如果 `thinking: off` 只意味着“不附带推理参数”，provider 仍可能按默认推理模式工作。
- 这类模型需要在 `off` 时显式下发 `enableReasoning: false` 或 `thinkingMode: 'disabled'`。

### 5. Search / Knowledge Search 是独立故障面

- `better-sqlite3` 报 `NODE_MODULE_VERSION 127` 对 `125` 的错误，说明依赖是用 Node 22+/25 CLI 安装的，而实际运行进程是 Electron 31。
- 该问题会导致 search-index 初始化失败、`Knowledge search is currently unavailable.`，但它不是本次 chat completion `400` 的直接原因。
- 两个问题会同时出现，是因为它们都发生在桌面端主进程里，但修复路径不同。

## 最终统一原则

### 不自研 message serializer / tool loop bridge

- 仓库继续使用 `@openai/agents-core` + `@openai/agents-extensions` 作为 Agent 运行时框架，不自建一套 message serializer 或 tool loop bridge。
- 根因治理目标是“统一到 AI SDK 抽象层并选对 provider adapter”，不是脱离 SDK 重写运行时。
- 只要 Agent 栈仍然依赖 `@openai/agents-extensions` 负责历史消息重放，就必须接受该层的协议行为约束。

### Chat / Agent 适配统一规则

- `openai` 聊天模型固定走 `@ai-sdk/openai`。
- `openai-compatible` 聊天模型固定走 `@ai-sdk/openai-compatible`，不得再使用 `@ai-sdk/openai` 作为兼容层。
- `openrouter` 聊天模型固定走 `@openrouter/ai-sdk-provider`。
- `anthropic` / `google` 分别走各自官方 AI SDK adapter。
- 该规则必须同时作用于：
  - `packages/agents-runtime/src/model-factory.ts`
  - `apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.ts`
  - `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`
- adapter 选择只能由 `packages/model-bank/src/thinking/resolver.ts` 的 `resolveRuntimeChatSdkType(...)` 统一裁决，业务侧不得再写平行映射。

### 非聊天能力边界

- Embedding、STT、图片生成等不参与 Agent tool loop / assistant history replay 的能力，不属于本问题域。
- 这些能力可以继续使用官方 `openai` SDK 或专用 SDK；是否迁移到 AI SDK 不是本次 `400 Bad Request` 的根因修复前提。

## 稳定修复策略

### reasoning/tool-call 连续性

- OpenAI-compatible transport 一律在 model settings 中标记 `reasoningContentToolCalls=true`。
- 运行时通过 patched `@openai/agents-extensions` 读取该标记，把 pending reasoning 合并进 assistant tool-call message。
- 仓库根 `package.json` 通过 `pnpm.patchedDependencies` 固定挂载 `@openai/agents-extensions@0.5.1` 补丁；在上游提供通用 override 能力前，不得移除该补丁。
- 该标记只影响 assistant/tool-call 消息拼装，不改变 UI 流式展示协议。

### openai-compatible thinking 参数

- `ReasoningConfig` 中的 provider-specific 开关通过 `rawConfig` 保存。
- `openai-compatible` providerOptions 固定走 `openaiCompatible` key。
- `enableReasoning` / `thinkingMode` 既支持显式开启，也支持显式关闭。

### OpenAI 预设 + 自定义 baseUrl

- 当 `openai` provider 使用自定义 `baseUrl` 时，runtime transport 切换为 `openai-compatible`。
- semantic thinking profile 仍沿用 model-bank 的统一档案解析，不向 UI 暴露 transport 分支。
- 该规则只影响 transport 层的消息序列化与 providerOptions 注入，不改变用户保存的 provider id。

### Search / Knowledge Search ABI

- Electron 桌面依赖安装后必须执行 `electron-rebuild -f -w better-sqlite3`，或使用包内 `postinstall` / `pretest:unit` 既有流程自动重建。
- 不允许跨工作区复用不同 Node 版本编译出的 `better-sqlite3.node`。
- 当桌面运行时升级 Electron 主版本时，原生模块必须重建一次。

## 上游最新版本状态

以 npm registry 在 2026-03-20 可见的 latest tag 为准：

- `@openai/agents-core` = `0.7.2`
- `@openai/agents-extensions` = `0.7.2`
- `@openai/agents` = `0.7.2`
- `@ai-sdk/openai-compatible` = `2.0.35`
- `@ai-sdk/openai` = `3.0.41`
- `ai` = `6.0.116`

### 升级是否能单独解决问题

- 不能。
- 最新 `@ai-sdk/openai-compatible` 已经包含“在多轮 tool call assistant message 中保留 `reasoning_content`”的修复；这说明 adapter 本身已经具备正确协议语义。
- 但最新 `@openai/agents-extensions@0.7.2` 的 `shouldIncludeReasoningContent(...)` 仍然只对 DeepSeek 做显式判断；它没有提供面向 Kimi / GLM / Qwen / 其他 OpenAI-compatible 推理模型的通用 override。
- 因此，只升级到最新版本而不修改 Agent 历史重放层，仍然可能在同一类模型上复现 `reasoning_content is missing in assistant tool call message`。
- `@openai/agents-core` 升级本身也不能替代该修复，因为问题不在 run loop 主框架，而在 `agents-extensions` 的 AI SDK bridge 逻辑。

### 对 latest 的最终判断

- 升级到最新版本是可选的仓库依赖刷新动作，但不是本问题的充分解。
- 在“不自研 bridge、继续沿用 Agent SDK”的前提下，最终可行方案仍然是：
  - 全仓统一 `openai-compatible -> @ai-sdk/openai-compatible`
  - thinking / reasoning 固定走 `providerData.providerOptions.openaiCompatible`
  - 对 Agent 运行时保留一个极小且可回归验证的 `@openai/agents-extensions` 补丁，直到上游提供通用 override 能力
  - 用自动化测试锁定该补丁行为，避免后续依赖升级时静默回退

## 一次性完成的最终方案

- 仓库内所有 Chat / Agent 相关模型工厂统一只消费 `resolveRuntimeChatSdkType(...)` 的结果，不再人工分支判断“这个 provider 看起来像 OpenAI”。
- 所有 `openai-compatible` 聊天模型统一切换到 `@ai-sdk/openai-compatible`，包括桌面端、Moryflow Server 和 Anyhunt Server。
- 所有 `openai-compatible` 的 reasoning 参数统一编码为 `providerData.providerOptions.openaiCompatible`；禁止继续依赖模型构造时的第二个 `settings` 参数。
- `thinking: off` 对 `enableReasoning` / `thinkingMode` 型 provider 必须显式下发关闭语义。
- Agent 运行时继续使用 `@openai/agents-core` + `@openai/agents-extensions`，但为 `reasoning/tool-call continuity` 保留补丁，并通过仓库级 `patchedDependencies` 固定。
- 补丁必须伴随仓库内回归测试，至少覆盖：
  - `openai-compatible` providerOptions 注入
  - `thinking off` 的显式 disable payload
  - reasoning 与 tool-call 在 assistant 历史消息中的合并行为
- 非聊天能力不纳入本次统一范围，不得为了“表面统一”重构 Embedding / STT / 图片生成链路。

## 影响范围

- 受 reasoning_content 规则影响的模型：所有通过 OpenAI-compatible transport 接入，且 provider 在多轮 tool call 中要求保留 reasoning continuity 的推理模型。
- 受显式 disable 规则影响的模型：以 `enableReasoning`、`thinkingMode`、或等价布尔/模式开关控制推理的模型。
- 受 transport 切换规则影响的配置：预设 `openai` provider + 非默认 `baseUrl`。
- 受 ABI 约束影响的功能：桌面全局搜索、Threads 索引、Knowledge Search 相关工具。

## 验证基线

- `packages/model-bank` 必须覆盖 `openai-compatible` 的 `enableReasoning` / `thinkingMode` / explicit off 映射回归。
- `packages/agents-runtime` 必须覆盖：
  - `openai-compatible` providerOptions 注入回归
  - 预设 `openai` + 自定义 `baseUrl` 的 transport 选择回归
  - explicit off 对 `enableReasoning` 型 profile 的 disable payload 回归
- 桌面端调试时若再次出现 `Knowledge search is currently unavailable.`，必须先检查主进程运行时的 `process.versions.modules` 与 `better-sqlite3.node` 编译 ABI 是否一致。
