# Workspace（Moryflow PC）

> 注意：本目录结构或关键状态流变更时必须同步更新本文件

## 定位

Moryflow PC 的 “Workspace feature root”：

- 负责 Renderer 侧的工作区状态编排（Vault/Tree/Doc/Command/Dialog）
- 负责 Navigation-aware 的窗口布局（destination：Agent / Skills / Sites；AgentSub：Chat / Workspace）
- 通过 **Store-first（业务状态 + 装配状态）** 避免 `DesktopWorkspace` 巨型 props 透传，保证模块化与单一职责

## 核心原则（强制）

- 单例 Controller：`useDesktopWorkspace()` 只能在一个地方调用一次（Provider 同步层内），避免多实例状态分裂
- UI 组件就地取值：`Sidebar/UnifiedTopBar/EditorPanel/SitesPage/VaultOnboarding` 不接收“大包 props”，改为 `useWorkspace*()` 获取自己需要的数据与动作
- 最佳实践优先：不考虑历史兼容，允许破坏式重构与删除死代码（但避免过度设计）
- 用户可见文案必须为英文

## 关键文件

- `index.tsx`
  - 导出 `DesktopWorkspace`（App Root 使用）
  - 包装 `WorkspaceControllerProvider` + `DesktopWorkspaceShell`
- `handle.ts`
  - `useDesktopWorkspace()`：控制器编排层（组装 vault/tree/doc/file-ops/dialog/command，避免重业务内联）
- `hooks/use-workspace-vault.ts`
  - Vault 生命周期与切换动作（初始化、切换、创建、刷新）
- `hooks/use-workspace-command-actions.ts`
  - 命令面板动作装配（Open/Create/Rename/Delete 等）
- `desktop-workspace-shell.tsx`
  - `DesktopWorkspaceShell`：纯壳层装配（layout state + main content + overlays）
  - 只做 “Shell”，不承载业务状态（业务来自 contexts）
- `hooks/use-shell-layout-state.ts`
  - Shell 布局状态机（sidebar/chat 折叠、宽度同步、拖拽约束）
- `components/workspace-shell-main-content.tsx`
  - destination 主内容分发层（显式 `renderContentByState`）
- `components/workspace-shell-overlays.tsx`
  - 覆层入口（Command/Input/Settings）
- `stores/workspace-shell-view-store.ts`
  - Shell 视图装配 store（`main-content/overlays` 统一 selector 取数）
- `components/sidebar/hooks/use-sidebar-panels-store.ts`
  - Sidebar 面板分发 store（`AgentSubPanels` selector 取数）
- `hooks/use-document-state.ts`
  - 文档状态主 hook（内部按 auto-save/fs-sync/vault-restore/persistence 分段）
- `hooks/use-vault-tree.ts`
  - 文件树状态主 hook（内部按 bootstrap/fs-events 分段）
- `navigation/`
  - `navigation/state.ts`：NavigationState（destination + agentSub）与纯 transitions（SSOT，无副作用）
  - `navigation/agent-actions.ts`：Coordinator（Open intents 回跳到 Agent；Inline actions 就地生效）
- `context/`
  - `workspace-controller-context.tsx`：调用 `useDesktopWorkspace()` + `useNavigation()`，仅负责把控制器快照同步到 store（保留 `useWorkspace*` API）
  - `workspace-shell-context.tsx`：仅负责把 Shell UI 控制器同步到 store（sidebarWidth/toggle panels/openSettings）
- `stores/workspace-controller-store.ts`
  - Workspace 业务控制器 store（`nav/vault/tree/doc/command/dialog`）
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

## 近期变更

- 2026-02-26：修复 Workspace Shell 黑屏回归：`WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels` 移除对象字面量 selector，统一改为原子 selector；`use-shell-layout-state` 返回值改为 `useMemo` 稳定引用；`workspace-shell-view-store` 的 `layoutState` 同步比较下沉到字段级；补充回归测试覆盖“layoutState 新对象但字段等价时不写入 store”。
- 2026-02-26：修复 Store-first 同步层性能回归：`workspace-shell-view-store` 与 `sidebar-panels-store` 新增 `shouldSyncSnapshot`，等价快照不再重复 `setSnapshot`；补充两处回归测试覆盖“等价快照不写入 / 变更快照仍同步”。
- 2026-02-26：PR #100 review follow-up：`use-document-state` 在 vault 切换时重置 `pendingSelectionPath/pendingOpenPath`，防止跨 vault 残留意图在后续树刷新时误触发。
- 2026-02-26：分支全量 Code Review follow-up：`workspace-controller-context/workspace-shell-context` 的 store 同步改为 `useLayoutEffect`（移除 render-phase 外部写入）；`use-workspace-command-actions` 恢复 `workspace` 命名空间 key 强类型（移除 `any` 降级）。
- 2026-02-26：项目复盘收口：`chat-pane-portal` 新增 `chat-pane-portal-model`（`main/panel/parking` 放置状态派生），移除链式三元并统一显式分发；补齐 `chat-pane-portal-model.test.ts`。
- 2026-02-26：模块 E 去 Context 化：`workspace-controller-context/workspace-shell-context` 改为 store 同步层，新增 `workspace-controller-store/workspace-shell-controller-store`，业务/布局读取统一走 `useWorkspace*` selector（无 React Context 透传）。
- 2026-02-26：修复 `@moryflow/pc typecheck` 阻塞项：`use-workspace-command-actions` 的 `t` 签名对齐 i18n 泛型返回类型（后续 follow-up 已恢复 `workspace` key 强类型，移除 `any`）。
- 2026-02-26：Store-first 二次改造落地（`SF-3`）：新增 `workspace-shell-view-store` 与 `sidebar-panels-store`；`WorkspaceShellMainContent/WorkspaceShellOverlays/AgentSubPanels` 改为 selector 就地取数，`DesktopWorkspaceShell/Sidebar` 改为快照同步层。
- 2026-02-26：模块 C 完成：`DesktopWorkspaceShell` 拆分为 `use-shell-layout-state + workspace-shell-main-content + workspace-shell-overlays`，主区统一显式 `renderContentByState` 分发。
- 2026-02-26：模块 C 完成：`handle.ts` 下沉 `useWorkspaceVault/useWorkspaceCommandActions`；`useDocumentState` 与 `useVaultTreeState` 副作用按职责分段，降低单 hook 复杂度。
- 2026-02-11：`New skill`/`Try` 成功后不再弹成功 toast（减少干扰）；仅保留失败提示，跳转行为保持即时生效。
- 2026-02-11：Skills 页面新增“立即生效”链路：`Try` 与 `New skill` 统一走 `createSession -> selectedSkill -> setSub('chat')`，确保点击后立刻新建会话并携带 skill tag。
- 2026-02-11：侧边栏默认宽度改为等于最小宽度（260px）；仍通过 `react-resizable-panels` 的 `autoSaveId` 记忆用户上次拖拽宽度。
- 2026-02-11：侧边栏最小宽度调整为 260px（`SIDEBAR_MIN_WIDTH` + panel 百分比下限按容器动态换算），确保拖拽下限与像素最小宽度一致。
- 2026-02-10：移除 `preload:*` IPC/落盘缓存与 Workspace preload service，预热回退为 Renderer 侧轻量 warmup（仅 idle `import()` ChatPane/Shiki；无额外 IPC/写盘）。
- 2026-02-11：新增 `Skills` destination 与 `SkillsPage` keep-alive 挂载，导航快捷键调整为 `Cmd/Ctrl+3 => Skills`、`Cmd/Ctrl+4 => Sites`。
- 2026-02-10：SettingsDialog/Theme/模型选择统一走 AgentSettings 单飞资源，降低重复 IPC，修复设置弹窗偶发一直 Loading。
- 2026-02-09：恢复工作区持久化的 `openTabs/lastOpenedFile` 时增加过滤（仅保留 Vault 内的绝对路径），避免旧版特殊 tab/非法路径被当作文件加载导致报错。
- 2026-02-09：Sites destination 视图 keep-alive/预热挂载不再触发未登录的站点列表请求；发布入口未登录时引导到 Account 设置页登录。
- 2026-02-10：新增 `useRequireLoginForSitePublish`，统一 Sites/Publish 的登录校验与引导逻辑。
- 2026-02-10：导航细节修复：移除未消费的 ready 字段；快捷键避开输入框/IME；AgentSubSwitcher 补齐 tab/tabpanel；New thread/New file 作为 Open intent 回跳到 Agent；ChatPanePortal portalRoot 初始化形式更纯。
