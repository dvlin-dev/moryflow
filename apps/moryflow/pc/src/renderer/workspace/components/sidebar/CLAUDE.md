# Sidebar（Workspace）

> 注意：本目录结构变更时必须同步更新本文件

## 定位

工作区左侧栏，负责导航、文件入口、Vault 切换与底部主操作（仅 `New chat`）。

## 关键文件

- `index.tsx`：侧边栏入口与整体布局（Header + Content Router + Bottom）
- `const.ts`：Sidebar 子组件 props 类型（`SidebarFilesProps` 等；已移除 `SidebarProps`）
- `components/sidebar-header.tsx`：顶部区域容器（`Home/Chat` + `Search icon`）
- `components/sidebar-mode-tabs.tsx`：顶部左侧 `Home/Chat` 模式切换
- `components/sidebar-search-action.tsx`：顶部右侧全局搜索 icon 动作
- `components/modules-nav.tsx`：Home 侧栏的 Modules 导航（Agent/Skills/Sites）
- `components/sidebar-layout-router.tsx`：侧栏内容分发（Home/Chat）
- `components/sidebar-layout-router-model.ts`：`destination + sidebarMode -> contentMode` 单一规则
- `components/chat-threads-list.tsx`：Threads 列表（Chat 模式内容）
- `components/sidebar-files.tsx`：文件列表（Home 模式内容）
- `components/sidebar-create-menu.tsx`：Files 标题行创建入口（历史样式 `+` 下拉菜单）
- `components/sidebar-bottom-primary-action.tsx`：底部固定 `New chat` 主操作
- `hooks/use-sidebar-publish-controller.ts`：发布入口状态与登录门禁（含 `useRequireLoginForSitePublish` 对接）
- `hooks/use-sidebar-panels-store.ts`：`Sidebar -> SidebarLayoutRouter` 面板状态桥接（store-first，selector 取数）
- `components/vault-selector/`：Vault 切换与创建

## 约束

- 图标统一使用 Lucide
- 用户可见文案必须为英文
- **不做 props 透传**：Sidebar 顶层通过 workspace contexts（`useWorkspace*`）就地获取数据与动作；仅对少数子组件传递局部 props
- 侧栏列表滚动统一由上层滚动容器负责，子列表与文件树根容器不得再叠加 `overflow-hidden` 等本地裁剪；`SidebarFiles` 的 `ContextMenuTrigger` 外层允许保留 `h-full`，但仅用于扩展空白区右键命中范围与为 `VaultFiles` 空状态提供高度参照，不能承担滚动裁剪职责
