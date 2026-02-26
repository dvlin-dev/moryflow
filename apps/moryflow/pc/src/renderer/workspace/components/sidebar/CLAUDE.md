# Sidebar（Workspace）

> 注意：本目录结构变更时必须同步更新本文件

## 定位

工作区左侧栏，负责导航、文件入口、Vault 切换与状态工具区（含云同步/设置）。

## 关键文件

- `index.tsx`：侧边栏入口与整体布局
- `const.ts`：Sidebar 子组件 props 类型（`SidebarFilesProps`/`SidebarToolsProps` 等；已移除 `SidebarProps`）
- `components/modules-nav.tsx`：顶部 Modules 导航（非 Agent 模块入口，例如 Skills/Sites；竖排 icon + text）
- `components/agent-sub-switcher.tsx`：Agent 面板二级入口 segmented（Chat / Workspace；destination!=agent 时为历史选中态）
- `components/sidebar-section-header.tsx`：内容区标题行（Section title + actions）
- `components/sidebar-create-menu.tsx`：Workspace 子视图创建菜单（+ 下拉：New file / New folder）
- `components/chat-threads-list.tsx`：AgentSub=chat 线程列表（select/rename/delete；可选 onOpenThread）
- `components/sidebar-files.tsx`：文件快捷入口
- `components/sidebar-tools.tsx`：工具区（云同步/设置）
- `components/agent-sub-panels.tsx`：`agentSub` 面板分发与 keep-alive 渲染容器
- `hooks/use-sidebar-publish-controller.ts`：发布入口状态与登录门禁（含 `useRequireLoginForSitePublish` 对接）
- `hooks/use-sidebar-panels-store.ts`：`Sidebar -> AgentSubPanels` 面板状态桥接（store-first，selector 取数）
- `components/search-dialog/`：文件搜索对话框（AgentSub=workspace）
- `components/vault-selector/`：Vault 切换与创建

## 约束

- 图标统一使用 Lucide
- 用户可见文案必须为英文
- **不做 props 透传**：Sidebar 顶层通过 workspace contexts（`useWorkspace*`）就地获取数据与动作；仅对少数子组件传递局部 props

## 近期变更

- 2026-02-26：修复 `useSidebarPublishController` 的 `use-require-login-for-site-publish` 相对路径（`../../../hooks/...`），恢复 `@moryflow/pc typecheck`。
- 2026-02-26：Store-first 二次改造落地：新增 `use-sidebar-panels-store`，`AgentSubPanels` 改为 selector 取数，`Sidebar` 仅同步快照，不再向面板平铺 `tree/vault/actions` 大包 props。
- 2026-02-26：模块 C 完成：`Sidebar` 拆分 `agentSub` 面板分发（`AgentSubPanels`）与发布门禁控制器（`useSidebarPublishController`），索引组件回归装配层。
- Threads/Files 行内水平 padding 统一为 `px-2.5`（保留 icon/占位槽 + gap），让两块列表间距与文本起始线保持一致；并通过 `-mx-1` 让激活背景轻微外扩（2026-02-11）
- Threads 列表移除空白前导占位槽（不再预留不可见 icon 位），避免视觉上左侧“假 padding”过大；Files 维持当前样式（2026-02-11）
- 侧栏横向对齐规则进一步收敛：顶部/分隔线/标题/工具区统一复用 `SIDEBAR_GUTTER_X_CLASS`；`Threads/Files` 列表继续独立使用 `SIDEBAR_LIST_INSET_X_CLASS` 维护“文本对齐优先、激活背景可独立”的规则（2026-02-11）
- Modules 顶部新增 `New thread` 快捷项：点击行为与 Threads 区 `+` 一致（回跳 Agent/Chat 并创建会话）。
- Threads/Files 改为由各自列表子容器统一控制左右内边距（inset）：激活背景与外层 gutter 形成分层，避免在线程行内做对齐补丁（2026-02-11）
- 侧栏文本基线统一：Modules 列表项采用统一 `px`，Threads 通过前导占位槽对齐到图标列表文本线，Files 同步行内 `px`，保证三者文字左边线一致（2026-02-11）
- 外层容器横向 gutter 再收敛：统一由 `3.5`（原 `2.5`）控制顶部/分隔线/标题行/工具区左右留白，保持全区垂直对齐（2026-02-11）
- 侧边栏横向对齐收敛：统一父容器 gutter，移除顶部分组/列表容器的嵌套 padding，保证左右边距一致（2026-02-11）
- Workspace selector 交互减重：保留 icon+文本，hover 不再使用背景色，仅做文字/图标颜色反馈（2026-02-11）
- AgentSub 右侧胶囊切换收敛为紧凑尺寸：固定宽度从 92px 收敛到 84px，胶囊高度与图标尺寸同步缩小，避免最小宽度下占比过高（2026-02-11）
- 顶部入口对齐：Search 并入 `Modules` 列表首项（icon+label 与 Skills/Sites 同款样式），保持列表层级一致（2026-02-11）
- Workspace 行恢复“左侧大区 + 右侧固定宽度胶囊切换”：左侧 VaultSelector 为 icon+文本，下拉箭头保留；右侧 AgentSubSwitcher 恢复胶囊样式（2026-02-11）
- 回归单一 Sidebar：顶部 Modules（例如 Sites，作为全局入口）+ 下方常驻 Agent 面板（implicit，无显式 Agent 顶层入口）
- Modules 顺序调整为 Skills 在 Sites 上方，保持入口稳定且符合 C 端“能力在前、发布在后”的信息层级
- 顶部布局顺序：Modules（Search/Skills/Sites）-> Workspace selector + 右侧 AgentSub segmented（不再显示 “Agent” 文本标签）
- Search 入口行为：AgentSub=workspace 打开文件搜索；其它场景打开 Command Palette
- Sidebar 创建动作按 AgentSub 收敛：Chat=New thread；Workspace=New file/folder；Sites 无创建入口（交由主面板）
- destination!=agent（如 Sites）时，New thread/New file 视为 Open intent：先回跳到 Agent，再执行创建并聚焦
- Threads/Files/Modules 等列表项在侧栏宽度变化时保持正确截断：超出显示省略号（`min-w-0` + `truncate`）
- Workspace selector 行支持整行点击打开下拉，采用无背景 hover 的轻量反馈
- 云同步 icon 仅在用户登录后显示，未登录时隐藏
- Publish 入口未登录时不再触发站点发布请求，改为引导打开 Account 设置页登录（PublishDialog 仅在打开时挂载）
- Publish 登录校验逻辑收敛到 `workspace/hooks/use-require-login-for-site-publish.ts`
- Vault 切换下拉箭头改为 ChevronDown（无中轴）
- AgentSubSwitcher 补齐可访问性语义：tablist/tab + tabpanel，支持 Arrow/Home/End 键盘切换
