---
title: Moryflow PC 左侧 Sidebar 导航方案（Implicit Agent + Modules）
date: 2026-02-10
scope: apps/moryflow/pc
status: implemented
---

<!--
[INPUT]:
- 反馈：不喜欢新增 Nav Rail（多一条工具栏不好看），也不喜欢顶层 Mode（Chat/Workspace/Sites）。
- 目标：回归“单一左侧 Sidebar”的经典交互与视觉，同时保留近期实现里做得好的交互/性能（keep-alive、Portal、Following 滚动等）。
- 约束：不考虑历史兼容；允许破坏式重构；无用代码直接删除；以最佳实践实现为目标（SRP/SSOT）。

[OUTPUT]:
- 单一 Sidebar 的信息架构：顶部 Modules（例如 Sites），下方永远是 Agent 面板（implicit，不提供显式 Agent 顶层入口）。
- Agent 面板内保留 Chat/Workspace 二级切换（复用现有 switcher 样式），并保证轻量切换（keep-alive）。
- 当切到其它模块（如 Sites）时：Agent 面板仍保持原样（不隐藏/不禁用）；AgentSub 显示“历史选中态（略变浅）”；打开类操作会回到 Agent，管理类操作就地生效。
- 文末给出可执行的步骤计划与进度表（后续每完成一步必须同步更新，防止上下文压缩丢信息）。

[POS]: Moryflow PC 左侧 Sidebar 的信息架构与导航语义单一事实来源（不含实现代码）。

[PROTOCOL]:
- 本文为实施后的基准文档：定义语义、验收标准与拆分边界（避免实现漂移）。
- 后续每完成一个执行步骤或调整关键语义，都必须同步更新本文底部“执行计划与进度”表格，防止上下文压缩后丢信息。
-->

# Moryflow PC 左侧 Sidebar 导航方案（Implicit Agent + Modules）

## TL;DR（你已确认的决策）

- 不新增 Nav Rail；只保留一个左侧 Sidebar。
- App 启动永远进入 Agent（implicit，不提供显式 Agent 顶层入口）。
- Sidebar 顶部只显示“其它模块入口”（当前至少 Sites；未来可扩展 Memory/Skills 等）。
- Sidebar 下半区永远是 Agent 面板：
  - Chat/Workspace segmented 永远可见（复用现有 switcher 样式）。
  - destination=agent：segmented 正常选中态。
  - destination!=agent（如 Sites）：segmented 仍显示 agentSub 选中态，但“略变浅”（历史态）；Agent 面板不隐藏、不禁用（避免“为什么突然没了/不能点”的反直觉）。
- 你已确认：destination!=agent 时，Agent 面板依然可见且可交互；打开类点击会切回 Agent。

## 设计目标（最少交互 + 最佳实践）

1. **符合用户习惯**：一个 Sidebar + 顶部模块入口；不引入额外工具栏/抽屉/二级侧栏。
2. **threads/files 都是第一公民**：不靠顶层 Mode，而靠 Agent 面板内 Chat/Workspace 二级切换（用户可快速在 threads 与文件世界间切换）。
3. **语义一致**：顶部 Modules 决定右侧主视图；Agent 面板始终属于 Agent（在其它模块下以“历史态 + 快捷返回”呈现）。
4. **轻量切换（性能不退化）**：切换不得引入明显 remount/闪烁/滚动复位/输入草稿丢失。
5. **零技术债**：不考虑历史兼容；旧的顶层 Mode 与胶水逻辑最终必须删除。

## 导航语义（SSOT：Navigation State）

### 状态模型

- destination：当前主视图目的地（agent / sites / ...）
- agentSub：Agent 面板内二级入口（chat / workspace）

推荐的状态结构（伪类型）：

```text
NavigationState
  destination: 'agent' | 'sites' | ...
  agentSub: 'chat' | 'workspace'
```

不变量（已确认）：

- 启动时固定：destination='agent'
- agentSub 永远存在并持久化（用于记忆上次 `Chat/Workspace` 二级入口；**全局记忆**，不按 workspace(vault) 分开）
- destination!=agent 时，agentSub 进入“历史态展示 + 点击回跳”的语义，而不是“无归属”

### Transition 规则（必须写死，避免实现漂移）

```text
go('sites')                     -> destination='sites'  # 未来可扩展为 go('memory') / go('skills') 等

# Agent 面板（语义事件；UI 不关心 destination）
openThread(threadId)            -> ensureAgent(), then open
openFile(fileId|path)           -> ensureAgent(), then open
setSub('chat'|'workspace')      -> ensureAgent(), then set agentSub
renameThread(threadId, name)    -> rename (destination 不变)
deleteThread(threadId)          -> delete (destination 不变)
moveFile(...)                   -> move (destination 不变)
```

补充约束（做减法，符合直觉）：

- destination!=agent 时，Agent 面板仍然渲染完整 UI（不隐藏、不禁用），以保持肌肉记忆与一致性。
- 仅对“打开类操作”做自动回跳：
  - 点击 Chat/Workspace tab（切回 Agent 并切换到对应 sub）
  - 点击 thread 行/文件项（切回 Agent 并打开）
  - 点击 New thread / New file（切回 Agent 并创建后聚焦）
- “管理类操作”不强制回跳：例如 `...` 菜单、rename/delete、drag & drop、批量操作等在当前 destination 下就地生效（Main View 不切换）。

点击区域规则（避免实现分歧）：

- Open（会回跳 + 打开）只包含：
  - 点击“名称/整行主区域”（包含名称右侧的空白区域）
  - 菜单项中语义为 `Open` / `Go to` / `Reveal` 的条目
- Inline（就地生效，不回跳）包含：
  - 展开/折叠箭头
  - checkbox / 多选相关控件
  - drag handle 与拖拽过程
  - `...` 菜单中的 rename/delete/move 等管理条目

示意（Threads/File Tree 行的点击区）：

```text
Row (thread/file)
+--------------------------------------------------------------+
| [>] [ ]  Name / Main area (OPEN)                      [ ... ]|
|  ^    ^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^ |
|  |    |                 OPEN zone                        inline|
|  |    inline (checkbox)                                     menu|
| inline (expand)                                               |
+--------------------------------------------------------------+
```

为什么不做“整块面板任意点击都回跳”的全局托管：

- 会与 `...` / drag&drop / rename/delete 等管理操作冲突，最终只能写大量例外（`stopPropagation`/白名单/黑名单），实现更脏且更脆。
- 拖拽类交互对事件阶段很敏感（capture/bubble），全局 click 托管容易引入边缘 bug（例如误触回跳、拖拽中断）。
- 语义层托管更简单：UI 只发出语义事件（open/rename/move），Coordinator 统一决定是否需要回跳。

Coordinator（统一托管）的最小伪代码：

```text
dispatch(action):
  if action is Open:
    if destination != 'agent': destination = 'agent'
    run(action)
  else:
    run(action)  # destination 不变
```

## 布局（单一 Sidebar：顶部 Modules + 下方 Agent 面板）

### 总体布局

```text
App Layout
+----------------------+------------------------------+--------------+
| Left Sidebar         | Main View                    | Right panel  |
| (Modules + Agent)    | (destination-driven)         | (optional)   |
+----------------------+------------------------------+--------------+
```

Sidebar 结构：

```text
Left Sidebar
+--------------------------------------------------+
| Modules (global, top)                            |
|  [S] Sites                                       |
|  [M] Memory   (future)                           |
|  [K] Skills   (future)                           |
|  - 竖排 list：icon + text（不需要 tooltip）        |
|  - 只渲染已实现模块入口（Memory/Skills 仅示例）    |
|  - 仅显示非 Agent 模块（Agent 是 implicit）        |
+--------------------------------------------------+
| Workspace row (vault + search)                   |
|  [ Vault selector...................... ] [Search]|
+--------------------------------------------------+
| Agent Panel (always visible & clickable)         |
|  [Chat] [Workspace]  (segmented, always visible) |
|                                                   |
|  if agentSub=chat:                                |
|    - Threads list (keep-alive)                    |
|                                                   |
|  if agentSub=workspace:                           |
|    - 文件树/文件列表 (keep-alive)                  |
+--------------------------------------------------+
```

### destination=agent（默认）

- Main View 渲染 Agent（尽量保持当前整体交互与布局）。
- Modules 顶部入口不高亮（因为 Agent 是 implicit）。
- AgentSub segmented：正常选中态（完全复用现有样式）。

### destination=sites

- Main View 渲染 Sites（独立主视图，不做弹窗/抽屉）。
- Modules：Sites 强高亮。
- Agent 面板仍然显示当前 agentSub 对应内容（你已确认“1”）。
- AgentSub segmented：保留选中态，但“略变浅”（你已确认“1 选中态略变浅”）。

## 高亮逻辑（最少规则，避免误读）

### Modules（顶部）

- destination=sites：Sites 强高亮。
- destination=agent：Modules 区域无选中态（避免引入“隐形 Agent”按钮的错觉）。

### AgentSub（Chat/Workspace segmented）

- destination=agent：正常选中态。
- destination!=agent：历史选中态（略变浅），并且保持可点击。

点击语义（已确认）：

- destination!=agent 时：点击任意 tab（包括当前已选 tab）都会回到 Agent，并切到对应 sub。

高亮真值表：

| 场景                                  | Modules 强高亮 | AgentSub 样式              | 点击 AgentSub 的结果 |
| ------------------------------------- | -------------- | -------------------------- | -------------------- |
| destination=agent, agentSub=chat      | 无             | Chat=正常选中              | 切 sub（留在 Agent） |
| destination=agent, agentSub=workspace | 无             | Workspace=正常选中         | 切 sub（留在 Agent） |
| destination=sites, agentSub=chat      | Sites          | Chat=历史选中（略浅）      | 回到 Agent/Chat      |
| destination=sites, agentSub=workspace | Sites          | Workspace=历史选中（略浅） | 回到 Agent/Workspace |

## 交互规则（你已确认）

1. **从 Sites 回到 Agent**：
   - 打开类操作（Open intents）：
     - 在 destination=sites 时，点击 Chat/Workspace tab、threads 行、文件树项、New thread / New file：
       - 立即切回 destination=agent
       - 并执行打开动作（打开 thread / 打开文件等）
   - 管理类操作（Inline actions）：
     - 在 destination=sites 时，`...` 菜单、rename/delete、drag & drop 等直接就地生效，不切换 Main View。
2. **Agent 内二级切换**：
   - Chat <-> Workspace 必须轻量（keep-alive 语义），不产生明显 remount。
3. **减少 Sidebar 信息噪音**：
   - 任意时刻 Agent 面板只展示一个子视图内容（chat 或 workspace），避免“threads + files 同屏”导致左侧过载。

## Keep-Alive 与性能约束（必须不退化）

> 这部分是“验收标准”，不是实现方式；实现允许重构，但结果不能退化。

- agentSub 切换时：
  - Threads list / Files tree 的 DOM 不反复卸载。
  - Chat 输入草稿、滚动位置不丢（若现有已有该能力）。
- destination 切换（Agent <-> Sites）时：
  - Agent 面板常驻（视觉上不闪）。
  - Main View 切换不出现明显白屏/跳动。
  - 不引入“离开确认弹窗”（Sites 内无重要数据，避免额外交互；Sites 内部局部 UI 状态允许丢失）。

## 模块化边界（SRP，方便删旧代码）

建议拆分（从纯逻辑到 UI）：

1. navigation/state：NavigationState + transitions（纯函数，SSOT）。
2. navigation/persistence：只负责持久化 agentSub（启动 destination 固定 agent，不持久化 destination）。
3. navigation/coordinator：消费 UI intents：
   - Open intents：原子化执行“先切 destination，再执行 intent”（避免各处分散写副作用）。
   - Inline actions：只执行 action（不切 destination）。
4. ui/sidebar/modules-switcher：顶部 Modules UI（不包含业务）。
5. ui/sidebar/agent-panel：Agent 面板 UI（segmented + content），对外只暴露事件（onSelectSub/onOpenThread/onOpenFile...）。
6. ui/main/destination-outlet：按 destination 渲染主视图（Agent / Sites / ...）。

必须删除（无历史兼容）：

- 旧的顶层 Mode（Chat/Workspace/Sites）与其状态、快捷键、分发逻辑。
- 旧的 mode 胶水与 helper 常量（如存在）。
- 不再使用的 Portal host/keep-alive hack（如果已被更清晰的常驻子树替代）。

## 验收清单（无需看代码即可判断）

- 启动永远进入 Agent（且 agentSub 记忆上次 chat/workspace）。
- Sidebar 顶部只有非 Agent 模块入口（至少 Sites）；竖排 icon + text（不需要 tooltip）；无 Nav Rail。
- destination=sites 时：
  - Agent 面板 UI 不隐藏、不禁用（包含 `...` 等管理操作）
  - AgentSub 选中态略变浅
  - 点击打开类操作（tab/列表项）：回到 Agent 并执行动作
  - 点击管理类操作（`...`/drag 等）：就地生效且不切换 Main View
  - 不弹“离开确认弹窗”
- pnpm lint / pnpm typecheck / pnpm test:unit 全通过。

---

## 核心逻辑（实现时不可违反）

1. `destination` 决定 Main View；启动固定 `destination='agent'`。
2. `agentSub` 只属于 Agent 面板：`destination=agent` 为正常选中；`destination!=agent` 为历史选中（略浅）+ 回跳。
3. Agent 面板语义分两类：
   - Open intents（tab/打开 thread/打开文件）：若当前不在 Agent，则先切 `destination='agent'`，再执行打开（保证“点了就是打开”）。
   - Inline actions：不改变 destination，直接就地生效（保证“看见就能用”）。

## 执行计划与进度（必须同步）

> 规则：每完成一个 Step，必须更新下表的 Status/Done at/Git/Notes，避免上下文压缩后丢失实施轨迹。
> Status 只能取：TODO / DOING / DONE / SKIPPED。

| Step | Scope           | Deliverable（验收标准）                                                                      | Status | Done at    | Git    | Notes                                                                                                                              |
| ---- | --------------- | -------------------------------------------------------------------------------------------- | ------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Docs            | 本文更新为“Implicit Agent + Modules”语义稿（含验收与执行计划表）                             | DONE   | 2026-02-10 | staged | -                                                                                                                                  |
| 1    | Navigation      | 新增 NavigationState（destination + agentSub）+ transitions（纯逻辑，无 UI）                 | DONE   | 2026-02-10 | staged | `navigation/state.ts`（ensureAgent/go）                                                                                            |
| 2    | Persistence     | 持久化 agentSub（启动 destination 固定 agent；全局记忆 chat/workspace）                      | DONE   | 2026-02-10 | staged | `lastAgentSub` + IPC + `useNavigation`                                                                                             |
| 3    | Sidebar         | 顶部 Modules（Sites 等，竖排 icon+text，无 tooltip）+ 下方 Agent Panel（segmented 永远可见） | DONE   | 2026-02-10 | staged | Sidebar：ModulesNav + AgentSubSwitcher                                                                                             |
| 4    | Sites Dest      | destination=sites 时主视图渲染 Sites；Agent 面板保留可见 + history style                     | DONE   | 2026-02-10 | staged | Shell 按 destination/agentSub 渲染                                                                                                 |
| 5    | Return-to-Agent | destination!=agent 时：打开类操作回到 Agent 并执行；管理类操作就地生效                       | DONE   | 2026-02-10 | staged | openThread/openFile -> setSub(...)                                                                                                 |
| 6    | KeepAlive       | 切换不 remount：threads/files/chat draft/scroll 不丢                                         | DONE   | 2026-02-10 | staged | ChatPane Portal + Sidebar keep-alive                                                                                               |
| 7    | Cleanup         | 删除旧顶层 Mode/旧入口/旧 helper/死代码（无兼容层遗留）                                      | DONE   | 2026-02-10 | staged | 移除 `use-app-mode`；清理 lastMode IPC；同步更新相关 CLAUDE.md（main/renderer/workspace/sidebar/sites/shared-ipc）                 |
| 8    | Tests           | Vitest：导航状态机 + return-to-agent 关键逻辑回归                                            | DONE   | 2026-02-10 | staged | `navigation/state.test.ts` + `hooks/use-navigation.test.tsx` + `navigation/agent-actions.test.ts`                                  |
| 9    | Verify          | pnpm lint + pnpm typecheck + pnpm test:unit 全通过                                           | DONE   | 2026-02-10 | staged | 根目录三条命令全绿                                                                                                                 |
| 10   | Review          | Code review 修复（a11y/快捷键/健壮性/语义一致性）                                            | DONE   | 2026-02-10 | staged | 移除未消费 isNavigationReady；补齐 tab/tabpanel；New thread/New file 作为 Open intent；快捷键避开输入/IME                          |
| 11   | Polish          | Sidebar 视觉与文案对齐（Sites 置顶；Files 列表样式与 Threads 一致）                          | DONE   | 2026-02-10 | staged | Sites 全局置顶；Workspace 行下移；去掉 Agent 文本；Pages/New page -> Files/New file；Files 行 padding/hover/active 与 Threads 对齐 |
| 12   | Polish          | 列表项截断（Threads/Files/Modules/Vault）：侧栏宽度变化时超出显示省略号                      | DONE   | 2026-02-10 | staged | `min-w-0` + `truncate`；并修复 Radix ScrollArea 内容容器默认 `display: table` 导致宽度按内容扩张的问题                             |
