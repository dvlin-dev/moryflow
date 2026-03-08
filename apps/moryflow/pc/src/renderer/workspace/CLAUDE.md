# Workspace（Moryflow PC）

> 注意：本目录结构或关键状态流变更时必须同步更新本文件

## 定位

Moryflow PC 的 “Workspace feature root”：

- 负责 Renderer 侧的工作区状态编排（Vault/Tree/Doc/Search/Dialog）
- 负责 Navigation-aware 的窗口布局（destination：Agent / Skills / Sites；SidebarMode：Home / Chat）
- 通过 **Store-first（业务状态 + 装配状态）** 避免 `DesktopWorkspace` 巨型 props 透传，保证模块化与单一职责

## 核心原则（强制）

- 单例 Controller：`useDesktopWorkspace()` 只能在一个地方调用一次（Provider 同步层内），避免多实例状态分裂
- UI 组件就地取值：`Sidebar/UnifiedTopBar/EditorPanel/SitesPage` 不接收“大包 props”，改为 `useWorkspace*()` 获取自己需要的数据与动作
- 最佳实践优先：不考虑历史兼容，允许破坏式重构与删除死代码（但避免过度设计）
- 用户可见文案必须为英文

## 关键文件

- `index.tsx`
  - 导出 `DesktopWorkspace`（App Root 使用）
  - 包装 `WorkspaceControllerProvider` + `DesktopWorkspaceShell`
- `handle.ts`
  - `useDesktopWorkspace()`：控制器编排层（组装 vault/tree/doc/file-ops/dialog/search-open-state，避免重业务内联）
- `hooks/use-workspace-vault.ts`
  - Vault 生命周期与切换动作（初始化、切换、创建、刷新）
- `desktop-workspace-shell.tsx`
  - `DesktopWorkspaceShell`：纯壳层装配（layout state + main content + overlays）
  - 只做 “Shell”，不承载业务状态（业务来自 contexts）
- `hooks/use-shell-layout-state.ts`
  - Shell 布局状态机（sidebar/chat 折叠、宽度同步、拖拽约束）
- `components/workspace-shell-main-content.tsx`
  - destination 主内容分发层（显式 `renderContentByState`）
- `components/workspace-shell-overlays.tsx`
  - 覆层入口（GlobalSearch/Input/Settings）
- `stores/workspace-shell-view-store.ts`
  - Shell 视图装配 store（`main-content/overlays` 统一 selector 取数）
- `components/sidebar/hooks/use-sidebar-panels-store.ts`
  - Sidebar 面板分发 store（`SidebarLayoutRouter` selector 取数）
- `hooks/use-document-state.ts`
  - 文档状态主 hook（内部按 auto-save/fs-sync/vault-restore/persistence 分段）
- `hooks/use-vault-tree.ts`
  - 文件树状态主 hook（内部按 bootstrap/fs-events 分段）
- `navigation/`
  - `navigation/state.ts`：NavigationState 判别联合（`agent-workspace` / `module`）与纯 transitions（SSOT，无副作用）
  - `navigation/agent-actions.ts`：Coordinator（Open intents 回跳到 Agent；Inline actions 就地生效）
- `context/`
  - `workspace-controller-context.tsx`：调用 `useDesktopWorkspace()` + `useNavigation()`，仅负责把控制器快照同步到 store（保留 `useWorkspace*` API）
  - `workspace-shell-context.tsx`：仅负责把 Shell UI 控制器同步到 store（sidebarWidth/toggle panels/openSettings）
- `stores/workspace-controller-store.ts`
  - Workspace 业务控制器 store（`nav/vault/tree/doc/search/dialog`）
- `stores/workspace-shell-controller-store.ts`
  - Workspace Shell 控制器 store（`sidebar/chat/settings`）
- `const.ts`
  - Workspace 共享类型中心（SelectedFile/ActiveDocument/RequestState/Controller 类型等）

## Store 边界（建议）

- Controller stores（全局业务状态）
  - navigation/vault/tree/doc/command/dialog
- Shell store（仅布局层）
  - sidebarCollapsed、sidebarWidth、toggleSidebarPanel、chatCollapsed、toggleChatPanel、openSettings

> 约束：Shell store 依赖 `ResizablePanel` 的 imperative handle，因此只能在 `DesktopWorkspaceShell` 内同步快照。

## 回归验证（必跑）

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```
