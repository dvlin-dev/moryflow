# OpenAI Provider

The [OpenAI](https://openai.com/) provider包含对 OpenAI Responses/Chat/Completion APIs 以及 Embeddings API 的支持，AI SDK 通过 `@ai-sdk/openai` 模块提供它。

## 安装

```bash
pnpm add @ai-sdk/openai
# 或者
npm install @ai-sdk/openai
# 或者
yarn add @ai-sdk/openai
# 或者
bun add @ai-sdk/openai
```

## Provider 实例

```ts
import { openai } from '@ai-sdk/openai'

const model = openai('gpt-4o-mini')
```

若需要自定义 `baseURL` / `apiKey` 等配置，可使用 `createOpenAI`：

```ts
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-foo': 'bar'
  }
})
```

> `baseURL` 默认 `https://api.openai.com/v1`，`apiKey` 默认读取 `OPENAI_API_KEY` 环境变量。

## 语言模型

```ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = streamText({
  model: openai('gpt-4o-mini'),
  prompt: '介绍一下 Mission Burrito 的历史'
})
```

- Responses API 默认启用（`openai('gpt-4o')` == `openai.responses('gpt-4o')`）。
- 如需使用 Chat/Completion API，可显式调用 `openai.chat(...)` 或 `openai.completion(...)`。
- 可在 `providerOptions.openai` 中设置 `parallelToolCalls`、`store`、`metadata`、`reasoningSummary` 等 OpenAI 特有参数。

## 自定义 baseURL / API Key

在 Electron 主进程中可以这样配置：

```ts
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? undefined,
  apiKey: process.env.OPENAI_API_KEY ?? undefined
})

const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const response = streamText({
  model: openai(modelId),
  messages: convertToModelMessages(messages)
})
```

- `OPENAI_API_KEY`：必填，传给 `Authorization` 头。
- `OPENAI_BASE_URL`：可选，用于代理/自建兼容端点（如 `https://api.openai-proxy.local/v1`）。
- `OPENAI_MODEL`：可选，覆盖默认模型。

## Responses API 的 providerOptions（节选）

```ts
const result = await streamText({
  model: openai('gpt-4o'),
  prompt: '总结 Primary/Secondary/Accent 设计语言',
  providerOptions: {
    openai: {
      reasoningSummary: 'detailed',
      parallelToolCalls: false,
      store: false,
      user: 'user_123'
    }
  }
})
```

可选项包括：

- `parallelToolCalls`: 是否允许并行 Tool 调用。
- `store`: 是否在 OpenAI 平台持久化该次请求。
- `reasoningSummary`: `'auto' | 'detailed'`，用于 gpt-5/o4 等推理模型。
- `textVerbosity`: `'low' | 'medium' | 'high'` 控制输出长度。
- `promptCacheKey`: 自定义 Prompt Cache Key。
- `serviceTier`: `'auto' | 'flex' | 'priority' | 'default'`。

## Chat API

```ts
const model = openai.chat('gpt-4o')

await generateText({
  model,
  providerOptions: {
    openai: {
      logitBias: { '50256': -100 },
      user: 'test-user'
    }
  }
})
```

常用 providerOptions：

- `logitBias`: 调整 token 生成概率。
- `logprobs`: 布尔或数字，返回 token logprob。
- `reasoningEffort`: `'minimal' | 'low' | 'medium' | 'high'`。
- `structuredOutputs`: 布尔，控制工具调用/对象生成是否严格遵循 schema。
- `maxCompletionTokens`: 针对推理模型的额外输出上限。

## Embedding / Image / Speech / Transcription

- Embedding：`openai.textEmbedding('text-embedding-3-large')`，可设置 `dimensions` 与 `user`。
- Image：`openai.image('gpt-image-1')`，`providerOptions.openai` 支持 `quality` 等参数。
- Transcription：`openai.transcription('whisper-1')`，可设置 `language`、`timestampGranularities`。
- Speech (TTS)：`openai.speech('tts-1')`，可设置 `response_format`、`speed`、`instructions`。

详细能力/限制参见 [OpenAI 官方文档](https://platform.openai.com/docs).
