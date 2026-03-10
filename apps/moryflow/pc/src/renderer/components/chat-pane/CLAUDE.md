# Chat Pane（PC）

## 范围

- 负责聊天区域布局、消息列表与输入框组合
- 负责 `prethread` 预对话欢迎页与正式 conversation 的切换
- 集成 session-scoped task checklist：输入框上方悬浮任务面板

## 关键文件

- `index.tsx`：ChatPane 容器与数据协调
- `const.ts`：ChatPane Props 与常量（含 variant：panel/mode）
- `components/pre-thread-view.tsx`：未选中会话时的 `newThread` 预对话界面
- `components/chat-footer.tsx`：输入区 + 悬浮任务面板
- `components/chat-composer.tsx`：共享输入区装配层（footer / prethread 复用）
- `components/conversation-section.tsx`：消息列表渲染（MessageList + 错误提示）
- `components/chat-prompt-input/index.tsx`：输入框主体（+ 菜单 / @ 引用 / 主操作按钮）
- `components/task-hover-panel.tsx`：任务悬浮面板 UI/交互
- `context/chat-pane-runtime-context.tsx`：实例级 chat runtime / composer controller 上下文
- `hooks/use-chat-sessions.ts`：会话列表、`selectedSessionId + draftState + displaySessionId` 与 `openPreThread()` 单一数据源（跨组件共享）

## 设计约束

- 任务悬浮面板不进入消息流；贴合输入框顶部
- `displaySessionId === null` 时渲染 `prethread`；真实选中会话与 `draftState` 分离，不再自动创建空 session
- 点击展开后只展示当前会话 `taskState` checklist；不提供详情、刷新或二次查询
- 结构保持模块化与单一职责
