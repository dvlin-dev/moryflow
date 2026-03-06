---
title: Moryflow 输入框与任务面板规范（合并版）
date: 2026-02-28
scope: apps/moryflow/pc
status: active
---

<!--
[INPUT]: 输入框重构方案、任务悬浮面板改造方案、现有 Chat Pane 交互边界
[OUTPUT]: Chat Pane 交互单一事实源（输入框 + 任务面板）
[POS]: Moryflow Features / Chat Input & Chat Pane

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Chat Input 与 Chat Pane 统一规范

本文合并了原 `pc-prompt-input-refactor` 与 `task-hover-panel-redesign`，后续 Chat Pane 交互改造仅维护本文件。

## 1. 总体目标

1. 输入框降噪：能力控制与消息动作分区明确。
2. 主操作统一：语音/发送/停止固定在同一主按钮位。
3. 任务面板稳定：取消 hover 展开，统一为点击展开/收起。
4. 视觉克制：沿用 Notion 风格（低对比、轻阴影、稳定布局）。

## 2. 输入框规范

### 2.1 布局结构

```text
[File chips row] (仅当存在引用/上传文件时显示)
[Textarea]
Left  : [Mode pill] [Model] [MCP]
Right : [Attach +] [@] [PrimaryAction]
```

约束：

- 左侧只放会话级能力开关（Mode/Model/MCP）。
- 右侧只放消息级动作（Attach/@/Primary）。
- `@` 固定在主操作按钮左侧。

### 2.2 主操作按钮状态优先级

1. 生成中：`Stop`
2. 录音中：`Stop`
3. 文本非空：`Send`
4. 文本为空：`Mic`

主按钮必须保持固定占位，禁止状态切换引发布局抖动。

### 2.3 模式与入口交互

- 模式切换为 dropdown select（Agent / Full Access），不再二次弹窗确认。
- `@` 入口 icon-only，弹层默认展示 Recent，输入后切换全量搜索。
- 附件入口统一为“加号”图标，归入右侧动作区。

### 2.4 文件引用与上传胶囊

- 引用文件与上传文件同一行渲染，视觉完全一致。
- 推荐规格：`h-7 w-36 rounded-full`、`text-xs truncate`。
- 左 icon、右关闭按钮对齐；关闭按钮 hover 才显示。

## 3. 文件选择与 MRU 规则

### 3.1 Recent 与全量搜索

- 默认列表：MRU 最近 3 个文件（per vault）。
- 搜索列表：覆盖工作区全量文件，不局限当前打开树。
- 已引用文件不在默认列表重复显示。

### 3.2 MRU 定义

- 仅“打开/聚焦文件”事件写入 MRU。
- 数据结构：`recentFiles: Record<string, string[]>`。
- 规则：去重后写到队首，仅保留 3 条；文件删除时同步剔除。

### 3.3 IPC 约束

- `workspace:getRecentFiles(vaultPath)`
- `workspace:recordRecentFile(vaultPath, filePath)`
- `workspace:removeRecentFile(vaultPath, filePath)`

## 4. 任务悬浮面板规范

### 4.1 交互状态机

```text
[Hidden] -> [Collapsed] <-> [Expanded List] <-> [Expanded Detail]
```

规则：

- `no tasks && !loading` 时隐藏。
- 有任务或 loading 时显示 Collapsed。
- 展开/收起仅由点击触发，取消 hover 展开。

### 4.2 Collapsed 规范

- 与输入框等宽、同圆角。
- 左侧：当前任务 + loading icon（标题截断）。
- 右侧：固定宽度进度区 `done/total`。
- 最右：caret 展开按钮。

### 4.3 Expanded 规范

- 列表行高 32~36px，单行信息（状态 icon + 标题）。
- 行尾箭头仅 hover 显示；hover 只做视觉提示，不触发展开。
- 详情为 inline 轻量卡片，默认两行，可展开全文。

### 4.4 业务状态到 UI 状态映射

- `in_progress` -> Active
- `todo` -> Pending
- `blocked` -> Blocked
- `done` -> Completed
- `failed` -> Failed
- `cancelled`/`archived` -> Closed

完成态要求：

- 图标改为 check。
- 行文本与图标统一灰化，降低对比度。

## 5. 组件与职责拆分

### 5.1 输入框侧

- `ModeSelector`：模式下拉
- `PrimaryActionButton`：主按钮状态机
- `FooterActions`：左右分区布局
- `FileChip` / `FileChipRow`：文件胶囊渲染

### 5.2 任务面板侧

- `TaskHoverPanel`：容器 + 展开状态
- `TaskSummaryBar`：collapsed 摘要栏
- `TaskList`：列表渲染
- `TaskRow`：行渲染 + 详情开关
- `TaskDetailInline`：详情块

## 6. 状态管理约束

- 共享业务状态遵循 Store-first（Zustand + methods）。
- selector 禁止返回对象/数组字面量。
- `useSync*Store` 写回前必须做等价判断（`shouldSync`）。
- `textareaRef` 仅用于焦点/滚动，文本状态由 `PromptInputProvider` 统一管理。

## 7. 测试与验收

### 7.1 单测最低覆盖

- 主按钮状态优先级（Mic/Send/Stop）
- 模式切换行为（无确认弹窗）
- `@` 默认 Recent 3 条 + 搜索全量
- 文件胶囊 hover/删除交互
- 任务面板状态切换（collapsed/expanded/detail）
- MRU 去重、上限 3 条、删除清理

### 7.2 手工验收

- 录音/发送/停止切换无抖动。
- 展开任务列表只受点击驱动。
- 无任务时面板隐藏；仅完成任务时保持灰化可见。
- 输入框与任务面板宽度、圆角、间距一致。

## 8. 代码索引

- 输入框：`apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/`
- 文件选择：`apps/moryflow/pc/src/renderer/components/chat-pane/components/file-context-adder/`
- 任务面板：`apps/moryflow/pc/src/renderer/components/chat-pane/components/task-hover-panel.tsx`
- workspace recent files：`apps/moryflow/pc/src/main/workspace-settings.ts`
- IPC：`apps/moryflow/pc/src/main/app/ipc-handlers.ts`
