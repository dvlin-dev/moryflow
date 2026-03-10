---
title: Bug：拖拽移动文件触发全界面重渲染（闪烁）
date: 2026-03-10
scope: moryflow/pc
status: in_progress
---

## 现象

在 Home 模式下将文件拖拽到另一个目录后，右侧 EditorPanel 和 ChatPane 会整体闪烁重渲染，光标丢失，体验受损。

## 已排查的根因链

```
refreshSubtree() → setTree(newArray)
  → tree 数组引用变化
  → handleExpandedPathsChange（已修：改用 treeRef，移除 tree dep）
  → createTreeController useMemo 重建（controller.tree 变 → 必然重建）
  → workspaceControllerStore.tree 更新
  → DesktopWorkspaceShell（已修：改用 useWorkspaceTreeLength/State 原子选择器）
  → WorkspaceShellMainContent（已修：memo 包裹）
  → EditorPanel / ChatPanePortal 仍在闪烁（未完全解决）
```

## 已实施的修复（PR 在当前 worktree）

| 文件                                          | 修改内容                                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `hooks/use-vault-tree.ts`                     | 添加 `treeRef`；`fetchTree` / `refreshSubtree` 移除 `tree` dep；`handleExpandedPathsChange` 改用 `treeRef.current`，移除 `tree` dep |
| `file-operations/types.ts`                    | `UseVaultFileOperationsOptions` 新增 `refreshSubtree`                                                                               |
| `file-operations/operations/move-by-drag.ts`  | 用 `refreshSubtree × 2`（源目录 + 目标目录）替换全量 `fetchTree`                                                                    |
| `file-operations/index.ts` / `handle.ts`      | 透传 `refreshSubtree`                                                                                                               |
| `context/workspace-controller-context.tsx`    | 新增 `useWorkspaceHasFiles` / `useWorkspaceTreeLength` / `useWorkspaceTreeState` 原子选择器                                         |
| `context/index.ts`                            | 导出上述新 hooks                                                                                                                    |
| `desktop-workspace-shell.tsx`                 | 以 `useWorkspaceTreeLength` / `useWorkspaceTreeState` 替换 `useWorkspaceTree()`                                                     |
| `components/workspace-shell-main-content.tsx` | `memo()` 包裹                                                                                                                       |
| `components/editor-panel/index.tsx`           | `useWorkspaceHasFiles()` 替换 `useWorkspaceTree()` + `tree.length > 0`                                                              |

## 仍未解决

闪烁仍然存在，说明还有其他路径触发重渲染，尚未完全定位。

可能的残余路径（待核查）：

1. **`Sidebar` → `useSyncSidebarPanelsStore` 全量 `set(snapshot)`**：
   每次 tree 变化，`sidebarPanelsStore` 做全量快照替换。若 `VaultFiles` 或其父层订阅了包含函数引用的 slice，可能因 `setSnapshot` 导致整棵 Sidebar 子树重渲染，视觉上与 EditorPanel 闪烁重叠。

2. **`ChatPaneRuntimeProvider` 的 context value 稳定性**：
   `WorkspaceShellMainContent` 内部内联构造 `ChatPaneRuntimeProvider` 的 props（含 `activeFilePath`、`vaultPath` 等），如果它们在 memo 边界外仍有不必要变化，会导致 context 值更新，进而触发 ChatPane 重渲染。

3. **`useSyncWorkspaceShellViewStore` 的 `[snapshot]` dep**：
   该 hook 的 `useLayoutEffect` 以内联对象为 dep，每次父渲染都执行一次（靠 `shouldSyncSnapshot` 守门），性能上有优化空间，但不是闪烁主因。

## 下一步排查方向

1. 用 React DevTools Profiler 录制一次拖拽操作，精确定位哪个组件触发了 re-render 及其原因（props / hooks）。
2. 检查 `ChatPanePortal` 是否被 `memo` 包裹，以及它从 `WorkspaceShellMainContent` 接收的 props 中哪些在 drag 后变化。
3. 检查 `sidebarPanelsStore.setSnapshot` 是否导致 `SidebarLayoutRouter` 内部的组件（如 `VaultFiles`）因为函数引用变化而全量重渲染，引发视觉抖动。
4. 考虑将 `sidebarPanelsStore` 的 `setSnapshot` 改为细粒度字段更新，替代全量替换。

## 关键文件路径

- `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts`
- `apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/editor-panel/index.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/chat-pane-portal/` （待查）
