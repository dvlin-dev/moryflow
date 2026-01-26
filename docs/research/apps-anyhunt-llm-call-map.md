---
title: apps/anyhunt：大模型调用逻辑梳理（Agent / LLM / Embedding）
date: 2026-01-26
scope: apps/anyhunt (server + console/www proxies)
status: draft
---

> 目标：把 `apps/anyhunt/*` 里所有“大模型相关调用”（Agent + LLM + Embedding）按**入口 → 路由/配置 → 调用边界 → 计费/流式**梳理清楚，便于整体 Code Review 与后续重构。
>
> 说明：本文只梳理 `apps/anyhunt/*` 的调用逻辑与边界；底层实现（如 `@openai/agents-core`、`@openai/agents-openai`）只作为依赖说明，不展开其内部细节。

## 1. 总览：哪里会触发“大模型调用”

### 1.1 服务端（真正发起模型请求）

| 能力                                      | 入口 API                            | 关键文件（调用点）                                       | 实际调用方式                                          |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| LLM Admin 配置（Provider/Model/Settings） | `GET/PUT /api/v1/admin/llm/*`       | `apps/anyhunt/server/src/llm/*`                          | 不调用模型；只做密钥加解密与路由配置                  |
| Extract（结构化提取）                     | `POST /api/v1/extract`              | `apps/anyhunt/server/src/extract/extract.service.ts`     | AI SDK：`generateText/generateObject`                 |
| Agent（浏览器工具调用编排，SSE）          | `POST /api/v1/agent`                | `apps/anyhunt/server/src/agent/agent.service.ts`         | `@openai/agents-core` + `Model`（由 `llm/` 路由构建） |
| Digest（摘要/叙事/解释）                  | 多个 Digest run/投递流程内部触发    | `apps/anyhunt/server/src/digest/services/ai.service.ts`  | AI SDK：`generateText`                                |
| Embedding（向量）                         | 被 Memory/Search/Extract 等间接依赖 | `apps/anyhunt/server/src/embedding/embedding.service.ts` | OpenAI SDK：`embeddings.create`                       |

### 1.2 前端（只负责传参/展示，不直接调用模型）

- Console Playground（API Key 直连公网 API）：
  - `apps/anyhunt/console/src/lib/api-paths.ts`：`/api/v1/agent/*`、`/api/v1/extract`
  - 认证方式：`Authorization: Bearer <apiKey>`
- www Playground（匿名/半匿名演示，最终仍走 server 的 Extract/Scrape 等能力）：
  - `apps/anyhunt/server/src/demo/demo.service.ts` 间接调用 `ExtractService`

## 2. 共享基础设施：LLM Admin 配置 + 运行时路由（`apps/anyhunt/server/src/llm`）

这一层是 Anyhunt Dev 的“模型配置真相来源”，其核心目标是：

1. **密钥只存密文**（DB），2) **按用途（agent/extract）选择默认模型**，3) **把外部 modelId 映射到上游 upstreamId**，4) **把 provider/baseUrl/apiKey 组装成可调用的 client/model**。

### 2.1 数据结构（概念层）

- `LlmProvider`（Admin 可配置）
  - `providerType`: `openai | openai-compatible | openrouter | anthropic | google | ...`
  - `baseUrl`
  - `apiKeyEncrypted`（AES-256-GCM，密文存储）
  - `sortOrder`（同名 model 绑定多个 provider 时用于择优）
  - `enabled`
- `LlmModel`（Admin 可配置）
  - `modelId`：对外可见的“标准模型名”（请求里传的 `model`）
  - `upstreamId`：上游真实 model id（发给网关/厂商）
  - `displayName`
  - `enabled`
  - `inputTokenPrice` / `outputTokenPrice`
  - `minTier`
  - `maxContextTokens` / `maxOutputTokens`
  - `capabilitiesJson`（vision/tools/json + reasoning）
  - `providerId`
- `LlmSettings`（全局默认值）
  - `defaultAgentModelId`
  - `defaultExtractModelId`

### 2.2 密钥加解密（`LlmSecretService`）

- 文件：`apps/anyhunt/server/src/llm/llm-secret.service.ts`
- 环境变量：`ANYHUNT_LLM_SECRET_KEY`（base64 32 bytes）
- 算法：AES-256-GCM（随机 IV + auth tag，payload `v1:iv:ciphertext:tag`）

伪代码：

```ts
encryptApiKey(plaintext):
  key = base64Decode(ENV.ANYHUNT_LLM_SECRET_KEY) // 32 bytes
  iv = randomBytes(12)
  (ciphertext, tag) = aes256gcm.encrypt(key, iv, plaintext)
  return `v1:${b64(iv)}:${b64(ciphertext)}:${b64(tag)}`

decryptApiKey(payload):
  [v, iv, ciphertext, tag] = payload.split(':')
  assert v === 'v1'
  return aes256gcm.decrypt(key, b64(iv), b64(ciphertext), b64(tag))
```

### 2.3 “上游解析器”：只负责查库/选路由/解密（`LlmUpstreamResolverService`）

- 文件：`apps/anyhunt/server/src/llm/llm-upstream-resolver.service.ts`
- 输入：`purpose: 'agent' | 'extract'` + `requestedModelId?`
- 输出：`provider meta + upstreamModelId + decrypted apiKey`

核心逻辑（伪代码）：

```ts
resolveUpstream({ purpose, requestedModelId? }):
  settings = prisma.llmSettings.findUnique(DEFAULT_LLM_SETTINGS_ID)
  defaultModelId = (purpose === 'agent')
    ? settings.defaultAgentModelId
    : settings.defaultExtractModelId

  effectiveModelId = trim(requestedModelId) ?? defaultModelId

  candidates = prisma.llmModel.findMany({
    where: { modelId: effectiveModelId, enabled: true, provider.enabled: true },
    select: { upstreamId, provider: { providerType, baseUrl, apiKeyEncrypted, sortOrder } }
  })
  if candidates.length === 0:
    throw 400("Model is not available")

  selected = pickByMaxSortOrderThenProviderId(candidates)
  apiKey = decrypt(selected.provider.apiKeyEncrypted)

  return { requestedModelId: effectiveModelId, upstreamModelId: selected.upstreamId, provider: selected.providerMeta, apiKey }
```

### 2.4 “运行时路由”：构建可用的 `Model`（给 Agent）或 `LanguageModel`（给 Extract/Digest）

这里分两条“调用形态”：

1. **Agent 路径（`LlmRoutingService`）**：返回 `@openai/agents-core` 的 `Model`
2. **AI SDK 路径（`LlmLanguageModelService`）**：返回 AI SDK `LanguageModel`

Agent 路由（伪代码，文件：`apps/anyhunt/server/src/llm/llm-routing.service.ts`）：

```ts
resolveAgentModel(modelId?):
  resolved = llmLanguageModel.resolveModel({ purpose: 'agent', requestedModelId: modelId })
  model = aisdk(resolved.model)
  return { providerMeta, requestedModelId, upstreamModelId, model }
```

AI SDK 语言模型（伪代码，文件：`apps/anyhunt/server/src/llm/llm-language-model.service.ts`）：

```ts
resolveModel({ purpose, requestedModelId? }):
  resolved = upstream.resolveUpstream({ purpose, requestedModelId })
  model = ModelProviderFactory.create({ providerType, apiKey, baseUrl }, { upstreamId })
  return { model, upstreamModelId: resolved.upstreamModelId, providerMeta }
```

## 3. Extract：结构化提取（Scrape → Prompt → Structured Output）

### 3.1 入口与职责

- API：`POST /api/v1/extract`（ApiKeyGuard）
- 文件：
  - Orchestrator：`apps/anyhunt/server/src/extract/extract.service.ts`
  - LLM 调用边界：`apps/anyhunt/server/src/extract/extract-llm.client.ts`
- 关键点：
  - `model` 可选：不传则使用 Admin `defaultExtractModelId`
  - 先 resolve LLM，再扣费（fail-fast）
  - 并发处理多个 URL（默认 5，可配 `EXTRACT_CONCURRENCY`）

### 3.2 调用链（伪代码级别）

```ts
POST /extract({ urls, prompt?, schema?, systemPrompt?, model? }):
  resolvedLlm = ExtractLlmClient.resolve(model) // -> llm/ resolveModel(purpose='extract')
  billing = BillingService.deductOrThrow(userId, 'fetchx.extract', referenceId)

  zodSchema = schema ? jsonSchemaToZod(schema) : null

  results = processWithConcurrency(urls, concurrency, (url) => extractSingle(url))
  return { results } // 每个 url: { url, data } 或 { url, error }

extractSingle(url):
  scrape = ScraperService.scrapeSync(userId, { url, formats: ['markdown'], onlyMainContent: true })
  userPrompt = buildPrompt(scrape.markdown, prompt)

  if zodSchema:
    data = ExtractLlmClient.completeParsed(resolvedLlm, { systemPrompt: systemPrompt ?? default, userPrompt, schema: zodSchema })
  else:
    text = ExtractLlmClient.complete(resolvedLlm, { systemPrompt: systemPrompt ?? default, userPrompt })
    data = { content: text }

  return { url, data }
```

### 3.3 Structured Output 的实现方式

文件：`apps/anyhunt/server/src/extract/extract-llm.client.ts`

- 文本：`generateText({ model, messages })`
- 结构化：`generateObject({ model, schema, messages })`

## 4. Digest：摘要/叙事/解释（LLM 生成内容）

### 4.1 入口与路由

- Digest 内的所有 LLM 调用集中在：`apps/anyhunt/server/src/digest/services/ai.service.ts`
- 模型路由：复用 `llm/` 的 Admin 配置（Digest 视为 `purpose='agent'`，使用 `defaultAgentModelId`）
  - `DigestAiService.resolveLlm()` → `LlmLanguageModelService.resolveModel({ purpose: 'agent' })`

### 4.2 调用形态（伪代码）

```ts
resolveLlm():
  { model, upstreamModelId } = llmLanguageModel.resolveModel({ purpose: 'agent' })
  return { model, upstreamModelId }

completeText({ systemPrompt, userPrompt }):
  resp = generateText({ model, messages })
  return resp.text ?? ''
```

### 4.3 三类生成：Summary / Narrative / Reason

- `generateSummary()`：构建“用于摘要的内容”并截断到 ~16000 chars（只对 fulltext 做了截断）；失败则降级用 description/title
- `generateNarrative()`：把多条 item 的 summary/reason 组装成一个“大 prompt”；失败则降级输出列表
- `generateReason()`：只在 heuristicReason 不够好时才调用 LLM；失败则返回 heuristicReason

（计费）Digest 当前是“固定 cost”计费（见 `digest.constants.ts` 的 `BILLING.costs[...]`），不是按 tokens。

## 5. Agent：浏览器工具调用编排（SSE + 计费 + 取消）

### 5.1 核心链路（从 API 到 LLM）

- API（Public）：`POST /api/v1/agent`（ApiKeyGuard）
- API（公网）：`POST /api/v1/agent`（ApiKeyGuard，默认 SSE）
- 执行编排：`apps/anyhunt/server/src/agent/agent.service.ts`
- 模型路由：`apps/anyhunt/server/src/llm/llm-routing.service.ts`（返回 `Model`）

### 5.2 执行流程（伪代码）

```ts
executeTask(input, userId):
  taskId = newTaskId()
  create AgentTask row(status=PENDING)

  // 1) fail-fast：先确定 provider/model 可用
  llmRoute = llmRouting.resolveAgentModel(input.model) // may throw 400
  model = llmRoute.model

  // 2) 计费初始化 + 最小配额检查
  billing = billingService.createBillingParams(now, input.maxCredits)
  progressStore.setProgress(taskId, billingService.buildProgress(billing))
  billingService.ensureMinimumQuota(userId, taskId)

  // 3) 任务进入 PROCESSING
  casUpdateTaskStatus(PENDING -> PROCESSING)

  // 4) 构建 Agent（instructions + tools + output schema）
  agent = new Agent({ model, instructions, tools: browserTools, outputType, modelSettings })

  // 5) lazy browser session：只有第一次 tool call 才 createSession
  ctx = { browser: BrowserAgentPort.forUser(userId), getSessionId: lazyCreateSession, abortSignal }
  stream = run(agent, userPrompt, { context: ctx, maxTurns: 20, stream: true, signal })

  // 6) 消费 stream：转 SSE、更新进度、做 checkpoint 扣费、处理取消
  for event in streamProcessor.consumeStreamEvents({ stream, billing, ... }):
    yield event

  // 7) 最终结算 + 更新任务终态
  creditsUsed = billingService.calculateCreditsFromStream(...)
  billingService.finalize(...)
  updateTask(status=COMPLETED, data=..., creditsUsed=...)
```

### 5.3 关键实现细节（Code Review 重点）

1. **“纯文本输出”时移除 `response_format: { type: 'text' }`**
   - 位置：`apps/anyhunt/server/src/agent/agent.service.ts` `buildAgent()`
   - 原因：部分 OpenAI-compatible 网关会对该字段报 400（尤其是 Gemini/Claude 的代理网关）
   - 实现：通过 `modelSettings.providerData = { response_format: undefined }` 覆盖并让 JSON stringify 丢弃该字段

2. **Browser Session 惰性创建**
   - 位置：`getSessionId()` closure，只有首次工具调用才 `browserPort.createSession()`
   - 收益：避免“LLM fail-fast / 早期取消 / 额度不足”导致的无效 session

3. **流式事件转换**
   - 位置：`apps/anyhunt/server/src/agent/agent-stream.processor.ts`
   - 将 `@openai/agents-core` 的 stream event 转为 SSE：`thinking/tool_call/tool_result/progress/...`

4. **取消语义**
   - AbortSignal（本进程内硬取消）
   - Redis cancel flag（跨实例，轮询检测）

5. **工具集合（Tool Calling 的边界）**
   - 位置：`apps/anyhunt/server/src/agent/tools/browser-tools.ts`
   - 核心工具：
     - `web_search`
     - `browser_open`
     - `browser_snapshot`
     - `browser_click / browser_fill / browser_type / browser_press`
     - `browser_scroll / browser_wait`
   - 注意：工具只依赖 `browser/ports`，避免泄漏 Playwright 类型

## 6. Embedding：向量生成（OpenAI Embeddings）

### 6.1 调用点

- 文件：`apps/anyhunt/server/src/embedding/embedding.service.ts`
- 依赖：OpenAI SDK `openai.embeddings.create`
- 配置来源：**环境变量**（而不是 Admin LLM 配置）
  - `EMBEDDING_OPENAI_API_KEY`（required）
  - `EMBEDDING_OPENAI_BASE_URL`（optional）
  - `EMBEDDING_OPENAI_MODEL`（optional，默认 `text-embedding-3-small`）

伪代码：

```ts
constructor():
  openai = new OpenAI({ apiKey: ENV.EMBEDDING_OPENAI_API_KEY, baseURL: ENV.EMBEDDING_OPENAI_BASE_URL })
  model = ENV.EMBEDDING_OPENAI_MODEL ?? 'text-embedding-3-small'

generateEmbedding(text):
  resp = openai.embeddings.create({ model, input: text })
  return { embedding: resp.data[0].embedding, model: resp.model, dimensions: embedding.length }
```

## 7. 设计/实现层面的 Code Review 观察点（建议你审核时重点看这些）

### 7.1 架构优点（当前设计值得保留的点）

- **LLM provider/model 路由收敛**：`llm/` 把“查库/选路由/解密”与“构建 client/model”分开，边界清晰。
- **purpose-based 默认模型**：Agent/Extract 分开默认值，降低“一个默认模型拖垮所有场景”的风险。
- **Agent 的资源控制意识强**：fail-fast resolve model + browser session lazy create + SSE cancel。
- **输入收紧（Agent output schema）**：`apps/anyhunt/server/src/agent/dto/agent.schema.ts` 对 schema 做了大小/深度/required 的硬约束（这点 Extract 目前还没有）。

### 7.2 主要风险/潜在问题（建议列为 TODO 或重构任务）

1. Extract 的 `jsonSchemaToZod()` 过于“宽松/不完整”
   - 只支持最基础的 `type`，忽略 `enum/format/minLength/maxLength/oneOf/...`
   - 没有 schema bytes/depth 的限制（Agent 有，Extract 没有）
   - 风险：structured output 约束弱，LLM 输出更容易飘；也更容易被输入放大成本

2. Extract 的 prompt 没有内容截断/分块策略
   - 当前会把整个 `markdown` 塞进 prompt（可能非常大）
   - 风险：超过上下文长度导致 400/截断/质量差；成本/延迟不可控

3. Structured Outputs 的兼容性问题
   - Extract 用 `chat.completions.parse + response_format(zodResponseFormat)`
   - 风险：部分 “OpenAI-compatible” 网关并不支持 structured output；需要 fallback 策略（例如降级到 text + zod safeParse）

4. Digest 的 LLM 调用缺少可控的生成参数
   - 当前 `chat.completions.create` 没有显式传 `temperature/max_tokens`（输出主要靠 prompt + slice）
   - 风险：输出长度/风格波动；在不同 provider 上更不可控

5. Embedding 的配置体系与 `llm/` 不统一
   - Embedding 走 env；文本生成走 Admin 配置
   - 这可能是“有意的”（embedding 常独立预算/限流），但需要在架构文档中明确：为什么要分开、谁负责配置与轮换密钥

6. 多 provider 同名 model 的“静默择优”
   - 当前通过 `sortOrder` 自动选最大者
   - 风险：运维/回滚时可能出现“以为切了模型但实际走了另一个 provider”的隐性问题
   - 建议：至少在日志/管理后台明确显示最终命中 provider；或引入显式“主 provider”指针

### 7.3 建议补齐的测试（回归价值高）

- Extract
  - `jsonSchemaToZod()` 覆盖：array/object 嵌套、required、非法 schema、schema 过大拒绝（如果你们决定加限制）
  - `ExtractLlmClient.completeParsed()` 的 fallback 行为（如果引入）
- Agent
  - `buildAgent()` 在 `output.type === 'text'` 时确实移除了 `response_format`
  - `AgentStreamProcessor.convertRunEventToSSE()` 覆盖常见 event case（已有部分测试但建议完整化）
- Digest
  - `buildContentForSummary()` 截断逻辑、fallback 分支

## 8. 快速定位清单（你想改某类行为时应该看哪些文件）

- 想改“默认用哪个模型/用途怎么分”：`apps/anyhunt/server/src/llm/llm-upstream-resolver.service.ts`
- 想加新的 LLM providerType（例如 anthropic/gemini 原生）：
  - 路由与构建：`apps/anyhunt/server/src/llm/llm-routing.service.ts`、`apps/anyhunt/server/src/llm/llm-openai-client.service.ts`
  - Admin DTO：`apps/anyhunt/server/src/llm/dto/*`
- 想改 Extract prompt / 分块 / structured output 策略：
  - `apps/anyhunt/server/src/extract/extract.service.ts`
  - `apps/anyhunt/server/src/extract/extract-llm.client.ts`
- 想改 Agent 的工具集 / 工具参数 / 行为：
  - `apps/anyhunt/server/src/agent/tools/browser-tools.ts`
  - `apps/anyhunt/server/src/browser/ports/*`
- 想改 Agent 的 SSE 协议 / 进度与取消策略：
  - `apps/anyhunt/server/src/agent/agent-stream.processor.ts`
  - `apps/anyhunt/server/src/agent/agent-task.progress.store.ts`
