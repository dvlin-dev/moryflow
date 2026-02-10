# Sidebar（Workspace）

> 注意：本目录结构变更时必须同步更新本文件

## 定位

工作区左侧栏，负责导航、文件入口、Vault 切换与状态工具区（含云同步/设置）。

## 关键文件

- `index.tsx`：侧边栏入口与整体布局
- `const.ts`：Sidebar 子组件 props 类型（`SidebarFilesProps`/`SidebarToolsProps` 等；已移除 `SidebarProps`）
- `components/modules-nav.tsx`：顶部 Modules 导航（非 Agent 模块入口，例如 Sites；竖排 icon + text）
- `components/agent-sub-switcher.tsx`：Agent 面板二级入口 segmented（Chat / Workspace；destination!=agent 时为历史选中态）
- `components/sidebar-section-header.tsx`：内容区标题行（Section title + actions）
- `components/sidebar-create-menu.tsx`：Workspace 子视图创建菜单（+ 下拉：New file / New folder）
- `components/chat-threads-list.tsx`：AgentSub=chat 线程列表（select/rename/delete；可选 onOpenThread）
- `components/sidebar-files.tsx`：文件快捷入口
- `components/sidebar-tools.tsx`：工具区（云同步/设置）
- `components/search-dialog/`：文件搜索对话框（AgentSub=workspace）
- `components/vault-selector/`：Vault 切换与创建

## 约束

- 图标统一使用 Lucide
- 用户可见文案必须为英文
- **不做 props 透传**：Sidebar 顶层通过 workspace contexts（`useWorkspace*`）就地获取数据与动作；仅对少数子组件传递局部 props

## 近期变更

- 回归单一 Sidebar：顶部 Modules（例如 Sites，作为全局入口）+ 下方常驻 Agent 面板（implicit，无显式 Agent 顶层入口）
- 顶部布局顺序：Modules（Sites 等）-> Workspace selector/search -> AgentSub segmented（不再显示 “Agent” 文本标签）
- 搜索入口收敛到顶部 Workspace 行右侧的 Search icon（AgentSub=workspace：打开文件搜索；其它场景：打开 Command Palette）
- Sidebar 创建动作按 AgentSub 收敛：Chat=New thread；Workspace=New file/folder；Sites 无创建入口（交由主面板）
- destination!=agent（如 Sites）时，New thread/New file 视为 Open intent：先回跳到 Agent，再执行创建并聚焦
- Threads/Files/Modules 等列表项在侧栏宽度变化时保持正确截断：超出显示省略号（`min-w-0` + `truncate`）
- Workspace selector 行支持整行点击打开下拉，并提供一致的 hover 背景与 padding
- 云同步 icon 仅在用户登录后显示，未登录时隐藏
- Publish 入口未登录时不再触发站点发布请求，改为引导打开 Account 设置页登录（PublishDialog 仅在打开时挂载）
- Publish 登录校验逻辑收敛到 `workspace/hooks/use-require-login-for-site-publish.ts`
- Vault 切换下拉箭头改为 ChevronDown（无中轴）
- AgentSubSwitcher 补齐可访问性语义：tablist/tab + tabpanel，支持 Arrow/Home/End 键盘切换
