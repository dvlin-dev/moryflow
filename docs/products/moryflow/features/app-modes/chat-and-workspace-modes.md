---
title: Moryflow PC App Modes 方案（Legacy: Chat / Workspace / Sites）
date: 2026-02-10
scope: apps/moryflow/pc
status: superseded
---

<!--
[INPUT]:
- 现状：启动时必须创建/选择目录（Vault Onboarding），否则无法进入主界面；AI Chat 既有“右侧面板”也有工具 Tab（Mory AI）入口；左侧 Sidebar 目前偏“文件树”。
- 诉求：引入顶层 Mode（Chat / Workspace / Sites），默认进入 Chat；并全面参考你提供的参考图，复刻左侧 Sidebar 的结构与交互（右上角用户/升级入口不照搬，仍保持设置入口在左下角）。
- 约束：Chat 与 Workspace/Sites 共享同一个工作区目录（Workspace folder），Chat 需要能写入文件，因此必须绑定 Workspace；底层逻辑尽量复用现有实现（主要做 UI/信息架构重排）。

[OUTPUT]:
- 三个 Mode（Chat / Workspace / Sites）的信息架构、布局与交互规范（Notion 风格、C 端友好）。
- 首次启动：自动创建默认 Workspace（名为 `workspace`），跳过“必须手动选择/创建目录”的阻塞流程；同时保留用户切换/自选目录能力。
- 不考虑历史兼容（当前不存在真实历史用户），按最新形态直接重构。

[POS]: Moryflow PC 顶层导航（Mode）与 Sidebar 复刻方案的单一事实来源。

[PROTOCOL]:
- 本文为讨论稿；默认 Workspace 路径策略已确认（见“首次启动：自动创建默认 Workspace folder”）。
- 本文记录 2026-02-08 版本的旧顶层 Mode 设计；已被新的导航层级替代（见 `docs/products/moryflow/features/app-modes/agent-sites-nav-hierarchy.md`）。
-->

# Moryflow PC App Modes 方案（Chat / Workspace / Sites）

> 本文为历史实现记录：顶层 `Chat / Workspace / Sites` 已被新的导航层级替代（顶部 Modules（例如 Sites） + Agent 面板 implicit + Agent 内二级 `Chat / Workspace`）。
> 最新方案见：`docs/products/moryflow/features/app-modes/agent-sites-nav-hierarchy.md`。

## TL;DR（你已确认的决策）

- 顶层 Mode：`Chat` + `Workspace` + `Sites`（用户可见标签为英文）。
- 默认进入：`Chat`。
- 三个 Mode 共享同一个 **active** `Workspace folder`（工作区目录，决定文件读写/工具执行的落点）；`Chat` 的 threads **全局共享**（不按 workspace 隔离），但 Chat 仍需要绑定当前 active workspace（因为对话可能写入文件与素材）。
- 移除旧入口：不再保留 `Mory AI` 工具 Tab（由 `Chat` Mode 取代）。
- 首次启动：如果用户未手动创建/选择目录，自动创建默认目录，目录名固定为 `workspace`；同时保留后续“切换/选择/创建 Workspace”的入口。
- `Sites` 作为第三个“浅 Mode”：底层仍是同一个 Workspace folder，只切换 UI 工作台入口（发布/站点管理）。
- 不考虑历史兼容：按最新形态直接做重构/删除旧入口与旧导航。
- UI 方向：全面参考你提供的参考图，尤其复刻左侧 Sidebar 的结构（设置入口仍在左下角，保持你现有规范）。

## 行为准则（强制）

1. **不考虑历史兼容**：不写迁移/兼容层，不保留旧入口，不维护旧配置读写逻辑（假设当前不存在真实历史用户）。
2. **最佳实践优先**：为了可维护性与一致性，允许进行破坏式重构与删除冗余代码（SRP/OCP/单一事实来源优先）。
3. **Git 提交约束**：AI Agent 不得擅自执行 `git commit` / `git push`；必须在用户明确指令后才可提交/推送。未获批准时改动保持未提交状态（允许放入暂存区供 review）。
4. **进度必须同步到本文件**：每完成一个执行步骤，必须更新“执行计划与进度”表格中的 `Status/Done at/Git/Notes`，避免上下文压缩后丢失实施轨迹。
5. **模块化 + 单一职责（SRP）**：发现某个组件/Hook/模块职责过载时，必须拆分为更小的可复用单元（避免把 Mode/Sidebar/Chat/Sites 逻辑继续堆进单文件）。

## 术语对齐（避免“Workspace”歧义）

你选择了 `Workspace` 同时作为：

- 一个 **Mode 名**：`Workspace Mode`（以文件/页面组织与编辑为主的工作台）
- 一个 **存储上下文**：`Workspace folder`（一个真实目录，承载文件、对话、发布配置等）

为避免文档与实现混淆，本文约定：

- **Mode**：`Chat Mode` / `Workspace Mode` / `Sites Mode`
- **目录**：`Workspace folder`（工作区目录）
- **内容实体**：
  - `Thread`：对话线程（**全局共享**，不按 Workspace folder 隔离）
  - `Page/File`：页面/文件（属于某个 Workspace folder）

> 你提到“模式很浅，只是 UI 上的入口，底层都没变”。这里的 Mode 就是这个定位：**同一 Workspace folder，不同工作台布局与默认动作集**。

### Thread 与 Workspace folder 的关系（你已确认）

- `Thread` 列表是全局的：切换 `Workspace folder` 不会切换 threads。
- 但 `Chat` 仍需要一个 active `Workspace folder`：
  - 工具写入文件/素材、导出内容、Sites 发布配置等，都必须落在某个目录里。
  - 因此 Chat Mode 顶部仍保留 Workspace Selector，让用户明确“当前写入上下文”。

## 技术方案（工程落地）

> 目标：在不引入“历史兼容负担”的前提下，把现有 PC 工作区壳层升级为 Mode-aware，同时复用现有 Vault/Chat/Sites 能力。

### 1) Mode 状态（Single Source of Truth）

- 定义 `AppMode = 'chat' | 'workspace' | 'sites'`
- 状态放在渲染进程的 Workspace Shell 层（`DesktopWorkspace` 之上或内部），并持久化：
  - 默认：`chat`
  - 持久化建议：主进程 `workspace-settings`（electron-store）新增 `lastMode`（按 vaultPath 或全局二选一）
- 必须支持快捷键切换：`Cmd+1/2/3`（并保证不会与现有 Command Palette 热键冲突）

### 2) 默认 Workspace 自动创建（macOS：`~/Documents/Moryflow/workspace`）

原则：

- App 启动后应尽快确保存在一个 active Workspace folder，使 Chat Mode 无阻塞可用。
- “自动创建”必须是幂等的（重复调用不应创建多个 workspace）。
- 自动创建后需要完成与 `vault:setActiveVault` 等价的副作用：
  - 广播 activeVaultChanged
  - 启动 vault watcher
  - 初始化 cloudSyncEngine

建议实现（最佳实践）：

- Main 新增 IPC：`vault:ensureDefaultWorkspace`
  - 只在 `getActiveVaultInfo()` 为空时执行创建/激活逻辑
  - 使用 `app.getPath('documents')` 计算 parentPath，并创建 `Documents/Moryflow/workspace`
  - 调用现有 `addVault()` 或 `createVault()`，并走“激活 + watcher + cloud sync init + broadcast”流程
- Renderer 在启动 hydrate 阶段调用：
  1. `vault:ensureDefaultWorkspace`
  2. `vault:getActiveVault`（拿到最终 active vault）

### 3) UI Shell 改造：从“工具 Tab”切换到“Mode”

需要删除/替换的旧结构（不做兼容）：

- `AI_TAB_ID` + `SITES_TAB_ID`（`apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/helper.ts`）
- `handleOpenAITab` / `handleOpenSites`（`apps/moryflow/pc/src/renderer/workspace/handle.ts`）
- 侧边栏旧导航 `SidebarNav`（Search/Mory AI/Sites）

新的结构（建议组件边界）：

- `DesktopWorkspaceShell`（Mode-aware）
  - `LeftSidebar`（同一骨架，按 Mode 替换内容区）
  - `MainView`（Chat / Workspace / Sites 三套视图之一）
  - `RightPanel`（Workspace 默认显示；Chat 默认隐藏；Sites 可选折叠）

### 4) 左侧 Sidebar 组件拆分（便于复刻参考图）

建议把 Sidebar 拆成“骨架 + 内容区”两层，避免现有 `Sidebar` 组件继续膨胀：

- `SidebarShell`
  - `WorkspaceSelectorRow`：复用/改造现有 `VaultSelector`（UI 文案改为 Workspace）
  - `GlobalSearchEntry`：输入框样式的 button（点击打开 Command Palette 或 SearchDialog）
  - `ModeSwitcher`：3 个 icon pill（Chat/Workspace/Sites）
  - `SectionHeader`：标题 + actions（Search；Create 按 mode 决定是否显示）
  - `SectionContent`：按 Mode 渲染 Threads / Pages tree / Sites list
  - `BottomTools`：复用现有 `SidebarTools`（左下角设置入口保持不变）

### 5) Chat Mode：线程列表 Sidebar + 对话主区

- 线程数据复用 `useChatSessions`（已存在：`apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts`）
- Sidebar 行为（Notion 风格）：
  - click：切换 active session
  - hover：显示 `…`（rename/delete）
  - 新建：`desktopAPI.chat.createSession()`
- 对话主区：
  - 复用现有 `ChatPane` 的 conversation/input 组件
  - 把“右侧面板折叠按钮”从 Chat 主区移除或隐藏（避免出现不合语义的 PanelRight 图标）
  - 布局约束（对齐竞品观感）：
    - 内容列最大宽度 `720px`，超出后居中显示
    - 小屏自动撑满可用宽度（仍遵守最大宽度）
    - 左右/顶部保留 `2em` padding（避免内容贴边）
    - 底部外层 padding 使用 `calc(2em - p-3)`：抵消输入区 Footer 自带的 `p-3`，避免底边距叠加过大（视觉上仍接近 `2em`）
  - **ChatPane 单实例（性能关键）**：Chat/Workspace/Sites 之间复用同一个 ChatPane，通过 Portal 在不同 Host 之间“移动 DOM”实现无 remount。
    - 必须 `createPortal(children, portalRoot)`，并把 `portalRoot` append 到 host；禁止直接 `createPortal(..., host)`（否则 host 下会多出一个 portalRoot sibling，Chat/Sites 在 flex 布局下会被挤到右侧且切换时 remount 变卡）。
    - Host 只做“壳容器”，不要用 `flex` row 承载内容（避免 flex item shrink-to-fit 导致内容不占满）。

### 6) Workspace Mode：复用现有三栏（文件/编辑/右侧助手）

- 中间 Editor、右侧 Assistant Panel 复用现有逻辑
- 左侧 Sidebar 改为新骨架后，把文件树挂在 `SectionContent`（Pages）

### 7) Sites Mode：复用现有 `SitesPage`，入口提升为 Mode

- 主区直接渲染 `SitesPage`
- `SitesPage` 的 `onBack` 在 Sites Mode 中不再需要：
  - 方案 A：让 `onBack` optional（Sites Mode 不显示 back）
  - 方案 B：`onBack` 切回 Workspace Mode（行为更清晰）

### 8) 测试与验收（强制）

- 单测（Vitest）：
  - `ensureDefaultWorkspace` 幂等性与错误回退
  - Mode 状态机（默认 chat，快捷键切换，持久化读写）
- 验收命令（必须全绿）：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`

## 执行计划与进度（必须同步）

> 规则：每完成一个 Step，必须更新本表的 `Status/Done at/Git/Notes`。Status 只能取：`TODO` / `DOING` / `DONE` / `SKIPPED`。`Git` 列建议填：`staged` / `committed` / `pushed`（或填写 commit hash）。

| Step | Scope    | Deliverable（验收标准）                                                                             | Status | Done at    | Git         | Notes                                                                                            |
| ---- | -------- | --------------------------------------------------------------------------------------------------- | ------ | ---------- | ----------- | ------------------------------------------------------------------------------------------------ |
| 0    | Docs     | 本文补齐技术方案 + 执行计划表（含行为准则与进度同步规则）                                           | DONE   | 2026-02-08 | staged      | -                                                                                                |
| 1    | Main     | 新增 `vault:ensureDefaultWorkspace`（macOS 默认 `~/Documents/Moryflow/workspace`），幂等可重复调用  | DONE   | 2026-02-08 | staged      | IPC + preload + renderer hydrate                                                                 |
| 2    | Main     | `vault:ensureDefaultWorkspace` 完成激活副作用：broadcast + watcher + cloudSync init                 | DONE   | 2026-02-08 | staged      | broadcast + watcher + cloudSyncEngine.init                                                       |
| 3    | Renderer | 引入 `AppMode`（chat/workspace/sites）+ 快捷键 `Cmd+1/2/3` + 持久化 `lastMode`                      | DONE   | 2026-02-08 | staged      | main store + IPC + preload + renderer hook                                                       |
| 4    | Renderer | Shell 改造：以 Mode 渲染三套主视图；删除 `AI_TAB_ID`/`SITES_TAB_ID` 入口与逻辑                      | DONE   | 2026-02-08 | staged      | 移除工具 tab；Workspace Mode 才显示右侧面板                                                      |
| 5    | Renderer | Sidebar 重构为“骨架 + 内容区”（WorkspaceSelector/Search/ModeSwitcher/Section/BottomTools）          | DONE   | 2026-02-08 | staged      | skeleton 落地；按 Mode 切换 Section 框架                                                         |
| 6    | Renderer | Chat Mode：Sidebar Threads 列表（select/rename/delete/new）+ 主区对话（隐藏不合语义的折叠按钮）     | DONE   | 2026-02-08 | staged      | 线程列表 + ChatPane `variant=mode`（无 Header）                                                  |
| 7    | Renderer | Workspace Mode：Files tree 挂载到新 Sidebar；Editor+Assistant 复用并通过回归检查                    | DONE   | 2026-02-08 | staged      | 回归：`pnpm --filter @anyhunt/moryflow-pc test:unit` 通过                                        |
| 8    | Renderer | Sites Mode：提升 `SitesPage` 为 Mode 主视图；处理 `onBack`（optional 或切回 Workspace）             | DONE   | 2026-02-08 | staged      | Sites Mode 去除无意义 back 语义；Sidebar 创建动作按 Mode 收敛                                    |
| 9    | Cleanup  | 删除旧组件与死代码（旧 SidebarNav、旧工具 Tab、旧 helper 常量等），不留兼容层                       | DONE   | 2026-02-08 | staged      | 清理确认：旧 Tab/nav/helper 无引用；同步更新相关 CLAUDE.md                                       |
| 10   | Tests    | 补齐/更新 Vitest 用例；`pnpm lint/typecheck/test:unit` 全通过                                       | DONE   | 2026-02-08 | staged      | 新增单测 + 全仓 `pnpm lint/typecheck/test:unit` 通过                                             |
| 11   | Docs     | 文档与实现一致：threads 全局共享；补充“AI 提交约束（需用户批准）”准则                               | DONE   | 2026-02-08 | staged      | threads 不按 workspace 隔离；提交约束与根 CLAUDE.md 对齐                                         |
| 12   | Main     | 安全边界：修复 `ensureWithinVault()` 路径校验（防 startsWith 绕过）                                 | DONE   | 2026-02-08 | staged      | 使用 `path.relative` 方案，阻止 Vault 外读写/移动/删除                                           |
| 13   | Renderer | A11y/HTML：修复 Threads 列表的嵌套交互元素（button/input 嵌套）                                     | DONE   | 2026-02-08 | staged      | 改为 row 容器 + 主按钮 + actions 按钮，不嵌套                                                    |
| 14   | Main     | 行为一致：`vault:ensureDefaultWorkspace` 在 active 分支也启动 watcher（与 doc 一致）                | DONE   | 2026-02-08 | staged      | active 存在时也 `scheduleStart(active.path)`                                                     |
| 15   | Cleanup  | 删除无用 IPC：移除 `vault:getRecent` handler + preload bridge + DesktopApi typing                   | DONE   | 2026-02-08 | staged      | 确认无引用后删除，减少 IPC 面积                                                                  |
| 16   | Cleanup  | 代码清理：import 顺序、无用 props（SitesPageProps.onBack）、用户可见中文文案转英文                  | DONE   | 2026-02-08 | staged      | 遵循 SRP；不做过度设计                                                                           |
| 17   | QA       | 回归校验：`pnpm lint` + `pnpm typecheck` + `pnpm test:unit` 全通过                                  | DONE   | 2026-02-08 | staged      | 全绿（本地非 CI 环境会触发 better-sqlite3 rebuild）                                              |
| 18   | Renderer | Sidebar 状态统一：宽度/收起状态在 Chat/Workspace/Sites 间共享（不因 mode 切换重置）                 | DONE   | 2026-02-08 | staged      | Resizable panels 结构常驻；非 Workspace 时折叠右侧 panel                                         |
| 19   | Renderer | Sidebar 只保留一个 `+`：移除顶部 `+`；Chat=New thread；Workspace=New file/folder 菜单；Sites 无 `+` | DONE   | 2026-02-08 | staged      | 创建入口收敛到 Section Header；按 mode 渲染 actions                                              |
| 20   | Renderer | Mode Switcher 交互复刻参考图：segmented pill（选中态浮起、hover 轻背景），与项目圆角规范一致        | DONE   | 2026-02-08 | staged      | `ToggleGroup` 自定义样式；不随 mode 切换抖动                                                     |
| 21   | Renderer | 修复 Chat/Sites 初始布局错位与切换卡顿：Portal 渲染目标 + 主视图容器语义（占满主内容区）            | DONE   | 2026-02-08 | staged      | `createPortal -> portalRoot`；Chat/Sites wrapper 不再 flex row                                   |
| 22   | Renderer | Chat Mode 内容列最大宽度 720px：超出居中，小屏撑满；外层 2em padding（底部扣除 Footer `p-3`）       | DONE   | 2026-02-08 | staged      | ChatPane `variant=mode`：`max-w-[720px]` + `px/pt=2em` + `pb=calc(2em-0.75rem)`                  |
| 23   | Renderer | DesktopWorkspace A+B 重构：Hook 下沉 + contexts 分片，消除巨型 props 透传（模块化/SRP）             | DONE   | 2026-02-09 | uncommitted | `DesktopWorkspace=Provider+Shell`；Sidebar/TopBar/Editor/Sites/Onboarding 就地 `useWorkspace*()` |

### Step 细化说明（按此执行）

#### Step 1: `vault:ensureDefaultWorkspace`（幂等）

- 修改文件（预期）：
  - Main：`apps/moryflow/pc/src/main/vault/context.ts`（新增 ensure 函数）
  - Main：`apps/moryflow/pc/src/main/vault/index.ts`（导出）
  - Main：`apps/moryflow/pc/src/main/app/ipc-handlers.ts`（注册 handler）
  - Preload：`apps/moryflow/pc/src/preload/index.ts`（暴露 desktopAPI.vault.ensureDefaultWorkspace）
  - Types：`apps/moryflow/pc/src/shared/ipc/desktop-api.ts`（DesktopApi 类型补齐）
- 验收：
  - 未选择任何 workspace 时，冷启动进入 Chat Mode，不出现 VaultOnboarding。
  - 重复调用 ensure 不会创建重复的 vault 条目（vaults 列表里只出现一个默认 workspace path）。

#### Step 2: 激活副作用对齐 `vault:setActiveVault`

- 修改文件（预期）：
  - Main：`apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- 验收：
  - 默认 workspace 被设为 active 后，`vault:onActiveVaultChange` 能收到事件。
  - vault watcher 启动，cloudSyncEngine 能 `init(vault.path)`。

#### Step 3: Mode 状态 + 快捷键 + 持久化

- 修改文件（预期）：
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/handle.ts` 或新增 `apps/moryflow/pc/src/renderer/workspace/hooks/use-app-mode.ts`
  - Main：`apps/moryflow/pc/src/main/workspace-settings.ts`（新增 `lastMode` 存储）
  - Main：`apps/moryflow/pc/src/main/app/ipc-handlers.ts`（新增 workspace:getLastMode/workspace:setLastMode）
  - Preload：`apps/moryflow/pc/src/preload/index.ts`（暴露 desktopAPI.workspace.getLastMode/setLastMode）
  - Types：`apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- 验收：
  - 默认 `chat`；`Cmd+1/2/3` 切换 Mode 并立即更新 UI。
  - 重启应用后恢复上次 Mode（从持久化读取）。

#### Step 4: Shell 改造（移除工具 Tab）

- 修改文件（预期）：
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/index.tsx`（以 Mode 渲染主视图/右侧面板）
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/handle.ts`（删除 `handleOpenAITab`/`handleOpenSites`）
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/components/unified-top-bar/helper.ts`（删除 `AI_TAB_ID`/`SITES_TAB_ID`）
- 验收：
  - UI 中不再出现 “Mory AI” 工具 Tab；Sites 不再通过 pinned tab 打开。
  - `openTabs` 只服务于 Workspace Mode 的页面编辑（不再混入工具 tab）。

#### Step 5: Sidebar 骨架重构（复刻参考图）

- 修改文件（预期）：
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/components/sidebar/index.tsx`（改为 SidebarShell）
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-nav.tsx`（删除）
  - Renderer：新增 `ModeSwitcher`/`GlobalSearchEntry`/`SectionHeader`/`SectionContent` 组件
- 验收：
  - Sidebar 顶部出现 Workspace Selector Row + 搜索框 + 3 个 Mode pills。
  - 设置入口仍在左下角（复用现有 SidebarTools）。

#### Step 6: Chat Mode 完整打通（线程列表 + 主区）

- 修改文件（预期）：
  - Renderer：新增 `apps/moryflow/pc/src/renderer/workspace/components/chat-mode/*`
  - Renderer：复用 `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts`
  - Renderer：必要时重构 `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-pane-header.tsx`（隐藏不合语义控件）
- 验收：
  - Sidebar Threads 可新建/切换/重命名/删除，主区对话随 session 切换更新。
  - Chat Mode 不展示“右侧面板折叠按钮”（PanelRight）等不匹配语义的控件。

#### Step 7: Workspace Mode 回归检查

- 验收：
  - 文件树、编辑器、右侧助手面板功能均可用。
  - Following 滚动规则不回退（以 `docs/architecture/ui-message-list-turn-anchor-adoption.md` 为准）。

#### Step 8: Sites Mode 提升为顶层入口

- 修改文件（预期）：
  - Renderer：`apps/moryflow/pc/src/renderer/workspace/components/sites/index.tsx`（`onBack` 适配）
- 验收：
  - Sites Mode 可完整管理站点（list/detail/publish/update/offline/delete）。
  - `SitesPage` 在 Mode 语义下没有“返回 tab”的不一致入口。

#### Step 9-10: 清理 + 测试 + 全量校验

- 验收：
  - `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全通过。
  - 删除旧入口代码后无死引用、无 unused exports。

## 总体信息架构（Modes 是顶层工作台）

```text
App Shell
  |
  v
Workspace folder (one active)
  |
  v
+----------------------+
| Mode (top-level)     |
+----------------------+
   |        |        |
   v        v        v
 Chat     Workspace   Sites
 (Threads) (Files)    (Publish)
```

核心原则：

1. 同一时间只有一个 **active Workspace folder**。
2. Mode 切换不切换数据世界，只切换“你在这个 Workspace 里干什么”。
3. Sidebar 外壳尽量保持一致，只替换中部“内容区”的信息架构（线程列表 vs 文件树）。

## 布局总览（对齐参考图）

> 你给的参考图的精髓：**一个 Notion-ish 的左侧栏 + 中间内容 + 右侧辅助面板**。

我们把整体布局固化成一个 Mode-aware 的三段式：

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Bar (window-drag region, consistent height)             │
├───────────────┬──────────────────────────────┬──────────────┤
│ Left Sidebar  │ Main                          │ Right Panel  │
│ (Notion-ish)  │ (Chat or Editor)              │ (optional)   │
└───────────────┴──────────────────────────────┴──────────────┘
```

- `Chat Mode`：右侧面板默认不出现（主区专注对话）。
- `Workspace Mode`：右侧面板默认出现（Assistant Panel），与参考图一致。
- `Sites Mode`：默认两栏（Sidebar + Dashboard）；右侧 Assistant 可选折叠，不抢占主流程。

## 左侧 Sidebar（重点复刻参考图）

### Sidebar 外壳结构（三种 Mode 共用骨架）

下面这张“结构骨架图”建议你重点看，它基本就是你参考图的抽象复刻：

```text
┌────────────────────────── Left Sidebar ──────────────────────────┐
│ Workspace Selector Row                                           │
│  [●] workspace ▼                                                 │
│  - dropdown: switch/open/create/reveal                           │
│                                                                   │
│ Global Search                                                     │
│  [ Search… ]                                     (Cmd+K)         │
│                                                                   │
│ Mode Switcher (3 items; reserved slot for future)                 │
│  [ 💬 Chat ] [ 🗂 Workspace ] [ 🌐 Sites ]                         │
│                                                                   │
│ Section Header (contextual)                                       │
│  Chat Mode:     "Threads"                             (＋) (⌕)    │
│  Workspace Mode: "Pages"                               (＋) (⌕)    │
│  Sites Mode:    "Sites"                                   (⌕)    │
│                                                                   │
│ Content List (scroll)                                             │
│  - rows: icon + title, hover bg, selected bg                      │
│                                                                   │
│ ───────────────────────────────────────────────────────────────  │
│ Bottom Tools (keep at left-bottom; your existing rule)            │
│  Settings / Sync / Account / etc                                  │
└───────────────────────────────────────────────────────────────────┘
```

你参考图里“右上角用户/设置入口”我们不照搬，仍然保持在 Sidebar 的左下角（你当前的 `SidebarTools` 区域）。

### Workspace Selector Row（顶部 workspace ▼）

行为建议（Notion 风格、C 端友好）：

- 默认显示：`workspace`（可重命名，但首启固定创建这个）
- dropdown 菜单项（建议顺序）：
  - `Switch Workspace…`（最近使用的 workspace 列表）
  - `Open Existing Workspace…`（选择目录）
  - `Create Workspace…`（选择目录 + 初始化）
  - `Reveal in Finder`（打开当前 workspace folder）
  - `Workspace Settings…`（未来：容量、同步、发布等）

### Section Header Actions（按 Mode 决定）

- `Chat Mode`：仅保留一个 `+`（New thread，直接创建新会话）
- `Workspace Mode`：仅保留一个 `+`（下拉：New file / New folder）
- `Sites Mode`：不显示 `+`（发布/站点创建在主面板完成）

### Mode Switcher（icon pill 复刻）

形态：参考你输入框文档里的“图标胶囊 + 下拉”语言，把它变成顶层导航：

```text
┌───────────────┐
│  💬  🗂  🌐   │   (pill group; active has subtle bg)
└───────────────┘
```

交互规则（重点）：

- 切 Mode 不弹确认、不丢上下文（只是切工作台）。
- 支持快捷键：
  - `Cmd+1` → Chat
  - `Cmd+2` → Workspace
  - `Cmd+3` → Sites

## Chat Mode（默认模式）

### 布局（两栏，主区专注对话）

```text
┌───────────────────────────────────────────────────────────────┐
│ Top Bar: (title/actions for current thread)                    │
├───────────────┬───────────────────────────────────────────────┤
│ Sidebar       │ Conversation                                   │
│ - Threads     │ - message list (Following mode)                │
│               │ - prompt input (bottom)                        │
└───────────────┴───────────────────────────────────────────────┘
```

### Sidebar 内容区（Threads）

建议沿用参考图的“列表型内容区”，而不是树：

- `Threads` 列表：按时间分组（Today/Yesterday/…）或按“Pinned/Recent”。
- 每行：icon + title（title 来自首条 user message 的摘要或用户自命名）。
- 行 hover：浅灰背景、右侧显示 `…` 更多菜单。

### 空状态（减少过大留白）

你的参考图 1/2 里中间留白很大；你说你不需要那么大的留白。这里建议用“更紧凑的 Notion 空状态”：

```text
  What can I help with?
  ┌──────────────────────────────────────┐
  │ Prompt input…                        │
  └──────────────────────────────────────┘
  [Summarize] [Write] [Translate] [Brainstorm]
```

## Workspace Mode（文件/页面工作台 + 右侧 Assistant Panel）

### 布局（三栏，对齐你这张参考图）

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Top Bar: (tabs / breadcrumb / actions)                              │
├───────────────┬───────────────────────────────┬─────────────────────┤
│ Sidebar       │ Editor / Canvas               │ Assistant Panel      │
│ - Pages tree  │ - page content                │ - contextual chat    │
│               │                               │ - same prompt input  │
└───────────────┴───────────────────────────────┴─────────────────────┘
```

要点：

- 这基本就是你现有的 `Sidebar + Editor + ChatPane`，只是把“进入方式”从工具 Tab 改为顶层 Mode。
- 右侧 Assistant Panel 的滚动/Following 规则，继续以 `docs/architecture/ui-message-list-turn-anchor-adoption.md` 为准（不引入新滚动语义）。

## Sites Mode（发布/站点管理工作台）

定位：把“Sites/发布”从一个散落入口提升为顶层 Mode。它仍然属于当前 Workspace folder（站点源文件与发布配置都在此工作区内），只是 UI 进入一个更聚焦的发布工作台。

### 布局（建议两栏；可选右侧 Assistant）

优先建议两栏（信息密度高、操作路径短）：

```text
┌───────────────────────────────────────────────────────────────┐
│ Top Bar: Sites (workspace-scoped)                              │
├───────────────┬───────────────────────────────────────────────┤
│ Sidebar       │ Sites Dashboard                                │
│ - Sites list  │ - list/status/config/publish history           │
│               │ - open preview / domain / cache policy         │
└───────────────┴───────────────────────────────────────────────┘
```

可选增强（如果你希望“参考图右侧永远有 AI”）：在 Sites Mode 也保留右侧 Assistant Panel（默认折叠），用于发布文案/FAQ/状态页生成等，但不要抢占主流程。

## 不做历史兼容（直接重构的边界）

因为当前不存在真实历史用户，本期允许做“破坏式但最佳实践”的改造：

- 删除旧入口与旧 UI 状态（例如：`Mory AI` 工具 Tab、Sites 的工具 Tab/特殊路径入口）。
- 不保留旧配置/旧工作区目录的自动迁移逻辑；新版本按“默认 workspace + 可切换”策略直接执行。
- 代码层面的目标不是“if/else 兼容”，而是让 Mode 架构成为新的单一事实来源（Single Source of Truth）。

## 首次启动：自动创建默认 Workspace folder

你希望“不要再卡在创建/选择目录”，而是自动创建一个默认 workspace。建议流程如下：

```text
App launch
  |
  v
Has active workspace folder?
  |-- Yes --> Enter Chat Mode
  |
  `-- No --> Create default workspace folder (name: workspace)
               |
               v
            Create success?
               |-- Yes --> Set as active workspace + enter Chat Mode
               |
               `-- No --> Fallback: show minimal picker (Open/Create)
```

### 默认路径策略（已确认）

你说“放到 user 根目录 / 安装目录都可以，选一个合理的”。我建议优先采用“用户可见且符合 OS 习惯”的路径：

- macOS：`~/Documents/Moryflow/workspace`（已确认）
- Windows：`%USERPROFILE%\\Documents\\Moryflow\\workspace`
- Linux：`~/Documents/Moryflow/workspace`（没有 Documents 就回退到 `~/Moryflow/workspace`）

原因：

- 你的产品是“文件/笔记工作区”，用户往往希望这个目录可见、可备份、可手动管理。
- 放在应用安装目录（/Applications）不符合权限与习惯；放在 App Support 太隐蔽（除非你明确想走“托管库”路线）。

## 扩展性（仍保留未来新增 Mode 的空间）

虽然现在 Mode Switcher 固定 3 个（Chat / Workspace / Sites），但 Sidebar 的结构与键盘快捷键应按“最多 4 个 Mode”预留样式空间：

- 第 4 个 Mode（未来可选）：例如 `Tasks`（任务工作台）或 `Research`（研究工作台）。
- 超过 4 个时：必须折叠到 `More…`（避免 Sidebar 顶部拥挤、可点击区域变窄）。

## 从当前实现迁移到新设计（讨论级，不开工）

你当前代码里可观察到的入口与结构（简化描述）：

- `VaultOnboarding`：无 Vault 时阻塞主界面
- `SidebarNav`：Search / Mory AI / Sites（将被新的 Sidebar 骨架替换）
- `AI_TAB_ID`：全屏 Chat 工具 Tab（将删除）
- `SITES_TAB_ID`：Sites 工具 Tab/特殊视图入口（将删除）
- Workspace 模式：三栏（Sidebar / Editor / ChatPane）

迁移要点（只讲“需要改哪里”，不写实现细节）：

1. **引入 Mode（Chat/Workspace/Sites）**：作为 App Shell 的顶层状态，驱动 Sidebar 内容与主区布局切换。
2. **移除 `Mory AI` 工具 Tab**：Chat Mode 取代它；`AI_TAB_ID` 相关逻辑可以删除或重定向。
3. **移除 Sites 工具 Tab**：Sites Mode 取代它；`SITES_TAB_ID` 相关逻辑可以删除或重定向。
4. **改造首启流程**：在进入 UI 前自动创建默认 Workspace folder（`workspace`），并设为 active。
5. **Sidebar 复刻参考图**：把你现有 Sidebar 分成“外壳骨架 + Mode 内容区”，保持底部 Settings 不动。

## 已确认（实现前置条件）

- 默认 Workspace folder（macOS）：`~/Documents/Moryflow/workspace`
