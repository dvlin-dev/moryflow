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

- 2026-03-01：模型后思考按钮触发文案简化为仅显示等级（不再拼接参数细节），并继续复用与模型按钮一致的字号/字重/行高样式。
- 2026-03-01：输入框底部工具栏视觉二次收敛：前两枚入口 icon 降粗并统一线性风格（Shield/Infinity），模型/Thinking 文本按钮去除 `text-xs`，发送/语音 icon 轻微增粗，左侧按钮统一垂直中心对齐。
- 2026-03-01：输入框访问模式入口从 `+` 子菜单迁出；新增独立 icon 下拉（`+` 后、模型选择前），按钮图标随模式切换（默认权限=盾牌、完全访问权限=∞）。
- 2026-03-01：访问模式入口细节调整：下拉项移除前置 icon；触发按钮缩小外框并放大内部图标（尤其 `∞`），对齐底部工具栏视觉密度。
- 2026-03-01：修复 assistant 占位渲染边界：仅在运行态最后一条空 assistant 显示 loading；assistant 仅含 file part 时保留消息渲染（不再误隐藏/误显示 loading）；`ConversationSection` 改为按“可见 assistant”计算 `isLastAssistant`，避免隐藏占位后丢失 retry 入口。
- 2026-02-28：删除 `ensureModelIncluded` 幽灵模型注入路径；选中模型若失效，`use-chat-model-selection` 仅在真实可用模型集合中回落选择，不再伪造 `Custom` 占位模型。
- 2026-02-27：Thinking 覆盖缓存改为共享状态单源（`renderer/lib/chat-thinking-overrides.ts`）；`use-chat-model-selection` 删除 `CustomEvent` 监听桥接，改为订阅共享快照并通过 method 写入覆盖等级。
- 2026-02-27：`chat-pane/models.ts` thinking 构建链路改为“模型合同优先”：仅消费模型 `thinking_profile`（云端 rawProfile 或 model-bank model-native）；移除 `sdkType` 默认等级/参数 fallback，无合同稳定 `off-only`。
- 2026-02-26：修复 Chat Pane 黑屏回归：`ChatFooter` 与 `chat-prompt-input` 浮层相关组件移除对象字面量 selector，统一改为原子 selector，避免 zustand v5 `getSnapshot` 引用抖动触发无限更新；新增 `use-chat-pane-footer-store.test.tsx` 回归覆盖等价快照反复同步与原子订阅场景。
- 2026-02-26：修复 `chat-prompt-input` 浮层快照同步性能回归：`onRefreshFiles/onRefreshSkills` 改为 `useCallback` 稳定引用，避免 `chat-prompt-overlay-store` 的 `shouldSync` 每次 render 误判并重复 `setSnapshot`。
- 2026-02-26：分支全量 Code Review follow-up：`chat-pane-footer-store` 与 `chat-prompt-overlay-store` 新增 `shouldSync` 快照比较（overlay labels 改为字段级比较），减少无变化时重复 `setSnapshot`。
- 2026-02-26：修复 thinking UI 回归：`ChatPromptInput` 恢复第二下拉（仅模型支持多等级时显示），新增 `chat-prompt-input-thinking-selector` 子组件与 helper 回归测试，保持 store-first 编排不变。
- 2026-02-26：Store-first 二次改造落地（`SF-1/SF-2`）：新增 `hooks/use-chat-pane-footer-store.ts` 与 `components/chat-prompt-input/chat-prompt-overlay-store.ts`；`ChatFooter/ChatPromptInputOverlays` 改为 selector 就地取数；`FileContextPanel` 新增 `FileContextPanelFromOverlayStore` 包装层，`ChatPane/ChatPromptInput` 改为快照同步层。
- 2026-02-26：模块 B 一次性重构完成：`ChatPane` 逻辑下沉到 `hooks/use-chat-pane-controller.ts`，容器层聚焦布局与组合。
- 2026-02-26：`ChatPromptInput` 拆分为 `use-chat-prompt-input-controller` + `chat-prompt-input-model-selector` + `chat-prompt-input-overlays`，输入状态机与渲染片段解耦。
- 2026-02-26：`ChatMessage` 拆分为 `message-body` / `tool-part` / `message-actions`，消息主体、工具审批、操作区职责分离。
- 2026-02-26：`ChatMessage` 参数收敛：新增 `message-body-model.ts`（`view/edit/tool` 分组模型），`MessageBody` 改为单 `model` 输入，`ToolPart` 改为 `toolModel` 对象输入，减少 props 平铺。
- 2026-02-26：`ChatMessage` 工具相关状态继续下沉到 `use-message-tool-model.ts`（统一 labels/callbacks/desktopAPI 调用），容器层只负责组合模型。
- 2026-02-26：`plus-menu` 改为复用 `PlusSubmenu` 渲染器；`use-chat-sessions` 引入 `chatSessionsRuntime` 显式管理订阅生命周期；`mcp-panel`/`task-hover-panel` 状态渲染改为方法映射；`input-dialog` 增加关闭链路去重与回归测试。
- 2026-02-11：提交链路改为异步发送与即时 UI 清理：发送发起后立即清空输入框文本、selected skill 与临时 context 引用，不再等待 AI 回复结束。
- 2026-02-11：发送成功后自动清空输入区 selected skill；用户消息根据 `message.metadata.chat.selectedSkill` 渲染 skill tag，便于会话回看。
- 2026-02-11：输入框新增 Skills 显式注入链路：`+` 二级菜单 Skills、空输入 `/` Skills 面板、selected skill chip（可移除）。
- 2026-02-11：selected skill 发送前校验启用状态，不可用时英文提示并软降级为普通对话；请求级 agent options 覆盖避免携带旧 skill。
- 2026-02-10：模型分组 helper 统一命名为 `buildModelGroupsFromSettings`，移除旧别名导出。
- 2026-02-10：Streamdown 升级至 v2.2：ChatMessage 流式输出启用逐词动画（仅最后一条 assistant 文本段）。
- 2026-02-10：新增全局检索标记 `STREAMDOWN_ANIM`，便于定位 Streamdown 动画 gating 与生效范围。
- 2026-02-08：useChatSessions 改为共享 store，供 Chat Mode Sidebar 与 ChatPane 复用（activeSession 单一事实来源）。
- 2026-02-09：useChatSessions 增加订阅引用计数，最后一个订阅者卸载时释放 session 事件监听，避免潜在资源泄露或重复监听。
- 2026-02-08：ChatPane 新增 `variant`（`panel`/`mode`），Chat Mode 主视图隐藏 Header/折叠按钮，避免语义不一致。
- 2026-02-08：Chat Mode 主视图内容最大宽度 720px，超出后居中；外层保留 2em padding（底部扣除 Footer 的 `p-3`，避免叠加过大）。
- 2026-02-08：ChatPane 在 `variant` 切换时重算 headerHeight，避免 mode/workspace 切换出现留白或遮挡。
- 2026-02-08：ChatMessage parts 解析复用 `@moryflow/ui/ai/message`（split/clean），避免多端重复实现导致语义漂移。
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
