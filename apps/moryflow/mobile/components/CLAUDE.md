# Components

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Mobile 端 UI 组件库，提供可复用的界面组件。

## 职责

- 通用 UI 组件（按钮、输入框、对话框等）
- 业务组件（聊天、编辑器、知识库等）
- 认证相关表单组件

## 约束

- 使用 **uniwind**（非 nativewind）作为样式系统
- 禁止使用 `StyleSheet.create`
- 所有颜色必须支持 light/dark 模式，使用 `useThemeColors()` 获取主题色
- 第三方组件（如 `GlassView`、`BlurView`）必须使用 `style` 属性，不支持 `className`

## 成员清单

| 文件/目录      | 类型 | 说明                                     |
| -------------- | ---- | ---------------------------------------- |
| `ui/`          | 目录 | 通用 UI 组件（Button、Input、Dialog 等） |
| `chat/`        | 目录 | 聊天相关组件                             |
| `editor/`      | 目录 | 编辑器组件                               |
| `vault/`       | 目录 | 知识库组件                               |
| `ai-elements/` | 目录 | AI 相关 UI 元素                          |
| `membership/`  | 目录 | 会员相关组件                             |
| `navigation/`  | 目录 | 导航组件                                 |
| `settings/`    | 目录 | 设置相关组件（LanguageSelector 等）      |
| `auth/`        | 目录 | 认证相关组件（登录、注册、验证等）       |
| `user/`        | 目录 | 用户相关组件（头像等）                   |
| `cloud-sync/`  | 目录 | 云同步相关组件                           |

## 样式规范

**正确示例**：

```tsx
// ✅ 原生组件使用 className + style（颜色）
const colors = useThemeColors()
<View className="flex-1 justify-center" style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.textPrimary }}>内容</Text>
</View>

// ✅ 第三方组件使用 style
<GlassView style={{ width: 48, height: 48, borderRadius: 24 }}>
  {children}
</GlassView>
```

**错误示例**：

```tsx
// ❌ 第三方组件使用 className（不生效）
<GlassView className="w-12 h-12 rounded-full">

// ❌ 硬编码颜色（不支持暗黑模式）
<View className="bg-white">
```

## 常见修改场景

| 场景          | 涉及文件    | 注意事项                 |
| ------------- | ----------- | ------------------------ |
| 新增通用组件  | `ui/`       | 遵循 uniwind 样式规范    |
| 修改聊天界面  | `chat/`     | 注意与 lib/chat 的配合   |
| 修改编辑器    | `editor/`   | 注意与 lib/editor 的配合 |
| 修改知识库 UI | `vault/`    | 注意与 lib/vault 的配合  |
| 修改认证表单  | `auth/`     | 使用 react-hook-form     |
| 修改设置相关  | `settings/` | 注意语言选择等设置组件   |
| 修改用户相关  | `user/`     | 用户头像等组件           |

## 近期变更

- Cloud Sync Workspace Sheet 交互收口（2026-03-08）：`components/cloud-sync/workspace-sheet` 的状态卡新增 `hint` 与单一主按钮语义；`needs_recovery/offline/conflict` 分别映射为 `Resume Recovery / Try Again / Open Conflict Copy`，默认只暴露第一条冲突副本入口，保持主路径简洁。
- Chat round timestamps 起点修正（2026-03-06）：`chat/hooks/use-chat-state.ts` 不再按 `submitted/streaming -> ready/error` 状态机边界记录 `startedAt`；改为消费 `lib/chat/assistant-round-timing.ts`，仅在“首个真实 assistant 内容进入 messages”时记录 round-level `startedAt`，结束时再写入 `finishedAt` 并透传给 `assistant-round-persistence`。
- ChatMessageList / MessageBubble 轮次折叠升级（2026-03-06）：`chat/components/ChatMessageList.tsx` 改为按 `summaryAnchorMessageIndex` 插入摘要并透传 `hiddenOrderedPartIndexes`；`chat/MessageBubble.tsx` 在结束态仅渲染可见 assistant parts，支持“最后一条 assistant message 仅保留最后一个结论 part”。
- ChatMessageList 偏好作用域收口（2026-03-06）：`chat/components/ChatMessageList.tsx` 不再在 `threadId` 变化时通过 effect 清空 `manualRoundOpenById`；改为使用共享 `resolveAssistantRoundPreferenceScopeKey` 按 thread/message identity 隔离手动开合偏好，避免 hooks 依赖告警与状态串线。
- ChatScreen 权限模式收口（2026-03-06）：`chat/ChatScreen.tsx` 不再读取 `activeSession.mode`，统一改为消费 `useChatSessions` 的全局 mode，并将输入栏模式切换事件改为更新全局配置。
- Chat 轮次折叠接入（2026-03-06）：`chat/components/ChatMessageList.tsx` 接入 `buildAssistantRoundRenderItems`，实现“运行态全展开、结束态折叠过程消息 + 摘要行可手动开合”；`chat/hooks/use-chat-state.ts` 接入轮次结束 metadata 注入与持久化；新增 `chat/hooks/assistant-round-persistence.ts` 纯函数并由 `lib/chat/__tests__/assistant-round-persistence.spec.ts` 回归覆盖。
- Tool 输出复制链路修复（2026-03-05）：`ai-elements/tool/ToolContent.tsx` 的复制按钮不再直连 `navigator.clipboard`，改为调用 `lib/platform/clipboard.ts`；新增复制反馈定时器清理，避免组件卸载后遗留计时器。
- Cloud Sync review follow-up（2026-03-08）：workspace sheet 的主状态继续保持 `Synced / Syncing / Needs attention` 三态，冲突只作为次级 hint；无绑定离线时唯一动作改为打开设置，而不是 retry。
- Tool Bash Card 组件收口（2026-03-05）：`ai-elements/tool/Tool.tsx`、`ToolHeader.tsx`、`ToolContent.tsx`、`const.ts` 完成结构重构：Header 两行信息层级、右下状态浮层、固定高度输出滚动容器、右上复制入口与顶部遮罩；状态/命令摘要改为消费 `lib/chat/tool-shell.ts`。
- Mobile 类型基线清理（2026-03-03）：`chat/ChatScreen.tsx`、`chat/ChatInputBar/components/InputToolbar.tsx` 会话模式统一为 `ask/full_access`，移除 `agent` 旧值；`chat/ChatInputBar/types/message.ts` 补齐 `ChatMessageMeta` 类型重导出，消除导出断裂。
- Membership/Vault 类型收口（2026-03-03）：`membership/UpgradeSheet.tsx` 为 `requiredTier` 增加 `UserTier` 类型守卫，避免宽字符串索引 `TIER_DISPLAY_NAMES`；`vault/FileList.tsx` 的 iOS `Host` 组件类型补齐 `style`，与实际使用一致。
- Tool 审批结果态修复（2026-03-03）：`chat/ChatScreen.tsx` 按 `approveToolRequest` 结构化结果处理，`already_processed` 并发场景不再 toast 失败；`ai-elements/tool/ToolContent.tsx` 新增“系统已处理”文案分支，点击授权后卡片稳定进入结果态。
- Chat Tool/Reasoning 开合语义根因修复（2026-03-02）：`ai-elements/reasoning/Reasoning.tsx` 与 `ai-elements/tool/Tool.tsx` 删除 `defaultOpen` 手动偏好混用，新增 `ai-elements/open-preference.ts` 统一“自动开合 vs 用户手动偏好”纯函数；保证运行结束后在“未手动展开”场景下立即自动折叠。
- Chat Reasoning 即时折叠收敛（2026-03-02）：`ai-elements/reasoning/Reasoning.tsx` 移除延迟计时器，streaming 结束后立即折叠；保留“用户手动展开优先”规则。
- Chat 对话链路 i18n 二次收口（2026-03-02）：`chat/components/ChatInitBanner.tsx`、`chat/ChatInputBar/components/FilePanel.tsx`、`chat/ChatInputBar/components/ModelSelector.tsx`、`chat/ChatInputBar/components/InputToolbar.tsx`、`chat/ChatInputBar/hooks/use-voice-input.ts`、`chat/TasksSheet.tsx`、`ai-elements/tool-output/CommandOutput.tsx` 移除初始化提示/文件面板空态与占位/模型占位/语音转写提示/任务状态标签/命令输出标签硬编码，统一接入 `chat` 命名空间。
- Chat 对话链路 i18n 补齐（2026-03-02）：`ai-elements/reasoning/Reasoning.tsx`、`chat/MessageBubble.tsx`、`chat/ChatInputBar/index.tsx`、`chat/SessionSwitcher.tsx`、`chat/ModelPickerSheet.tsx`、`chat/TasksSheet.tsx` 移除硬编码文案，统一改为 `chat` 命名空间多语言键；日期时间展示改为按当前语言 locale 格式化。
- Chat Tool/Reasoning 交互收敛（2026-03-02）：`ai-elements/tool` 移除参数区渲染，Tool 在运行态默认展开、完成后立即自动折叠（用户手动展开后不再自动折叠）；`ai-elements/reasoning` 同步该开合语义并改为消息文字流同层样式（无外层容器/独立底色）。
- Chat Tool/Reasoning 共享规则收口（2026-03-02）：`ai-elements/tool/Tool.tsx` 与 `ai-elements/reasoning/Reasoning.tsx` 直接复用 `@moryflow/agents-runtime/ui-message/visibility-policy` 的 `resolveToolOpenState/resolveReasoningOpenState`；删除本地重复状态机文件，组件层仅保留 RN 交互与样式适配。
- MembershipCard 修复 starter 等级展示：从共享 tier 配置读取，避免 starter 回退为 free 样式
- Chat 输入工具栏修复 mode 解构，模式切换确认弹窗稳定可用
- Chat 输入工具栏新增会话模式切换与全权限确认弹窗
- Chat hook 发送前加入 compaction 预处理，避免消息列表与历史错位
- AI Tool 新增权限审批卡（once/always）
- AI ToolOutput 新增截断输出组件与完整内容弹层
- Mobile 图标库切换为 Lucide（`lucide-react-native`），新增 `ui/icons.ts` 统一出口与 `ui/icon.tsx` 封装
- 云同步相关组件状态文案统一为 Syncing/Synced/Needs attention，移除 raw error 展示
- Workspace Sheet 保留唯一 Sync now 入口，状态卡仅展示状态与最后同步时间
- Workspace Sheet 最后同步时间改为 i18n 格式化，避免硬编码中文
- iOS 原生 ContextMenu 组件使用显式类型定义，避免 `any` 与类型漂移
- Chat 组件任务面板收口为 snapshot-only checklist：Header 保留 Tasks 入口，`TasksSheet` 只读展示当前会话 `taskState`，不再包含 detail / refresh / dependencies / files
- Chat 删除会话生命周期收口（2026-03-07）：`ChatScreen.tsx` 删除 active session 前先通过 `lib/chat/session-lifecycle.ts` stop 当前运行，再调用 `useChatSessions().deleteSession()`；避免工具流继续写入已删除 session。
- Chat 会话错误交互收口（2026-03-07）：`ChatScreen.tsx` 现在由 UI 显式承接 `createSession()/deleteSession()` 失败并 toast，`useChatSessions()` 只负责把命令错误上抛，避免 hook 层吞错。
- Chat 组件 Header/TasksSheet 协议标注统一为 CLAUDE.md
- `LiquidGlassTabBar` 以 Tabs 状态为唯一数据源渲染/导航，「快速创建草稿」为独立动作按钮
- `EditorWebView` 注入主题相关样式，确保内容 placeholder 在暗黑模式下可见
- `MessageBubble` 补齐动画 useEffect 依赖，消除 hooks lint 警告
- Auth 表单统一改为 RHF + zod/v3，并新增 `ui/form.tsx`

## 依赖关系

```
components/
├── 依赖 → lib/hooks（自定义 Hooks）
├── 依赖 → lib/stores（状态管理）
├── 样式 → uniwind + useThemeColors()
└── 被依赖 ← app/（页面组件）
```
