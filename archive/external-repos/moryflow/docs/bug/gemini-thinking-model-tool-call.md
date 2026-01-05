# Gemini 思考模型工具调用 thought_signature 问题

## 状态

**待修复** - 等待 SDK 升级支持

## 问题描述

使用 OpenRouter 调用 Gemini 思考模型（如 `google/gemini-2.5-flash-preview:thinking`、`google/gemini-2.5-pro-preview`）时，当模型返回工具调用后，后续请求会报错：

```
Unable to submit request because function call `default_api:xxx` in the 2. content block is missing a `thought_signature` in functionCall parts. This is required for tools to work correctly, and missing thought_signature may lead to degraded model performance.
```

## 技术背景

### Gemini 思考模型工作原理

1. Gemini 思考模型在启用 reasoning 时，响应中会包含 `reasoning_details`
2. `reasoning_details` 包含 `thought_signature` 签名信息
3. 当模型决定调用工具时，每个工具调用都关联一个 `thought_signature`
4. **关键约束**：在后续请求中发送工具调用历史时，必须包含原始的 `thought_signature`

### 数据流

```
请求 1 → Gemini → 响应（包含 reasoning_details + tool_calls + thought_signature）
                          ↓
                   执行工具，获取结果
                          ↓
请求 2 → Gemini（需要包含原始 tool_call + thought_signature + tool_result）
```

## 当前 SDK 状态

### @openrouter/ai-sdk-provider@1.5.4

分析 `@openrouter/ai-sdk-provider` 源码发现：

1. **已实现**：Provider 会在流式响应中捕获 `reasoning_details`，并附加到 `tool-call` 的 `providerMetadata` 中

   ```javascript
   // 从流中累积 reasoning_details
   accumulatedReasoningDetails.push(...delta.reasoning_details);

   // 附加到 tool-call
   controller.enqueue({
     type: 'tool-call',
     toolCallId: toolCall.id,
     toolName: toolCall.function.name,
     input: toolCall.function.arguments,
     providerMetadata: {
       openrouter: {
         reasoning_details: accumulatedReasoningDetails
       }
     }
   });
   ```

2. **已实现**：在转换消息时，会从 `providerOptions.openrouter.reasoning_details` 读取并回传

   ```javascript
   // convertToOpenRouterChatMessages 中
   const partReasoningDetails = part.providerOptions?.openrouter;
   if (partReasoningDetails?.reasoning_details) {
     accumulatedReasoningDetails.push(...partReasoningDetails.reasoning_details);
   }

   messages.push({
     role: 'assistant',
     reasoning_details: finalReasoningDetails,  // 回传
     // ...
   });
   ```

### 问题定位

问题在于 `@moryflow/agents-extensions` 的 `aiSdk.ts`：

1. `tool-call` 流事件的 `providerMetadata` 被正确捕获到 `providerData`
2. 在 `itemsToLanguageModelMessages` 转换时，`providerData` 被放入 `providerOptions`
3. **但是**：OpenRouter provider 期望 `reasoning_details` 在 `providerOptions.openrouter.reasoning_details`，而我们直接展开了 `providerData`

当前代码：
```typescript
const content: LanguageModelV3ToolCallPart = {
  type: 'tool-call',
  toolCallId: item.callId,
  toolName: item.name,
  input: parseArguments(item.arguments),
  providerOptions: {
    ...(item.providerData ?? {}),  // 直接展开，结构可能不匹配
  },
};
```

如果 `providerData` 是 `{ openrouter: { reasoning_details: [...] } }`，则结构正确。
但如果 AI SDK 返回的结构不同，可能导致问题。

## 解决方案

### 方案 1：等待 SDK 升级（推荐）

等待以下 SDK 的更新：

- `@openrouter/ai-sdk-provider` - 确保 `providerMetadata` 结构与 `providerOptions` 期望一致
- `@ai-sdk/provider` - AI SDK v6 稳定后可能会有更好的支持

**理由**：
- OpenRouter provider 已经实现了 reasoning_details 的捕获和回传逻辑
- 问题可能是结构传递不一致，SDK 升级后应该会修复
- 自己 hack 兼容代码会增加维护成本，且可能与后续 SDK 更新冲突

### 方案 2：临时禁用思考模型的工具调用

在 UI 层面，当用户选择 Gemini 思考模型时，提示暂不支持工具调用功能。

## 相关链接

- [OpenRouter Reasoning Tokens 文档](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- [Gemini Thought Signatures 文档](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [OpenAI Community 讨论](https://community.openai.com/t/external-llm-providers-not-working-with-sdk-tools-with-enabled-thinking/1366972)
- [Open WebUI Issue #19328](https://github.com/open-webui/open-webui/issues/19328)

## 影响范围

- PC 端 Agent 工具调用
- Mobile 端 Agent 工具调用
- 仅影响 Gemini 思考模型（`google/gemini-2.5-flash-preview:thinking`、`google/gemini-2.5-pro-preview` 等）

## 版本信息

- `@openrouter/ai-sdk-provider`: ^1.5.4
- `@ai-sdk/provider`: ^3.0.0
- `@moryflow/agents-extensions`: workspace:*
- `@moryflow/agents-runtime`: workspace:*

## 更新日志

- 2024-12-26: 创建问题记录，决定等待 SDK 升级
