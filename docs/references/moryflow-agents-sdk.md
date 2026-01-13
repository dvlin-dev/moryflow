# Moryflow Agents SDK 参考文档

> 基于 OpenAI Agents JS SDK 二次开发，提供 Agent 抽象、运行时、工具调用等核心能力。
>
> 原文档位置：`apps/moryflow/pc/docs/openai-agents-js.md`

---

## 1. 快速开始

### 项目设置

1. 创建项目并初始化 npm。只需执行一次。

   ```bash
   mkdir my_project
   cd my_project
   npm init -y
   ```

2. 安装 Agents SDK。

   ```bash
   npm install @moryflow/agents zod@3
   ```

3. 设置 OpenAI API key。

   ```bash
   export OPENAI_API_KEY=sk-...
   ```

   或者，您可以调用 `setDefaultOpenAIKey('<api key>')` 以编程方式设置密钥，并使用 `setTracingExportApiKey('<api key>')` 进行追踪导出。

### 创建第一个智能体

智能体由 instructions 和名称定义。

```typescript
import { Agent } from '@moryflow/agents'

const agent = new Agent({
  name: 'History Tutor',
  instructions:
    'You provide assistance with historical queries. Explain important events and context clearly.',
})
```

### 运行第一个智能体

您可以使用 `run` 方法来运行智能体。通过传入要启动的智能体以及要传入的输入来触发一次运行。

这将返回一个执行结果，其中包含最终输出以及在该次运行期间执行的所有操作。

```typescript
import { Agent, run } from '@moryflow/agents'

const agent = new Agent({
  name: 'History Tutor',
  instructions:
    'You provide assistance with historical queries. Explain important events and context clearly.',
})

const result = await run(agent, 'When did sharks first appear?')

console.log(result.finalOutput)
```

### 为智能体提供工具

您可以为智能体提供工具，用于查找信息或执行操作。

```typescript
import { Agent, tool } from '@moryflow/agents'
import { z } from 'zod' // 确保导入 zod

const historyFunFact = tool({
  // The name of the tool will be used by the agent to tell what tool to use.
  name: 'history_fun_fact',
  // The description is used to describe **when** to use the tool by telling it **what** it does.
  description: 'Give a fun fact about a historical event',
  // This tool takes no parameters, so we provide an empty Zod Object.
  parameters: z.object({}),
  execute: async () => {
    // The output will be returned back to the Agent to use
    return 'Sharks are older than trees.'
  },
})

const agent = new Agent({
  name: 'History Tutor',
  instructions:
    'You provide assistance with historical queries. Explain important events and context clearly.',
  // Adding the tool to the agent
  tools: [historyFunFact],
})
```

### 添加更多智能体

可以以类似方式定义更多智能体，将问题拆解为更小的部分，使智能体更专注于当前任务。还可以通过在智能体上定义模型，为不同问题使用不同的模型。

```typescript
const historyTutorAgent = new Agent({
  name: 'History Tutor',
  instructions:
    'You provide assistance with historical queries. Explain important events and context clearly.',
})

const mathTutorAgent = new Agent({
  name: 'Math Tutor',
  instructions:
    'You provide help with math problems. Explain your reasoning at each step and include examples',
})
```

### 定义交接

为了在多个智能体之间编排，您可以为一个智能体定义 `handoffs`。这将使该智能体能够将对话交接给下一个智能体。这将在运行过程中自动发生。

```typescript
// Using the Agent.create method to ensures type safety for the final output
const triageAgent = Agent.create({
  name: 'Triage Agent',
  instructions: "You determine which agent to use based on the user's homework question",
  handoffs: [historyTutorAgent, mathTutorAgent],
})
```

在运行结束后，您可以通过查看结果上的 `finalAgent` 属性来了解是哪一个智能体生成了最终响应。

### 运行智能体编排

Runner 负责处理各个智能体的执行、可能的交接以及工具执行。

```typescript
import { run } from '@moryflow/agents'

async function main() {
  const result = await run(triageAgent, 'What is the capital of France?')
  console.log(result.finalOutput)
}

main().catch((err) => console.error(err))
```

### 集成

让我们把以上内容整合成一个完整示例。将其放入您的 `index.js` 文件并运行。

```typescript
import { Agent, run } from '@moryflow/agents'

const historyTutorAgent = new Agent({
  name: 'History Tutor',
  instructions:
    'You provide assistance with historical queries. Explain important events and context clearly.',
})

const mathTutorAgent = new Agent({
  name: 'Math Tutor',
  instructions:
    'You provide help with math problems. Explain your reasoning at each step and include examples',
})

const triageAgent = new Agent({
  name: 'Triage Agent',
  instructions: "You determine which agent to use based on the user's homework question",
  handoffs: [historyTutorAgent, mathTutorAgent],
})

async function main() {
  const result = await run(triageAgent, 'What is the capital of France?')
  console.log(result.finalOutput)
}

main().catch((err) => console.error(err))
```

### 查看追踪

Agents SDK 会自动为您生成追踪。这使您可以审查智能体的运行情况、调用了哪些工具或交接给了哪个智能体。

要查看智能体运行期间发生的情况，请前往
[OpenAI 仪表板中的 Trace 查看器](https://platform.openai.com/traces)。

## 2. 智能体 (Agents)

智能体是 OpenAI Agents SDK 的主要构建模块。一个**Agent** 是已配置好的大型语言模型（LLM），包含：

- **Instructions** —— 告诉模型"它是谁"以及"应如何回复"的系统提示。
- **Model** —— 要调用的 OpenAI 模型，以及可选的模型调参。
- **Tools** —— LLM 可调用以完成任务的一组函数或 API。

```typescript
import { Agent } from '@moryflow/agents'

const agent = new Agent({
  name: 'Haiku Agent',
  instructions: 'Always respond in haiku form.',
  model: 'gpt-5-nano', // optional – falls back to the default model
})
```

### 基础配置

`Agent` 构造函数接收一个配置对象。最常用的属性如下所示。

| 属性            | 必需 | 描述                                                           |
| :-------------- | :--- | :------------------------------------------------------------- |
| `name`          | yes  | 简短的人类可读标识符。                                         |
| `instructions`  | yes  | 系统提示（字符串**或**函数——参见动态 instructions）。          |
| `model`         | no   | 模型名称**或**自定义的 `Model` 实现。                          |
| `modelSettings` | no   | 调参（temperature、top_p 等）。                                |
| `tools`         | no   | 模型可调用的 `Tool` 实例数组。                                 |

```typescript
import { Agent, tool } from '@moryflow/agents'
import { z } from 'zod'

const getWeather = tool({
  name: 'get_weather',
  description: 'Return the weather for a given city.',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`
  },
})

const agent = new Agent({
  name: 'Weather bot',
  instructions: 'You are a helpful weather bot.',
  model: 'gpt-4.1',
  tools: [getWeather],
})
```

### 上下文

智能体对其上下文类型是**泛型**的——即 `Agent<TContext, TOutput>`。该上下文是一个依赖注入对象，由你创建并传入 `Runner.run()`。它会被转发到每个工具、护栏、交接等，对于存储状态或提供共享服务（数据库连接、用户元数据、功能开关等）很有用。

```typescript
import { Agent } from '@moryflow/agents'

interface Purchase {
  id: string
  uid: string
  deliveryStatus: string
}
interface UserContext {
  uid: string
  isProUser: boolean

  // this function can be used within tools
  fetchPurchases(): Promise<Purchase[]>
}

const agent = new Agent<UserContext>({
  name: 'Personal shopper',
  instructions: 'Recommend products the user will love.',
})

// Later
import { run } from '@moryflow/agents'

const result = await run(agent, 'Find me a new pair of running shoes', {
  context: { uid: 'abc', isProUser: true, fetchPurchases: async () => [] },
})
```

### 输出类型

默认情况下，Agent 返回**纯文本**（`string`）。如果希望模型返回结构化对象，可以指定 `outputType` 属性。SDK 接受：

1. [Zod](https://github.com/colinhacks/zod) 模式（`z.object({...})`）。
2. 任何兼容 JSON Schema 的对象。

```typescript
import { Agent } from '@moryflow/agents'
import { z } from 'zod'

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
})

const extractor = new Agent({
  name: 'Calendar extractor',
  instructions: 'Extract calendar events from the supplied text.',
  outputType: CalendarEvent,
})
```

当提供了 `outputType` 时，SDK 会自动使用
[structured outputs](https://platform.openai.com/docs/guides/structured-outputs) 而不是纯文本。

### 多智能体系统设计模式

组合智能体有多种方式。我们在生产应用中经常看到的两种模式是：

1. **管理者（智能体作为工具）**——一个中心智能体掌控对话，并调用作为工具暴露的专业智能体。
2. **交接**——初始智能体在识别出用户请求后，将整个对话委派给某个专家智能体。

这些方法是互补的。管理者让你可以在单处实施护栏或速率限制，而交接则让每个智能体专注于单一任务而无需保留对话控制权。

#### 管理者（智能体作为工具）

在该模式下，管理者从不移交控制权——LLM 使用工具，管理者汇总最终答案。

```typescript
import { Agent } from '@moryflow/agents'

const bookingAgent = new Agent({
  name: 'Booking expert',
  instructions: 'Answer booking questions and modify reservations.',
})

const refundAgent = new Agent({
  name: 'Refund expert',
  instructions: 'Help customers process refunds and credits.',
})

const customerFacingAgent = new Agent({
  name: 'Customer-facing agent',
  instructions:
    'Talk to the user directly. When they need booking or refund help, call the matching tool.',
  tools: [
    bookingAgent.asTool({
      toolName: 'booking_expert',
      toolDescription: 'Handles booking questions and requests.',
    }),
    refundAgent.asTool({
      toolName: 'refund_expert',
      toolDescription: 'Handles refund questions and requests.',
    }),
  ],
})
```

#### 交接

采用交接时，分诊智能体负责路由请求，但一旦发生交接，专家智能体就拥有对话控制权直到产生最终输出。

```typescript
import { Agent } from '@moryflow/agents'

const bookingAgent = new Agent({
  name: 'Booking Agent',
  instructions: 'Help users with booking requests.',
})

const refundAgent = new Agent({
  name: 'Refund Agent',
  instructions: 'Process refund requests politely and efficiently.',
})

// Use Agent.create method to ensure the finalOutput type considers handoffs
const triageAgent = Agent.create({
  name: 'Triage Agent',
  instructions: `Help the user with their questions.
  If the user asks about booking, hand off to the booking agent.
  If the user asks about refunds, hand off to the refund agent.`.trimStart(),
  handoffs: [bookingAgent, refundAgent],
})
```

### 动态 instructions

`instructions` 可以是**函数**而不是字符串。该函数接收当前的 `RunContext` 和 Agent 实例，并可返回字符串或 `Promise<string>`。

```typescript
import { Agent, RunContext } from '@moryflow/agents'

interface UserContext {
  name: string
}

function buildInstructions(runContext: RunContext<UserContext>) {
  return `The user's name is ${runContext.context.name}. Be extra friendly!`
}

const agent = new Agent<UserContext>({
  name: 'Personalized helper',
  instructions: buildInstructions,
})
```

同步和 `async` 函数均受支持。

### 生命周期钩子

对于高级用例，你可以通过监听事件来观察 Agent 的生命周期。

```typescript
import { Agent } from '@moryflow/agents'

const agent = new Agent({
  name: 'Verbose agent',
  instructions: 'Explain things thoroughly.',
})

agent.on('agent_start', (ctx, agent) => {
  console.log(`[${agent.name}] started`)
})
agent.on('agent_end', (ctx, output) => {
  console.log(`[agent] produced:`, output)
})
```

### 护栏

护栏允许你验证或转换用户输入与智能体输出。通过 `inputGuardrails` 与 `outputGuardrails` 数组进行配置。

### 智能体克隆/复制

需要现有智能体的稍作修改版本？使用 `clone()` 方法，它会返回一个全新的 `Agent` 实例。

```typescript
import { Agent } from '@moryflow/agents'

const pirateAgent = new Agent({
  name: 'Pirate',
  instructions: 'Respond like a pirate – lots of "Arrr!"',
  model: 'gpt-5-mini',
})

const robotAgent = pirateAgent.clone({
  name: 'Robot',
  instructions: 'Respond like a robot – be precise and factual.',
})
```

### 强制工具使用

提供工具并不保证 LLM 会调用它。你可以通过 `modelSettings.tool_choice` **强制**使用工具：

1. `'auto'`（默认）——由 LLM 决定是否使用工具。
2. `'required'` —— LLM **必须**调用某个工具（可自行选择）。
3. `'none'` —— LLM **不得**调用工具。
4. 指定工具名，如 `'calculator'` —— LLM 必须调用该特定工具。

```typescript
import { Agent, tool } from '@moryflow/agents'
import { z } from 'zod'

const calculatorTool = tool({
  name: 'Calculator',
  description: 'Use this tool to answer questions about math problems.',
  parameters: z.object({ question: z.string() }),
  execute: async (input) => {
    throw new Error('TODO: implement this')
  },
})

const agent = new Agent({
  name: 'Strict tool user',
  instructions: 'Always answer using the calculator tool.',
  tools: [calculatorTool],
  modelSettings: { toolChoice: 'auto' },
})
```

#### 防止无限循环

在工具调用后，SDK 会自动将 `tool_choice` 重置为 `'auto'`。这可防止模型进入反复尝试调用工具的无限循环。你可以通过 `resetToolChoice` 标志或配置 `toolUseBehavior` 来覆盖该行为：

- `'run_llm_again'`（默认）——使用工具结果再次运行 LLM。
- `'stop_on_first_tool'` —— 将第一个工具结果作为最终答案。
- `{ stopAtToolNames: ['my_tool'] }` —— 当任一列出的工具被调用时停止。
- `(context, toolResults) => ...` —— 返回是否应结束运行的自定义函数。

```typescript
const agent = new Agent({
  /* ... */
  toolUseBehavior: 'stop_on_first_tool',
})
```

## 3. 运行智能体 (Running Agents)

智能体不会自行执行——您需要使用 `Runner` 类或 `run()` 工具来**运行**它们。

```typescript
import { Agent, run } from '@moryflow/agents'

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
})

const result = await run(agent, 'Write a haiku about recursion in programming.')
console.log(result.finalOutput)

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.
```

当您不需要自定义 runner 时，也可以使用 `run()` 工具，它会运行一个单例的默认 `Runner` 实例。

或者，您也可以创建自己的 runner 实例：

```typescript
import { Agent, Runner } from '@moryflow/agents'

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
})

// You can pass custom configuration to the runner
const runner = new Runner()

const result = await runner.run(agent, 'Write a haiku about recursion in programming.')
console.log(result.finalOutput)
```

### 智能体循环

当您在 Runner 中使用 run 方法时，需要传入一个起始智能体和输入。输入可以是字符串（被视为用户消息），也可以是输入项列表。

runner 会执行如下循环：

1. 使用当前输入调用当前智能体的模型。
2. 检查 LLM 响应。
   - **最终输出** → 返回。
   - **交接** → 切换到新智能体，保留累积的对话历史，回到步骤 1。
   - **工具调用** → 执行工具，将其结果追加到对话中，回到步骤 1。
3. 一旦达到 `maxTurns`，抛出 `MaxTurnsExceededError`。

> **提示：** 判断 LLM 输出是否为"最终输出"的规则是：它生成了期望类型的文本输出，并且没有工具调用。

### 运行参数

`run()` 方法的输入包括用于启动运行的初始智能体、运行的输入以及一组选项。

| 选项       | 默认值  | 说明                                                                           |
| :--------- | :------ | :----------------------------------------------------------------------------- |
| `stream`   | `false` | 若为 `true`，调用将返回 `StreamedRunResult` 并在事件从模型到达时发出这些事件。 |
| `context`  | –       | 传递给每个 tool / guardrail / handoff 的上下文对象。                           |
| `maxTurns` | `10`    | 安全限制——达到时抛出 `MaxTurnsExceededError`。                                 |
| `signal`   | –       | 用于取消的 `AbortSignal`。                                                     |

### 会话 / 聊天线程

每次调用 `runner.run()`（或 `run()` 工具）代表您应用层对话中的一个**轮次**。

```typescript
import { Agent, run } from '@moryflow/agents'
import type { AgentInputItem } from '@moryflow/agents'

let thread: AgentInputItem[] = []

const agent = new Agent({
  name: 'Assistant',
})

async function userSays(text: string) {
  const result = await run(agent, thread.concat({ role: 'user', content: text }))

  thread = result.history // Carry over history + newly generated items
  return result.finalOutput
}

await userSays('What city is the Golden Gate Bridge in?')
// -> "San Francisco"

await userSays('What state is it in?')
// -> "California"
```

### 异常

SDK 会抛出一小组可捕获的错误：

- `MaxTurnsExceededError` – 达到 `maxTurns`。
- `ModelBehaviorError` – 模型生成了无效输出（例如格式错误的 JSON、未知工具）。
- `InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered` – 违反护栏。
- `GuardrailExecutionError` – 护栏执行失败。
- `ToolCallError` – 任一函数工具调用失败。
- `UserError` – 基于配置或用户输入抛出的错误。

## 4. 执行结果 (Execution Results)

当你运行智能体时，你将会收到以下之一：

- 如果调用 `run` 且未设置 `stream: true`，则为`RunResult`
- 如果调用 `run` 并设置了 `stream: true`，则为`StreamedRunResult`。

### 最终输出

`finalOutput` 属性包含最后一个运行的智能体的最终输出。该结果可能是：

- `string` — 默认用于未定义 `outputType` 的任何智能体
- `unknown` — 如果智能体将 JSON schema 定义为输出类型。
- `z.infer<outputType>` — 如果智能体将 Zod schema 定义为输出类型。
- `undefined` — 如果智能体未产生输出

### 下一轮的输入

你可以通过两种方式获取下一轮的输入：

- `result.history` — 包含你的输入以及智能体输出的副本。
- `result.output` — 包含整个智能体运行的输出。

### 新条目

`newItems` 属性包含在此次运行期间生成的新条目：

- `RunMessageOutputItem` 表示来自 LLM 的消息。
- `RunHandoffCallItem` 表示 LLM 调用了交接工具。
- `RunHandoffOutputItem` 表示发生了交接。
- `RunToolCallItem` 表示 LLM 调用了某个工具。
- `RunToolCallOutputItem` 表示某个工具被调用。
- `RunReasoningItem` 表示来自 LLM 的推理条目。
- `RunToolApprovalItem` 表示 LLM 请求对工具调用进行批准。

## 5. 工具 (Tools)

工具让智能体能够**执行操作**。JavaScript/TypeScript SDK 支持四种类别：

1. **托管工具**——与模型一起在 OpenAI 服务器上运行。（Web 搜索、文件搜索、Code Interpreter 等）
2. **函数工具**——使用 JSON schema 包装任意本地函数，让 LLM 可调用。
3. **智能体作为工具**——将整个智能体暴露为可调用的工具。
4. **本地 MCP 服务器**——挂载在你机器上运行的 Model Context Protocol 服务器。

### 1. 托管工具

当你使用 `OpenAIResponsesModel` 时，可以添加以下内置工具：

| 工具                    | 类型字符串           | 目的                             |
| :---------------------- | :------------------- | :------------------------------- |
| Web search              | `'web_search'`       | 互联网搜索。                     |
| File / retrieval search | `'file_search'`      | 查询托管在 OpenAI 上的向量存储。 |
| Computer use            | `'computer'`         | 自动化 GUI 交互。                |
| Shell                   | `'shell'`            | 在主机上运行 shell 命令。        |
| Apply patch             | `'apply_patch'`      | 将 V4A diffs 应用于本地文件。    |
| Code Interpreter        | `'code_interpreter'` | 在沙盒环境中运行代码。           |
| Image generation        | `'image_generation'` | 基于文本生成图像。               |

```typescript
import { Agent, webSearchTool, fileSearchTool } from '@moryflow/agents'

const agent = new Agent({
  name: 'Travel assistant',
  tools: [webSearchTool(), fileSearchTool('VS_ID')],
})
```

### 2. 函数工具

你可以使用 `tool()` 帮助器将**任意**函数转换为工具。

```typescript
import { tool } from '@moryflow/agents'
import { z } from 'zod'

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`
  },
})
```

#### 选项参考

| 字段            | 必填 | 描述                                                                                |
| :-------------- | :--- | :---------------------------------------------------------------------------------- |
| `name`          | 否   | 默认为函数名（例如 `get_weather`）。                                                |
| `description`   | 是   | 清晰、可读的描述，展示给 LLM。                                                      |
| `parameters`    | 是   | Zod schema 或原始 JSON schema 对象。                                                |
| `strict`        | 否   | 当为 `true`（默认）时，如果参数验证失败，SDK 会返回模型错误。                       |
| `execute`       | 是   | `(args, context) => string \| Promise<string>`——你的业务逻辑。                      |
| `errorFunction` | 否   | 自定义处理器 `(context, error) => string`，用于将内部错误转换为对用户可见的字符串。 |

### 3. 智能体作为工具

有时你希望一个智能体在不完全交接对话的情况下*协助*另一个智能体。使用 `agent.asTool()`：

```typescript
import { Agent } from '@moryflow/agents'

const summarizer = new Agent({
  name: 'Summarizer',
  instructions: 'Generate a concise summary of the supplied text.',
})

const summarizerTool = summarizer.asTool({
  toolName: 'summarize_text',
  toolDescription: 'Generate a concise summary of the supplied text.',
})

const mainAgent = new Agent({
  name: 'Research assistant',
  tools: [summarizerTool],
})
```

### 4. MCP 服务器

你可以通过 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器暴露工具，并将其附加到智能体上。

```typescript
import { Agent, MCPServerStdio } from '@moryflow/agents'

const server = new MCPServerStdio({
  fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./sample_files',
})

await server.connect()

const agent = new Agent({
  name: 'Assistant',
  mcpServers: [server],
})
```

### 最佳实践

- **简短且明确的描述**——描述工具做什么，以及*何时使用*它。
- **验证输入**——尽可能使用 Zod schema 实现严格的 JSON 验证。
- **避免在错误处理器中产生副作用**——`errorFunction` 应返回有用的字符串。
- **每个工具只做一件事**——小而可组合的工具有助于提升模型推理效果。

## 6. 多智能体编排

编排指的是智能体的流转：哪些智能体运行、以什么顺序运行、以及它们如何决定下一步做什么。主要有两种方式：

1. **通过 LLM 的编排**：利用 LLM 的智能进行规划、推理，并据此决定采取哪些步骤。
2. **通过代码的编排**：用你的代码决定智能体的流程。

### 通过 LLM 的编排

当任务是开放式且你希望依赖 LLM 的智能时，这种模式非常适合。关键策略包括：

1. 投入精力打磨提示词。
2. 监控你的应用并持续迭代。
3. 允许智能体自省并改进。
4. 使用专注于单一任务的专业智能体。
5. 投入于 evals。

### 通过代码的编排

通过代码编排在速度、成本和性能方面更具确定性和可预测性。常见模式包括：

- 使用 structured outputs 生成可由代码检查的格式良好的数据。
- 将多个智能体串联起来，把一个的输出转换为下一个的输入。
- 让执行任务的智能体与负责评估和反馈的智能体在 `while` 循环中运行。
- 并行运行多个智能体（`Promise.all`）。

## 7. 交接 (Handoffs)

交接让一个智能体将对话的一部分委托给另一个智能体。在 LLM 看来，交接被表示为工具。

### 创建交接

每个智能体都接受一个 `handoffs` 选项。它可以包含其他 `Agent` 实例，或由 `handoff()` 帮助函数返回的 `Handoff` 对象。

```typescript
import { Agent, handoff } from '@moryflow/agents'

const billingAgent = new Agent({ name: 'Billing agent' })
const refundAgent = new Agent({ name: 'Refund agent' })

// Use Agent.create method to ensure the finalOutput type considers handoffs
const triageAgent = Agent.create({
  name: 'Triage agent',
  handoffs: [billingAgent, handoff(refundAgent)],
})
```

### 通过 `handoff()` 自定义交接

`handoff()` 函数允许你微调生成的工具。

- `agent` – 要交接到的智能体。
- `toolNameOverride` – 覆盖默认的 `transfer_to_<agent_name>` 工具名。
- `toolDescriptionOverride` – 覆盖默认工具描述。
- `onHandoff` – 发生交接时的回调。
- `inputType` – 交接所期望的输入模式。
- `inputFilter` – 过滤传递给下一个智能体的历史记录。

## 8. 上下文管理 (Context Management)

你需要关注两大类上下文：

1. **本地上下文**：代码在一次运行期间可访问的（`RunContext<T>`）。
2. **智能体/LLM 上下文**：语言模型在生成响应时可见的。

### 本地上下文

本地上下文由 `RunContext<T>` 类型表示。你可以创建任意对象来保存状态或依赖，并将其传给 `Runner.run()`。

```typescript
import { Agent, run, RunContext, tool } from '@moryflow/agents'
import { z } from 'zod'

interface UserInfo {
  name: string
  uid: number
}

const fetchUserAge = tool({
  name: 'fetch_user_age',
  description: 'Return the age of the current user',
  parameters: z.object({}),
  execute: async (_args, runContext?: RunContext<UserInfo>): Promise<string> => {
    return `User ${runContext?.context.name} is 47 years old`
  },
})

async function main() {
  const userInfo: UserInfo = { name: 'John', uid: 123 }

  const agent = new Agent<UserInfo>({
    name: 'Assistant',
    tools: [fetchUserAge],
  })

  const result = await run(agent, 'What is the age of the user?', {
    context: userInfo,
  })

  console.log(result.finalOutput)
  // The user John is 47 years old.
}
```

> **提示：** 上下文对象**不会**发送给 LLM。它是纯本地的。

### 智能体/LLM 上下文

当调用 LLM 时，它只能看到会话历史。要让更多信息可见，你可以：

1. 将其添加到智能体的 `instructions`（静态字符串或动态函数）。
2. 在调用 `Runner.run()` 时将其包含在 `input` 中。
3. 通过函数工具暴露，让 LLM 按需获取数据。
4. 使用检索或 Web 搜索工具。

## 9. 会话 (Sessions)

会话为 Agents SDK 提供了一个**持久化内存层**。将任何实现了 `Session` 接口的对象传给 `Runner.run`。

SDK 自带两个实现：`OpenAIConversationsSession` (Conversations API) 和 `MemorySession` (本地开发)。

### 快速上手

```typescript
import { Agent, OpenAIConversationsSession, run } from '@moryflow/agents'

const agent = new Agent({
  name: 'TourGuide',
  instructions: 'Answer with compact travel facts.',
})

// Any object that implements the Session interface works here.
const session = new OpenAIConversationsSession()

const firstTurn = await run(agent, 'What city is the Golden Gate Bridge in?', {
  session,
})
console.log(firstTurn.finalOutput) // "San Francisco"

const secondTurn = await run(agent, 'What state is it in?', { session })
console.log(secondTurn.finalOutput) // "California"
```

## 10. 模型 (Models)

每个 Agent 最终都会调用一个 LLM。SDK 通过 `Model` 和 `ModelProvider` 接口抽象了模型。

```typescript
import { Agent } from '@moryflow/agents'

const agent = new Agent({
  name: 'Creative writer',
  model: 'gpt-4.1',
})
```

### 默认模型

当未指定模型时，将使用默认模型（目前是 `gpt-4.1`）。

您可以通过设置 `OPENAI_DEFAULT_MODEL` 环境变量来更改全局默认值，或者在 `Runner` 实例上设置默认值：

```typescript
import { Runner } from '@moryflow/agents'

const runner = new Runner({ model: 'gpt‑4.1-mini' })
```

### ModelSettings

| 字段                | 类型               | 说明                             |
| :------------------ | :----------------- | :------------------------------- |
| `temperature`       | `number`           | 创造性与确定性的权衡。           |
| `topP`              | `number`           | 核采样。                         |
| `frequencyPenalty`  | `number`           | 惩罚重复的 token。               |
| `presencePenalty`   | `number`           | 鼓励引入新 token。               |
| `toolChoice`        | `'auto' \| ...`    | 工具选择控制。                   |
| `parallelToolCalls` | `boolean`          | 允许并行函数调用。               |
| `maxTokens`         | `number`           | 响应中的最大 token 数。          |
| `reasoning.effort`  | `'minimal' \| ...` | 适用于 gpt-5 等的推理强度。      |
| `text.verbosity`    | `'low' \| ...`     | 适用于 gpt-5 等的文本详尽程度。  |

## 11. 护栏 (Guardrails)

护栏与您的智能体*并行*运行，允许您对用户输入或智能体输出进行检查和验证。

1. **输入护栏** 运行在初始用户输入上（仅当该智能体是工作流中的*第一个*时）。
2. **输出护栏** 运行在最终智能体输出上（仅当该智能体是工作流中的*最后一个*时）。

### 绊线 (Tripwires)

当护栏失败时（`tripwireTriggered: true`），runner 会抛出 `InputGuardrailTripwireTriggered` 或 `OutputGuardrailTripwireTriggered` 错误并停止执行。

## 12. 流式传输 (Streaming)

Agents SDK 可以增量地传递来自模型和其他执行步骤的输出。

### 启用流式传输

向 `Runner.run()` 传入 `{ stream: true }` 选项以获取一个流式对象 (`StreamedRunResult`)。

```typescript
import { Agent, run } from '@moryflow/agents'

const agent = new Agent({
  name: 'Storyteller',
  instructions:
    'You are a storyteller. You will be given a topic and you will tell a story about it.',
})

const result = await run(agent, 'Tell me a story about a cat.', {
  stream: true,
})
```

### 获取文本输出

调用 `stream.toTextStream()` 获取已发出的文本流。

```typescript
result
  .toTextStream({
    compatibleWithNodeStreams: true,
  })
  .pipe(process.stdout)

// 确保在退出前等待 stream.completed
await result.completed
```

### 事件类型

该流会产出三种不同的事件类型：

1. **`raw_model_stream_event`**: 来自底层模型的原始事件。
2. **`run_item_stream_event`**: SDK 特定的运行信息。
3. **`agent_updated_stream_event`**: 指示当前活动的智能体已更改。

## 13. 人机协作 (Human-in-the-Loop)

本指南演示如何使用 SDK 内置的人工干预支持，根据人工介入来暂停和恢复智能体运行。

### 审批请求

可以通过将 `needsApproval` 选项设置为 `true`，或设置为一个返回布尔值的异步函数，来定义需要审批的工具。

```typescript
import { tool } from '@moryflow/agents'
import z from 'zod'

const sensitiveTool = tool({
  name: 'cancelOrder',
  description: 'Cancel order',
  parameters: z.object({
    orderId: z.number(),
  }),
  // always requires approval
  needsApproval: true,
  execute: async ({ orderId }, args) => {
    // ...
  },
})
```

### 流程

1. 智能体决定调用一个（或多个）设置了 `needsApproval` 的工具。
2. 智能体检查审批是否已被授予。
3. 如果缺少批准，智能体会收集所有工具审批请求并**中断**执行。
4. 执行结果将包含一个 `interruptions` 数组（`ToolApprovalItem`）。
5. 你可以调用 `result.state.approve(interruption)` 或 `result.state.reject(interruption)`。
6. 处理完所有中断后，可以将 `result.state` 传回 `runner.run(agent, state)` 来恢复执行。

## 14. MCP 集成

[**Model Context Protocol (MCP)**](https://modelcontextprotocol.io) 是一种开放协议，用于标准化应用如何向 LLMs 提供工具和上下文。

本 SDK 支持三种 MCP 服务器类型：

1. **托管 MCP 服务器工具** – 由 OpenAI Responses API 用作工具的远程 MCP 服务器。
2. **Streamable HTTP MCP 服务器** – 实现了 Streamable HTTP 传输的本地或远程服务器。
3. **Stdio MCP 服务器** – 通过标准输入/输出访问的服务器（最简单的选项）。

## 15. 追踪 (Tracing)

Agents SDK 内置了追踪功能，会在智能体运行期间收集完整的事件记录。

> **提示：** 追踪默认启用。可通过设置 `OPENAI_AGENTS_DISABLE_TRACING=1` 或在 `RunConfig` 中设置 `tracingDisabled: true` 来禁用。

### Trace 与 Span

- **Traces** 表示一次"工作流"的端到端操作（例如一次 `run()` 调用）。
- **Spans** 表示具有开始和结束时间的操作（例如 `AgentSpan`, `GenerationSpan`, `FunctionSpan`）。

### 默认追踪

默认情况下，SDK 会追踪：

- 整个 `run()`
- 每次智能体运行 (`AgentSpan`)
- LLM 生成 (`GenerationSpan`)
- 函数工具调用 (`FunctionSpan`)
- 护栏 (`GuardrailSpan`)
- 交接 (`HandoffSpan`)

## 16. SDK 配置

### API 密钥与客户端

默认情况下，SDK 会读取 `OPENAI_API_KEY` 环境变量。您也可以手动设置：

```typescript
import { setDefaultOpenAIKey } from '@moryflow/agents'
setDefaultOpenAIKey(process.env.OPENAI_API_KEY!)
```

或传入自定义的 `OpenAI` 客户端实例：

```typescript
import { OpenAI } from 'openai'
import { setDefaultOpenAIClient } from '@moryflow/agents'

const customClient = new OpenAI({ baseURL: '...', apiKey: '...' })
setDefaultOpenAIClient(customClient)
```

切换 API (Responses vs Chat Completions):

```typescript
import { setOpenAIAPI } from '@moryflow/agents'
setOpenAIAPI('chat_completions') // 默认为 'responses'
```

### 调试日志

SDK 使用 `debug` 包进行调试日志记录。

```bash
export DEBUG=openai-agents*
```

## 17. 故障排除

### 支持的运行环境

OpenAI Agents SDK 支持以下服务器环境：

- Node.js 22+
- Deno 2.35+
- Bun 1.2.5+

**限制性支持:**

- **Cloudflare Workers**：需要 `nodejs_compat`，且需要手动刷新追踪。
- **浏览器**：目前不支持追踪。
- **v8 isolates**：理论上可以打包，但追踪无法工作。

## 18. 使用 AI SDK 指定任意模型

> **注意：** 此适配器仍处于测试版。

如果您想使用其他模型（例如 Anthropic, Google Vertex AI 等），[Vercel 的 AI SDK](https://sdk.vercel.ai/) 提供了多种受支持的模型，可通过此适配器引入。

### 设置

1. 安装扩展包：

   ```bash
   npm install @moryflow/agents-extensions
   ```

2. 从 Vercel 的 AI SDK 选择所需的模型包并进行安装（例如 OpenAI）：

   ```bash
   npm install @ai-sdk/openai
   ```

3. 导入适配器和模型：

   ```typescript
   import { openai } from '@ai-sdk/openai' // 来自 Vercel AI SDK
   import { aisdk } from '@moryflow/agents-extensions' // 适配器
   ```

4. 初始化一个模型实例供智能体使用：

   ```typescript
   const model = aisdk(openai('gpt-5-mini'))
   ```

### 示例

```typescript
import { Agent, run } from '@moryflow/agents'

// 1. Import the model package you installed
import { openai } from '@ai-sdk/openai'

// 2. Import the adapter
import { aisdk } from '@moryflow/agents-extensions'

// 3. Create a model instance to be used by the agent
const model = aisdk(openai('gpt-5-mini'))

// 4. Create an agent with the model
const agent = new Agent({
  name: 'My Agent',
  instructions: 'You are a helpful assistant.',
  model,
})

// 5. Run the agent with the new model
run(agent, 'What is the capital of Germany?')
```

---

_文档版本: 1.0 | 更新日期: 2026-01-13_
