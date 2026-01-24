---
title: OpenCode 架构分析与 Aiget 优化建议
date: 2026-01-12
scope: moryflow/agents
status: proposal
---

# OpenCode 架构分析与 Aiget 优化建议

> 本文档分析 OpenCode（开源 AI 编码助手）的架构模式，并提出针对 Aiget（尤其是 Moryflow 的 Agent Runtime）可落地的优化建议。
> 参考快照：`.opencode-ref/`（opencode@`f1a13f25a410ba79fd1537a4ac0df5864ac14530`，拉取日期：2026-01-12）。本文中的 OpenCode 细节以该快照为准。

## 使用指南：先准备参考项目快照（Snapshot）

> 背景：参考项目（如 OpenCode）不会被提交到本仓库（通常在 `.gitignore` 中），因此当你把本分支拉到另一台机器后，**本地不会自动带上 `.opencode-ref/`**。
> 在阅读/对照本文档前，请先确认参考快照已存在且版本一致。

### 1) 检查快照是否存在

- 仓库根目录下应存在：`.opencode-ref/`
- 且应能取到对应 commit：`f1a13f25a410ba79fd1537a4ac0df5864ac14530`

### 2) 如果不存在：拉取并固定到本文档使用的 commit

```bash
# 在 Aiget 仓库根目录执行
git clone https://github.com/anomalyco/opencode .opencode-ref
git -C .opencode-ref checkout f1a13f25a410ba79fd1537a4ac0df5864ac14530
```

### 3) 如果已存在但版本不一致：切换到对应 commit

```bash
git -C .opencode-ref fetch --all --tags
git -C .opencode-ref checkout f1a13f25a410ba79fd1537a4ac0df5864ac14530
```

## 目录

1. [OpenCode 项目概述](#1-opencode-项目概述)
2. [基础设施改进](#2-基础设施改进)
   - 2.1 类型安全事件总线
   - 2.2 分层配置系统
   - 2.3 权限系统
   - 2.4 Zod 工具系统
3. [Moryflow AI 工作流改进](#3-moryflow-ai-工作流改进)
   - 3.1 会话压缩（Token 感知）
   - 3.2 Agent 定义系统
   - 3.3 流式处理增强
   - 3.4 Doom Loop 保护
   - 3.5 工具结果缓存
   - 3.6 并行工具执行
4. [对比分析：Moryflow 现有 vs OpenCode](#4-对比分析)
5. [优先级排序与实施路径](#5-优先级排序与实施路径)
6. [参考文件索引](#6-参考文件索引)

---

## 1. OpenCode 项目概述

**OpenCode** 是一个开源的 AI 编码助手，类似 Claude Code / Cursor 的替代品。

### 基本信息

| 项目     | 详情                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 仓库     | https://github.com/anomalyco/opencode                                      |
| 许可     | MIT                                                                        |
| 本地快照 | `.opencode-ref/`（git commit: `f1a13f25a410ba79fd1537a4ac0df5864ac14530`） |
| 架构     | Monorepo（Turborepo + Bun）                                                |

### 技术栈

| 层级     | 技术                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| 运行时   | Bun（主）/ Node.js（部分场景）                                                 |
| 语言     | TypeScript (严格模式)                                                          |
| UI       | SolidJS + OpenTUI（终端/应用 UI），Astro（Web/Docs），Tauri（Desktop Wrapper） |
| HTTP     | Hono（部分服务端路由）                                                         |
| LLM      | Vercel AI SDK（`ai` + `@ai-sdk/*` 多提供商）                                   |
| 验证     | Zod                                                                            |
| 本地存储 | 文件存储（JSON；非 SQLite）                                                    |

### 核心架构

```
.opencode-ref/
├── packages/
│   ├── opencode/          # 核心引擎（Agent/Session/Tool/Permission/Bus/...）
│   │   ├── src/
│   │   │   ├── agent/     # Agent 定义与配置
│   │   │   ├── bus/       # 事件总线
│   │   │   ├── config/    # 分层配置
│   │   │   ├── permission/# 权限系统
│   │   │   ├── provider/  # LLM 提供商抽象
│   │   │   ├── session/   # 会话管理
│   │   │   └── tool/      # 23 个内置工具
│   │   └── ...
│   ├── plugin/            # 插件 SDK（@opencode-ai/plugin；Hooks 扩展点）
│   ├── sdk/               # TypeScript SDK（@opencode-ai/sdk）
│   ├── app/               # 主应用 UI（SolidJS）
│   ├── desktop/           # 桌面端（Tauri，包装 app）
│   └── web/               # 网站/文档（Astro + Solid）
├── .opencode/             # 项目内扩展目录（agent/command/tool）
└── opencode.json          # 项目级配置（JSONC）
```

---

## 2. 基础设施改进

### 2.1 类型安全事件总线

**OpenCode 实现**: `packages/opencode/src/bus/`

OpenCode 使用类型安全的发布/订阅系统实现松耦合通信。

#### 核心代码

```typescript
// 简化节选（以 `.opencode-ref/packages/opencode/src/bus/*` 为准）
import z from 'zod';

export namespace BusEvent {
  export type Definition = ReturnType<typeof define>;

  const registry = new Map<string, Definition>();

  export function define<Type extends string, Properties extends z.ZodType>(
    type: Type,
    properties: Properties
  ) {
    const def = { type, properties };
    registry.set(type, def);
    return def;
  }
}

export namespace Bus {
  type Subscription = (event: any) => void | Promise<void>;
  const subscriptions = new Map<string, Subscription[]>();

  export async function publish(def: BusEvent.Definition, properties: any) {
    const payload = { type: def.type, properties };
    const pending: Promise<unknown>[] = [];

    for (const key of [def.type, '*']) {
      for (const sub of subscriptions.get(key) ?? []) {
        pending.push(Promise.resolve(sub(payload)));
      }
    }

    // 同步到全局 bus（用于跨 UI / CLI 层通信）
    GlobalBus.emit('event', { directory: Instance.directory, payload });
    await Promise.all(pending);
  }
}
```

#### 事件定义示例

```typescript
// 会话压缩事件
export const Event = {
  Compacted: BusEvent.define(
    'session.compacted',
    z.object({
      sessionID: z.string(),
    })
  ),
};

// 权限事件
export const Event = {
  Asked: BusEvent.define('permission.asked', Request),
  Replied: BusEvent.define(
    'permission.replied',
    z.object({
      sessionID: z.string(),
      requestID: z.string(),
      reply: Reply,
    })
  ),
};
```

#### Aiget 应用场景

> 说明：OpenCode 的 Bus 是“进程内 / 实例内”的事件总线。Aiget 若需要跨进程（Electron main ↔ renderer）或跨服务（server ↔ console）通信，建议在事件总线之上加 IPC/WebSocket/队列适配层，而不是直接把进程内 Bus 当作分布式消息系统使用。

| 场景     | 事件                     | 发布者        | 订阅者                        |
| -------- | ------------------------ | ------------- | ----------------------------- |
| 会话压缩 | `session.compacted`      | Agent Runtime | UI（展示“已压缩/可继续”提示） |
| 同步状态 | `sync.started/completed` | Moryflow PC   | UI 状态栏                     |
| 配额更新 | `quota.updated`          | Aiget Server  | Console 仪表盘                |
| MCP 重载 | `mcp.reloaded`           | Agent Runtime | UI 工具列表                   |

#### 建议包结构

```
packages/event-bus/
├── src/
│   ├── index.ts           # 主导出
│   ├── bus.ts             # 核心 Bus
│   ├── bus-event.ts       # 事件定义助手
│   ├── events/
│   │   ├── memory.events.ts
│   │   ├── sync.events.ts
│   │   └── quota.events.ts
│   └── adapters/
│       ├── nestjs.ts      # @Injectable() 服务
│       ├── electron.ts    # IPC 桥接
│       └── websocket.ts   # 实时推送
├── package.json
└── tsc-multi.json
```

---

### 2.2 分层配置系统

**OpenCode 实现**: `packages/opencode/src/config/`

OpenCode 支持三级配置覆盖：全局 → 项目 → 内联。

#### 配置层级

```
~/.config/opencode/config.json   # 全局配置
    ↓ 覆盖
./opencode.json                   # 项目配置
    ↓ 覆盖
Agent frontmatter / CLI flags     # 内联配置
```

#### 配置格式 (JSONC)

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.schema.json",

  // 模型配置
  "model": {
    "default": "anthropic/claude-sonnet-4-20250514",
  },

  // 提供商密钥
  "provider": {
    "anthropic": {
      "api_key": "{env:ANTHROPIC_API_KEY}", // 环境变量引用
    },
    "openai": {
      "api_key": "{file:~/.secrets/openai.txt}", // 文件引用
    },
  },

  // MCP 服务器
  "mcp": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
    },
  },

  // 权限规则
  "permission": {
    "read": "allow",
    "edit": {
      "*": "ask",
      "*.md": "allow",
    },
    "bash": "ask",
  },
}
```

#### 特殊语法

| 语法          | 说明       | 示例                        |
| ------------- | ---------- | --------------------------- |
| `{env:VAR}`   | 环境变量   | `{env:OPENAI_API_KEY}`      |
| `{file:path}` | 文件内容   | `{file:~/.secrets/key.txt}` |
| `{shell:cmd}` | Shell 输出 | `{shell:cat ~/.key}`        |

#### Aiget 应用建议

```typescript
// packages/config/src/loader.ts（建议新增）
// 注意：Aiget / Moryflow 两条业务线不共享账号/Token/数据库，建议配置也按 product 分隔。
export function loadConfig(input: { directory: string; product: 'aiget' | 'moryflow' }): Config {
  const global = readConfig(`~/.config/${input.product}/config.json`);
  const project = readConfig(`${input.directory}/${input.product}.json`);

  return deepMerge(global, project);
}

export function resolveValue(value: string): string {
  if (value.startsWith('{env:')) {
    const key = value.slice(5, -1);
    return process.env[key] ?? '';
  }
  if (value.startsWith('{file:')) {
    const path = value.slice(6, -1);
    return fs.readFileSync(expandPath(path), 'utf-8').trim();
  }
  return value;
}
```

---

### 2.3 权限系统

**OpenCode 实现**: `packages/opencode/src/permission/next.ts`

基于模式匹配的细粒度权限控制。

#### 核心概念

```typescript
// 权限动作
export const Action = z.enum(['allow', 'deny', 'ask']);

// 权限规则
export const Rule = z.object({
  permission: z.string(), // 权限类型: read, edit, bash, etc.
  pattern: z.string(), // 匹配模式: *, *.env, src/**/*.ts
  action: Action, // 动作
});

// 规则集
export type Ruleset = Rule[];
```

#### 规则评估

```typescript
export function evaluate(permission: string, pattern: string, ...rulesets: Ruleset[]): Rule {
  const merged = merge(...rulesets);

  // 从后往前匹配（后面的规则优先级更高）
  const match = merged.findLast(
    (rule) => Wildcard.match(permission, rule.permission) && Wildcard.match(pattern, rule.pattern)
  );

  return match ?? { action: 'ask', permission, pattern: '*' };
}
```

#### 权限请求流程

```
工具请求执行
    ↓
evaluate(permission, pattern, ruleset)
    ↓
┌─ action === 'allow' → 执行
├─ action === 'deny'  → 抛出 DeniedError
└─ action === 'ask'   → 发布 Event.Asked
                            ↓
                        UI 显示审批对话框
                            ↓
                        用户选择: once / always / reject
                            ↓
                        发布 Event.Replied
                            ↓
                        继续/中止执行
```

#### Aiget 应用场景

| 场景       | 权限    | 模式            | 动作   |
| ---------- | ------- | --------------- | ------ |
| 读取 .env  | `read`  | `*.env`         | `deny` |
| 写入配置   | `edit`  | `config/*.json` | `ask`  |
| 执行 Shell | `bash`  | `*`             | `ask`  |
| 网络请求   | `fetch` | `localhost:*`   | `deny` |

---

### 2.4 Zod 工具系统

**OpenCode 实现**: `packages/plugin/src/tool.ts`

统一的工具定义模式，支持 AI Agent 和 REST API 双重调用。

#### 工具定义

```typescript
// `.opencode-ref/packages/plugin/src/tool.ts`（节选）
import { z } from 'zod';

export type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

export function tool<Args extends z.ZodRawShape>(input: {
  description: string;
  args: Args;
  execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>;
}) {
  return input;
}

tool.schema = z;
```

#### 工具示例

```typescript
// .opencode/tool/github-triage.ts
import { tool } from '@opencode-ai/plugin';

const DESCRIPTION = `
Triage GitHub issues by assigning labels and assignees.
`;

export default tool({
  description: DESCRIPTION,
  args: {
    assignee: tool.schema
      .enum(['alice', 'bob', 'charlie'])
      .describe('The assignee username')
      .default('alice'),
    labels: tool.schema.array(tool.schema.enum(['bug', 'feature', 'docs'])).default([]),
    issue_number: tool.schema.number().describe('GitHub issue number'),
  },
  async execute(args, context) {
    const { assignee, labels, issue_number } = args;

    // 使用环境变量
    const token = process.env.GITHUB_TOKEN;

    // 调用 GitHub API
    const result = await github.updateIssue(issue_number, {
      assignee,
      labels,
    });

    return `Issue #${issue_number} updated: assigned to ${assignee}`;
  },
});
```

#### Aiget 工具包结构

```
packages/agents-tools/
├── src/
│   ├── index.ts
│   ├── create-tools.ts     # 工具集创建器（现有）
│   ├── file/               # 文件类工具（现有）
│   ├── search/             # 搜索类工具（现有）
│   ├── web/                # Web 工具（现有）
│   ├── task/               # Task / SubAgent（现有）
│   ├── fetchx/             # （建议新增）网页抓取能力工具
│   └── memox/              # （建议新增）记忆/知识图谱能力工具
```

> 补充：Aiget 当前已经在 `@aiget/agents-core` 暴露了 `tool({ name, description, parameters, execute })` 辅助函数，并在 `packages/agents-tools` 中实际使用（例如 `read`/`glob`/`grep`/`web_search`）。因此这里更多是“把 Fetchx/Memox 能力接入现有工具体系”，而不是重新发明一套 tool SDK。

---

## 3. Moryflow AI 工作流改进

### 3.1 会话压缩（Token 感知）

**OpenCode 实现**: `packages/opencode/src/session/compaction.ts`

这是对 Moryflow 最有价值的改进之一。当前 Moryflow 会将完整对话历史发送给模型，可能导致 Token 溢出。

#### OpenCode 压缩策略

```typescript
export namespace SessionCompaction {
  // 常量配置
  export const PRUNE_MINIMUM = 20_000;   // 最少修剪 20K tokens
  export const PRUNE_PROTECT = 40_000;   // 保护最近 40K tokens

  const PRUNE_PROTECTED_TOOLS = ['skill']; // 不修剪的工具

  // 检测是否溢出
  export async function isOverflow(input: {
    tokens: MessageV2.Assistant['tokens'];
    model: Provider.Model;
  }) {
    const context = input.model.limit.context;
    if (context === 0) return false;

    const count = input.tokens.input + input.tokens.cache.read + input.tokens.output;
    const output = Math.min(input.model.limit.output, SessionPrompt.OUTPUT_TOKEN_MAX);
    const usable = context - output;

    return count > usable;
  }

  // 修剪旧工具输出
  export async function prune(input: { sessionID: string }) {
    const msgs = await Session.messages({ sessionID: input.sessionID });
    let total = 0;
    let pruned = 0;
    const toPrune = [];
    let turns = 0;

    // 从后往前遍历
    loop: for (let msgIndex = msgs.length - 1; msgIndex >= 0; msgIndex--) {
      const msg = msgs[msgIndex];
      if (msg.info.role === 'user') turns++;
      if (turns < 2) continue; // 保护最近 2 轮
      if (msg.info.role === 'assistant' && msg.info.summary) break loop;

      for (let partIndex = msg.parts.length - 1; partIndex >= 0; partIndex--) {
        const part = msg.parts[partIndex];
        if (part.type === 'tool' && part.state.status === 'completed') {
          if (PRUNE_PROTECTED_TOOLS.includes(part.tool)) continue;
          if (part.state.time.compacted) break loop;

          const estimate = Token.estimate(part.state.output);
          total += estimate;

          if (total > PRUNE_PROTECT) {
            pruned += estimate;
            toPrune.push(part);
          }
        }
      }
    }

    // 执行修剪
    if (pruned > PRUNE_MINIMUM) {
      for (const part of toPrune) {
        part.state.time.compacted = Date.now();
        await Session.updatePart(part);
      }
    }
  }

  // 生成上下文摘要
  export async function process(input: {
    parentID: string;
    messages: MessageV2.WithParts[];
    sessionID: string;
    abort: AbortSignal;
    auto: boolean;
  }) {
    const agent = await Agent.get('compaction');
    const model = /* ... */;

    // 创建摘要消息
    const msg = await Session.updateMessage({
      role: 'assistant',
      mode: 'compaction',
      summary: true,
      // ...
    });

    // 调用 LLM 生成摘要
    const promptText = `
      Provide a detailed prompt for continuing our conversation above.
      Focus on information that would be helpful for continuing:
      - what we did
      - what we're doing
      - which files we're working on
      - what we're going to do next

      The new session will not have access to our conversation.
    `;

    const result = await processor.process({
      messages: [
        ...MessageV2.toModelMessage(input.messages),
        { role: 'user', content: [{ type: 'text', text: promptText }] },
      ],
      // ...
    });

    Bus.publish(Event.Compacted, { sessionID: input.sessionID });
    return 'continue';
  }
}
```

#### Moryflow 集成建议

Moryflow 当前的会话存储模型是 `AgentInputItem[]`（见 `packages/agents-runtime/src/session.ts` 的 `SessionStore` / `createSessionAdapter`），与 OpenCode 的 `MessageV2 + Part` 模型不同；因此更推荐把 compaction 设计成“输入裁剪 / history 重写”两步：

1. **输入裁剪**：通过 `Runner.sessionInputCallback` 在送给模型前裁剪历史（优先丢弃旧 tool output / reasoning）。
2. **history 重写（可选）**：当需要长期持久化时，用 `clearHistory + appendHistory` 把历史重写为「摘要 + 最近 N 轮」，避免本地存储无限膨胀。

```typescript
// packages/agents-runtime/src/session-compaction.ts（建议新增）
import type { AgentInputItem } from '@aiget/agents';
import { getModelContextWindow } from '@aiget/agents-model-registry';
import type { SessionStore } from './session';

export type CompactionConfig = {
  /** 保护最近多少轮 user 消息（例如 2~4 轮） */
  protectRecentTurns: number;
  /**
   * 触发阈值：当 history 近似 token/体积超过阈值则尝试压缩
   * 注：没有 tokenizer 时可先用字符数/JSON 大小做近似；后续再接入精确 token 估算
   */
  maxApproxChars: number;
};

export async function compactSessionIfNeeded(input: {
  chatId: string;
  store: SessionStore;
  modelId: string;
  config: CompactionConfig;
}): Promise<{ compacted: boolean; summaryItem?: AgentInputItem }> {
  const history = await input.store.getHistory(input.chatId);
  const contextWindow = getModelContextWindow(input.modelId);
  void contextWindow; // 用于后续更精确的阈值策略

  // TODO: 1) 判断是否接近 overflow（可用 contextWindow + 近似/精确 token 估算）
  // TODO: 2) 生成摘要（可用专用 compaction agent，输出为 System/Assistant message item）
  // TODO: 3) 重写历史：clearHistory + appendHistory([summaryItem, ...tailItems])
  return { compacted: false };
}
```

#### Moryflow 现有 vs 建议

| 方面         | Moryflow 现有 | 建议改进                                                                     |
| ------------ | ------------- | ---------------------------------------------------------------------------- |
| Token 跟踪   | ✅ 有 (usage) | 保持                                                                         |
| 溢出检测     | ❌ 无         | 增加“接近 context window”检测（`@aiget/agents-model-registry` + token 估算） |
| 输入裁剪     | ❌ 无         | 增加 `sessionInputCallback` 裁剪（优先丢弃旧 tool output / reasoning）       |
| history 重写 | ❌ 无         | 生成摘要并重写历史（`clearHistory + appendHistory`）                         |
| 配置化       | -             | 添加 `CompactionConfig`（阈值/保护轮数/策略开关）                            |

---

### 3.2 Agent 定义系统

**OpenCode 实现**: `packages/opencode/src/agent/agent.ts` + `.opencode/agent/`

OpenCode 支持用 Markdown + YAML frontmatter 定义 Agent，非常灵活。

#### Agent 定义格式

```markdown
---
mode: primary # primary | subagent | all
model: opencode/claude-haiku-4-5
color: '#44BA81' # UI 显示颜色
hidden: false # 是否在切换器中隐藏
tools:
  '*': true # 默认允许所有工具
  'bash': false # 禁用 bash
permission:
  read: allow
  edit: ask
  bash: deny
temperature: 0.7
topP: 0.9
steps: 10 # 最大工具调用轮数
---

You are a research assistant specialized in gathering information.

## Responsibilities

- Search the web for relevant information
- Read and summarize documents
- Extract key facts and data

## Guidelines

- Always cite sources
- Prefer official documentation
- Cross-reference multiple sources
```

#### Agent 解析

```typescript
// agent.ts
export namespace Agent {
  export const Info = z.object({
    name: z.string(),
    description: z.string().optional(),
    mode: z.enum(['subagent', 'primary', 'all']),
    native: z.boolean().optional(),
    hidden: z.boolean().optional(),
    topP: z.number().optional(),
    temperature: z.number().optional(),
    color: z.string().optional(),
    permission: PermissionNext.Ruleset,
    model: z
      .object({
        modelID: z.string(),
        providerID: z.string(),
      })
      .optional(),
    prompt: z.string().optional(),
    options: z.record(z.string(), z.any()),
    steps: z.number().int().positive().optional(),
  });

  export async function get(name: string): Promise<Info> {
    // 1. 检查内置 Agent
    const builtin = await getBuiltin(name);
    if (builtin) return builtin;

    // 2. 检查用户自定义 Agent
    const custom = await loadFromFile(`.opencode/agent/${name}.md`);
    if (custom) return parseAgentMarkdown(custom);

    throw new Error(`Agent "${name}" not found`);
  }

  function parseAgentMarkdown(content: string): Info {
    const { frontmatter, body } = parseFrontmatter(content);
    return {
      ...frontmatter,
      prompt: body,
    };
  }
}
```

#### Moryflow 集成建议

当前 Moryflow 的 Agent 配置在代码中硬编码。建议：

```typescript
// packages/agents-runtime/src/agent-loader.ts（建议新增）

export interface AgentDefinition {
  name: string;
  mode: 'primary' | 'subagent';
  model?: { provider: string; model: string };
  tools?: Record<string, boolean>;
  temperature?: number;
  maxSteps?: number;
  systemPrompt: string;
}

export async function loadAgent(name: string, searchPaths: string[]): Promise<AgentDefinition> {
  for (const basePath of searchPaths) {
    const filePath = path.join(basePath, `${name}.md`);
    if (await fs.exists(filePath)) {
      const content = await fs.readFile(filePath, 'utf-8');
      return parseAgentMarkdown(content);
    }
  }
  throw new Error(`Agent "${name}" not found`);
}

// 使用示例
const researchAgent = await loadAgent('research', [
  './moryflow/agents', // 项目级
  '~/.moryflow/agents', // 用户级
]);
```

#### 建议的 Agent 目录结构

```
apps/moryflow/pc/
├── agents/                    # 内置 Agent
│   ├── default.md             # 默认对话 Agent
│   ├── research.md            # 研究助手
│   ├── writing.md             # 写作助手
│   └── coding.md              # 编码助手
└── ...

~/.moryflow/
├── agents/                    # 用户自定义 Agent
│   └── my-custom-agent.md
└── config.json
```

---

### 3.3 流式处理增强

**OpenCode 实现**: `packages/opencode/src/session/processor.ts`

OpenCode 的流式处理支持多种事件类型。

#### 事件类型

```typescript
// 原始模型流事件
for await (const value of stream.fullStream) {
  switch (value.type) {
    case 'reasoning-delta': // 推理过程（o1/o3）
      // 增量推理文本
      break;

    case 'text-delta': // 文本输出
      // 增量输出文本
      break;

    case 'tool-call': // 工具调用（完整）
      // { toolCallId, toolName, args }
      break;

    case 'tool-call-delta': // 工具调用（增量）
      // { toolCallId, argsTextDelta }
      break;

    case 'tool-call-result': // 工具结果
      // { toolCallId, result }
      break;
  }
}
```

#### Moryflow 现有流式类型

```typescript
// packages/agents-core/src/events.ts
type RunStreamEvent =
  | RunRawModelStreamEvent // 原始模型事件（ResponseStreamEvent）
  | RunItemStreamEvent // 结构化运行事件（message/tool/handoff/...）
  | RunAgentUpdatedStreamEvent; // Agent 切换事件

// RunItemStreamEvent.name 包括:
// - 'message_output_created'
// - 'tool_called'
// - 'tool_output'
// - 'reasoning_item_created'
```

> 现状补充：`ResponseStreamEvent`（`packages/agents-core/src/types/protocol.ts`）目前只显式建模了 `output_text_delta` / `response_started` / `response_done` / `model`（透传 provider 原始事件）。因此 “tool-call-delta / reasoning-delta” 要做到稳定可用，需要扩展协议或从 `model.event` 中解析不同 provider 的 payload。

#### 建议增强

```typescript
// 1. 添加 reasoning 显示支持
interface ReasoningStreamEvent {
  type: 'reasoning_delta';
  text: string;
}

// 2. 添加 tool-call-delta 支持（实时显示参数构建）
interface ToolCallDeltaEvent {
  type: 'tool_call_delta';
  toolCallId: string;
  argsTextDelta: string;
}

// 3. 在 UI 中显示
function ChatMessage({ event }) {
  if (event.type === 'reasoning_delta') {
    return <ReasoningBlock text={event.text} />;
  }
  if (event.type === 'tool_call_delta') {
    return <ToolCallProgress id={event.toolCallId} args={event.argsTextDelta} />;
  }
  // ...
}
```

---

### 3.4 Doom Loop 保护

**OpenCode 实现**: `packages/opencode/src/session/processor.ts`

防止 AI 陷入无限工具调用循环。

#### OpenCode 实现

```typescript
export function create(input: {
  assistantMessage: MessageV2.Assistant;
  sessionID: string;
  model: Provider.Model;
  abort: AbortSignal;
}) {
  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  return {
    async process(streamInput: LLM.StreamInput) {
      while (true) {
        attempt++;

        // Doom loop 检测
        if (attempt > MAX_ATTEMPTS) {
          log.warn('Doom loop detected, stopping');
          return 'stop';
        }

        const stream = await LLM.stream(streamInput);

        for await (const value of stream.fullStream) {
          // 处理事件...
        }

        // 检查是否需要继续
        if (shouldStop()) {
          return 'stop';
        }
      }
    },
  };
}
```

#### Moryflow 集成建议

```typescript
// packages/agents-core/src/runImplementation.ts

const DOOM_LOOP_CONFIG = {
  maxAttempts: 3,           // 最大重试次数
  maxToolCalls: 50,         // 单次运行最大工具调用
  sameToolThreshold: 5,     // 相同工具连续调用阈值
};

async function executeRun(...) {
  let attempt = 0;
  let totalToolCalls = 0;
  const toolCallHistory: string[] = [];

  while (true) {
    attempt++;

    // 检测 doom loop
    if (attempt > DOOM_LOOP_CONFIG.maxAttempts) {
      throw new DoomLoopError('Max attempts exceeded');
    }

    if (totalToolCalls > DOOM_LOOP_CONFIG.maxToolCalls) {
      throw new DoomLoopError('Max tool calls exceeded');
    }

    // 检测相同工具重复调用
    const recentTools = toolCallHistory.slice(-DOOM_LOOP_CONFIG.sameToolThreshold);
    if (recentTools.length === DOOM_LOOP_CONFIG.sameToolThreshold &&
        recentTools.every(t => t === recentTools[0])) {
      throw new DoomLoopError(`Tool "${recentTools[0]}" called repeatedly`);
    }

    // 执行...
    for (const toolCall of toolCalls) {
      totalToolCalls++;
      toolCallHistory.push(toolCall.name);
    }
  }
}
```

#### Moryflow 现有 vs 建议

| 方面         | Moryflow 现有 | 建议改进 |
| ------------ | ------------- | -------- |
| 最大轮数     | ✅ maxTurns   | 保持     |
| 工具调用计数 | ❌ 无         | 添加     |
| 重复检测     | ❌ 无         | 添加     |
| 错误处理     | ⚠️ 基础       | 增强     |

---

### 3.5 工具结果缓存

**现状**: Moryflow 不缓存工具结果，重复调用会重新执行。

#### 建议实现

```typescript
// packages/agents-core/src/tool-cache.ts（建议新增）

interface CacheEntry {
  result: string;
  timestamp: number;
  hash: string;
}

export class ToolResultCache {
  private cache = new Map<string, CacheEntry>();
  private ttl: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // 默认 5 分钟
    this.ttl = ttlMs;
  }

  private getKey(toolName: string, args: unknown): string {
    return `${toolName}:${hashObject(args)}`;
  }

  async get(toolName: string, args: unknown): Promise<string | null> {
    const key = this.getKey(toolName, args);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  async set(toolName: string, args: unknown, result: string): Promise<void> {
    const key = this.getKey(toolName, args);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hash: key,
    });
  }
}

// 可缓存的工具类型
const CACHEABLE_TOOLS = [
  'read', // 文件内容（除非被修改）
  'web_search', // 搜索结果
  'glob', // 文件列表
  'grep', // 搜索结果
];
```

---

### 3.6 并行工具执行

**现状（已具备）**：`packages/agents-core/src/runImplementation.ts` 的 `executeFunctionToolCalls()` 已通过 `Promise.all(...)` 并发执行同一轮模型输出的多个 Function Tool Call。

这一点与 OpenCode 的理念一致：**能并行就并行**。但在工程上，真正缺的通常不是“能不能并行”，而是：

1. **并发上限**：避免瞬时把 FS / HTTP / MCP 打爆（尤其是同时触发多个网络工具）。
2. **互斥/依赖**：写入类工具、同一路径操作、同一资源（如同一 session/vault）的串行化。
3. **可观测性**：每个工具的排队/开始/结束/耗时，以及被限流的原因（便于 UX 和调参）。

#### 建议实现

```typescript
// 建议：在现有 `executeFunctionToolCalls()` 之上增加“并发控制 + 写入互斥”层（伪代码）
//
// 现有（节选）：
// const results = await Promise.all(toolRuns.map(runSingleTool));
//
// 建议改为（示意）：
// const limit = createLimiter(maxConcurrentTools);
// const results = await Promise.all(toolRuns.map((toolRun) => {
//   const resource = getResourceKey(toolRun); // e.g. `fs:${absPath}` / `mcp:${server}` / null
//   return runWithOptionalLock(resource, () => limit(() => runSingleTool(toolRun)));
// }));
//
// 说明：
// - `maxConcurrentTools` 建议可配置（默认 4~8），避免 IO 风暴
// - 写入类工具（write/edit/move/delete/apply_patch/shell）建议按资源加锁
// - 读操作可自由并发（但依然建议受总并发上限约束）
```

---

## 4. 对比分析

### Moryflow 现有架构 vs OpenCode

| 特性           | Moryflow                           | OpenCode                                   | 差距            |
| -------------- | ---------------------------------- | ------------------------------------------ | --------------- |
| **Agent 框架** | ✅ 基于 OpenAI SDK                 | ✅ 自研                                    | 相当            |
| **工具系统**   | ✅ FunctionTool                    | ✅ Zod Tool                                | 相当            |
| **流式处理**   | ✅ RunStreamEvent                  | ✅ fullStream                              | 相当            |
| **工具审批**   | ✅ ToolApprovalFunction            | ✅ Permission ask                          | 相当            |
| **MCP 支持**   | ✅ agents-mcp                      | ✅ 内置                                    | 相当            |
| **多 Agent**   | ✅ Handoff                         | ✅ Agent 切换                              | 相当            |
| **Session**    | ✅ SessionStore                    | ✅ Session 接口                            | 相当            |
| **Token 压缩** | ❌ 无                              | ✅ Compaction                              | **差距大**      |
| **Agent 配置** | ⚠️ 代码中                          | ✅ Markdown                                | **可改进**      |
| **事件总线**   | ❌ 无                              | ✅ Bus                                     | **可添加**      |
| **分层配置**   | ⚠️ 基础                            | ✅ 完善                                    | **可改进**      |
| **Doom Loop**  | ⚠️ maxTurns                        | ✅ 多维检测                                | **可增强**      |
| **工具缓存**   | ❌ 无                              | ⚠️ 部分                                    | **可添加**      |
| **工具并发**   | ✅ 同一轮工具并发（`Promise.all`） | ✅（AI SDK；并发取决于 provider/工具实现） | 需补齐限流/互斥 |

### Moryflow 优势

1. **平台适配**: 完善的 Electron/Node.js/移动端适配层
2. **多提供商**: 支持 OpenAI/Anthropic/Google/XAI/OpenRouter
3. **实时语音**: agents-realtime 包
4. **Guardrails**: 输入/输出安全验证
5. **沙盒执行**: 安全的 Shell 执行环境

### OpenCode 可借鉴的优势

1. **Token 感知压缩**: 智能修剪旧工具输出
2. **Markdown Agent**: 灵活的 Agent 定义
3. **插件系统**: Hooks 扩展点（可改写 params/messages/system、拦截工具执行等）
4. **事件驱动**: 松耦合通信
5. **分层配置**: 全局/项目/内联覆盖

---

## 5. 优先级排序与实施路径

### 优先级矩阵

| 特性                  | 工作量 | 影响 | 紧迫性 | 优先级 |
| --------------------- | ------ | ---- | ------ | ------ |
| 会话压缩              | 中     | 高   | 高     | **P0** |
| Doom Loop 增强        | 低     | 中   | 高     | **P1** |
| Markdown Agent        | 中     | 中   | 中     | P2     |
| 事件总线              | 中     | 中   | 低     | P2     |
| 工具缓存              | 低     | 中   | 低     | P3     |
| 并发控制（限流/互斥） | 中     | 中   | 低     | P3     |
| 分层配置              | 中     | 低   | 低     | P4     |

### 实施路径

#### 阶段 1: AI 工作流核心改进 (2-3 周)

1. **会话压缩** (P0)
   - 添加 `isOverflow()` 检测
   - 实现 `prune()` 修剪逻辑
   - 可选: 添加上下文摘要生成

2. **Doom Loop 增强** (P1)
   - 添加工具调用计数
   - 添加重复检测
   - 改进错误消息

#### 阶段 2: 开发体验改进 (2-3 周)

3. **Markdown Agent** (P2)
   - 实现 Agent 加载器
   - 定义内置 Agent
   - 支持用户自定义

4. **事件总线** (P2)
   - 创建 `@aiget/event-bus` 包
   - 集成到 agent-runtime
   - 添加 Electron IPC 适配

#### 阶段 3: 性能优化 (2-3 周)

5. **工具缓存** (P3)
   - 实现 `ToolResultCache`
   - 标记可缓存工具
   - 配置 TTL

6. **并发控制（限流/互斥）** (P3)
   - 增加工具并发上限（默认值 + 可配置）
   - 写入类工具按资源加锁（避免竞态/破坏性写入）
   - 性能与稳定性测试（尤其是 Web/MCP 工具）

#### 阶段 4: 基础设施 (按需)

7. **分层配置** (P4)
   - 定义配置 schema
   - 实现加载器
   - 迁移现有配置

---

## 6. 参考文件索引

### OpenCode 核心文件

| 文件       | 功能       | 路径                                                        |
| ---------- | ---------- | ----------------------------------------------------------- |
| Bus 实现   | 事件总线   | `.opencode-ref/packages/opencode/src/bus/index.ts`          |
| 事件定义   | 事件类型   | `.opencode-ref/packages/opencode/src/bus/bus-event.ts`      |
| 会话压缩   | Token 管理 | `.opencode-ref/packages/opencode/src/session/compaction.ts` |
| 会话处理   | 流式处理   | `.opencode-ref/packages/opencode/src/session/processor.ts`  |
| 权限系统   | 访问控制   | `.opencode-ref/packages/opencode/src/permission/next.ts`    |
| Agent 定义 | Agent 配置 | `.opencode-ref/packages/opencode/src/agent/agent.ts`        |
| 工具定义   | 工具 SDK   | `.opencode-ref/packages/plugin/src/tool.ts`                 |
| 插件钩子   | 扩展点     | `.opencode-ref/packages/plugin/src/index.ts`                |

### Moryflow 核心文件

| 文件         | 功能           | 路径                                                          |
| ------------ | -------------- | ------------------------------------------------------------- |
| Agent 运行时 | 主入口         | `apps/moryflow/pc/src/main/agent-runtime/index.ts`            |
| MCP 管理     | 服务器生命周期 | `apps/moryflow/pc/src/main/agent-runtime/core/mcp-manager.ts` |
| Chat 请求    | IPC 处理       | `apps/moryflow/pc/src/main/chat/chat-request.ts`              |
| Agent 核心   | Agent 定义     | `packages/agents-core/src/agent.ts`                           |
| 运行实现     | 执行循环       | `packages/agents-core/src/runImplementation.ts`               |
| Stream 事件  | 流式事件类型   | `packages/agents-core/src/events.ts`                          |
| 工具定义     | 工具抽象       | `packages/agents-core/src/tool.ts`                            |
| Session      | 会话接口       | `packages/agents-core/src/memory/session.ts`                  |
| SessionStore | 会话存储适配   | `packages/agents-runtime/src/session.ts`                      |

---

## 附录 A: OpenCode 插件钩子列表

```typescript
export type Hooks = {
  // 认证
  auth?: AuthHook;

  // Chat 生命周期
  'chat.message'?: (input, output: { message; parts }) => Promise<void>;
  'chat.params'?: (input, output: { temperature; topP; topK }) => Promise<void>;

  // 工具执行
  'tool.execute.before'?: (input, output: { args }) => Promise<void>;
  'tool.execute.after'?: (input, output: { title; output; metadata }) => Promise<void>;

  // 实验性钩子
  'experimental.session.compacting'?: (input, output: { context; prompt }) => Promise<void>;
  'experimental.chat.messages.transform'?: (input, output: { messages }) => Promise<void>;
  'experimental.chat.system.transform'?: (input, output: { system }) => Promise<void>;
};
```

---

## 附录 B: Aiget 事件定义建议

```typescript
// packages/event-bus/src/events/index.ts

import { z } from 'zod';
import { BusEvent } from '../bus-event';

// 注意：以下事件 payload 仅示意；字段以实际业务模型/隐私策略为准。
// 建议：事件尽量只携带 ID / 统计信息，避免携带正文或敏感数据（如 content / query / 完整 args 等）。

// Memory 事件 (Memox)
export const MemoryEvents = {
  Created: BusEvent.define(
    'memory.created',
    z.object({
      id: z.string(),
      apiKeyId: z.string(),
    })
  ),
  Updated: BusEvent.define(
    'memory.updated',
    z.object({
      id: z.string(),
      apiKeyId: z.string(),
      changes: z.record(z.unknown()),
    })
  ),
  Deleted: BusEvent.define(
    'memory.deleted',
    z.object({
      id: z.string(),
      apiKeyId: z.string(),
    })
  ),
  Searched: BusEvent.define(
    'memory.searched',
    z.object({
      apiKeyId: z.string(),
      resultCount: z.number(),
    })
  ),
};

// Sync 事件 (Moryflow)
export const SyncEvents = {
  Started: BusEvent.define(
    'sync.started',
    z.object({
      vaultId: z.string(),
      direction: z.enum(['up', 'down', 'both']),
    })
  ),
  Progress: BusEvent.define(
    'sync.progress',
    z.object({
      vaultId: z.string(),
      current: z.number(),
      total: z.number(),
    })
  ),
  Completed: BusEvent.define(
    'sync.completed',
    z.object({
      vaultId: z.string(),
      filesChanged: z.number(),
    })
  ),
  Conflict: BusEvent.define(
    'sync.conflict',
    z.object({
      vaultId: z.string(),
      filePath: z.string(),
    })
  ),
  Error: BusEvent.define(
    'sync.error',
    z.object({
      vaultId: z.string(),
      error: z.string(),
    })
  ),
};

// Agent 事件 (Moryflow)
export const AgentEvents = {
  Started: BusEvent.define(
    'agent.started',
    z.object({
      sessionId: z.string(),
      agentName: z.string(),
    })
  ),
  ToolCalled: BusEvent.define(
    'agent.tool_called',
    z.object({
      sessionId: z.string(),
      toolName: z.string(),
    })
  ),
  Completed: BusEvent.define(
    'agent.completed',
    z.object({
      sessionId: z.string(),
      tokensUsed: z.number(),
    })
  ),
  Error: BusEvent.define(
    'agent.error',
    z.object({
      sessionId: z.string(),
      message: z.string(),
    })
  ),
};

// Quota 事件 (Aiget Dev)
export const QuotaEvents = {
  Updated: BusEvent.define(
    'quota.updated',
    z.object({
      apiKeyId: z.string(),
      type: z.enum(['credits', 'rate_limit']),
      remaining: z.number(),
    })
  ),
  Exceeded: BusEvent.define(
    'quota.exceeded',
    z.object({
      apiKeyId: z.string(),
      type: z.enum(['credits', 'rate_limit']),
      limit: z.number(),
    })
  ),
};
```

---

_文档版本: 1.2 | 最近审阅: 2026-01-12 | OpenCode 快照: opencode@`f1a13f25a410ba79fd1537a4ac0df5864ac14530`（`.opencode-ref/`）_
