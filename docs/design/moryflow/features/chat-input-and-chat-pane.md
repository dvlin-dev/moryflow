---
title: Chat 输入与预对话入口
date: 2026-03-11
scope: apps/moryflow/pc
status: active
---

# Chat 输入与预对话入口

本文是 Moryflow PC Chat Pane 的主事实源，覆盖正式会话输入区、任务面板，以及未进入线程前的 pre-thread 入口。

## 1. 两种进入状态

Chat Pane 当前有两种主状态：

### 1.1 已进入会话

用户已经选中 session，或者已经开始一段新会话。这时主界面是正常对话流，底部使用共享 `ChatComposer`。

### 1.2 Pre-thread

当前没有选中 session 时，显示 `PreThreadView`。它不是单独的一套输入系统，而是“上方引导区 + 底部共享 composer”的组合。

`PreThreadView` 有两个 variant：

- `mode`：主区预对话页，允许展开 Explore 区
- `panel`：侧栏三栏模式，只保留精简卡片，不展开大面板

当前状态源与生命周期固定为：

- `activeSessionId === null` 是 pre-thread 的唯一事实源，不额外维护第二套 `chatViewState`。
- `activeSessionId !== null` 时进入正式 conversation。
- `useChatSessions` hydrate 不会自动创建空会话。
- `openPreThread()` 只负责把当前会话清空并回到预对话页。
- `New chat` 与 `Chat tab` 进入的是同一个 pre-thread，不会先创建空壳 thread。
- 首条消息发送时才创建真实 session，再继续正式 `sendMessage`。

## 2. Pre-thread 当前内容

Pre-thread 的职责不是讲产品故事，而是帮用户尽快起第一条消息。

### 2.1 Get Started

当前固定是 3 个场景卡片：

1. `Write & publish a post`
2. `Build a plan from my ideas`
3. `Create a site page from my vault`

点击卡片只会把默认提示词填进输入框，不会直接发送，也不会绕开用户确认。

### 2.2 Skills

Pre-thread 还会展示一组预装 Skill，当前名单来自静态常量，不是临时拼装：

- `pdf`
- `docx`
- `pptx`
- `xlsx`
- `frontend-design`
- `canvas-design`
- `algorithmic-art`
- `web-artifacts-builder`
- `theme-factory`
- `internal-comms`
- `skill-creator`
- `find-skills`
- `agent-browser`
- `macos-automation`

点击 Skill 卡片同样是填充默认提示词到输入框，不直接发送。

### 2.3 与输入框的连接方式

Pre-thread 和正式会话共用同一个 `ChatComposer`。

- `PreThreadExplorePanel` 通过 `fillInput`
- `PreThreadView` 持有 `ChatComposer` ref
- `ChatComposer` 再把 `fillInput` 转发给 `ChatPromptInput`

这意味着 pre-thread 只负责“给输入框预填内容”，不维护第二套提交逻辑。

## 3. 输入框结构

正式会话和 pre-thread 底部都使用 `ChatPromptInput`。

### 3.1 顶部 chips 行

只有在存在上下文时才显示。当前会进入这一行的内容包括：

- 选中的 Skill
- 编辑器选区引用
- 上传附件
- 手动添加的上下文文件

如果选区内容被截断，还会显示截断提示 badge。

### 3.2 文本输入区

中间是 textarea，本身只负责文本输入；模型、文件、Skill、语音等控制都在 footer。

### 3.3 Footer 左侧

左侧是工具和会话级控制：

- `+` 菜单
- Access Mode
- Model Selector
- Thinking Selector

当语音录制进行中，左侧会切换成 waveform 和时长，不再显示工具条。

### 3.4 Footer 右侧

右侧保留消息级动作和主操作按钮：

- `@` 文件引用入口
- 主操作按钮
- token usage 指示

主操作按钮当前只有一套状态机：

1. 生成中：`Stop`
2. 录音中：`Stop`
3. 有可发送内容：`Send`
4. 无可发送内容且支持语音：`Mic`

## 4. `+` 菜单与 `@` 的边界

`+` 菜单是聚合入口，当前包含：

- 上传文件
- Skills
- MCP
- Reference Files

`@` 是更快的文件引用入口，只负责引用文件，不承载上传、MCP 或 Skill 选择。

两者在文件引用上复用了同一套 `FileContextPanel`，所以默认列表、搜索和去重规则是一致的。

## 5. 文件引用规则

文件引用面板有两种展示模式：

- 默认无搜索词：显示 Recent files
- 输入搜索词后：切到 All files

当前 Recent files 的规则是：

- 按 vault 维度存储
- 只记录最近操作的文件
- 去重后置顶
- 最多保留 3 条
- 文件被删除后会同步清理

相关 IPC 入口仍然是：

- `workspace:getRecentFiles`
- `workspace:recordRecentFile`
- `workspace:removeRecentFile`

## 6. Skill 选择规则

Chat 输入区当前有两类 Skill 入口：

- `+` 菜单里的 Skills
- 输入中的 slash skill 面板

一旦选择 Skill，输入区会出现 Skill chip。这个选择会作为本次消息的 `selectedSkillName` 进入运行时，而不是只做展示。

## 7. Task 面板

Task 面板当前是 active session 的轻量 snapshot，不再是独立任务系统。

### 7.1 显示条件

- `taskState.items.length === 0`：不显示
- 只要当前会话存在 task items：显示摘要栏

### 7.2 交互

- 摘要栏点击展开或收起
- 不再依赖 hover 展开
- `taskState.updatedAt` 变化时自动收起

### 7.3 摘要规则

- 优先显示 `in_progress` 项
- 如果没有 `in_progress`，显示第一项
- 右侧固定显示 `done/total`

### 7.4 列表规则

- 顺序跟随 `taskState.items`
- `done` 项降对比显示
- `note` 只作为行尾补充信息

## 8. 当前边界

- Chat 主文档现在已经吸收 pre-thread；`pre-thread-explore-panel.md` 不再单独维护。
- 本文只写用户可见交互和稳定结构，不写 agent runtime 内部调度细节。
- Quick Chat、编辑器选区引用收敛、Bash Tool Card 等历史专题继续保留各自文档，但不再承担读者理解 Chat 主流程的职责。
- Home / Chat 切换只影响 ChatPane 放置位置，不改变当前聊天内容状态；这一点与导航壳层架构保持一致。

## 9. 代码入口

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-view.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-explore-panel/const.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-composer.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/plus-menu.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/file-context-panel.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/primary-action.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx`
- `apps/moryflow/pc/src/main/workspace/settings/index.ts`
