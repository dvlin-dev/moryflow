# AI Reasoning 支持

## 需求

支持 AI 模型的深度推理功能：
- 配置 reasoning 参数（effort、maxTokens、exclude）
- 多轮对话中保持 reasoning 连续性
- 支持不同提供商的 API 格式

## 技术方案

### 不同提供商的 API 差异

| 提供商 | 请求参数格式 |
|--------|-------------|
| OpenRouter | `reasoning: { effort, max_tokens, exclude }` |
| OpenAI 直连 | `reasoning_effort: 'high'` |
| Anthropic 直连 | `thinking: { type: 'enabled', budget_tokens }` |

### 混合方案设计

```typescript
interface ReasoningConfig {
  // 通用配置（UI 友好，代码自动转换）
  enabled: boolean
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none'
  maxTokens?: number
  exclude?: boolean

  // 原生配置覆盖（直接透传给 API）
  rawConfig?: Record<string, unknown>
}
```

### 数据流向

```
请求流程:
Client Request
  → MessageSchema (接受 reasoning_details)
  → AiProxyService (合并配置)
  → ModelProviderFactory (根据 provider 转换)
  → AI SDK

响应流程:
AI SDK Response
  → SSEStreamBuilder (解析 reasoning 事件)
  → 构建 reasoning_details 数组
  → Client Response
```

### reasoning_details 类型

```typescript
type ReasoningDetail =
  | { type: 'reasoning.summary', summary: string }
  | { type: 'reasoning.text', text: string, signature?: string }
  | { type: 'reasoning.encrypted', data: string }
```

### 核心逻辑（伪代码）

```
# Provider Factory
buildReasoningParams(providerType, reasoning):
  if reasoning.rawConfig:
    return rawConfig  # 直接透传

  switch providerType:
    case 'openrouter':
      return { reasoning: { enabled, effort, max_tokens, exclude } }
    case 'openai':
      return { reasoning_effort: effort }
    case 'anthropic':
      return { thinking: { type: 'enabled', budget_tokens: maxTokens } }

# SSE Stream 处理
processStream():
  for part in fullStream:
    if part.type == 'reasoning-delta':
      # 发送 reasoning_content（向后兼容）
      sendChunk(createReasoningDeltaChunk(text))
      # 发送 reasoning_details
      sendChunk(createReasoningDetailsChunk([{ type: 'reasoning.text', text }]))
```

## 代码索引

| 模块 | 路径 |
|------|------|
| DTO Schema | `apps/server/src/ai-proxy/dto/schemas.ts` |
| Provider Factory | `apps/server/src/ai-proxy/providers/model-provider.factory.ts` |
| SSE 流构建 | `apps/server/src/ai-proxy/stream/sse-stream.builder.ts` |
| Admin DTO | `apps/server/src/ai-admin/dto/ai-admin.dto.ts` |
