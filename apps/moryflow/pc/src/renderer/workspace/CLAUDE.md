# Workspace（Moryflow PC）

> 注意：本目录结构或关键状态流变更时必须同步更新本文件

## 定位

Moryflow PC 的 “Workspace feature root”：

- 负责 Renderer 侧的工作区状态编排（Vault/Tree/Doc/Command/Dialog）
- 负责 Navigation-aware 的窗口布局（destination：Agent / Skills / Sites；AgentSub：Chat / Workspace）
- 通过 **Context 分片**避免 `DesktopWorkspace` 巨型 props 透传，保证模块化与单一职责

## 核心原则（强制）

- 单例 Controller：`useDesktopWorkspace()` 只能在一个地方调用一次（Provider 内），避免多实例状态分裂
- UI 组件就地取值：`Sidebar/UnifiedTopBar/EditorPanel/SitesPage/VaultOnboarding` 不接收“大包 props”，改为 `useWorkspace*()` 获取自己需要的数据与动作
- 最佳实践优先：不考虑历史兼容，允许破坏式重构与删除死代码（但避免过度设计）
- 用户可见文案必须为英文

## 关键文件

- `index.tsx`
  - 导出 `DesktopWorkspace`（App Root 使用）
  - 包装 `WorkspaceControllerProvider` + `DesktopWorkspaceShell`
- `handle.ts`
  - `useDesktopWorkspace()`：聚合 Vault/Tree/Doc/FileOps/InputDialog/CommandPalette 等业务状态与动作（Controller）
- `desktop-workspace-shell.tsx`
  - `DesktopWorkspaceShell`：布局与 panel 行为（Resizable panels / portal hosts / keep-alive）
  - 只做 “Shell”，不承载业务状态（业务来自 contexts）
- `navigation/`
  - `navigation/state.ts`：NavigationState（destination + agentSub）与纯 transitions（SSOT，无副作用）
  - `navigation/agent-actions.ts`：Coordinator（Open intents 回跳到 Agent；Inline actions 就地生效）
- `context/`
  - `workspace-controller-context.tsx`：调用 `useDesktopWorkspace()` + `useNavigation()`，拆分并提供多个 contexts
  - `workspace-shell-context.tsx`：提供 Shell UI 状态/动作（sidebarWidth/toggle panels/openSettings）
- `const.ts`
  - Workspace 共享类型中心（SelectedFile/ActiveDocument/RequestState/Controller 类型等）

## Context 边界（建议）

- Controller contexts（全局业务状态）
  - navigation/vault/tree/doc/command/dialog
- Shell context（仅布局层）
  - sidebarCollapsed、sidebarWidth、toggleSidebarPanel、chatCollapsed、toggleChatPanel、openSettings

> 约束：Shell context 依赖 `ResizablePanel` 的 imperative handle，因此只能在 `DesktopWorkspaceShell` 内提供。

## 回归验证（必跑）

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 近期变更

- 2026-02-11：侧边栏默认宽度改为等于最小宽度（260px）；仍通过 `react-resizable-panels` 的 `autoSaveId` 记忆用户上次拖拽宽度。
- 2026-02-11：侧边栏最小宽度调整为 260px（`SIDEBAR_MIN_WIDTH` + panel 百分比下限按容器动态换算），确保拖拽下限与像素最小宽度一致。
- 2026-02-10：移除 `preload:*` IPC/落盘缓存与 Workspace preload service，预热回退为 Renderer 侧轻量 warmup（仅 idle `import()` ChatPane/Shiki；无额外 IPC/写盘）。
- 2026-02-11：新增 `Skills` destination 与 `SkillsPage` keep-alive 挂载，导航快捷键调整为 `Cmd/Ctrl+3 => Skills`、`Cmd/Ctrl+4 => Sites`。
- 2026-02-10：SettingsDialog/Theme/模型选择统一走 AgentSettings 单飞资源，降低重复 IPC，修复设置弹窗偶发一直 Loading。
- 2026-02-09：恢复工作区持久化的 `openTabs/lastOpenedFile` 时增加过滤（仅保留 Vault 内的绝对路径），避免旧版特殊 tab/非法路径被当作文件加载导致报错。
- 2026-02-09：Sites destination 视图 keep-alive/预热挂载不再触发未登录的站点列表请求；发布入口未登录时引导到 Account 设置页登录。
- 2026-02-10：新增 `useRequireLoginForSitePublish`，统一 Sites/Publish 的登录校验与引导逻辑。
- 2026-02-10：导航细节修复：移除未消费的 ready 字段；快捷键避开输入框/IME；AgentSubSwitcher 补齐 tab/tabpanel；New thread/New file 作为 Open intent 回跳到 Agent；ChatPanePortal portalRoot 初始化形式更纯。
