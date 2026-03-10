# Moryflow PC `newThread` 预对话界面设计

## 目标

- 启动进入 `Agent + Home` 布局时，右侧 Assistant Panel 默认显示 `newThread` 预对话界面。
- `newThread` 不是新 tab，也不是新 route，而是 ChatPane 的未选中 thread 状态。
- 点击 `Chat` tab 或底部 `New chat` 时，都显示同一个 `newThread` 预对话界面。
- 真正的会话仅在首条消息发送时创建，避免空壳 thread。

## 设计决策

### 状态模型

- `sidebarMode` 继续控制 Home / Chat 布局。
- `activeSessionId === null` 作为 `prethread` 的唯一事实源，不额外引入新的全局 `chatViewState` store。
- `activeSessionId !== null` 时进入正式 conversation。

### 启动与切换

- 默认导航状态改为 `destination='agent' + sidebarMode='home'`。
- 启动不再恢复上次 sidebarMode。
- Home / Chat 切换只影响 ChatPane 放置位置，不改变当前聊天内容状态。

### 会话生命周期

- `useChatSessions` hydrate 时不再自动创建 session。
- 新增 `openPreThread()`，用于把当前选中 thread 清空并回到预对话页。
- `New chat` 只调用 `openPreThread()`，不创建 session。
- 首条消息提交时由 controller 先创建 session，再派发真正的 `sendMessage`。

### UI 结构

- 在 ChatPane 内新增 `PreThreadView`。
- `PreThreadView` 复用同一套输入区能力，只新增 Hero 区和 suggestion cards。
- `PreThreadView` 通过 `variant='panel' | 'mode'` 调整宽度与间距，不做双实现。
- 正式对话页继续使用现有 `ConversationSection + ChatFooter`。

### 动画

- `prethread` 和 `conversation` 在 ChatPane 内部用 keyed transition 切换。
- 过渡采用轻量 opacity + translateY，避免 portal 重定位时闪烁。
- `prefers-reduced-motion` 下退化为纯淡入淡出。

## 验收点

- 启动后左侧为 Home tab，右侧显示 `newThread`。
- 在 Home tab 与 Chat tab 间切换时，`newThread` 跟随布局移动，不变成真实 thread。
- 点击 `New chat` 时，保留当前 tab，只把右侧/主区内容切回 `newThread`。
- 首条发送后才生成 thread，并切到正式 conversation。
