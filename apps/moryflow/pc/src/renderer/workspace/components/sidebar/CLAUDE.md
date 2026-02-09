# Sidebar（Workspace）

> ⚠️ 本目录结构变更时必须同步更新本文件

## 定位

工作区左侧栏，负责导航、文件入口、Vault 切换与状态工具区（含云同步/设置）。

## 关键文件

- `index.tsx`：侧边栏入口与整体布局
- `const.ts`：Sidebar 子组件 props 类型（`SidebarFilesProps`/`SidebarToolsProps` 等；已移除 `SidebarProps`）
- `components/mode-switcher.tsx`：Mode Switcher（Chat / Workspace / Sites）
- `components/sidebar-section-header.tsx`：内容区标题行（Section title + actions）
- `components/sidebar-create-menu.tsx`：Workspace Mode 创建菜单（+ 下拉：New page / New folder）
- `components/chat-threads-list.tsx`：Chat Mode 线程列表（select/rename/delete）
- `components/sidebar-files.tsx`：文件快捷入口
- `components/sidebar-tools.tsx`：工具区（云同步/设置）
- `components/search-dialog/`：文件搜索对话框（Workspace Mode）
- `components/vault-selector/`：Vault 切换与创建

## 约束

- 图标统一使用 Lucide
- 用户可见文案必须为英文
- **不做 props 透传**：Sidebar 顶层通过 workspace contexts（`useWorkspace*`）就地获取数据与动作；仅对少数子组件传递局部 props

## 近期变更

- 引入 Notion-ish Sidebar skeleton：WorkspaceHeader/ModeSwitcher/Section/BottomTools
- 搜索入口收敛到顶部 Workspace 行右侧的 Search icon（Workspace Mode：打开文件搜索；其它 Mode：打开 Command Palette）
- 移除旧导航（Search/Mory AI/Sites），改为 Mode Switcher
- Sidebar 创建动作按 Mode 收敛：Chat 仅 New thread；Workspace 仅 New page/folder；Sites 无创建入口（交由主面板）
- Workspace selector 行支持整行点击打开下拉，并提供一致的 hover 背景与 padding
- 云同步 icon 仅在用户登录后显示，未登录时隐藏
- Vault 切换下拉箭头改为 ChevronDown（无中轴）
