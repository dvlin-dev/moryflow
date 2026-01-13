# Fetchx Browser & Agent 功能研究

> 研究日期：2026-01-13
> 参考仓库：
> - https://github.com/vercel-labs/agent-browser
> - https://github.com/mendableai/firecrawl

---

## 研究流程说明

**前置条件**：如果本地没有参考仓库，需要先拉取到本地。

```bash
# 1. 克隆参考仓库到 archive/external-repos/ 目录
git clone https://github.com/vercel-labs/agent-browser.git archive/external-repos/agent-browser
git clone https://github.com/mendableai/firecrawl.git archive/external-repos/firecrawl

# 2. 在 .gitignore 中添加忽略规则（避免提交外部仓库）
# 已添加：
# archive/external-repos/agent-browser/
# archive/external-repos/firecrawl/

# 3. 参考仓库本地路径
# archive/external-repos/agent-browser/
# archive/external-repos/firecrawl/
```

---

## 一、参考项目分析

### 1.1 agent-browser（Vercel Labs）

**定位**：面向 AI Agent 的**底层浏览器自动化 CLI 工具**

**核心特点**：
- **CLI 优先**：设计为命令行工具，便于 AI Agent 调用
- **Rust + Node.js 混合架构**：CLI 用 Rust 实现（快速），后台 Daemon 用 Node.js + Playwright
- **Ref 系统**：通过 snapshot 生成元素引用（@e1, @e2），实现确定性元素选择
- **Session 管理**：支持多个隔离的浏览器实例

**架构图**：

```
┌─────────────────────────────────────────────────────────────┐
│                     agent-browser                            │
├─────────────────────────────────────────────────────────────┤
│  CLI (Rust)                                                  │
│  - 解析命令行参数                                            │
│  - 通过 Unix Socket/TCP 与 Daemon 通信                       │
├─────────────────────────────────────────────────────────────┤
│  Daemon (Node.js)                                            │
│  - BrowserManager: 管理 Playwright 浏览器实例                │
│  - Actions: 执行各种浏览器操作                               │
│  - Snapshot: 生成可访问性树 + 元素引用                       │
│  - Protocol: JSON-based IPC 协议                             │
├─────────────────────────────────────────────────────────────┤
│  Playwright Core                                             │
│  - Chromium / Firefox / WebKit                               │
└─────────────────────────────────────────────────────────────┘
```

**核心功能**：

| 功能类别 | 命令 | 说明 |
|---------|------|------|
| 导航 | `open`, `back`, `forward`, `reload`, `close` | 页面导航控制 |
| Snapshot | `snapshot [-i] [-c] [-d N]` | 生成可访问性树，支持交互元素过滤、深度限制 |
| 交互 | `click`, `dblclick`, `fill`, `type`, `press`, `hover`, `check`, `uncheck` | 元素交互 |
| 等待 | `wait` | 等待元素/时间/URL/文本/网络空闲 |
| 信息获取 | `get text/html/value/attr/title/url/count/box` | 获取页面/元素信息 |
| 状态检查 | `is visible/enabled/checked` | 检查元素状态 |
| 截图/PDF | `screenshot`, `pdf` | 页面截图和 PDF 导出 |
| 语义定位 | `find role/text/label/placeholder/alt/title/testid` | 基于 ARIA 角色/文本的元素定位 |

**Ref 系统示例**：

```bash
# 1. 获取页面快照，生成元素引用
agent-browser snapshot -i
# 输出：
# - heading "Example Domain" [ref=e1] [level=1]
# - button "Submit" [ref=e2]
# - textbox "Email" [ref=e3]

# 2. 使用 ref 进行操作（确定性）
agent-browser click @e2
agent-browser fill @e3 "test@example.com"
```

### 1.2 Firecrawl Agent

**定位**：**高层智能数据收集 API**

**核心特点**：
- **Prompt 驱动**：用户只需描述想要的数据，系统自动完成
- **无需 URL**：自动搜索和导航找到数据
- **LLM 决策**：使用 Gemini 2.5 Pro 智能决策导航路径
- **结构化输出**：支持 JSON Schema / Zod / Pydantic 定义输出格式

**使用示例**：

```typescript
// Python SDK
result = app.agent(
    prompt="Find the founders of Firecrawl",
    schema=FoundersSchema
)

// 返回结构化数据
{
  "founders": [
    { "name": "Eric Ciarla", "role": "Co-founder" },
    { "name": "Nicolas Camara", "role": "Co-founder" }
  ]
}
```

**内部实现**（`smartScrape.ts`）：
- 调用内部 `/smart-scrape` 端点
- 使用 `gemini-2.5-pro` 作为决策模型
- 使用 `gemini-2.0-flash` 作为工具执行模型
- 动态计费（基于 token 消耗）

### 1.3 对比分析

| 维度 | agent-browser | Firecrawl Agent |
|------|---------------|-----------------|
| **层级** | 底层自动化工具 | 高层智能 API |
| **控制方式** | 命令式（click @e2, fill @e3） | 声明式（prompt: "找到创始人"） |
| **是否需要 URL** | 需要 | 不需要（自动搜索） |
| **LLM 依赖** | 无（纯浏览器操作） | 强依赖（gemini-2.5-pro 决策） |
| **会话模型** | 有状态（多轮交互） | 无状态（一次任务） |
| **使用者** | AI Agent（Claude/GPT） | 开发者/终端用户 |
| **典型场景** | Agent 操作浏览器完成复杂任务 | "帮我研究 X 公司的信息" |
| **成本** | 仅浏览器资源 | 高（LLM token 消耗） |

### 1.4 agent-browser 深入分析（值得借鉴的设计）

> 基于源码深入分析，以下是 agent-browser 的核心设计细节。

#### 1.4.1 Ref 系统精妙设计

**Ref 存储格式** - 使用 Playwright 语义定位器而非 CSS 选择器：

```typescript
interface RefMap {
  [ref: string]: {
    selector: string;  // "getByRole('button', { name: 'Submit', exact: true })"
    role: string;      // ARIA 角色
    name?: string;     // 元素文本/标签
    nth?: number;      // 仅当有重复时存储（用于 .nth(1)）
  };
}
```

**Nth 去重逻辑** - 通过 RoleNameTracker 检测重复元素：

```typescript
// 只有当多个元素具有相同 role+name 时才存储 nth
function removeNthFromNonDuplicates(refs: RefMap, tracker: RoleNameTracker): void {
  const duplicateKeys = tracker.getDuplicateKeys();
  for (const [ref, data] of Object.entries(refs)) {
    const key = tracker.getKey(data.role, data.name);
    if (!duplicateKeys.has(key)) {
      delete refs[ref].nth;  // 单独元素不需要 nth
    }
  }
}
```

**角色分类系统** - 支持不同的快照模式：

```typescript
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
  'listbox', 'menuitem', 'option', 'searchbox', 'slider', 'spinbutton',
  'switch', 'tab', 'treeitem',
]);

const CONTENT_ROLES = new Set([
  'heading', 'cell', 'gridcell', 'columnheader', 'rowheader',
  'listitem', 'article', 'region', 'main', 'navigation',
]);

const STRUCTURAL_ROLES = new Set([
  'generic', 'group', 'list', 'table', 'row', 'rowgroup',
  'grid', 'menu', 'toolbar', 'tablist', 'tree',
]);
```

#### 1.4.2 多标签页/多窗口架构

```typescript
class BrowserManager {
  private contexts: BrowserContext[] = [];  // 多个隔离上下文
  private pages: Page[] = [];                // 所有页面的平面列表
  private activePageIndex: number = 0;       // 当前活跃页面索引

  // 新标签页（同一上下文，共享 cookies）
  async newTab(): Promise<{ index: number }>;

  // 新窗口（新上下文，独立 cookies/storage）
  async newWindow(viewport?: { width; height }): Promise<{ index: number }>;

  // 列表所有标签页
  async listTabs(): Promise<Array<{ index; url; title; active }>>;
}
```

#### 1.4.3 CDP 连接支持（重连机制）

```typescript
// 连接到已运行的浏览器（如 Electron、调试实例）
async connectViaCDP(cdpPort: number): Promise<void> {
  const browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
  // ... 验证连接、设置追踪
}

// 关闭时区分处理
async close(): Promise<void> {
  if (this.cdpPort !== null) {
    // CDP 模式：只断开连接，不关闭外部应用
    await this.browser.close();
  } else {
    // 普通模式：彻底关闭所有页面和浏览器
    for (const page of this.pages) await page.close();
    // ...
  }
}
```

#### 1.4.4 AI 友好的错误消息

```typescript
function toAIFriendlyError(error: unknown, selector: string): Error {
  if (message.includes('strict mode violation')) {
    const count = message.match(/resolved to (\d+) elements/)?.[1] ?? 'multiple';
    return new Error(
      `Selector "${selector}" matched ${count} elements. ` +
      `Run 'snapshot' to get updated refs, or use a more specific CSS selector.`
    );
  }

  if (message.includes('intercepts pointer events')) {
    return new Error(
      `Element "${selector}" is not interactable (may be hidden or covered). ` +
      `Try scrolling it into view or check if a modal/overlay is blocking it.`
    );
  }
  // ...
}
```

#### 1.4.5 值得借鉴的功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **角色分类系统** | 支持 `--interactive` 仅返回可交互元素 | P0 |
| **Nth 去重** | 自动处理重复元素 | P0 |
| **语义定位器** | 使用 getByRole 而非 CSS | P0 |
| **多标签页** | newTab, listTabs, switchTab | P1 |
| **多窗口** | 独立上下文（隔离 cookies） | P1 |
| **CDP 连接** | 连接已运行的浏览器 | P2 |
| **AI 友好错误** | 错误消息 + 修复建议 | P1 |
| **对话框处理** | 自动处理 alert/confirm/prompt | P1 |
| **网络拦截** | 按需设置请求头、mock 响应 | P2 |

---

## 二、Fetchx API 层级架构

基于以上分析，设计 Fetchx 三层 API 架构：

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fetchx API (server.aiget.dev)               │
├─────────────────────────────────────────────────────────────────┤
│  L3: Agent (智能数据收集)                                        │
│      POST /api/v1/agent                                         │
│      - 基于 @moryflow/agents SDK 实现                           │
│      - L2 Browser 能力封装为 Tools                              │
│      - prompt 驱动，LLM 自动决策                                │
│      - 返回结构化数据                                            │
├─────────────────────────────────────────────────────────────────┤
│  L2: Browser (浏览器自动化)                                      │
│      POST /api/v1/browser/session/*                             │
│      - 有状态会话                                                │
│      - Snapshot + Ref 系统                                       │
│      - 精确控制（供外部 AI Agent 使用）                          │
├─────────────────────────────────────────────────────────────────┤
│  L1: Scrape/Crawl/Map (基础抓取)                                │
│      POST /api/v1/scrape                                        │
│      POST /api/v1/crawl                                         │
│      POST /api/v1/map                                           │
├─────────────────────────────────────────────────────────────────┤
│  Shared Infrastructure (共享基础设施)                            │
│      - SessionManager: 浏览器会话管理                            │
│      - SnapshotService: 快照生成与 Ref 映射                     │
│      - ActionExecutor: 动作执行引擎                              │
│      - BrowserPool: 浏览器实例池                                 │
└─────────────────────────────────────────────────────────────────┘
```

### L2 与 L3 的关系

**方案选择**：共享基础设施层（而非 L3 调用 L2 HTTP API）

```
               ┌─────────────┐     ┌─────────────┐
               │   L2 API    │     │   L3 API    │
               │  (browser)  │     │   (agent)   │
               └──────┬──────┘     └──────┬──────┘
                      │                   │
                      ▼                   ▼
        ┌─────────────────────────────────────────────┐
        │        Shared Infrastructure                │
        │  ┌───────────────┐  ┌───────────────────┐   │
        │  │ SessionManager│  │  SnapshotService  │   │
        │  └───────────────┘  └───────────────────┘   │
        │  ┌───────────────┐  ┌───────────────────┐   │
        │  │ActionExecutor │  │   BrowserPool     │   │
        │  └───────────────┘  └───────────────────┘   │
        └─────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │             Playwright Core                 │
        └─────────────────────────────────────────────┘
```

**优势**：
- 避免 HTTP 调用开销
- 代码复用无重复
- L2 对外提供 API，L3 内部使用相同能力

---

## 三、路由设计

### 3.1 完整路由规划

```typescript
// ==================== L1: 基础抓取（现有） ====================
POST /api/v1/scrape              // 单页抓取
POST /api/v1/crawl               // 多页爬取
GET  /api/v1/crawl/:id           // 获取爬取状态
POST /api/v1/map                 // URL 发现
POST /api/v1/extract             // 结构化提取

// ==================== L2: Browser 自动化（新增） ====================
POST   /api/v1/browser/session              // 创建会话
GET    /api/v1/browser/session/:id          // 获取会话状态
DELETE /api/v1/browser/session/:id          // 关闭会话

POST   /api/v1/browser/session/:id/open     // 打开 URL
POST   /api/v1/browser/session/:id/snapshot // 获取 Snapshot + refs
POST   /api/v1/browser/session/:id/action   // 执行动作（支持 @ref）
GET    /api/v1/browser/session/:id/screenshot // 截图

// ==================== L3: Agent（新增） ====================
POST   /api/v1/agent             // 创建 Agent 任务（默认 SSE 流式返回）
GET    /api/v1/agent/:id         // 获取任务状态/结果（用于断线重连）
DELETE /api/v1/agent/:id         // 取消任务
```

**L3 Agent 流式设计说明**：
- `POST /agent` 默认返回 SSE 流，前端可实时显示进度
- 流的第一条消息包含 `taskId`，用于断线重连
- 使用 `stream=false` 参数可切换为非流式模式（仅返回 `{ id }`）
- `GET /agent/:id` 用于断线后获取任务结果（5 分钟内有效）

### 3.2 模块结构

```
apps/aiget/server/src/
├── scraper/                    # L1 基础抓取（现有）
│   ├── scraper.module.ts
│   ├── scraper.controller.ts
│   ├── scraper.service.ts
│   └── handlers/
│       └── action-executor.handler.ts
│
├── browser/                    # L2 浏览器自动化（新增）
│   ├── browser.module.ts
│   ├── browser.controller.ts   # /api/v1/browser/*
│   ├── browser.service.ts
│   ├── session/
│   │   └── session.manager.ts  # 会话管理（含 ref 映射）
│   ├── snapshot/
│   │   └── snapshot.service.ts # Snapshot 生成
│   ├── handlers/
│   │   └── action.handler.ts   # 动作执行（支持 @ref）
│   └── dto/
│       └── browser.schema.ts   # Zod schemas
│
└── agent/                      # L3 智能 Agent（新增）
    ├── agent.module.ts
    ├── agent.controller.ts     # /api/v1/agent
    ├── agent.service.ts
    ├── smart-scrape/
    │   └── smart-scrape.service.ts # LLM 驱动的智能抓取
    └── dto/
        └── agent.schema.ts
```

---

## 四、L2 Browser API 详细设计

### 4.1 会话管理

```typescript
// POST /api/v1/browser/session
interface CreateSessionRequest {
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;  // 会话超时（默认 5 分钟）
}

interface CreateSessionResponse {
  id: string;
  expiresAt: string;
}
```

### 4.2 Snapshot API

```typescript
// POST /api/v1/browser/session/:id/snapshot
interface SnapshotRequest {
  interactive?: boolean;  // 仅交互元素（默认 false）
  compact?: boolean;      // 紧凑模式（默认 false）
  maxDepth?: number;      // 深度限制
  scope?: string;         // CSS 选择器范围
}

interface SnapshotResponse {
  tree: string;           // 可访问性树文本
  refs: Record<string, {  // 元素引用映射
    role: string;
    name?: string;
    nth?: number;
  }>;
  stats: {
    lines: number;
    chars: number;
    refs: number;
    interactive: number;
  };
}
```

**示例输出**：

```
- heading "Example Domain" [ref=e1] [level=1]
- paragraph: This domain is for use in illustrative examples.
- link "More information..." [ref=e2]
- button "Submit" [ref=e3]
- textbox "Email" [ref=e4]
```

### 4.3 Action API

```typescript
// POST /api/v1/browser/session/:id/action
interface ActionRequest {
  type: ActionType;
  selector?: string;      // CSS 选择器或 @ref
  value?: string;         // fill/type 的值
  key?: string;           // press 的按键
  // ... 其他参数
}

type ActionType =
  // 导航
  | 'open' | 'back' | 'forward' | 'reload'
  // 交互
  | 'click' | 'dblclick' | 'fill' | 'type' | 'press'
  | 'hover' | 'check' | 'uncheck' | 'select' | 'focus'
  // 等待
  | 'wait'
  // 滚动
  | 'scroll' | 'scrollIntoView'
  // 信息获取
  | 'getText' | 'getAttribute' | 'getInnerHTML' | 'getInputValue'
  // 状态检查
  | 'isVisible' | 'isEnabled' | 'isChecked';

interface ActionResponse {
  success: boolean;
  result?: unknown;       // getText 等操作的返回值
  error?: string;
}
```

### 4.4 Ref 系统实现

```typescript
// session/session.manager.ts
interface RefMap {
  [ref: string]: {
    selector: string;     // getByRole('button', { name: 'Submit', exact: true })
    role: string;
    name?: string;
    nth?: number;
  };
}

class SessionManager {
  private sessions: Map<string, {
    context: BrowserContext;
    page: Page;
    refs: RefMap;
    expiresAt: Date;
  }>;

  // 解析 ref 语法
  parseSelector(selector: string, refs: RefMap): Locator {
    if (selector.startsWith('@')) {
      const ref = selector.slice(1);
      const refData = refs[ref];
      if (!refData) throw new Error(`Unknown ref: ${ref}`);

      let locator = this.page.getByRole(refData.role, {
        name: refData.name,
        exact: true
      });

      if (refData.nth !== undefined) {
        locator = locator.nth(refData.nth);
      }

      return locator;
    }

    return this.page.locator(selector);
  }
}
```

---

## 五、L3 Agent API 详细设计

> **实现方式**：基于 `@moryflow/agents` SDK（二次封装自 openai-agents-js）
> **参考文档**：[docs/references/moryflow-agents-sdk.md](../references/moryflow-agents-sdk.md)

### 5.1 架构设计

L3 Agent 使用现有 `@moryflow/agents` SDK，将 L2 Browser 的能力封装为 Tools：

```
┌─────────────────────────────────────────────────────────────────┐
│                      L3 Agent Service                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐      │
│   │              @moryflow/agents SDK                    │      │
│   │                                                      │      │
│   │   Agent({                                            │      │
│   │     name: 'Fetchx Browser Agent',                    │      │
│   │     model: 'gpt-4o',                                 │      │
│   │     tools: [browserTools...],                        │      │
│   │     outputType: userSchema,                          │      │
│   │   })                                                 │      │
│   │                                                      │      │
│   └──────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────┐      │
│   │              Browser Tools                           │      │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │      │
│   │  │ snapshot │ │  click   │ │   fill   │ │  open  │  │      │
│   │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │      │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │      │
│   │  │  scroll  │ │  wait    │ │ getText  │ │ search │  │      │
│   │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │      │
│   └──────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────┐      │
│   │           Shared Infrastructure                      │      │
│   │   (SessionManager, SnapshotService, ActionExecutor)  │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Browser Tools 定义

> ⚠️ **重要**：以下代码已根据 `@moryflow/agents` SDK 实际接口修正

```typescript
// agent/tools/browser-tools.ts
import { tool } from '@moryflow/agents';
import { z } from 'zod';
import type { RunContext } from '@moryflow/agents';

// 定义 Tool 上下文类型
interface BrowserContext {
  session: BrowserSession;
  snapshotService: SnapshotService;
  actionExecutor: ActionExecutor;
}

// Schema 定义
const snapshotSchema = z.object({
  interactive: z.boolean().optional().default(true),
  maxDepth: z.number().optional(),
});

const selectorSchema = z.object({
  selector: z.string().describe('元素选择器，支持 @ref 格式（如 @e1）'),
});

const fillSchema = z.object({
  selector: z.string().describe('输入框选择器'),
  value: z.string().describe('要填写的文本'),
});

const urlSchema = z.object({
  url: z.string().url().describe('要打开的 URL'),
});

const querySchema = z.object({
  query: z.string().describe('搜索关键词'),
});

// 获取页面快照（核心 Tool）
export const snapshotTool = tool<typeof snapshotSchema, BrowserContext>({
  name: 'browser_snapshot',
  description: `获取当前页面的可访问性树快照，包含可交互元素的引用（@e1, @e2...）。
  返回的 ref 可用于后续 click、fill 等操作。
  - interactive=true: 仅返回可交互元素（button, link, input 等）
  - 用于理解页面结构和定位目标元素`,
  parameters: snapshotSchema,
  execute: async (input, runContext) => {
    // runContext 可能为 undefined，需要判空
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { snapshotService, session } = runContext.context;
    return await snapshotService.capture(session.page, {
      interactive: input.interactive,
      maxDepth: input.maxDepth,
    });
  },
});

// 点击元素
export const clickTool = tool<typeof selectorSchema, BrowserContext>({
  name: 'browser_click',
  description: '点击指定元素。使用 @ref 格式（如 @e1）或 CSS 选择器。',
  parameters: selectorSchema,
  execute: async (input, runContext) => {
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { actionExecutor, session } = runContext.context;
    return await actionExecutor.execute(session, { type: 'click', selector: input.selector });
  },
});

// 填写输入框
export const fillTool = tool<typeof fillSchema, BrowserContext>({
  name: 'browser_fill',
  description: '在输入框中填写文本。会清空原有内容。',
  parameters: fillSchema,
  execute: async (input, runContext) => {
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { actionExecutor, session } = runContext.context;
    return await actionExecutor.execute(session, {
      type: 'fill',
      selector: input.selector,
      value: input.value,
    });
  },
});

// 打开 URL
export const openTool = tool<typeof urlSchema, BrowserContext>({
  name: 'browser_open',
  description: '在浏览器中打开指定 URL。',
  parameters: urlSchema,
  execute: async (input, runContext) => {
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { session } = runContext.context;
    await session.page.goto(input.url, { waitUntil: 'domcontentloaded' });
    return { success: true, url: session.page.url() };
  },
});

// Web 搜索（Agent 起点）
export const searchTool = tool<typeof querySchema, BrowserContext>({
  name: 'web_search',
  description: '使用搜索引擎搜索信息。返回搜索结果页面。',
  parameters: querySchema,
  execute: async (input, runContext) => {
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { session, snapshotService } = runContext.context;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(input.query)}`;
    await session.page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    // 返回搜索结果页的快照
    const snapshot = await snapshotService.capture(session.page, { interactive: true });
    return { success: true, url: session.page.url(), snapshot };
  },
});

// 获取文本内容
export const getTextTool = tool<typeof selectorSchema, BrowserContext>({
  name: 'browser_getText',
  description: '获取指定元素的文本内容。',
  parameters: selectorSchema,
  execute: async (input, runContext) => {
    if (!runContext?.context) {
      throw new Error('Browser context not available');
    }
    const { actionExecutor, session } = runContext.context;
    return await actionExecutor.execute(session, { type: 'getText', selector: input.selector });
  },
});

// 导出所有 Tools
export const browserTools = [
  snapshotTool,
  clickTool,
  fillTool,
  openTool,
  searchTool,
  getTextTool,
];
```

### 5.3 Agent 实现

> ⚠️ **重要**：以下代码已根据 `@moryflow/agents` SDK 实际接口修正

```typescript
// agent/agent.service.ts
import { Agent, Runner } from '@moryflow/agents';
import { z } from 'zod';
import { browserTools, BrowserContext } from './tools/browser-tools';
import { SessionManager } from '../browser/session/session.manager';
import { SnapshotService } from '../browser/snapshot/snapshot.service';
import { ActionExecutor } from '../browser/handlers/action.handler';

const SYSTEM_INSTRUCTIONS = `你是 Fetchx Browser Agent，一个专业的网页数据收集助手。

你的任务是根据用户的 prompt，通过浏览器操作找到并提取所需数据。

工作流程：
1. 分析用户需求，确定需要收集的数据
2. 如果没有提供 URL，使用 web_search 搜索相关网站
3. 使用 browser_open 打开目标页面
4. 使用 browser_snapshot 获取页面结构
5. 根据快照中的 ref，使用 click/fill 等操作导航
6. 多次迭代直到找到所有需要的数据
7. 返回结构化的结果

注意事项：
- 每次操作后都应获取新的 snapshot 以了解页面变化
- 使用 @ref 格式（如 @e1）进行元素定位，比 CSS 选择器更可靠
- 如果页面需要登录，提示用户无法访问
- 遇到验证码或反爬机制时，返回错误信息`;

@Injectable()
export class AgentService {
  private runner: Runner;

  constructor(
    private sessionManager: SessionManager,
    private snapshotService: SnapshotService,
    private actionExecutor: ActionExecutor,
  ) {
    // 创建 Runner 实例（可复用）
    this.runner = new Runner({
      tracingDisabled: false,  // 启用追踪
    });
  }

  async executeTask(request: {
    prompt: string;
    urls?: string[];
    schema?: z.ZodType;
    maxCredits?: number;
  }) {
    // 创建浏览器会话
    const session = await this.sessionManager.createSession();

    try {
      // 构建 Agent（泛型指定上下文类型）
      const agent = new Agent<BrowserContext>({
        name: 'Fetchx Browser Agent',
        model: 'gpt-4o',
        instructions: SYSTEM_INSTRUCTIONS,
        tools: browserTools,
        outputType: request.schema ?? 'text',  // 默认文本输出
        modelSettings: {
          temperature: 0.7,
          maxTokens: 4096,
        },
      });

      // 构建上下文（供 Tools 使用）
      const context: BrowserContext = {
        session,
        snapshotService: this.snapshotService,
        actionExecutor: this.actionExecutor,
      };

      // 构建初始 prompt
      let userPrompt = request.prompt;
      if (request.urls?.length) {
        userPrompt += `\n\n起始 URL：${request.urls.join(', ')}`;
      }

      // 执行 Agent
      const result = await this.runner.run(agent, userPrompt, {
        context,
        maxTurns: 20,  // 最大轮数限制
      });

      // 获取 token 用量
      const usage = result.state._context.usage;

      return {
        success: true,
        data: result.finalOutput,
        creditsUsed: usage.totalTokens,
        details: {
          requests: usage.requests,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        },
      };
    } finally {
      // 清理会话
      await this.sessionManager.closeSession(session.id);
    }
  }

  // 流式执行（用于实时反馈）
  async executeTaskStream(request: {
    prompt: string;
    urls?: string[];
    schema?: z.ZodType;
  }) {
    const session = await this.sessionManager.createSession();

    const agent = new Agent<BrowserContext>({
      name: 'Fetchx Browser Agent',
      model: 'gpt-4o',
      instructions: SYSTEM_INSTRUCTIONS,
      tools: browserTools,
      outputType: request.schema ?? 'text',
    });

    const context: BrowserContext = {
      session,
      snapshotService: this.snapshotService,
      actionExecutor: this.actionExecutor,
    };

    let userPrompt = request.prompt;
    if (request.urls?.length) {
      userPrompt += `\n\n起始 URL：${request.urls.join(', ')}`;
    }

    // 流式执行
    const streamResult = await this.runner.run(agent, userPrompt, {
      context,
      stream: true,
      maxTurns: 20,
    });

    return {
      stream: streamResult,
      cleanup: async () => {
        await this.sessionManager.closeSession(session.id);
      },
    };
  }
}
```

### 5.4 API 接口

```typescript
// POST /api/v1/agent
interface AgentRequest {
  prompt: string;                    // 自然语言描述（必填）
  urls?: string[];                   // 可选的起始 URL
  schema?: Record<string, unknown>;  // JSON Schema 或 Zod schema
  maxCredits?: number;               // 最大消耗 credits
  stream?: boolean;                  // 是否流式返回（默认 true）
}

// 非流式响应（stream=false）
interface AgentResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
}

// 流式响应（stream=true，默认）：返回 SSE 事件流
// Content-Type: text/event-stream

// GET /api/v1/agent/:id
interface AgentStatusResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  data?: unknown;            // 提取的结构化数据
  creditsUsed?: number;
  expiresAt?: string;
  error?: string;
}
```

### 5.5 SSE 事件类型定义

> **核心设计**：POST /agent 默认返回 SSE 流，前端可实时显示执行进度

```typescript
// SSE 事件类型
type AgentStreamEvent =
  // 任务开始（第一条消息，包含 taskId 用于断线重连）
  | { type: 'started'; id: string; expiresAt: string }

  // Agent 思考过程
  | { type: 'thinking'; content: string }

  // 工具调用开始
  | { type: 'tool_call'; callId: string; tool: string; args: Record<string, unknown> }

  // 工具调用结果
  | { type: 'tool_result'; callId: string; tool: string; result: unknown; error?: string }

  // 进度更新
  | { type: 'progress'; message: string; step: number; totalSteps?: number }

  // 任务完成
  | { type: 'complete'; data: unknown; creditsUsed: number }

  // 任务失败
  | { type: 'failed'; error: string; creditsUsed?: number };

// SSE 消息格式示例
// event: thinking
// data: {"type":"thinking","content":"正在分析目标网站结构..."}
//
// event: tool_call
// data: {"type":"tool_call","callId":"call_123","tool":"browser_open","args":{"url":"https://example.com"}}
//
// event: tool_result
// data: {"type":"tool_result","callId":"call_123","tool":"browser_open","result":{"success":true}}
//
// event: complete
// data: {"type":"complete","data":{"founders":[...]},"creditsUsed":150}
```

### 5.6 使用示例

#### 流式模式（默认，推荐）

```typescript
// 前端：使用 EventSource 接收 SSE 流
async function executeAgentTask(prompt: string, schema: object) {
  const response = await fetch('/api/v1/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema }),
  });

  // 保存 taskId 用于断线重连
  let taskId: string | null = null;

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6)) as AgentStreamEvent;

        switch (event.type) {
          case 'started':
            taskId = event.id;
            console.log('任务开始:', taskId);
            break;
          case 'thinking':
            console.log('思考中:', event.content);
            break;
          case 'tool_call':
            console.log(`调用工具: ${event.tool}`, event.args);
            break;
          case 'tool_result':
            console.log(`工具结果: ${event.tool}`, event.result);
            break;
          case 'progress':
            console.log(`进度: ${event.step}/${event.totalSteps ?? '?'} - ${event.message}`);
            break;
          case 'complete':
            console.log('完成!', event.data);
            console.log(`消耗 credits: ${event.creditsUsed}`);
            return event.data;
          case 'failed':
            throw new Error(event.error);
        }
      }
    }
  }
}

// 使用
const result = await executeAgentTask(
  'Find the founders and funding history of Firecrawl',
  { type: 'object', properties: { founders: { type: 'array' } } }
);
```

#### 断线重连

```typescript
// 如果 SSE 连接中断，使用 taskId 获取结果
async function recoverTask(taskId: string) {
  const response = await fetch(`/api/v1/agent/${taskId}`);
  const result = await response.json();

  if (result.status === 'completed') {
    return result.data;
  } else if (result.status === 'failed') {
    throw new Error(result.error);
  } else {
    // 还在处理中，等待后重试
    await new Promise(resolve => setTimeout(resolve, 2000));
    return recoverTask(taskId);
  }
}
```

#### 非流式模式

```typescript
// 创建任务（非流式）
const job = await fetch('/api/v1/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Find the founders and funding history of Firecrawl',
    stream: false,  // 禁用流式
    schema: {
      type: 'object',
      properties: {
        founders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' }
            }
          }
        },
        funding: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              round: { type: 'string' },
              amount: { type: 'string' },
              date: { type: 'string' }
            }
          }
        }
      }
    }
  })
}).then(r => r.json());

// 轮询结果
const pollResult = async (id: string) => {
  while (true) {
    const result = await fetch(`/api/v1/agent/${id}`).then(r => r.json());
    if (result.status !== 'processing') return result;
    await new Promise(r => setTimeout(r, 2000));
  }
};

const result = await pollResult(job.id);
// result.data = {
//   founders: [{ name: "Eric Ciarla", role: "Co-founder" }, ...],
//   funding: [{ round: "Seed", amount: "$1M", date: "2023-01" }, ...]
// }
```

### 5.7 后端流式实现（NestJS）

```typescript
// agent/agent.controller.ts
import { Controller, Post, Body, Res, Get, Param, Delete } from '@nestjs/common';
import { Response } from 'express';
import { AgentService } from './agent.service';
import { AgentRequestDto } from './dto/agent.schema';

@Controller('api/v1/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  async createTask(
    @Body() request: AgentRequestDto,
    @Res() res: Response,
  ) {
    // 非流式模式
    if (request.stream === false) {
      const { id } = await this.agentService.createTask(request);
      return res.json({ id, status: 'processing' });
    }

    // 流式模式（默认）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: AgentStreamEvent) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const { id, stream, cleanup } = await this.agentService.executeTaskStream(request);

      // 发送开始事件（包含 taskId）
      sendEvent({
        type: 'started',
        id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      // 监听 SDK 事件
      for await (const event of stream) {
        switch (event.type) {
          case 'raw_model_stream_event':
            if (event.data.type === 'content_block_delta') {
              sendEvent({ type: 'thinking', content: event.data.delta.text || '' });
            }
            break;
          case 'run_item_stream_event':
            if (event.item.type === 'tool_call_item') {
              sendEvent({
                type: 'tool_call',
                callId: event.item.rawItem.call_id,
                tool: event.item.rawItem.name,
                args: event.item.rawItem.arguments,
              });
            } else if (event.item.type === 'tool_call_output_item') {
              sendEvent({
                type: 'tool_result',
                callId: event.item.rawItem.call_id,
                tool: event.item.rawItem.name,
                result: event.item.rawItem.output,
              });
            }
            break;
        }
      }

      // 获取最终结果
      const result = await stream.finalOutput;
      const usage = stream.state._context.usage;

      sendEvent({
        type: 'complete',
        data: result,
        creditsUsed: usage.totalTokens,
      });

      await cleanup();
    } catch (error) {
      sendEvent({
        type: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      res.end();
    }
  }

  @Get(':id')
  async getTaskStatus(@Param('id') id: string) {
    return this.agentService.getTaskStatus(id);
  }

  @Delete(':id')
  async cancelTask(@Param('id') id: string) {
    return this.agentService.cancelTask(id);
  }
}
```

---

## 六、实现优先级

| 优先级 | 内容 | 说明 |
|-------|------|------|
| **P0** | L2 Browser 基础 | session 管理 + open + close |
| **P0** | Snapshot + Ref 系统 | snapshot 生成 ref，action 支持 @ref |
| **P1** | L2 完整 Action | fill, check, select, hover, getText 等 |
| **P1** | L3 Agent 基础 | prompt + schema + 异步任务 |
| **P2** | L3 智能导航 | 集成 LLM 自动决策 |
| **P2** | L2 高级功能 | 网络拦截、多标签页、调试工具 |

---

## 七、计费方案

### L1 Scrape（现有）

- 按请求次数计费
- `fetchx.scrape`: 1 credit/次

### L2 Browser

| 计费项 | 说明 |
|-------|------|
| `fetchx.browser.session` | 创建会话：1 credit |
| `fetchx.browser.action` | 每个动作：免费（已计入 session） |
| `fetchx.browser.screenshot` | 截图：0.5 credit |

### L3 Agent

- 动态计费（基于 LLM token 消耗）
- 设置 `maxCredits` 参数控制成本
- 每日免费额度（推广期）

---

## 八、参考资源

### 本地参考仓库

- `archive/external-repos/agent-browser/`
- `archive/external-repos/firecrawl/`

### 内部文档

- **[@moryflow/agents SDK 参考](../references/moryflow-agents-sdk.md)** - L3 Agent 实现的核心依赖
- `packages/agents-core/CLAUDE.md` - agents-core 包文档

### 文档链接

- [agent-browser GitHub](https://github.com/vercel-labs/agent-browser)
- [Firecrawl Agent 文档](https://docs.firecrawl.dev/features/agent)
- [Playwright ARIA Snapshot API](https://playwright.dev/docs/aria-snapshot)
- [ARIA 角色参考](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)
- [OpenAI Agents SDK (原版)](https://github.com/openai/openai-agents-js)

### 关键源码文件

**agent-browser**：
- `src/snapshot.ts` - Snapshot + Ref 系统核心
- `src/actions.ts` - 命令执行器
- `src/browser.ts` - BrowserManager

**firecrawl**（注意：Agent 核心逻辑未开源）：
- `apps/api/src/scraper/scrapeURL/lib/smartScrape.ts` - 智能抓取接口（调用闭源服务）
- `apps/api/src/controllers/v2/agent.ts` - Agent API 入口（透传到内部服务）
- `apps/api/src/scraper/scrapeURL/lib/extractSmartScrape.ts` - LLM 决策是否使用 SmartScrape

**@moryflow/agents（内部 SDK）**：
- `packages/agents-core/src/agent.ts` - Agent 定义
- `packages/agents-core/src/tool.ts` - Tool 抽象
- `packages/agents-core/src/run.ts` - 执行入口

---

## 九、实现进度追踪

> **同步规则**：每完成一个步骤后，必须更新此章节的状态和日期。

### 进度总览

| Phase | 名称 | 状态 | 完成度 |
|-------|------|------|--------|
| Phase 1 | L2 Browser 基础架构 | 🔲 待开始 | 0/4 |
| Phase 2 | Snapshot + Ref 系统 | 🔲 待开始 | 0/3 |
| Phase 3 | L2 完整 Action | 🔲 待开始 | 0/3 |
| Phase 4 | L3 Agent 基础（SDK） | 🔲 待开始 | 0/4 |
| Phase 5 | L3 高级功能 | 🔲 待开始 | 0/3 |

### Phase 1: L2 Browser 基础架构

| 步骤 | 任务 | 状态 | 产出文件 | 完成日期 |
|------|------|------|----------|----------|
| 1.1 | 创建 browser 模块骨架 | 🔲 待开始 | `browser.module.ts`, `browser.controller.ts`, `browser.service.ts` | - |
| 1.2 | 定义 DTO 和 Zod Schema | 🔲 待开始 | `dto/browser.schema.ts` | - |
| 1.3 | 实现 session 管理 | 🔲 待开始 | `session/session.manager.ts` | - |
| 1.4 | 实现 open/close 基础功能 | 🔲 待开始 | 整合到 `browser.service.ts` | - |

**1.1 创建 browser 模块骨架**
- 创建 `apps/aiget/server/src/browser/` 目录结构
- 创建 NestJS 模块文件：module, controller, service
- 注册到 AppModule
- 路由前缀：`/api/v1/browser`

**1.2 定义 DTO 和 Zod Schema**
- `CreateSessionSchema` - 创建会话请求
- `SessionResponse` - 会话信息响应
- `OpenUrlSchema` - 打开 URL 请求
- `ActionSchema` - 动作执行请求（预定义结构）

**1.3 实现 session 管理**
- 创建 `SessionManager` 类
- 维护 `Map<sessionId, { context, page, refs, expiresAt }>`
- 实现会话超时清理（默认 5 分钟）
- 实现 `createSession`, `getSession`, `closeSession` 方法

**1.4 实现 open/close 基础功能**
- `POST /browser/session` - 创建会话
- `GET /browser/session/:id` - 获取会话状态
- `DELETE /browser/session/:id` - 关闭会话
- `POST /browser/session/:id/open` - 打开 URL

### Phase 2: Snapshot + Ref 系统

| 步骤 | 任务 | 状态 | 产出文件 | 完成日期 |
|------|------|------|----------|----------|
| 2.1 | 实现 snapshot 服务 | 🔲 待开始 | `snapshot/snapshot.service.ts` | - |
| 2.2 | 实现 ref 系统 | 🔲 待开始 | 整合到 `session/session.manager.ts` | - |
| 2.3 | action 支持 @ref 语法 | 🔲 待开始 | `handlers/action.handler.ts` | - |

**2.1 实现 snapshot 服务**
- 基于 Playwright `locator.ariaSnapshot()` API
- 生成可访问性树文本
- 支持选项：`interactive`, `compact`, `maxDepth`, `scope`
- 解析生成元素引用（@e1, @e2...）

**2.2 实现 ref 系统**
- 解析 snapshot 输出，提取角色和名称
- 构建 `RefMap: { e1: { role, name, nth }, ... }`
- 存储到 session 中
- 每次 snapshot 后更新 ref 映射

**2.3 action 支持 @ref 语法**
- 解析 `@e1` 格式的选择器
- 转换为 Playwright `getByRole()` 调用
- 支持 nth 索引（相同角色+名称的多个元素）

### Phase 3: L2 完整 Action

| 步骤 | 任务 | 状态 | 产出文件 | 完成日期 |
|------|------|------|----------|----------|
| 3.1 | 实现交互类 action | 🔲 待开始 | `handlers/action.handler.ts` | - |
| 3.2 | 实现信息获取 action | 🔲 待开始 | `handlers/action.handler.ts` | - |
| 3.3 | 实现截图功能 | 🔲 待开始 | `browser.controller.ts` | - |

**3.1 实现交互类 action**
- `click`, `dblclick`, `fill`, `type`, `press`
- `hover`, `check`, `uncheck`, `select`, `focus`
- `scroll`, `scrollIntoView`
- 导航：`back`, `forward`, `reload`

**3.2 实现信息获取 action**
- `getText`, `getAttribute`, `getInnerHTML`, `getInputValue`
- `isVisible`, `isEnabled`, `isChecked`
- `getTitle`, `getUrl`

**3.3 实现截图功能**
- `GET /browser/session/:id/screenshot`
- 支持全页截图和元素截图
- 返回 base64 编码图片

### Phase 4: L3 Agent 基础（使用 @moryflow/agents SDK）

| 步骤 | 任务 | 状态 | 产出文件 | 完成日期 |
|------|------|------|----------|----------|
| 4.1 | 创建 agent 模块骨架 | 🔲 待开始 | `agent.module.ts`, `agent.controller.ts`, `agent.service.ts` | - |
| 4.2 | 定义 Browser Tools | 🔲 待开始 | `agent/tools/browser-tools.ts` | - |
| 4.3 | 实现异步任务系统 | 🔲 待开始 | 使用 BullMQ | - |
| 4.4 | 实现 Agent 执行逻辑 | 🔲 待开始 | `agent.service.ts` | - |

**4.1 创建 agent 模块骨架**
- 创建 `apps/aiget/server/src/agent/` 目录
- 路由：`POST /api/v1/agent`, `GET /api/v1/agent/:id`, `DELETE /api/v1/agent/:id`
- 定义 DTO：`AgentRequest`, `AgentResponse`, `AgentStatusResponse`

**4.2 定义 Browser Tools**
- 基于 `@moryflow/agents` 的 `tool()` 函数定义 Tools
- 核心 Tools：`browser_snapshot`, `browser_click`, `browser_fill`, `browser_open`
- 辅助 Tools：`web_search`, `browser_getText`, `browser_scroll`
- Tools 使用 Shared Infrastructure（SessionManager, SnapshotService, ActionExecutor）

**4.3 实现异步任务系统**
- 使用 BullMQ 队列处理长时间任务
- 任务状态：`processing`, `completed`, `failed`
- 结果持久化（Redis 或 DB）

**4.4 实现 Agent 执行逻辑**
- 使用 `Agent` 类创建 Browser Agent
- 配置 `instructions`（系统 prompt）
- 传入 Browser Tools 和用户 schema
- 通过 `run()` 执行并获取结构化输出

### Phase 5: L3 高级功能

| 步骤 | 任务 | 状态 | 产出文件 | 完成日期 |
|------|------|------|----------|----------|
| 5.1 | 增强 Tools（更多动作） | 🔲 待开始 | `agent/tools/browser-tools.ts` | - |
| 5.2 | 实现 credits 消耗追踪 | 🔲 待开始 | `agent.service.ts` | - |
| 5.3 | 流式输出支持 | 🔲 待开始 | 使用 SDK `Runner.runStreaming()` | - |

**5.1 增强 Tools**
- 添加更多 Browser 操作：`select`, `hover`, `check`, `uncheck`
- 添加 `screenshot` Tool（视觉分析）
- 添加 `wait` Tool（等待条件）

**5.2 实现 credits 消耗追踪**
- 追踪 LLM token 使用量
- 实现 `maxCredits` 限制
- 超额时提前终止任务

**5.3 流式输出支持**
- 使用 SDK 的 `Runner.runStreaming()` API
- 通过 SSE 推送执行进度
- 返回中间步骤（思考过程、工具调用）

---

## 十、同步规则

### 进度同步协议

1. **每完成一个步骤**后，必须执行以下更新：
   ```markdown
   - 将该步骤状态从 🔲 改为 ✅
   - 填写完成日期
   - 更新 Phase 总览的完成度
   - 如果 Phase 完成，更新状态为 ✅ 已完成
   ```

2. **正在进行的步骤**使用 🔄 标记：
   ```markdown
   | 1.1 | 创建 browser 模块骨架 | 🔄 进行中 | ... | - |
   ```

3. **遇到阻塞时**添加备注：
   ```markdown
   | 1.3 | 实现 session 管理 | ⚠️ 阻塞 | ... | - |
   备注：等待 browser-pool 重构完成
   ```

4. **状态图标说明**：
   - 🔲 待开始
   - 🔄 进行中
   - ✅ 已完成
   - ⚠️ 阻塞
   - ❌ 已取消

### 提交规范

每个步骤完成后，commit message 格式：
```
feat(browser): 完成步骤 X.X - [任务名称]

- 产出文件：xxx.ts
- 关联文档：docs/research/agent-browser-integration.md
```

---

_文档版本: 5.1 | 更新日期: 2026-01-13_

---

## 十一、方案 Review 与改进建议

> 基于 agent-browser 源码深入分析和 @moryflow/agents SDK 接口验证后的改进建议

### 11.1 已修正的问题

| 问题 | 原方案 | 修正后 |
|------|--------|--------|
| **SDK 接口** | `ctx.context` 直接访问 | `runContext?.context` 判空访问 |
| **Tool 泛型** | 缺少类型参数 | `tool<Schema, Context>()` |
| **Runner 使用** | 直接 `run()` | 创建 `Runner` 实例复用 |
| **Token 用量** | `result.usage` | `result.state._context.usage` |

### 11.2 需要补充的功能（按优先级）

#### P0 - 必须实现

| 功能 | 说明 | 实现建议 |
|------|------|----------|
| **角色分类系统** | INTERACTIVE / CONTENT / STRUCTURAL | 参考 agent-browser 的角色定义 |
| **Nth 去重逻辑** | 处理相同 role+name 的重复元素 | 实现 RoleNameTracker |
| **语义定位器** | 使用 `getByRole` 而非 CSS | RefMap 存储完整 selector |
| **SSRF 防护** | 禁止内网/localhost | 复用现有 `url-validator.ts` |

#### P1 - 建议实现

| 功能 | 说明 | 实现建议 |
|------|------|----------|
| **AI 友好错误** | 错误消息 + 修复建议 | `toAIFriendlyError()` 转译 |
| **多标签页** | newTab, listTabs, switchTab | BrowserManager 扩展 |
| **对话框处理** | 自动处理 alert/confirm/prompt | `page.on('dialog')` |
| **计费模型优化** | 按时长或动作数计费 | 避免资源滥用 |

#### P2 - 可选实现

| 功能 | 说明 | 实现建议 |
|------|------|----------|
| **多窗口** | 独立上下文（隔离 cookies） | `newWindow()` |
| **CDP 连接** | 连接已运行的浏览器 | 调试用 |
| **网络拦截** | 按需设置请求头、mock | 高级用例 |
| **会话持久化** | 存储 cookies/localStorage | 断点续传 |
| **增量快照** | `snapshot --delta` | 节省 token |

### 11.3 计费模型建议

**当前方案问题**：按 session 计费（1 credit/session）会导致资源滥用

**改进方案**：

```
L2 Browser 计费方案（二选一）：

方案 A：时长计费
- session 创建：1 credit（基础，包含 5 分钟）
- 超时计费：0.1 credit/分钟（超过 5 分钟后）
- 截图：0.5 credit/次

方案 B：动作计费
- session 创建：0.5 credit
- 每个 action：0.01 credit
- snapshot：0.02 credit（token 消耗较高）
- 截图：0.5 credit/次

L3 Agent 计费方案：
- 基于 LLM token 消耗动态计费
- 支持 maxCredits 参数限制
- 提供预估功能（基于历史数据）
```

### 11.4 安全考量

```typescript
// 1. URL 验证 - 复用现有 SSRF 防护
import { validateUrl } from '../common/url-validator';

async function openUrl(url: string): Promise<void> {
  const validation = await validateUrl(url);
  if (!validation.valid) {
    throw new Error(`Invalid URL: ${validation.reason}`);
  }
  await page.goto(url);
}

// 2. 文件路径限制
function validateFilePath(filePath: string): boolean {
  // 禁止 ../ 路径穿越
  if (filePath.includes('..')) return false;
  // 限制在允许的目录内
  const allowedDirs = ['/tmp/fetchx/', '/var/fetchx/'];
  return allowedDirs.some(dir => filePath.startsWith(dir));
}

// 3. evaluate 命令沙盒化（可选）
// 使用 isolated context 或禁用危险 API
```

### 11.5 与 agent-browser 的差异对比

| 维度 | agent-browser | Fetchx (本方案) |
|------|--------------|-----------------|
| **协议** | Unix Socket / TCP | REST API + WebSocket |
| **会话模型** | Daemon（长连接） | 无状态（每请求创建） |
| **Ref 有效期** | 单次快照内 | 单次快照内（相同） |
| **并发** | 单连接串行 | 队列 + 异步 |
| **持久化** | 无 | 可选（cookies/storage） |
| **LLM 集成** | 无（纯浏览器） | @moryflow/agents SDK |

### 11.6 实现顺序调整建议

基于以上分析，建议调整实现顺序：

```
原顺序：
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

建议顺序：
Phase 1（基础架构）
  ↓
Phase 2（Snapshot + Ref）← 重点：加入角色分类、Nth 去重
  ↓
Phase 3（Action）← 加入：AI 友好错误、对话框处理
  ↓
Phase 4（Agent SDK 集成）
  ↓
Phase 5（高级功能）← 加入：多标签页、计费优化
```

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 5.1 | 2026-01-13 | 添加流式 API 设计：SSE 事件类型、前后端示例 |
| 5.0 | 2026-01-13 | 深入 Review：修正 SDK 接口、添加改进建议 |
| 4.0 | 2026-01-13 | L3 Agent 架构调整为使用 @moryflow/agents SDK |
| 3.0 | 2026-01-13 | 添加实现进度追踪和同步规则 |
| 2.0 | 2026-01-13 | 完善 L2/L3 API 详细设计 |
| 1.0 | 2026-01-13 | 初始版本：参考项目分析和架构设计 |
