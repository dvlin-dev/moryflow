# 思考模型（Thinking Models）支持

## 需求

支持具有推理能力的思考模型：
- Gemini 3 Pro/Flash Preview
- OpenAI o3-mini / GPT-5.2
- Claude 3.7 Sonnet

功能点：
- 正确传递 reasoning 配置
- 解析 reasoning tokens 流
- UI 展示思考过程（折叠/展开）

## 技术方案

### 架构

```
客户端（PC/Mobile）
├── useChat Hook
└── Agent Runtime
    └── ModelFactory.buildModel()
        └── AI SDK streamText()
            └── providerOptions (reasoning 配置)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    OpenRouter   Google     Anthropic
    Provider     Provider   Provider
```

### Reasoning 配置类型

```typescript
interface ReasoningConfig {
  enabled: boolean
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal'  // OpenRouter/OpenAI
  maxTokens?: number   // Anthropic/Gemini
}
```

### 统一配置构建

```typescript
buildReasoningProviderOptions(sdkType, config):
  switch sdkType:
    case 'openrouter':
      return { openrouter: { reasoning: { effort, max_tokens } } }
    case 'google':
      return { google: { thinkingConfig: { includeThoughts, thinkingBudget } } }
    case 'anthropic':
      return { anthropic: { thinking: { type: 'enabled', budgetTokens } } }
```

### 流式解析

```typescript
for await (const part of result.fullStream) {
  if (part.type === 'reasoning') {
    // 思考内容 → <Reasoning> 组件
  }
  if (part.type === 'text-delta') {
    // 回复内容 → <MessageResponse> 组件
  }
}
```

### 使用方式（OpenRouter Provider）

```typescript
// 方式 1：模型级别启用
const model = openrouter('deepseek/deepseek-r1', {
  includeReasoning: true
})

// 方式 2：providerOptions
const result = await streamText({
  model: openrouter('google/gemini-3-flash-preview'),
  providerOptions: {
    openrouter: {
      reasoning: { effort: 'medium', max_tokens: 8000 }
    }
  }
})
```

### 支持的模型

| 模型 | 思考方式 |
|------|----------|
| gemini-3-pro/flash-preview | thinkingConfig |
| openai/o1, o3-mini, gpt-5.2 | effort |
| anthropic/claude-3.7-sonnet | budgetTokens |
| deepseek/deepseek-r1 | effort |

## 代码索引

| 模块 | 路径 |
|------|------|
| 模型注册表 | `packages/agents-model-registry/src/models.ts` |
| 类型定义 | `packages/agents-runtime/src/types.ts` |
| Reasoning 配置 | `packages/agents-runtime/src/reasoning-config.ts` |
| AI SDK 适配 | `packages/agents-extensions/src/aiSdk.ts` |
| 模型工厂 | `packages/agents-runtime/src/model-factory.ts` |
| PC Reasoning UI | `apps/pc/src/renderer/components/ai-elements/reasoning.tsx` |
| Mobile Reasoning UI | `apps/mobile/components/ai-elements/Reasoning.tsx` |
