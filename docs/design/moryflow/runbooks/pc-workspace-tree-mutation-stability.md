---
title: PC Workspace Tree Mutation Stability
date: 2026-03-13
scope: apps/moryflow/pc
status: active
---

# PC Workspace Tree Mutation Stability

本文记录 Moryflow PC 在文件树创建、拖拽移动与局部刷新场景下的当前稳定约束，以及拖拽闪烁问题的正式排查入口。

## 1. 当前目标

- Workspace tree 的局部变更不得默认升级成全量 tree 重抓。
- Home 模式下的文件移动、创建、删除，不得导致 EditorPanel / ChatPane 因无关 tree 订阅而整体闪烁重挂。
- 文件树 mutation 的真相源仍是 Sidebar tree；Shell、Editor 与 Chat 只消费必要派生状态。

## 2. 当前稳定约束

### 2.1 Tree mutation

- 创建、移动、删除优先使用目录级局部刷新，不再默认走全量 `fetchTree()`。
- `refreshSubtree()` 是 tree 局部恢复的首选入口。
- 源目录和目标目录同时受影响时，必须分别刷新，不允许靠一次全量抓取兜底。

### 2.2 Shell 订阅边界

- `DesktopWorkspaceShell`、`WorkspaceShellMainContent`、`EditorPanel` 不得为了“是否有文件”“tree 长度”“空状态”去订阅整棵 tree。
- 上层容器必须优先消费：
  - `hasFiles`
  - `treeLength`
  - `treeState`
- 与文件树无直接关系的主区内容，不应因为 tree 数组引用变化而被动 remount。

### 2.3 Quick create / move

- 文件与文件夹命名归一化只能发生在 main process。
- 拖拽移动后的可见性恢复，必须以局部 tree 刷新和目标目录展开为主，不依赖上层全局 rerender。

## 3. 已确认的残余问题

当前仍存在一个已知问题：

- Home 模式下将文件拖拽到另一目录后，右侧 `EditorPanel` 与 `ChatPane` 可能发生可见闪烁，表现为主区整体重渲染与光标丢失。

这不是文件移动失败，而是主区仍存在额外 rerender 路径未完全收口。

## 4. 当前排查焦点

后续排查固定优先级如下：

1. `Sidebar` 与 `sidebarPanelsStore` 的快照更新是否仍触发大范围 rerender
2. `ChatPanePortal` / `ChatPaneRuntimeProvider` 的 props 或 context 值是否在 tree 变化后发生不必要变化
3. `WorkspaceShellMainContent` 之外是否仍有组件直接订阅整棵 tree

## 5. 关键文件

- `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts`
- `apps/moryflow/pc/src/renderer/workspace/file-operations/operations/move-by-drag.ts`
- `apps/moryflow/pc/src/renderer/workspace/desktop-workspace-shell.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/editor-panel/index.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/sidebar/hooks/use-sidebar-panels-store.ts`
