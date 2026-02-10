# Chat Pane（PC）

## 范围

- 负责聊天区域布局、消息列表与输入框组合
- 集成任务系统：输入框上方悬浮任务面板

## 关键文件

- `index.tsx`：ChatPane 容器与数据协调
- `const.ts`：ChatPane Props 与常量（含 variant：panel/mode）
- `components/chat-footer.tsx`：输入区 + 悬浮任务面板
- `components/conversation-section.tsx`：消息列表渲染（MessageList + 错误提示）
- `components/chat-prompt-input/index.tsx`：输入框主体（+ 菜单 / @ 引用 / 主操作按钮）
- `components/task-hover-panel.tsx`：任务悬浮面板 UI/交互
- `hooks/use-chat-sessions.ts`：会话列表/activeSession 单一数据源（跨组件共享）
- `hooks/use-tasks.ts`：Tasks 数据拉取/订阅

## 近期变更

- 2026-02-10：模型分组 helper 统一命名为 `buildModelGroupsFromSettings`，移除旧别名导出。
- 2026-02-10：Streamdown 升级至 v2.2：ChatMessage 流式输出启用逐词动画（仅最后一条 assistant 文本段）。
- 2026-02-08：useChatSessions 改为共享 store，供 Chat Mode Sidebar 与 ChatPane 复用（activeSession 单一事实来源）。
- 2026-02-09：useChatSessions 增加订阅引用计数，最后一个订阅者卸载时释放 session 事件监听，避免潜在资源泄露或重复监听。
- 2026-02-08：ChatPane 新增 `variant`（`panel`/`mode`），Chat Mode 主视图隐藏 Header/折叠按钮，避免语义不一致。
- 2026-02-08：Chat Mode 主视图内容最大宽度 720px，超出后居中；外层保留 2em padding（底部扣除 Footer 的 `p-3`，避免叠加过大）。
- 2026-02-08：ChatPane 在 `variant` 切换时重算 headerHeight，避免 mode/workspace 切换出现留白或遮挡。
- 2026-02-08：ChatMessage parts 解析复用 `@anyhunt/ui/ai/message`（split/clean），避免多端重复实现导致语义漂移。
- 2026-02-08：ChatPane `handle.ts` 清理未使用的 message parts 工具函数，仅保留 `computeAgentOptions`（单一职责）。
- 2026-02-07：ChatMessage 统一使用 Message（移除 MessageRoot），消息容器不再承担锚点相关逻辑。
- 2026-02-05：恢复 Header 高度透传，修复自动滚动时顶部遮挡。
- 2026-02-05：取消 Header 高度透传，顶部 padding 变量在 PC 侧归零。
- 2026-02-04：移除 assistant-ui 直连 adapter，滚动交互继续由 UI 包实现。
- 2026-02-04：移除 header inset 与 topInset 透传，滚动行为严格对齐 assistant-ui。
- 2026-02-04：移除 scrollReady 透传，滚动时机交由 UI 包的 AutoScroll 处理。
- 2026-02-04：ChatPaneHeader 高度写入 CSS 变量，消息列表顶部 padding 动态对齐。
- 2026-02-03：ChatMessage 切换为 UI 包的 Message 容器（共享消息样式与原语）。
- 2026-02-03：ChatPaneHeader 高度参与消息列表顶部 inset，避免最新消息被 header 遮挡。
- 2026-02-03：会话切换先清空 UI 消息，历史落盘由主进程流持久化，避免 Renderer 覆盖最后回复。
- 2026-02-03：消息 loading 改为 icon 反馈，替换文字 shimmer。
- 2026-02-03：任务面板仅在会话运行且存在执行/阻塞/失败任务时显示，非运行态清理任务状态。
- 2026-02-03：ConversationSection 改为纵向 flex，保证 MessageList 撑满容器且 Footer 贴底。
- 2026-01-28：发送后保留 active 引用文件，@ 面板触发索引随输入变更同步更新。
- 2026-01-28：输入框改造为 “+ 菜单 + 模型选择 + 统一主操作按钮”，并支持 `@` 触发引用面板。
- 2026-01-28：模型选择下拉图标替换为无中轴的 ChevronDown。
- 2026-01-28：模型选择下拉图标尺寸调整为 `size-4.5`，提升可视性。
- 2026-01-28：+ 菜单二级面板改为 `align="end"`，底部对齐触发项并移除手动对齐计算。
- 2026-01-28：语音入口禁用（登出）时强制停止录音并清理资源。
- 2026-01-28：主操作终止图标进一步缩小并保持与发送同色。
- 2026-01-28：任务列表隐藏子项详情与右侧展开图标，列表项仅保留状态 icon + 标题。
- 2026-02-02：悬浮任务面板列表改用子项外边距控制，统一左右留白并新增加载失败提示。
- 2026-02-02：移除未被使用的任务 UI 辅助文件（task-ui.ts）。
- 2026-02-02：子项外侧留白加大，右侧不再贴边且保持图标对齐。
- 2026-02-02：列表项左右间距重新对齐 Header 图标列，避免右侧图标贴边。
- 2026-02-02：悬浮任务面板行内 icon 与 Header 图标对齐，展开态保持高亮与箭头常显，列表间距由子项 margin 控制。
- 2026-02-02：悬浮任务面板 Header 全区域可点击展开/收起。
- 2026-02-02：任务列表子项改为非交互展示，移除 hover 选中状态。
- 2026-02-02：主操作终止图标缩小并保持与发送图标同色。
- 2026-02-02：语音入口仅对登录用户开放，未登录显示不可用发送态。
- 2026-02-02：消息列表切换到 Viewport Following，输入区作为 MessageList footer 注入。
- 2026-02-02：消息列表渲染简化为 index 驱动，移除冗余索引映射。
- 2026-01-28：引用文件面板挂载时仅触发一次最近文件刷新，避免重复请求。
- 2026-01-27：新增输入框上方 hover 展开任务悬浮面板，移除右上角 Tasks 入口。

## 设计约束

- 任务悬浮面板不进入消息流；贴合输入框顶部
- 点击展开列表；点击任务显示 inline 详情
- 结构保持模块化与单一职责
