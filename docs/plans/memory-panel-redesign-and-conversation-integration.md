---
title: Memory 面板重构与对话集成
date: 2026-03-16
scope: moryflow-pc
status: draft
---

# Memory 面板重构与对话集成

## 动机

当前 "Memory" 面板混淆了两个本质不同的概念：

1. **文件向量化** — 被动索引工作区 markdown 文件
2. **个人记忆** — 用户偏好、兴趣和对话中表达的事实

用户对 "Memory" 的直觉理解是 "AI 对我的了解"，而不是 "文件搜索仪表盘"。

此外，Memory 当前与对话流程完全断开：

- AI 回复时不会参考已有记忆
- 对话不会产生新的记忆
- 聊天与记忆之间没有反馈循环

## 硬约束

- **零历史兼容**：从零设计，旧组件直接删除重写。
- **AI 驱动**：记忆的读写由 AI 通过 tool 自主决定，不搞硬编码管道。

## 概念模型

两大主域 + 一个派生视角：

```
┌─────────────────────────────────────────────────────────────┐
│                      Memory（页面）                          │
│            "你的 AI 了解和记住的一切"                          │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│   Memories              │   Knowledge                       │
│   （关于你）             │   （你的文件）                     │
│                         │                                   │
│ • 偏好 / 兴趣 / 习惯    │ • 已索引文件                      │
│ • 上下文事实            │ • 文件洞察                        │
│ • 来自对话 + 手动输入    │ • 语义搜索                        │
│                         │                                   │
├─────────────────────────┴───────────────────────────────────┤
│   Connections（派生视角 · graph lens）                        │
│   从 Memories + Knowledge 投影的实体-关系图谱                │
│   不是独立数据资产，是两个主域的联合视图                       │
└─────────────────────────────────────────────────────────────┘
```

### 与现有 Memox 模型的映射

| UI 概念         | Memox 实体                  | origin_kind      | sourceType                       | 来源                |
| --------------- | --------------------------- | ---------------- | -------------------------------- | ------------------- |
| 记忆（手动）    | MemoryFact                  | `MANUAL`         | —                                | 用户输入            |
| 记忆（AI 写入） | MemoryFact                  | `SOURCE_DERIVED` | `moryflow_chat_session_v1`       | 对话中 AI tool call |
| 知识洞察        | MemoryFact                  | `SOURCE_DERIVED` | `moryflow_workspace_markdown_v1` | Markdown 文件       |
| 知识文件        | KnowledgeSource             | —                | —                                | Workspace Content   |
| 关系（派生）    | GraphEntity / GraphRelation | —                | —                                | 从 fact 投影        |

**IPC 类型变更（Phase 1 前置）**：

- `MemoryFact` 新增 `sourceId?: string`、`sourceType?: string`
- 新增归一化字段 `factScope: 'personal' | 'knowledge'`（由 IPC handler 计算，UI 直接消费）
- `moryflow_chat_session_v1` 严格限制在 memory gateway 内，不污染文件搜索契约

---

## 对话集成：Tool 驱动架构

### 核心思路

不搞硬编码的检索管道和后置提取 pipeline。把 Memory 和 Knowledge 封装为标准 tool，由 AI 在对话中自主驱动读写。

```
对话开始
  │
  ├─ System Prompt 注入用户记忆（top 30）
  │  AI 天然就「认识你」
  │
  ├─ AI 对话中自主调用 tool
  │  ├─ memory_search(query)     → 查询个人记忆
  │  ├─ memory_save(text, cat)   → 保存新记忆
  │  ├─ memory_update(id, text)  → 更新已有记忆
  │  ├─ knowledge_search(query)  → 搜索文件知识
  │  └─ 和其他 tool 一样，标准注册/执行
  │
  └─ 无需后置提取 pipeline
     AI 在对话中实时决定存什么
```

### System Prompt 注入

对话创建时，从 Memory API 拉取用户个人记忆（`factScope === 'personal'`），按更新时间排序，注入 system prompt。

**规则**：

- 取 top 30 条；不足 30 条则有多少注入多少
- 记忆为空时不注入此块（不占 token 空间）
- 仅在对话创建时注入一次，不随每轮更新

**注入格式**：

```
## About This User

The following are things you know about this user from past interactions.
Use this knowledge to personalize your responses.

- Prefers concise, direct responses without trailing summaries
- Senior full-stack engineer (TypeScript, NestJS, Electron, React)
- Uses Chinese for conversation, English for code and commits
- Working on cloud sync architecture for Moryflow
- Interested in macOS native design patterns and typography
- Prefers root-cause fixes over band-aid patches
...
```

### Memory Tool

注册为标准 tool，自动执行（不需要用户审批）。

#### memory_search

查询个人记忆。当用户的问题可能涉及之前聊过的内容、或需要更多个人上下文时调用。

```typescript
{
  name: 'memory_search',
  description: 'Search your personal memories about this user. Use when the user references past context or when their question could benefit from personal knowledge.',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  },
  returns: {
    facts: Array<{ id: string, text: string, category: string, updatedAt: string }>
  }
}
```

#### memory_save

保存新的个人记忆。当用户表达了强偏好、透露了背景/角色、提到了正在进行的项目或兴趣时调用。

```typescript
{
  name: 'memory_save',
  description: 'Save a personal fact about this user for future reference. Save preferences, interests, professional background, and ongoing project context. Only save persistent facts, not ephemeral task details.',
  parameters: {
    text: { type: 'string', description: 'The fact to remember, as a clear single statement' },
    category: {
      type: 'string',
      enum: ['preference', 'interest', 'profile', 'context'],
      description: 'preference=how they like things done, interest=topics they care about, profile=role/skills/experience, context=ongoing projects/goals'
    }
  },
  returns: { id: string }
}
```

#### memory_update

更新已有记忆。当用户的情况发生变化（如从 React 18 迁移到 React 19）时，更新而非新建。

```typescript
{
  name: 'memory_update',
  description: 'Update an existing memory when the user\'s situation has changed. Use instead of creating a duplicate.',
  parameters: {
    id: { type: 'string', description: 'Memory ID to update' },
    text: { type: 'string', description: 'Updated fact text' }
  },
  returns: { success: boolean }
}
```

### Knowledge Tool

注册为标准 tool，自动执行。

#### knowledge_search

搜索用户工作区的文件知识。当用户的问题涉及他们的文件内容、或需要从文件中获取参考信息时调用。

```typescript
{
  name: 'knowledge_search',
  description: 'Search the user\'s workspace files for relevant knowledge. Use when the user asks about their own content, needs references from their files, or when file context would improve your answer.',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  },
  returns: {
    files: Array<{ title: string, path: string, snippet: string, score: number }>,
    insights: Array<{ text: string, sourcePath: string }>
  }
}
```

### Tool 使用指引（注入 System Prompt）

```
## Your Tools — Memory & Knowledge

You have memory and knowledge tools. Use them proactively — they significantly
improve the user experience.

### When to use memory_save:
- User expresses a clear preference ("I prefer...", "Don't do...", "Always use...")
- User reveals their role, skills, or professional background
- User mentions an ongoing project, goal, or current focus area
- User shares interests or topics they care about
- SAVE EAGERLY. When in doubt, save it. The user can always delete later.
- Only skip truly ephemeral details (specific error messages, one-off debugging).

### When to use memory_search:
- User references something from a past conversation
- User asks a question where personal context would help
- You want to check if you already know something before asking

### When to use memory_update:
- User's situation has changed (new role, migrated tech stack, etc.)
- A previously saved fact is now outdated
- Search first to find the memory ID, then update

### When to use knowledge_search:
- User asks about their own files, notes, or project content
- User's question could benefit from their existing documentation
- You need specific details from their workspace to give a better answer
- SEARCH PROACTIVELY when the topic relates to the user's workspace.
```

### Tool 实现层

所有 tool handler 在 PC 主进程中实现，走已有的 Memory API client 和 Memox search adapter。

```
┌─ Agent Runtime ───────────────────────────────────────────┐
│                                                           │
│  Tool Registry                                            │
│  ├─ memory_search  → memoryApiClient.search()             │
│  ├─ memory_save    → memoryApiClient.createFact()          │
│  ├─ memory_update  → memoryApiClient.updateFact()          │
│  ├─ knowledge_search → memoryApiClient.search() (files)   │
│  ├─ (existing tools: file_read, bash, etc.)               │
│  └─ ...                                                   │
│                                                           │
│  Tool Execution: 自动执行，不需要用户审批                    │
│                                                           │
└───────────────────────────────────────────────────────────┘
         │
         ▼
    Memory API Client (已有)
         │
         ▼
    Moryflow Server → Anyhunt Memox
```

---

## UI 设计

### 设计原则（对齐 design-system.md）

- macOS 原生质感：克制、层次分明、手感精致
- 黑白灰为主；彩色仅用于状态指示
- 渐进式披露：仪表盘 → 侧面板详情
- 直接操控：就地编辑，最少模态打断
- 一目了然：用户 2 秒内理解状态
- 图标统一 Lucide，禁止 emoji
- 破坏性操作必须有确认（`destructive` 变体）
- 成功状态优先安静 inline 反馈

### 主仪表盘布局

单栏纵向卡片式 Dashboard。

**导航模型**：Dashboard（Hub）→ Memories / Knowledge 点击进入侧面板（保留总览上下文）→ Connections / Search 进入全屏覆盖。

```
┌──────────────────────────────────────────────────────────────────────┐
│  Memory                                             [Search]        │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Memories                                                  →   │  │
│  │  About you · 12 memories                                       │  │
│  │                                                                │  │
│  │  + What should your AI remember?                               │  │
│  │                                                                │  │
│  │  Prefers concise, direct responses       [MessageSquare] 2h    │  │
│  │  Working on cloud sync architecture      [MessageSquare] 5h    │  │
│  │  Interested in typography and design     [Pencil] 2d           │  │
│  │  Uses Chinese for conversation           [MessageSquare] 3d    │  │
│  │  Senior full-stack engineer              [MessageSquare] 5d    │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Knowledge                                                 →   │  │
│  │  [Check] 108 / 127 files indexed                               │  │
│  │  ████████████████░░░ 85%                                       │  │
│  │  Recent: design-system.md · sync-plan.md · 5 min ago           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Connections · 23 entities · 15 relations                  →   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Memories 卡片**（全宽，主角）：

- 标题：`Memories` + `About you · N memories` + `→`
- 内嵌输入框：`+ What should your AI remember?`
- 最近 5 条个人记忆预览：文本截断 + 来源图标（`MessageSquare` / `Pencil`）+ 时间
- 点击 → 侧面板

**Knowledge 卡片**（全宽）：

- 状态机优先显示 + 进度条为辅：

| 状态       | 主文案                     | 进度条        |
| ---------- | -------------------------- | ------------- |
| `scanning` | Scanning workspace...      | indeterminate |
| `indexing` | Indexing · N / M files     | determinate   |
| `ready`    | [Check] N files indexed    | 隐藏          |
| `paused`   | Indexing paused            | 隐藏          |
| `failed`   | Indexing failed · N errors | 隐藏          |
| `offline`  | Offline · cached data      | 隐藏          |

- 分母 = PC 本地扫描总数；分子 = 服务端已确认索引数
- 大量新增（分母突增 > 20%）：`Indexing N new files...`
- 点击 → 侧面板

**Connections 卡片**（全宽紧凑行，`entity_count > 0` 时才显示）：

- 单行：`Connections · N entities · M relations` + `→`
- 点击 → 全屏图谱

### 详情导航

| 入口        | 形式              | 理由                  |
| ----------- | ----------------- | --------------------- |
| Memories    | 右侧侧面板（60%） | 保留 Dashboard 上下文 |
| Knowledge   | 右侧侧面板（60%） | 同上                  |
| Connections | 全屏覆盖          | 图谱需要最大空间      |
| Search      | 全屏覆盖          | 搜索结果需要完整空间  |

### 侧面板：Memories 详情

- 输入框 + 筛选标签（`All` / `From conversations` / `Manual`）
- 全量列表，每条含分类徽章（`preferences` / `profile` / `interests` / `context`）
- 选中后展开：来源 + 创建时间 + `[Mark useful]` `[Edit]` `[Delete]`
- 删除需确认弹窗（`destructive`）
- `New` 徽章标记最近 24 小时内 AI 自动保存的记忆

### 侧面板：Knowledge 详情

- 索引状态卡片（状态机 + 进度条）
- 搜索框
- INSIGHTS 列表（文件衍生的 source-derived facts）
- FILES 列表（已索引文件 + 时间）

### 全屏：Connections / Search

与之前版本相同，不再重复。

### 空状态

**Dashboard 全空**：

```
  [Brain]
  Your AI doesn't know you yet

  Start chatting to teach your AI about your preferences,
  or add memories manually.
  Your files will be automatically indexed as knowledge.

  [+ Add a memory]     [Start a chat →]
```

**Memories 卡片空**：`[Brain] No memories yet · Start chatting — your AI will learn over time.`

---

## 集成路线图

### Phase 1：UI 重构 + 数据契约补齐

> 以下步骤按顺序执行，每步标注了目标文件和具体操作。

#### 步骤 1.1：IPC 类型变更

**文件**：`apps/moryflow/pc/src/shared/ipc/memory.ts`

- `MemoryFact` 类型新增三个字段：

  ```typescript
  sourceType?: string;  // 透传服务端 source_type，如 'moryflow_chat_session_v1'
  factScope: 'personal' | 'knowledge';  // UI 消费的归一化分类
  ```

  注：`sourceId` 已存在于现有类型中，无需新增。

- 新增 `MemoryFactScope` 类型导出：
  ```typescript
  export type MemoryFactScope = 'personal' | 'knowledge';
  ```

#### 步骤 1.2：IPC handler 计算 factScope

**文件**：`apps/moryflow/pc/src/main/app/ipc/memory-domain/*`

- 找到所有返回 `MemoryFact` 或 `MemoryFact[]` 的 handler（`listMemoryFactsIpc`、`searchMemoryIpc`、`createMemoryFactIpc`、`updateMemoryFactIpc` 等）
- 在返回前对每个 fact 附加 `factScope`：
  ```typescript
  const computeFactScope = (fact: ServerFact): 'personal' | 'knowledge' => {
    if (fact.kind === 'manual') return 'personal';
    // source-derived + chat session → personal；其余 → knowledge
    if (fact.sourceType === 'moryflow_chat_session_v1') return 'personal';
    return 'knowledge';
  };
  ```
- 注意：服务端 Memory Gateway 返回的 fact 已包含 `source_id` 和 origin 信息。如果当前 `memory.client.ts` 的响应 DTO 没有透传 `sourceType`，需要在 `memory/api/client.ts` 的响应映射中补上（从服务端的 `origin_kind` + source 关联字段推导）。

#### 步骤 1.3：删除旧组件

**目录**：`apps/moryflow/pc/src/renderer/workspace/components/memory/`

删除以下文件（保留 `use-force-layout.ts`、`graph-entity-node.tsx`、`helpers.ts`、`const.ts`）：

- `index.tsx`（旧 Dashboard，将被重写）
- `memory-panel.tsx`
- `connections-panel.tsx`
- `memory-dashboard-header.tsx`
- `workbench-sheet.tsx`
- `memories-sheet.tsx`（将被重写为 `memories-panel.tsx`）
- `connections-sheet.tsx`（将被重写为 `connections-overlay.tsx`）
- `search-sheet.tsx`（将被重写为 `search-overlay.tsx`）
- `use-memory.ts`（将被重写为 `use-memory-page.ts`）
- `use-memory-dashboard.ts`
- `memory-workbench-store.ts`（将被重写为 `memory-store.ts`）
- `memory-fact-card.tsx`（将被内联到新组件中）

#### 步骤 1.4：创建 Zustand store

**新建文件**：`memory-store.ts`

```typescript
type MemoryDetailView = 'none' | 'memories' | 'knowledge' | 'connections' | 'search';

interface MemoryStore {
  // 当前打开的详情视图
  detailView: MemoryDetailView;
  openDetail: (view: MemoryDetailView) => void;
  closeDetail: () => void;

  // Memories 侧面板中选中的 fact
  selectedFactId: string | null;
  selectFact: (id: string | null) => void;

  // 从 Global Search 来的 deep-link intent
  pendingFactIntent: { scopeKey: string; factId: string } | null;
  openFactFromSearch: (factId: string, scopeKey: string) => void;
  clearPendingFactIntent: () => void;
}
```

- 使用 `create` from `zustand`
- `openDetail` 设置 `detailView`；`closeDetail` 设置为 `'none'`
- `openFactFromSearch` 同时设置 `pendingFactIntent` + `detailView = 'memories'`

#### 步骤 1.5：创建页面状态 hook

**新建文件**：`use-memory-page.ts`

职责：加载 overview、facts 列表、graph 数据、搜索，管理异步状态。

**数据加载**（全部走 `window.desktopAPI.memory.*`）：

- `loadOverview()`：调 `getOverview()` → 填充 `overview` state
- `loadPersonalFacts(page)`：调 `listFacts({ kind: 'manual', pageSize: 30 })` → Memories 区域数据
- `loadKnowledgeFacts(page)`：调 `listFacts({ kind: 'derived', pageSize: 20 })` → Knowledge 区域数据
- `loadGraph(query?)`：调 `queryGraph({ query })` → Connections 数据
- `searchAll(query)`：调 `search({ query, limitPerGroup: 10 })` → 统一搜索结果
- `createFact(text)`：调 `createFact({ text })` → 刷新列表
- `updateFact(id, text)`：调 `updateFact({ factId: id, text })` → 刷新列表
- `deleteFact(id)`：调 `deleteFact(id)` → 刷新列表
- `feedbackFact(id, feedback)`：调 `feedbackFact({ factId: id, feedback })`

**状态结构**：

```typescript
{
  overview: MemoryOverview | null;
  overviewLoading: boolean;
  personalFacts: { items: MemoryFact[]; hasMore: boolean; loading: boolean };
  knowledgeFacts: { items: MemoryFact[]; hasMore: boolean; loading: boolean };
  graphData: { entities: []; relations: []; loading: boolean };
  searchResults: MemorySearchResult | null;
  searchLoading: boolean;
}
```

**关键模式**：

- 用 `useRef` 做 request ID 防抖（参考旧 `use-memory.ts` 的 `requestIdRef` 模式）
- workspace 切换时（通过 `vaultPath` 变化检测）清空所有状态并重新加载
- 首次 mount 时自动调用 `loadOverview()` + `loadPersonalFacts()` + `loadGraph()`

#### 步骤 1.6：创建 Dashboard 卡片组件

以下三个文件均放在 `components/memory/` 下。

**1.6a `memories-card.tsx`**（全宽主角卡片）：

- Props：`facts: MemoryFact[]`、`totalCount: number`、`loading: boolean`、`onCreateFact: (text: string) => void`、`onOpenDetail: () => void`、`onSelectFact: (id: string) => void`
- 结构：
  - 标题行：`Memories` + `About you · {N} memories` + `→` 按钮（→ `onOpenDetail`）
  - 输入框：placeholder `What should your AI remember?`，回车 → `onCreateFact`
  - 列表：最多 5 条 `personalFacts`，每条渲染：文本 2 行截断 + Lucide 图标（`MessageSquare` if `kind === 'source-derived'`，`Pencil` if `kind === 'manual'`）+ 相对时间
  - 点击单条 → `onSelectFact(fact.id)`
- 空状态：`Brain` 图标 + "No memories yet · Start chatting — your AI will learn over time."
- 样式：`rounded-xl border border-border/60 shadow-xs p-4`

**1.6b `knowledge-card.tsx`**（全宽状态卡片）：

- Props：`overview: MemoryOverview | null`、`loading: boolean`、`onOpenDetail: () => void`
- 状态机逻辑：从 `overview.indexing` 计算当前状态（`scanning` / `indexing` / `ready` / `paused` / `failed` / `offline`），参考方案中的状态机表格
- 进度条：`<div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} /></div>`
- 完成态（`ready`）：隐藏进度条，显示 `Check` 图标 + `N files indexed`
- 错误态（`failed`）：红色 `AlertCircle` + `Indexing failed · N errors`
- 样式同上

**1.6c `connections-card.tsx`**（全宽紧凑行，条件渲染）：

- Props：`entityCount: number`、`relationCount: number`、`onOpenDetail: () => void`
- 仅在 `entityCount > 0` 时渲染
- 单行：`Link` 图标 + `Connections · {N} entities · {M} relations` + `→`
- 样式：`rounded-xl border border-border/60 shadow-xs px-4 py-3`

#### 步骤 1.7：创建侧面板组件

**1.7a `memories-panel.tsx`**（右侧 60% 宽度侧面板）：

- 使用 shadcn `<Sheet>` 组件，`side="right"`，`className="sm:max-w-[60vw]"`
- Props：`open: boolean`、`onClose: () => void`、`facts`、`selectedFactId`、各种回调
- 内容：
  - 顶部：`← Memories` 返回按钮 + 搜索图标
  - 输入框（同 card 中的）
  - 筛选标签：`All` / `From conversations` / `Manual`（filter `personalFacts` by `kind`）
  - 列表：全量 personalFacts，每条含 checkbox + 文本 + 来源 + 分类徽章
  - AI 保存的记忆（`createdAt` 在 24h 内 + `kind === 'source-derived'`）标 `New` 徽章
  - 选中展开：分类 + 来源 + 创建时间 + `[Mark useful]` `[Edit]` `[Delete]`
  - 删除按钮：点击弹出确认对话框（Lucide `AlertTriangle` + `destructive` 按钮）
  - 批量删除：底部 `Delete selected` 按钮

**1.7b `knowledge-panel.tsx`**（右侧 60% 宽度侧面板）：

- 同样使用 `<Sheet>`
- 内容：
  - 索引状态卡片（同 knowledge-card 的扩展版，含完整统计）
  - 搜索框：调 `searchAll(query)` 并只显示 files + insights 结果
  - INSIGHTS 区域：渲染 `knowledgeFacts`（`factScope === 'knowledge'` 的 facts），每条含文本 + 来源文件路径
  - FILES 区域：从 `overview.indexing` 渲染已索引文件数 + 列表（如果 search 有结果则显示搜索匹配的文件）

#### 步骤 1.8：创建全屏覆盖组件

**1.8a `connections-overlay.tsx`**：

- 全屏覆盖（`fixed inset-0 z-50 bg-background`）
- 顶部：`← Connections` 返回按钮 + 搜索输入框
- 内容：复用现有 `use-force-layout.ts` + `graph-entity-node.tsx` + ReactFlow 渲染全尺寸图谱
- 点击实体节点 → 底部展开实体详情（关系 + 观察）
- 搜索：调 `queryGraph({ query })` 并重新渲染图谱

**1.8b `search-overlay.tsx`**：

- 全屏覆盖
- 搜索输入框（自动聚焦，最少 3 字符）
- 3 组结果：MEMORIES / FILES / CONNECTIONS
- 点击 Memory fact → 关闭搜索，打开 memories-panel 并选中
- 点击 File → 调用 `openMemoryFileFromSearch`（复用旧逻辑）
- 点击 Connection entity → 关闭搜索，打开 connections-overlay

#### 步骤 1.9：组装 Dashboard 主页

**新建文件**：`index.tsx`（替代旧的同名文件）

```tsx
export function MemoryPage() {
  const store = useMemoryStore();
  const state = useMemoryPage();

  // 全空 Dashboard → 引导界面
  if (isFullyEmpty(state)) return <EmptyDashboard />;

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto">
      <header> {/* Memory 标题 + Search 按钮 */} </header>

      <MemoriesCard ... />
      <KnowledgeCard ... />
      {state.overview?.graph.entityCount > 0 && <ConnectionsCard ... />}

      {/* 侧面板 */}
      <MemoriesPanel open={store.detailView === 'memories'} onClose={store.closeDetail} ... />
      <KnowledgePanel open={store.detailView === 'knowledge'} onClose={store.closeDetail} ... />

      {/* 全屏覆盖 */}
      {store.detailView === 'connections' && <ConnectionsOverlay onClose={store.closeDetail} ... />}
      {store.detailView === 'search' && <SearchOverlay onClose={store.closeDetail} ... />}
    </div>
  );
}
```

#### 步骤 1.10：验证

- 启动 PC 应用，导航到 Memory 模块
- 确认 Dashboard 正确显示三张卡片
- 确认 Memories 卡片显示 `kind === 'manual'` 的 facts
- 确认 Knowledge 卡片显示索引进度
- 确认 Connections 卡片仅在有数据时显示
- 确认点击 Memories/Knowledge 打开侧面板，点击 Connections 打开全屏图谱
- 确认创建/编辑/删除 fact 正常工作（含确认弹窗）
- 确认搜索覆盖三个域
- 确认 Global Search → Memory 的 deep-link 仍然工作

---

### Phase 2：Memory & Knowledge Tool + System Prompt 注入

> 以下步骤按顺序执行。依赖 Phase 1 完成（IPC 类型已变更）。

#### 步骤 2.1：创建 memory tool 文件

**新建文件**：`apps/moryflow/pc/src/main/agent-runtime/tools/memory-tools.ts`

参考现有 `packages/agents-tools/src/task/task-tool.ts` 的模式，使用 `tool()` from `@openai/agents-core`。

**需要的依赖注入**：

- `memoryApi`（from `@main/memory/index.js`）
- `resolveWorkspaceContext()`（获取 `workspaceId`，复用 `memory-ipc-handlers.ts` 中的 `requireWorkspaceContext` 逻辑）

**定义 factory 函数**：

```typescript
import { tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';

type MemoryToolDeps = {
  getWorkspaceId: () => Promise<string>; // 从 workspace profile 获取
  api: MemoryApi; // memoryApi
};

export const createMemoryTools = (deps: MemoryToolDeps): Tool<AgentContext>[] => [
  createMemorySearchTool(deps),
  createMemorySaveTool(deps),
  createMemoryUpdateTool(deps),
];
```

**memory_search**：

- Zod schema：`{ query: z.string().min(1) }`
- handler：`await deps.api.search({ workspaceId, query, limitPerGroup: 10 })`
- 返回：仅 `groups.facts.items`（personal facts），映射为 `{ id, text, category, updatedAt }`
- 错误处理：catch → 返回 `{ error: 'Memory service unavailable' }`

**memory_save**：

- Zod schema：`{ text: z.string().min(1), category: z.enum(['preference','interest','profile','context']) }`
- handler：`await deps.api.createFact({ workspaceId, text, categories: [category] })`
- 返回：`{ id: fact.id, saved: true }`
- 错误处理：同上

**memory_update**：

- Zod schema：`{ id: z.string().min(1), text: z.string().min(1) }`
- handler：`await deps.api.updateFact({ workspaceId, factId: id, text })`
- 返回：`{ id: fact.id, updated: true }`
- 错误处理：同上

#### 步骤 2.2：创建 knowledge tool 文件

**新建文件**：`apps/moryflow/pc/src/main/agent-runtime/tools/knowledge-tools.ts`

```typescript
export const createKnowledgeTools = (deps: MemoryToolDeps): Tool<AgentContext>[] => [
  createKnowledgeSearchTool(deps),
];
```

**knowledge_search**：

- Zod schema：`{ query: z.string().min(1) }`
- handler：`await deps.api.search({ workspaceId, query, limitPerGroup: 10 })`
- 返回：`groups.files.items`，映射为 `{ title, path, snippet, score }`
- 错误处理：catch → 返回 `{ error: 'Knowledge service unavailable' }`

#### 步骤 2.3：注册 tool 到 Agent Runtime

**文件**：`apps/moryflow/pc/src/main/agent-runtime/index.ts`

- 在 `createAgentRuntime()` 中，找到 toolset 构建位置（`createPcBashFirstToolset()` 调用附近）
- 构造 deps：
  ```typescript
  const memoryToolDeps = {
    getWorkspaceId: async () => {
      const profile = await resolveActiveWorkspaceProfileContext(/* 复用现有 deps */);
      return profile.workspaceId;
    },
    api: memoryApi,
  };
  ```
- 创建 tools 并加入 toolset：
  ```typescript
  const memoryTools = createMemoryTools(memoryToolDeps);
  const knowledgeTools = createKnowledgeTools(memoryToolDeps);
  // 加入 baseTools 数组
  const allTools = [...baseTools, ...memoryTools, ...knowledgeTools, sandboxBashTool, ...];
  ```
- 这些 tool 不需要走 permission wrapper 的特殊处理（自动执行），但仍经过 hook/truncation wrapper

#### 步骤 2.4：System Prompt 注入用户记忆

**文件**：`packages/agents-runtime/src/prompt/build.ts`

- `buildSystemPrompt()` 新增参数 `memoryBlock?: string`
- 在 core prompt 和 platform prompt 之后、customInstructions 之前插入：
  ```typescript
  if (memoryBlock?.trim()) {
    sections.push(memoryBlock);
  }
  ```

**文件**：`apps/moryflow/pc/src/main/agent-runtime/prompt-resolution.ts`

- `resolveSystemPrompt()` 新增参数 `memoryBlock?: string`，透传到 `buildSystemPrompt()`
- 新增辅助函数 `buildMemoryBlock()`：

  ```typescript
  export const buildMemoryBlock = async (deps: {
    getWorkspaceId: () => Promise<string>;
    api: MemoryApi;
  }): Promise<string> => {
    try {
      const workspaceId = await deps.getWorkspaceId();
      const result = await deps.api.listFacts({
        workspaceId,
        kind: 'all', // manual + source-derived
        pageSize: 30,
        // 只取 personal scope 的（后续可由服务端筛选）
      });
      const personalFacts = result.items
        .filter((f) => f.kind === 'manual' || f.sourceType === 'moryflow_chat_session_v1')
        .slice(0, 30);

      if (personalFacts.length === 0) return '';

      const lines = personalFacts.map((f) => `- ${f.text}`).join('\n');
      return [
        '## About This User',
        '',
        'The following are things you know about this user from past interactions.',
        'Use this knowledge to personalize your responses.',
        '',
        lines,
      ].join('\n');
    } catch {
      return ''; // 失败不阻塞对话
    }
  };
  ```

**文件**：`apps/moryflow/pc/src/main/agent-runtime/index.ts`

- 在 `runChatTurn()` 中，调用 `buildMemoryBlock()` 并传入 `resolveSystemPrompt()`：
  ```typescript
  const memoryBlock = await buildMemoryBlock(memoryToolDeps);
  const systemPrompt = resolveSystemPrompt({
    settings: getAgentSettings(),
    basePrompt: selectedAgent?.systemPrompt,
    hook: runtimeHooks?.chat?.system,
    availableSkillsBlock: readAvailableSkillsPrompt(),
    memoryBlock, // 新增
  });
  ```

#### 步骤 2.5：添加 Tool 使用指引到 System Prompt

**文件**：`packages/agents-runtime/src/prompt/core.ts`

在 core prompt 末尾（Safety Boundaries 之后）追加 memory/knowledge tool 使用指引：

```
## Your Tools — Memory & Knowledge

You have memory and knowledge tools. Use them proactively — they significantly
improve the user experience.

### When to use memory_save:
- User expresses a clear preference ("I prefer...", "Don't do...", "Always use...")
- User reveals their role, skills, or professional background
- User mentions an ongoing project, goal, or current focus area
- User shares interests or topics they care about
- SAVE EAGERLY. When in doubt, save it. The user can always delete later.
- Only skip truly ephemeral details (specific error messages, one-off debugging).

### When to use memory_search:
- User references something from a past conversation
- User asks a question where personal context would help
- You want to check if you already know something before asking

### When to use memory_update:
- User's situation has changed (new role, migrated tech stack, etc.)
- A previously saved fact is now outdated
- Search first to find the memory ID, then update

### When to use knowledge_search:
- User asks about their own files, notes, or project content
- User's question could benefit from their existing documentation
- You need specific details from their workspace to give a better answer
- SEARCH PROACTIVELY when the topic relates to the user's workspace.
```

#### 步骤 2.6：验证

- 启动 PC 应用，开始新对话
- 确认 system prompt 中包含 "About This User" 块（如果有记忆的话）
- 对话中说 "I prefer TypeScript over JavaScript" → 确认 AI 调用了 `memory_save`
- 对话中问 "What do you know about me?" → 确认 AI 调用了 `memory_search` 或直接引用注入的记忆
- 对话中问 "What does my design system doc say about colors?" → 确认 AI 调用了 `knowledge_search`
- 在 Memory Dashboard 确认新保存的记忆出现，标有 `New` 徽章
- 确认 memory API 不可用时 tool 返回错误信息而非崩溃

---

### Phase 3：智能记忆管理（远期，不细化）

- `context` 类记忆 30 天自动过期
- `preference` / `interest` / `profile` 持久
- 用户可置顶防过期
- 负面反馈 3 次后隐藏
- 服务端 embedding 级去重

### Phase 4：图谱增强（远期，不细化）

- Connections 卡片从统计摘要升级为可选迷你图谱预览
- 全屏图谱改进：搜索、筛选、实体详情

### Future Exploration

- 对话 → 知识链接
- 记忆 → 文件推荐
- 图谱中的个人记忆实体
- 记忆时间线可视化

---

## 状态与失败矩阵

| 场景                 | Dashboard                    | Tool 调用                                 |
| -------------------- | ---------------------------- | ----------------------------------------- |
| 正常                 | 实时数据                     | 正常执行                                  |
| 离线                 | 缓存 + `[WifiOff] Offline`   | tool 返回错误，AI 告知用户                |
| Memory API 降级      | 缓存 + `Service unavailable` | tool 返回错误，AI fallback 到已注入的记忆 |
| Workspace 切换       | 清空并重新加载               | 新对话重新注入新 workspace 记忆           |
| 账号切换 / 登出      | 清空                         | 不执行                                    |
| Profile 不可用       | 不可用提示                   | 不执行                                    |
| 多设备同一 workspace | 各自独立展示                 | 依赖 Memox 服务端去重                     |

## 隐私与控制

| 控制             | 实现                                              |
| ---------------- | ------------------------------------------------- |
| 全局关闭         | 设置 toggle：关闭后不注册 memory tool，不注入记忆 |
| 手动管理         | Memories 侧面板：查看/编辑/删除（含确认弹窗）     |
| Workspace 隔离   | 所有记忆按 workspaceId 隔离                       |
| Source type 隔离 | `chat_session_v1` 不污染文件搜索契约              |
| New 标记         | AI 保存的记忆在 Dashboard 标 `New` 徽章 24 小时   |

---

## 约束

1. System prompt 注入 top 30 条个人记忆；不足 30 则有多少注入多少
2. Memory / Knowledge tool 全部自动执行，不需用户审批
3. System prompt 中强调积极调用 tool——符合场景就调用，不要吝啬
4. memory_save 只存持久性事实，不存临时调试细节
5. Tool handler 走已有 Memory API client，不引入新的 HTTP 调用链路
6. 破坏性操作（删除记忆）必须有确认弹窗
7. UI 统一 Lucide 图标，禁止 emoji
8. 零历史兼容
9. Global Search 继续并行搜索 Memory（保持现有集成）
10. 成功反馈使用 inline 状态变化，不使用 toast

---

## 实现状态

### Phase 1：UI 重构 + 数据契约补齐 — done（构建期验收通过）

| 步骤                                              | 状态 | 验收                                                                       |
| ------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| 1.1 IPC 类型 `sourceType` + `factScope`           | done | typecheck pass                                                             |
| 1.2 IPC handler `computeFactScope` + `enrichFact` | done | typecheck pass                                                             |
| 1.3 删除 15 个旧组件                              | done | —                                                                          |
| 1.4 `memory-store.ts` Zustand store               | done | typecheck pass                                                             |
| 1.5 `use-memory-page.ts` 页面状态 hook            | done | typecheck pass                                                             |
| 1.6 三个 Dashboard 卡片                           | done | typecheck + lint pass                                                      |
| 1.7 两个侧面板                                    | done | typecheck + lint pass                                                      |
| 1.8 两个全屏覆盖                                  | done | typecheck + lint pass                                                      |
| 1.9 Dashboard 组装                                | done | typecheck + lint pass                                                      |
| 1.10 构建期验证                                   | done | `tsc --noEmit` pass, `vitest run` 913/913 pass, `electron-vite build` pass |

### Phase 2：Memory & Knowledge Tool + System Prompt 注入 — done（构建期验收通过）

| 步骤                                       | 状态 | 验收                                                                       |
| ------------------------------------------ | ---- | -------------------------------------------------------------------------- |
| 2.1 `memory-tools.ts` (search/save/update) | done | typecheck pass                                                             |
| 2.2 `knowledge-tools.ts` (search)          | done | typecheck pass                                                             |
| 2.3 注册到 Agent Runtime                   | done | typecheck pass                                                             |
| 2.4 System Prompt 注入 top 30 记忆         | done | typecheck pass                                                             |
| 2.5 Tool 使用指引                          | done | typecheck pass                                                             |
| 2.6 构建期验证                             | done | `tsc --noEmit` pass, `vitest run` 913/913 pass, `electron-vite build` pass |

### 部署后验收清单（待执行）

以下验收依赖 Moryflow 服务端部署完成（Memory Gateway + Anyhunt Memox 可用）。

#### Dashboard UI 验收

| #   | 场景                    | 操作                             | 预期结果                                                          |
| --- | ----------------------- | -------------------------------- | ----------------------------------------------------------------- |
| D1  | Dashboard 加载          | 导航到 Memory 模块               | 显示 Memories 卡片 + Knowledge 卡片；Connections 仅在有数据时显示 |
| D2  | 全空状态                | 新 workspace，无记忆无索引       | 显示 Brain 图标 + "Your AI doesn't know you yet" 引导界面         |
| D3  | Memories 卡片           | 有手动记忆时                     | 显示最近 5 条，来源图标 + 相对时间；点击 → 侧面板                 |
| D4  | Knowledge 状态机        | 文件索引进行中                   | 显示进度条 + 百分比；完成后切换为 Check 图标                      |
| D5  | Knowledge 错误          | Memox 不可用                     | 红色 AlertCircle + "Indexing failed"                              |
| D6  | 手动创建记忆            | 在输入框输入并回车               | 记忆创建成功，列表刷新                                            |
| D7  | 侧面板编辑              | 选中记忆 → Edit → 修改 → Save    | 更新成功                                                          |
| D8  | 侧面板删除              | 选中记忆 → Delete                | 弹出确认框，确认后删除                                            |
| D9  | 统一搜索                | 搜索关键词                       | 3 组结果（Memories / Files / Connections）                        |
| D10 | Global Search deep-link | Global Search 中点击 Memory fact | 跳转到 Memory 模块，侧面板打开并选中该 fact                       |

#### Tool 集成验收

| #   | 场景               | 操作                                                 | 预期结果                                             |
| --- | ------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| T1  | System Prompt 注入 | 有记忆时开始新对话                                   | system prompt 包含 "About This User" 块              |
| T2  | 无记忆注入         | 无记忆时开始新对话                                   | system prompt 不含记忆块（不占 token）               |
| T3  | memory_save        | 对话中说 "I prefer TypeScript over JavaScript"       | AI 调用 `memory_save`，Dashboard 出现新记忆          |
| T4  | memory_search      | 对话中问 "What do you know about me?"                | AI 调用 `memory_search` 或引用已注入记忆             |
| T5  | memory_update      | 对话中说 "Actually I switched to Go"                 | AI 先 `memory_search` 找到旧记忆，再 `memory_update` |
| T6  | knowledge_search   | 对话中问 "What does my design doc say about colors?" | AI 调用 `knowledge_search`，引用文件内容回答         |
| T7  | Tool 降级          | Memory API 不可用时                                  | tool 返回错误信息，AI 告知用户并继续对话             |
| T8  | New 徽章           | AI 保存记忆后                                        | Dashboard 该记忆标 `New` 徽章（24h）                 |

#### 边界场景验收

| #   | 场景           | 预期结果                                         |
| --- | -------------- | ------------------------------------------------ |
| E1  | Workspace 切换 | Dashboard 清空并加载新 workspace 数据            |
| E2  | 账号登出       | Dashboard 清空                                   |
| E3  | 离线           | Dashboard 显示缓存 + Offline 标签；Tool 返回错误 |
| E4  | 长对话         | 记忆注入不超过 30 条                             |
