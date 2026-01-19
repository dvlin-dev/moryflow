# Fetchx Browser & Agent 功能需求

> 创建日期：2026-01-13
> 最后更新：2026-01-14
> 状态：已完成

---

## 一、前期准备

### 1.1 参考项目

| 项目                | 仓库                                                                      | 定位                                      |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| **agent-browser**   | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | 面向 AI Agent 的底层浏览器自动化 CLI 工具 |
| **Firecrawl Agent** | [mendableai/firecrawl](https://github.com/mendableai/firecrawl)           | 高层智能数据收集 API                      |

### 1.2 环境配置

参考仓库需克隆到本地以供查阅：

```bash
# 克隆参考仓库
git clone https://github.com/vercel-labs/agent-browser.git archive/external-repos/agent-browser
git clone https://github.com/mendableai/firecrawl.git archive/external-repos/firecrawl
```

> 注：已在 `.gitignore` 中添加忽略规则，避免提交外部仓库。

---

## 二、需求概述

### 2.1 业务目标

为 AI Agent 提供完整的浏览器自动化能力，支持：

- **精确控制**：外部 AI Agent（如 Claude、GPT）可通过 API 操作浏览器
- **智能决策**：内置 LLM 驱动的自动导航和数据提取
- **结构化输出**：支持用户定义的 JSON Schema 输出格式

### 2.2 三层 API 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fetchx API (server.anyhunt.app)              │
├─────────────────────────────────────────────────────────────────┤
│  L3: Agent (智能数据收集)                                        │
│      POST /api/v1/agent                                         │
│      - 基于 @anyhunt/agents-core SDK 实现                        │
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
│      - ActionHandler: 动作执行引擎                               │
│      - BrowserPool: 浏览器实例池                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心功能矩阵

| 功能层级           | 描述           | 关键能力                                                       |
| ------------------ | -------------- | -------------------------------------------------------------- |
| **L2 Browser API** | 浏览器会话管理 | Session CRUD、页面导航、截图、快照、CDP 访问、多标签页、多窗口 |
| **L3 Agent API**   | AI Agent 执行  | 任务执行、流式输出、取消、计费检查点                           |
| **计费系统**       | Credits 扣费   | 分段检查（每 100 credits）、失败退款、取消结算                 |
| **持久化**         | 任务状态管理   | DB 存储终态、Redis 存储实时进度                                |

---

## 三、架构设计

### 3.1 系统架构图

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
        │  │ ActionHandler │  │   BrowserPool     │   │
        │  └───────────────┘  └───────────────────┘   │
        └─────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │             Playwright Core                 │
        └─────────────────────────────────────────────┘
```

### 3.2 模块划分

```
apps/anyhunt/server/src/
├── browser/                    # L2 浏览器自动化
│   ├── browser.module.ts
│   ├── browser-session.controller.ts
│   ├── browser-session.service.ts
│   ├── session/                # 会话管理
│   ├── snapshot/               # 快照服务
│   ├── handlers/               # 动作处理
│   ├── network/                # 网络拦截
│   ├── persistence/            # 存储持久化
│   ├── cdp/                    # CDP 连接
│   ├── ports/                  # Agent 端口（类型隔离）
│   └── dto/                    # Zod schemas
│
└── agent/                      # L3 智能 Agent
    ├── agent.module.ts
    ├── agent.controller.ts
    ├── agent.service.ts
    ├── agent-billing.service.ts    # 计费逻辑
    ├── agent-task.repository.ts    # 任务持久化
    ├── agent-task.progress.store.ts # 进度存储
    ├── tools/                  # Browser Tools
    └── dto/
```

### 3.3 类型隔离（Ports/Facade）

为避免 Playwright 重类型进入 agents-core 泛型推断导致 TypeScript OOM，采用 Ports 模式隔离：

```
Agent Service  ──▶  BrowserAgentPortService  ──▶  SessionManager
   (轻量类型)           (端口接口)                (Playwright 类型)
```

---

## 四、核心功能设计

### 4.1 L2 Browser API

#### 路由清单

```typescript
// 会话管理
POST   /api/v1/browser/session              // 创建会话
GET    /api/v1/browser/session/:id          // 获取会话状态
DELETE /api/v1/browser/session/:id          // 关闭会话

// 页面操作
POST   /api/v1/browser/session/:id/open     // 打开 URL
POST   /api/v1/browser/session/:id/snapshot // 获取 Snapshot + refs
POST   /api/v1/browser/session/:id/action   // 执行动作
POST   /api/v1/browser/session/:id/screenshot // 截图

// 多标签页管理
POST   /api/v1/browser/session/:id/tabs
GET    /api/v1/browser/session/:id/tabs
POST   /api/v1/browser/session/:id/tabs/:tabIndex/activate
DELETE /api/v1/browser/session/:id/tabs/:tabIndex

// 多窗口管理
POST   /api/v1/browser/session/:id/windows
GET    /api/v1/browser/session/:id/windows
POST   /api/v1/browser/session/:id/windows/:windowIndex/activate
DELETE /api/v1/browser/session/:id/windows/:windowIndex

// 网络拦截
POST   /api/v1/browser/session/:id/intercept/rules
GET    /api/v1/browser/session/:id/intercept/rules
POST   /api/v1/browser/session/:id/intercept/rule
DELETE /api/v1/browser/session/:id/intercept/rule/:ruleId
GET    /api/v1/browser/session/:id/network/history
DELETE /api/v1/browser/session/:id/network/history

// 存储管理
POST   /api/v1/browser/session/:id/storage/export
POST   /api/v1/browser/session/:id/storage/import
DELETE /api/v1/browser/session/:id/storage

// CDP 连接（创建新的 CDP session）
POST   /api/v1/browser/session/cdp/connect

// 增量快照
POST   /api/v1/browser/session/:id/snapshot/delta
```

#### Snapshot + Ref 系统

Snapshot 返回页面可访问性树，并为每个元素生成唯一引用（@e1, @e2...）：

```
- heading "Example Domain" [ref=e1] [level=1]
- paragraph: This domain is for use in illustrative examples.
- link "More information..." [ref=e2]
- button "Submit" [ref=e3]
- textbox "Email" [ref=e4]
```

后续操作可使用 `@ref` 格式定位元素，比 CSS 选择器更可靠：

```bash
# 使用 ref 进行操作
click @e3      # 点击 Submit 按钮
fill @e4 "test@example.com"  # 填写 Email
```

#### Action 类型

| 类别         | 动作                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| **导航**     | open, back, forward, reload                                              |
| **交互**     | click, dblclick, fill, type, press, hover, check, uncheck, select, focus |
| **等待**     | wait (元素/时间/URL/文本/网络空闲)                                       |
| **滚动**     | scroll, scrollIntoView                                                   |
| **信息获取** | getText, getAttribute, getInnerHTML, getInputValue                       |
| **状态检查** | isVisible, isEnabled, isChecked                                          |

### 4.2 L3 Agent API

#### 路由

```typescript
POST   /api/v1/agent             // 创建任务（默认 SSE 流式）
GET    /api/v1/agent/:id         // 获取任务状态/结果
DELETE /api/v1/agent/:id         // 取消任务
POST   /api/v1/agent/estimate    // 预估 credits 消耗
```

#### 请求/响应

```typescript
// POST /api/v1/agent
interface AgentRequest {
  prompt: string; // 自然语言描述（必填）
  urls?: string[]; // 可选的起始 URL
  schema?: object; // JSON Schema 输出格式
  maxCredits?: number; // 最大消耗 credits
  stream?: boolean; // 是否流式返回（默认 true）
}

// SSE 事件类型
type AgentStreamEvent =
  | { type: 'started'; id: string; expiresAt: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; callId: string; tool: string; args: object }
  | { type: 'tool_result'; callId: string; tool: string; result: unknown }
  | { type: 'progress'; message: string; step: number; totalSteps?: number }
  | { type: 'complete'; data: unknown; creditsUsed: number }
  | { type: 'failed'; error: string; creditsUsed?: number };
```

#### Browser Tools

Agent 可调用的浏览器工具：

| 工具               | 说明                   |
| ------------------ | ---------------------- |
| `browser_snapshot` | 获取页面可访问性树快照 |
| `browser_open`     | 打开 URL               |
| `browser_click`    | 点击元素               |
| `browser_fill`     | 填写输入框             |
| `browser_type`     | 键入文本               |
| `browser_press`    | 按键                   |
| `browser_scroll`   | 滚动页面               |
| `browser_wait`     | 等待条件               |
| `web_search`       | 搜索引擎搜索           |

### 4.3 计费规则

#### L2 Browser 计费

| 计费项                      | 说明                             |
| --------------------------- | -------------------------------- |
| `fetchx.browser.session`    | 创建会话：1 credit               |
| `fetchx.browser.action`     | 每个动作：免费（已计入 session） |
| `fetchx.browser.screenshot` | 截图：1 credit                   |

#### L3 Agent 计费

- **分段检查点**：每消耗 100 credits 触发一次检查，验证用户余额
- **失败退款**：任务失败时全额退回已扣 checkpoint
- **取消结算**：用户主动取消不退款，按已消耗扣费
- **SSE 断开不取消**：后台继续执行，用户可通过 `GET /agent/:id` 查看结果

---

## 五、数据结构与流程

### 5.1 数据模型

```prisma
// 任务主表
model AgentTask {
  id            String   @id @default(cuid())
  userId        String
  status        String   // pending | running | completed | failed | cancelled
  prompt        String
  urls          String[] // 起始 URL 列表
  outputSchema  Json?    // 用户期望的输出 schema
  result        Json?    // 任务结果
  error         String?  // 错误信息
  creditsUsed   Int      @default(0)
  creditsMax    Int?     // 用户设置的最大消耗
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  charges       AgentTaskCharge[]
}

// 计费流水表
model AgentTaskCharge {
  id            String   @id @default(cuid())
  taskId        String
  userId        String
  referenceId   String   // quota 系统的扣费流水 ID
  credits       Int      // 扣费金额
  type          String   // checkpoint | settlement | refund
  createdAt     DateTime @default(now())

  task          AgentTask @relation(...)
}
```

### 5.2 任务生命周期

```
┌─────────┐    创建    ┌─────────┐    开始执行    ┌─────────┐
│ pending │ ─────────▶ │ running │ ─────────────▶ │ running │
└─────────┘            └─────────┘                └────┬────┘
                                                       │
           ┌───────────────────────────────────────────┼───────────────────────┐
           │                                           │                       │
           ▼                                           ▼                       ▼
    ┌───────────┐                              ┌───────────┐            ┌───────────┐
    │ completed │  ◀── 正常完成（结算剩余）     │  failed   │ ◀── 执行失败（全额退款）
    └───────────┘                              └───────────┘            │
                                                                        │
                                                                 ┌──────┴──────┐
                                                                 │  cancelled  │
                                                                 └─────────────┘
                                                                 ◀── 用户取消（不退款）
```

### 5.3 计费流程

```
任务执行中
    │
    ├── 每 100 credits ──▶ checkpoint 扣费 ──▶ 写入 AgentTaskCharge
    │
    ├── 正常完成 ──▶ settlement（结算剩余 credits）
    │
    ├── 执行失败 ──▶ refund（退回所有 checkpoint）
    │
    └── 用户取消 ──▶ 不退款（保留已扣 checkpoint）
```

---

## 附录

### A. 参考项目对比

| 维度             | agent-browser                 | Firecrawl Agent                |
| ---------------- | ----------------------------- | ------------------------------ |
| **层级**         | 底层自动化工具                | 高层智能 API                   |
| **控制方式**     | 命令式（click @e2, fill @e3） | 声明式（prompt: "找到创始人"） |
| **是否需要 URL** | 需要                          | 不需要（自动搜索）             |
| **LLM 依赖**     | 无（纯浏览器操作）            | 强依赖（LLM 决策）             |
| **会话模型**     | 有状态（多轮交互）            | 无状态（一次任务）             |
| **使用者**       | AI Agent（Claude/GPT）        | 开发者/终端用户                |

### B. 参考源码

**agent-browser**：

- `src/snapshot.ts` - Snapshot + Ref 系统核心
- `src/actions.ts` - 命令执行器
- `src/browser.ts` - BrowserManager

**@anyhunt/agents-core**：

- `packages/agents-core/src/agent.ts` - Agent 定义
- `packages/agents-core/src/tool.ts` - Tool 抽象
- `packages/agents-core/src/run.ts` - 执行入口

### C. 相关文档

- **[@moryflow/agents SDK 参考](../references/moryflow-agents-sdk.md)** - L3 Agent 实现的核心依赖
- **[Playwright ARIA Snapshot API](https://playwright.dev/docs/aria-snapshot)** - 快照实现参考
- **[ARIA 角色参考](https://www.w3.org/TR/wai-aria-1.2/#role_definitions)** - 可访问性角色定义

---

_版本: 1.0 | 更新日期: 2026-01-14_
