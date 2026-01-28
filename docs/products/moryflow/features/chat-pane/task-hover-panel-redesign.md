---
title: Moryflow PC 悬浮任务面板改造方案
date: 2026-02-02
scope: apps/moryflow/pc
status: proposal
---

<!--
[INPUT]: PC Chat Pane 任务悬浮面板现状与交互诉求
[OUTPUT]: 可执行的 UI/交互/状态映射改造方案
[POS]: Moryflow PC Chat Pane 任务面板改造方案

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow PC 悬浮任务面板改造方案

## 背景

- 任务入口已从右上角迁移到输入框上方，形成悬浮面板。
- 现有 hover 展开体验不稳定，且布局/状态显示与预期不符。

## 目标

- 任务面板与输入框等宽、同圆角，并保持轻量与高信息密度。
- 交互改为“点击展开/收起”，取消 hover 展开。
- 初始悬浮态仅展示“当前进行中任务 + 进度 + 展开按钮”。
- 展开后列表与详情采用 Notion 风格：极简、通俗、非专业化呈现。

## 非目标

- 不改动任务数据结构与 TasksStore 协议。
- 不引入新状态类型（仅重映射 UI 状态）。

## 状态机（交互 + 展示）

```
[Hidden]  (no tasks && !loading)
    |
    v
[Collapsed] -- click caret --> [Expanded List]
    ^                           |
    |----------- click ---------|

[Expanded List] -- click row icon --> [Expanded Detail]
      ^                               |
      |----------- click -------------|
```

说明：

- 当有任务或仍在加载时，进入 Collapsed。
- 全部完成后仍保持 Collapsed，但任务项变为“完成态”。
- 没有任务且加载结束时才隐藏面板。

## 布局规范（Collapsed）

**结构：**

```
      (gap = input bottom padding)
            ↓
  +-------------------------------------------------------+
  | [loading] Current Task (truncate)          3/9     >  |
  +-------------------------------------------------------+
  |                                                       |
  |  Input Area (same width + same radius)                |
  |                                                       |
  +-------------------------------------------------------+
```

- 容器：flex 水平布局，**宽度与输入框等宽**，圆角与输入框一致。
- 水平间距：左右留白与输入框一致（同一组 padding/spacing token）。
- 垂直间距：面板与输入框之间留出间距，该值与输入框到底部的间距保持一致。
- 左侧：`flex: 1`，包含 Loading icon + 当前任务标题；标题超出显示省略号。
- 右侧：固定宽度区域，显示 `done/total`（数字对齐，不换行）。
- 末尾：展开 icon（如 `ChevronUp/Down`），点击切换 Expanded。

**建议的结构分区：**

```
[Left Flexible Area: flex-1]
  - Loading icon (in_progress)
  - Task title (truncate)

[Right Fixed Area: w-14 ~ w-16]
  - Progress: 3/9

[Expand Icon Area: w-6]
  - Chevron
```

## 展开列表（Expanded）

**列表区：**

```
  +-------------------------------------------------------+
  | [loading] Current Task (truncate)          3/9     v  |
  |-------------------------------------------------------|
  |  o  Task A                               [>]
  |  o  Task B                               [>]
  |  o  Task C                               [>]
  +-------------------------------------------------------+
```

- 列表采用 `compact row`，每行 32~36px 高度。
- **每行只保留一行内容**：左侧状态图标 + 任务标题（或简介），右侧展开 icon（贴右）。
- 展开 icon 与 Header 的 caret 在同一垂直对齐线，靠最右侧显示。
- 不显示时间/优先级/负责人等专业信息。
- 默认状态隐藏行尾箭头，仅在 hover 该行时显示（不影响点击展开逻辑）。

**Hover 行态示意：**

```
  +-------------------------------------------------------+
  | [loading] Current Task (truncate)          3/9     v  |
  |-------------------------------------------------------|
  | [hover bg] o  Task B                         (arrow)  |
  +-------------------------------------------------------+
```

- hover 时整行出现淡色背景 + 轻圆角，鼠标指针为可点击态。
- 行尾箭头仅在 hover 时显现，位置与 Header caret 对齐。

**详情区（inline expand）：**

```
Task Row
  -> Detail (description only)
      - Full description text
```

- 详情为轻量卡片样式，**只展示任务描述**。
- description 默认两行 + truncation，支持“展开更多”查看全文。
- 点击标题行右侧展开 icon 触发详情展开/收起。

**展开态示意（含详情）：**

```
  +-------------------------------------------------------+
  | [loading] Current Task (truncate)          3/9     v  |
  |-------------------------------------------------------|
  |  o  Task A                               [>]
  |  o  Task B                               [v]
  |     -----------------------------------------------
  |     Detail: This is the full description text...
  |     It can expand to multiple lines as needed.
  |  o  Task C                               [>]
  +-------------------------------------------------------+
```

## UI 状态映射（不改数据结构）

**保留后端状态字段：**
`todo / in_progress / blocked / done / failed / cancelled / archived`

**UI 映射建议：**

| 业务状态    | UI 状态组 | Icon    | 视觉风格               |
| ----------- | --------- | ------- | ---------------------- |
| in_progress | Active    | loading | 主色、文字正常         |
| todo        | Pending   | dot     | 中性色                 |
| blocked     | Blocked   | !       | warning 色             |
| done        | Completed | check   | 文字灰化、背景轻微淡化 |
| failed      | Failed    | x       | destructive 色         |
| cancelled   | Closed    | dot     | 文字灰化、低对比度     |
| archived    | Closed    | dot     | 文字灰化、低对比度     |

**Completed 样式要求（强制）：**

- 圆圈变为对勾（check）
- 任务行整体变灰（文字与图标降低对比度）

## 视觉与动效建议

- 阴影：轻量 `shadow-sm`，展开态可增加 `shadow-md`。
- 背景：`bg-background/95` + `backdrop-blur`。
- 圆角：`rounded-2xl`（与输入框保持一致）。
- 动效：列表与详情展开/收起使用**高度平滑过渡**（`max-height` 或 `grid-rows` 方案）。

## 关键交互细节

- **点击展开**：仅展开列表，取消 hover 逻辑。
- **单行展开**：点击标题后的展开 icon 触发；再次点击收起。
- **Hover 仅做提示**：显示箭头与背景，不触发展开/收起。
- **进度显示**：右侧固定区域显示 `done/total`（仅统计 `done`）。
- **无活动任务**：显示 `Idle`（英文文案）并接入 i18n key。
- **箭头显示**：仅在 hover 该行时显示；非 hover 隐藏。
- **Hover 反馈**：整行淡背景、鼠标指针为可点击态、背景轻圆角与面板一致。

## 例外与边界

- 任务数为 0：默认隐藏面板（除非还在 loading）。
- 仅有已完成任务：仍显示面板，但全部为灰化完成态。
- Loading 中：左侧使用 `Loader` icon，右侧显示 `--/--` 或 `0/0`。

## 组件拆分建议

- `TaskHoverPanel`：容器 + 状态管理（collapsed/expanded）。
- `TaskSummaryBar`：顶部摘要栏（Collapsed 行）。
- `TaskList`：列表渲染。
- `TaskRow`：单行（包含 inline 详情）。
- `TaskDetailInline`：详情块（依赖/备注/文件/更新时间）。

## 已确认

- 完成数统计仅包含 `done`。
- “无活动任务”文案接入 i18n key。
- 详情区允许展开查看完整 description。
- 悬浮面板与输入框等宽、同圆角，垂直间距与输入框底部间距一致。
