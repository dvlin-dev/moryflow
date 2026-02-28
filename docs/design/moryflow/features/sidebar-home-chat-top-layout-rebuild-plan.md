---
title: Moryflow PC 侧边栏 Home/Chat 顶部切换重构方案
date: 2026-02-28
scope: apps/moryflow/pc
status: implemented
---

<!--
[INPUT]:
- 当前 Sidebar 的模式切换（Chat/Workspace）位于中段 Workspace 行右侧，入口隐蔽且视觉拥挤。
- 目标参考 Notion 新侧栏布局：顶部显式模式切换；搜索位于对称右侧；新对话固定在底部；设置从侧栏底部迁移到系统顶栏最右。
- 交互确认：Home/Chat 在左、Search 为右侧 icon；Home 保留 Modules（Skills/Sites）；Chat 不显示 Modules，仅显示对话列表。
- 强约束：不做历史兼容；优先根因治理；模块化/单一职责；保持 Store-first。

[OUTPUT]:
- 一个可执行的重构方案：信息架构、状态模型、组件拆分、文件改造清单、测试与验收标准。

[POS]:
- Moryflow PC Sidebar 与 UnifiedTopBar 的交互与结构重构方案（执行完成稿）。
-->

# Moryflow PC 侧边栏 Home/Chat 顶部切换重构方案

## TL;DR

- 把当前侧栏“中段胶囊切换”上移到顶部 Header，改为左侧 `Home | Chat` 两态，右侧放置 `Search icon`。
- 把“新建对话”收敛为侧栏底部统一主操作（无论当前是 Home 还是 Chat）。
- 把设置入口从 `SidebarTools` 迁移到 `UnifiedTopBar` 最右侧（系统栏右上角）。
- 通过状态与组件边界重构一次性收口，删除旧入口与重复动作，避免补丁式叠加。
- `Home` 与 `Chat` 侧栏信息架构分离：Home 保留 Modules + 文件区；Chat 仅保留 Threads 列表（不显示 Modules）。
- 定义强不变量：`destination !== 'agent'` 时强制使用 Home 侧栏布局（确保模块入口始终可达，避免状态冲突）。

## 当前实现与问题定位（基于现有代码）

- 模式切换入口在 `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx` 的 Workspace 行右侧（`AgentSubSwitcher`，固定 `w-[84px]`），视觉优先级低。
- 顶部导航 `ModulesNav` 同时承载 `New thread`、`Search`、`Skills`、`Sites`，全局动作与导航入口混排，信息密度过高。
- “新建对话”存在多个入口（顶部 `New thread`、内容区 Header `+`），行为重复。
- 设置入口位于侧栏底部 `SidebarTools`，与“系统级控制（侧边栏收起、窗口控制）”分离，认知成本高。
- `UnifiedTopBar` 目前只有左侧 Sidebar toggle 与中部 tabs，没有右侧系统动作区。

## 根因分析（为什么会拥挤/隐蔽）

1. 信息层次混叠  
   `导航（Skills/Sites）`、`模式（Chat/Workspace）`、`动作（Search/New thread/Settings）` 混在同一纵向区块，缺少明确分层。
2. 全局动作缺少稳定锚点  
   Search、New thread、Settings 分散在不同区域，用户需要记忆多个位置。
3. 状态语义与 UI 文案不一致  
   代码使用 `agentSub=workspace`，但交互目标实际是“回到 Home 视角 + 文件场景”，语义不够直观。

## 二次评审问题与收口（已同步）

| 级别 | 问题                                                          | 根因                                             | 最佳实践收口动作                                                     | 状态   |
| ---- | ------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- | ------ |
| P0   | `destination` 与 `sidebarMode` 组合可能冲突，导致侧栏展示错乱 | 缺少导航不变量与统一状态转换                     | 建立强不变量 + 单一 transition 入口 + 侧栏渲染矩阵（见下文状态模型） | 已收口 |
| P1   | Skills/Sites 导航后仍停留 Chat 侧栏，模块入口不可见           | 快捷键与 `go()` 只切 destination，未约束侧栏模式 | 规定 `destination!=agent` 强制 Home 侧栏；补快捷键不变量测试         | 已收口 |
| P1   | 旧入口与旧状态键残留，易形成双轨实现                          | 缺少“彻底删除”约束                               | 增加删除清单（组件、状态键、条件分支）并要求一次性清理               | 已收口 |
| P1   | 搜索语义可能分裂成 Home/Chat 两套行为                         | 需求未冻结时引入推测性设计                       | 冻结为“全局搜索，行为与当前一致”，禁止新增分叉语义                   | 已收口 |
| P2   | 实施时组件层直接拼状态，导致补丁蔓延                          | 缺少路由分发层                                   | 新增 `SidebarLayoutRouter` 作为唯一布局分发层，组件仅消费派生结果    | 已收口 |

以上问题已全部落到方案正文对应章节，不再保留“口头约定”。

## 目标与非目标

### 目标

- 顶部 Header 显式模式：左侧 `Home | Chat`，右侧 `Search icon` 对称布局。
- 底部固定 `New chat` 主操作，跨模式一致。
- 设置入口迁移到系统顶栏右上角，与窗口级控制聚合。
- 保留并强化现有 Store-first、Open intent/Inline action 语义，不新增 Context 透传。
- `Home` 与 `Chat` 的侧栏内容严格分层：
  - Home：显示 Modules（Skills/Sites）+ 文件相关内容。
  - Chat：不显示 Modules，仅显示对话列表。

### 非目标

- 不改动聊天、文件树、Sites/Skills 核心业务逻辑。
- 不引入额外顶层模式（保持仅 Home/Chat 两态切换用于侧栏视图）。
- 不保留旧入口兼容层（删除重复入口与死代码）。

## 目标信息架构

```text
Sidebar (Home)
├─ Header
│  ├─ Left: ModeTabs (Home | Chat)
│  └─ Right: Search icon
├─ Header Modules (Skills / Sites)
├─ Content
│  ├─ Workspace selector
│  └─ Files tree
└─ Bottom
   └─ New Chat (primary action)
```

```text
Sidebar (Chat)
├─ Header
│  ├─ Left: ModeTabs (Home | Chat)
│  └─ Right: Search icon
├─ Content
│  └─ Threads list only
└─ Bottom
   └─ New Chat (primary action)
```

`Settings` 从 Sidebar 移除，迁移到 `UnifiedTopBar` 右侧 `TopBarActions`。

## 状态模型重构（单一事实源）

为消除语义歧义，建议直接替换 `AgentSub`：

```ts
type SidebarMode = 'home' | 'chat';

type NavigationState = {
  destination: 'agent' | 'skills' | 'sites';
  sidebarMode: SidebarMode;
};
```

迁移规则：

- 旧 `agentSub='workspace'` -> 新 `sidebarMode='home'`
- 旧 `agentSub='chat'` -> 新 `sidebarMode='chat'`
- `setSub` 重命名为 `setSidebarMode`
- 旧持久化字段 `lastAgentSub` 直接替换为 `lastSidebarMode`（不做兼容读取）

### 状态不变量（必须）

1. `destination !== 'agent'` 时，侧栏渲染必须退回 Home 布局（含 Modules）。
2. `sidebarMode='chat'` 仅在 `destination='agent'` 下可生效。
3. 任何导航事件都必须通过统一 reducer/transition 计算，组件层禁止直接拼装状态。

### 推荐状态转换（伪代码）

```ts
go(destination):
  if destination === 'agent':
    return { destination: 'agent', sidebarMode: prev.sidebarMode }
  return { destination, sidebarMode: 'home' } // 非 agent 强制 home 侧栏

setSidebarMode(mode):
  return { destination: 'agent', sidebarMode: mode } // 切模式即回到 agent
```

### 侧栏渲染矩阵（单一事实源）

```text
if destination !== 'agent'          -> render Home Sidebar
if destination === 'agent' && home  -> render Home Sidebar
if destination === 'agent' && chat  -> render Chat Sidebar
```

## 组件与职责拆分方案

### Sidebar（重构后）

- `sidebar/index.tsx`：只做装配，不直接承载行为分支。
- 新增 `sidebar/components/sidebar-header.tsx`：组合 `ModeTabs + SearchIconAction`。
- 新增 `sidebar/components/sidebar-mode-tabs.tsx`：只处理 Home/Chat 切换与可访问性。
- 新增 `sidebar/components/sidebar-search-action.tsx`：只处理右侧 Search icon 触发。
- 新增 `sidebar/components/sidebar-bottom-primary-action.tsx`：固定 `New chat` 按钮。
- `sidebar/components/modules-nav.tsx`：移除 `New thread` 与 `Search`，仅保留模块导航（Skills/Sites），且仅在 Home 模式显示。
- 删除 `sidebar/components/sidebar-tools.tsx`：底部区域收敛为单一主操作，不再承载同步状态/设置入口。
- 新增 `sidebar/components/sidebar-layout-router.tsx`：根据 `destination + sidebarMode` 统一路由 Home/Chat 侧栏（Chat 分支仅渲染 Threads），避免散落条件分支。

### UnifiedTopBar（重构后）

- `unified-top-bar/index.tsx`：新增右侧 `TopBarActions` 插槽。
- 新增 `unified-top-bar/components/top-bar-actions.tsx`：集中右上角系统动作。
- 新增 `unified-top-bar/components/open-settings-button.tsx`：设置入口，调用 `openSettings('account')`。

## 文件级改造清单（执行结果）

### 新增

- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-header.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-mode-tabs.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-search-action.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-bottom-primary-action.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-layout-router.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-layout-router-model.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-layout-router-model.test.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/components/top-bar-actions.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/components/open-settings-button.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/components/top-bar-actions.test.tsx`

### 修改

- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/const.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/chat-threads-list.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/modules-nav.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/index.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/const.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/agent-actions.ts`
- `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.ts`
- `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.test.tsx`
- `apps/moryflow/pc/src/renderer/workspace/navigation/state.test.ts`
- `apps/moryflow/pc/src/main/workspace-settings.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`

### 删除

- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/agent-sub-switcher.tsx`（由 `sidebar-mode-tabs.tsx` 取代）
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/agent-sub-panels.tsx`（由 `sidebar-layout-router.tsx` 取代）
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-section-header.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-tools.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/search-dialog/`（整目录）

## 交互与行为约束

- Header 中点击 `Home/Chat`：始终走 Open intent，回到 `destination='agent'` 并切换 `sidebarMode`。
- `Search` 在 Header 右侧始终以 icon 形式展示（不显示文字）。
- `Search` 为全局搜索入口，行为与当前版本保持一致（不拆分 Home/Chat 两套搜索语义）。
- `Modules`（Skills/Sites）只在 Home 模式显示；Chat 模式完全不显示 Modules 区。
- `New chat` 固定在侧栏底部，始终可见且为唯一“新建对话”主入口。
- 顶栏设置按钮始终在最右侧，且为 `window-no-drag` 可点击区。
- `Cmd/Ctrl+3`、`Cmd/Ctrl+4`（Skills/Sites）触发后必须落到 Home 侧栏布局（不允许保留 Chat 侧栏）。

## 测试与验收

本改造属于 **L2（高风险）**：跨导航状态、侧栏布局、系统顶栏交互。

### 必测

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`

### 需要新增/调整的回归测试

1. `use-navigation`
   - `lastSidebarMode` 持久化与恢复
   - `Cmd/Ctrl+1/2/3/4` 快捷键映射与不变量（3/4 后强制 Home 侧栏）
   - `go()` / `setSidebarMode()` 状态转换单测（含 destination!=agent 场景）
2. `Sidebar`
   - Header 模式切换触发正确 intent
   - 渲染矩阵：`skills/sites` 必渲染 Home Sidebar
   - 底部 `New chat` 在 Home/Chat 均可触发创建
3. `UnifiedTopBar`
   - 右上角设置按钮触发 `openSettings('account')`
4. `sidebar-panels-store`
   - 字段重命名后快照同步稳定性（等价快照不重复 set）

### 验收标准（与需求一一对应）

- 侧栏顶部可见左侧 `Home/Chat` 与右侧 `Search icon`，布局对称。
- Home 模式显示 Modules（Skills/Sites）与文件区。
- Chat 模式不显示 Modules，内容区只显示 Threads 列表。
- `destination=skills/sites` 时侧栏稳定为 Home 布局（可见 Modules）。
- 侧栏底部存在固定 `New chat`，切换 Home/Chat 不消失。
- 设置按钮不再出现在侧栏底部，而在系统顶栏最右侧可点击。
- 旧的重复入口（顶部 `New thread`、中段隐蔽切换）已删除。

## 分步实施计划

1. 状态层重构：`AgentSub -> SidebarMode`，替换类型与持久化键。
2. 导航状态机重构：落地 `go()/setSidebarMode()` 不变量，删除组件层直接拼状态。
3. Sidebar 结构重构：引入 `Header/Content/Bottom` 三段 + `SidebarLayoutRouter`，删除旧 switcher。
4. 顶栏动作重构：引入 `TopBarActions`，迁移设置按钮。
5. i18n 与快捷键同步：文案、tooltip、快捷键描述更新。
6. 回归测试补齐并跑 L2 闸门。
7. 清理死代码与文档回写（CLAUDE/docs 索引同步）。

## 已确认决策（2026-02-28）

1. `Home` 直接替代当前 `Workspace` 作为模式文案。
2. `Modules` 放在侧边栏 Header 区，但仅在 Home 模式显示。
3. 侧栏底部采用固定 `New chat` 主操作。
4. `Search` 位于 Header 右侧，使用 icon 形态（非文字）。
5. `Search` 作为全局搜索入口，行为与当前版本保持一致。

## 彻底删除清单（禁止补丁共存）

- 删除 `agent-sub-switcher` 及其样式/测试残留。
- 删除 `ModulesNav` 内 `New thread` 与 `Search` 入口。
- 删除 Sidebar Header 中与旧 `Workspace` 文案绑定的分支逻辑。
- 删除 `lastAgentSub` 读取/写入与 IPC key，替换为 `lastSidebarMode`。
- 删除任何 `agentSub === 'workspace'` 的条件分支与兜底映射。

## 按步骤执行计划（最终执行版）

> 说明：以下是实施阶段唯一执行清单。执行时必须严格按顺序推进，不允许跳步并行。

| 步骤   | 执行项                                                                                        | 产出物                                                            | 状态 |
| ------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| Step 1 | 导航状态重构：`AgentSub -> SidebarMode`，替换类型、状态转换与持久化 key（`lastSidebarMode`）  | `navigation/state.ts`、`use-navigation.ts`、相关 store 与测试更新 | DONE |
| Step 2 | 落地导航不变量：`destination!=agent` 强制 Home 侧栏；新增渲染矩阵与 reducer/transition 单入口 | `go()/setSidebarMode()` 单测通过；`skills/sites` 场景行为稳定     | DONE |
| Step 3 | 侧栏结构重构：实现 `SidebarLayoutRouter` + `Header/Content/Bottom` 三段；Home/Chat 双布局拆分 | `sidebar-*` 新组件落地；`agent-sub-switcher` 退场                 | DONE |
| Step 4 | Header 交互收口：左侧 `Home/Chat` + 右侧 `Search icon`；Search 保持全局语义一致               | Header 交互回归通过；无文本 Search 入口残留                       | DONE |
| Step 5 | Home/Chat 内容分离：Home 显示 Modules + 文件区；Chat 仅 Threads 列表（无 Modules）            | `modules-nav` 条件渲染收口；Chat 侧栏纯对话列表                   | DONE |
| Step 6 | 底部主操作收口：固定 `New chat`（底部仅保留单一主操作）                                       | 底部动作统一；顶部/中段重复新建入口删除                           | DONE |
| Step 7 | 顶栏设置迁移：`UnifiedTopBar` 右上角新增设置入口；Sidebar 设置入口删除                        | `TopBarActions`/`open-settings-button` 落地                       | DONE |
| Step 8 | 全量清理：删除旧入口、旧状态键、旧条件分支与死代码；补齐 i18n 文案                            | 删除清单全部完成；无双轨实现残留                                  | DONE |
| Step 9 | 回归验证与验收：执行 L2 闸门并逐条验收                                                        | `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全通过          | DONE |

## 行为准则（强制）

1. 每完成一个 Step，必须立即回写本文件的“状态”列（`TODO -> IN_PROGRESS -> DONE`）与关键结果。
2. 只有当前 Step 标记为 `DONE`，才能开始下一个 Step。
3. 任一步出现阻塞，先在本文件记录“阻塞原因/影响/决策”，再继续推进。
4. 禁止补丁式修复：不得通过兼容分支、临时兜底、重复映射绕过当前 Step。
5. 所有行为变更必须有对应测试或回归验证记录；无验证不允许标记 `DONE`。
6. 全部 Step 完成后，再统一执行一次“删除清单”复核，确认无旧路径残留。

## 执行记录（2026-02-28）

### Step 1 完成记录（2026-02-28）

- 变更文件：`navigation/state.ts`、`hooks/use-navigation.ts`、`main/workspace-settings.ts`、`main/app/ipc-handlers.ts`、`preload/index.ts`、`shared/ipc/desktop-api.ts`。
- 关键决策：状态语义统一为 `SidebarMode = home/chat`，持久化键统一为 `lastSidebarMode`，不保留 `lastAgentSub` 兼容读取。
- 测试/验证：`navigation/state.test.ts`、`hooks/use-navigation.test.tsx` 已同步通过。
- 风险与后续：旧键残留风险转入 Step 8 删除清单统一复核。

### Step 2 完成记录（2026-02-28）

- 变更文件：`navigation/state.ts`、`navigation/agent-actions.ts`、`hooks/use-navigation.ts`、对应测试文件。
- 关键决策：`go(destination)` 在 `destination !== 'agent'` 时强制回落 `sidebarMode='home'`；`setSidebarMode(mode)` 统一回到 `destination='agent'`。
- 测试/验证：快捷键与状态转换回归通过（`Cmd/Ctrl+3/4` 强制 Home 侧栏）。
- 风险与后续：组件层不再拼装 destination/sidebarMode 组合，后续由 Router 单点消费。

### Step 3 完成记录（2026-02-28）

- 变更文件：`sidebar/index.tsx`、`sidebar-layout-router.tsx`、`sidebar-layout-router-model.ts`、`sidebar-header.tsx`、`sidebar-mode-tabs.tsx`、`sidebar-search-action.tsx`、`sidebar-bottom-primary-action.tsx`。
- 关键决策：侧栏分层固定为 Header/Content/Bottom，内容分发统一由 `SidebarLayoutRouter` 负责。
- 测试/验证：新增 `sidebar-layout-router-model.test.ts`，覆盖 Home/Chat 渲染矩阵。
- 风险与后续：后续仅允许在 Router 模型层新增布局分支，禁止索引组件分散条件渲染。

### Step 4 完成记录（2026-02-28）

- 变更文件：`sidebar-header.tsx`、`sidebar-mode-tabs.tsx`、`sidebar-search-action.tsx`、`sidebar/index.tsx`。
- 关键决策：Header 左侧仅保留 `Home/Chat`，右侧 `Search icon` 统一触发 `openCommandPalette()`（全局搜索语义）。
- 测试/验证：UI 回归和单测通过，无文本 `Search` 入口残留。
- 风险与后续：搜索逻辑单轨化后，后续功能扩展需先更新全局搜索面板而非侧栏分叉。

### Step 5 完成记录（2026-02-28）

- 变更文件：`modules-nav.tsx`、`chat-threads-list.tsx`、`sidebar-layout-router.tsx`。
- 关键决策：Home 显示 Modules + Files；Chat 仅显示 Threads，不展示 Skills/Sites。
- 测试/验证：`sites/index.test.tsx` 与 sidebar 相关回归通过，`skills/sites` 导航均落 Home 侧栏。
- 风险与后续：保持 `Modules` 仅在 Home 渲染，防止模式语义回退。

### Step 6 完成记录（2026-02-28）

- 变更文件：`sidebar-bottom-primary-action.tsx`、`sidebar/index.tsx`、`modules-nav.tsx`。
- 关键决策：`New chat` 固定到侧栏底部作为唯一主入口；中上部重复入口全部删除。
- 测试/验证：Home/Chat 两种布局下均可触发新会话创建。
- 风险与后续：新建会话交互统一走底部主入口，避免入口分裂。

### Step 7 完成记录（2026-02-28）

- 变更文件：`unified-top-bar/index.tsx`、`unified-top-bar/components/top-bar-actions.tsx`、`unified-top-bar/components/open-settings-button.tsx`、`sidebar/index.tsx`。
- 关键决策：设置入口迁移到顶栏右上角；侧栏底部仅保留 `New chat` 主操作。
- 测试/验证：新增 `top-bar-actions.test.tsx`，验证 `openSettings('account')` 触发正确。
- 风险与后续：系统级动作统一收口到顶栏右侧，避免与侧栏业务操作混排。

### Step 8 完成记录（2026-02-28）

- 变更文件：删除 `agent-sub-switcher.tsx`、`agent-sub-panels.tsx`、`sidebar-section-header.tsx`、`sidebar-tools.tsx`、`search-dialog/*`；并清理旧 `AgentSub` 与 `lastAgentSub` 链路。
- 关键决策：不保留兼容桥接，直接删除旧入口与旧协议，杜绝双轨实现。
- 测试/验证：代码扫描确认无旧 key/旧通道残留（文档除外）。
- 风险与后续：新增功能必须基于 `SidebarMode` 与 `SidebarLayoutRouter` 单一事实源。

### Step 9 完成记录（2026-02-28）

- 变更文件：全链路改造文件 + 测试文件。
- 关键决策：按 L2 闸门完成最终验收。
- 测试/验证：`pnpm lint` 通过；`pnpm typecheck` 通过；`pnpm --filter @moryflow/pc test:unit` 通过（56 files / 176 tests）；`pnpm test:unit` 通过（turbo 20/20 successful）。
- 风险与后续：当前变更已闭环，无遗留阻塞；进入 UI 细节体验验收阶段。

## Code Review 问题补充（2026-02-28）

| 级别 | 问题                                                          | 根因                                             | 收口动作                                                                                               | 状态 |
| ---- | ------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---- |
| P1   | Home 侧栏 `Files` 区缺少显式创建入口（仅剩右键菜单）          | 重构时把创建入口与标题解耦后未补齐 Header 动作位 | 恢复历史 `+` 下拉创建菜单（`New file` / `New folder`），复用原有样式与 root create action 逻辑         | DONE |
| P3   | `renderer/CLAUDE.md` 仍保留旧 `agentSub(Chat/Workspace)` 语义 | 文档未随状态模型重构同步                         | 将导航描述统一更新为 `destination + sidebarMode(home/chat)`，并补充非 agent 场景强制 Home 的不变量说明 | DONE |

### Follow-up 执行记录（2026-02-28）

- P1 落地文件：`sidebar-layout-router.tsx`（Files 标题行接回旧入口）、`sidebar-create-menu.tsx`（恢复历史 `+` 下拉创建菜单）。
- P1 样式/交互收口：移除新造的双图标按钮实现，确保创建入口样式与旧版一致。
- P3 落地文件：`apps/moryflow/pc/src/renderer/CLAUDE.md`（移除旧 `agentSub` 语义，统一为 `destination + sidebarMode`）。
- 底部操作区收口：移除 `Sync unavailable` 与分割线，侧栏底部仅保留 `New chat` 胶囊按钮，icon 统一为 `BadgePlus` 且文字/图标居中。
- 验证结果：`pnpm --filter @moryflow/pc typecheck` 通过；`pnpm --filter @moryflow/pc test:unit` 通过（56 files / 176 tests）。
