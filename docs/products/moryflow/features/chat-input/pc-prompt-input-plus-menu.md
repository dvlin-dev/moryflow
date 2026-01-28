---
title: Moryflow PC 输入框改造（+ 菜单 / @ 引用 / 主按钮统一）
date: 2026-01-28
scope: apps/moryflow/pc
status: proposal
---

<!--
[INPUT]: PC 输入框改造需求（+ 菜单、@ 引用、主操作按钮统一）
[OUTPUT]: 交互逻辑 + 具体改造方案 + 布局/交互示意 + 执行计划
[POS]: Moryflow PC Chat 输入框改造方案（供评审）

[PROTOCOL]: 本文件变更需同步更新 docs/products/moryflow/index.md、docs/index.md、docs/CLAUDE.md。
-->

# Moryflow PC 输入框改造方案（+ 菜单 / @ 引用 / 主按钮统一）

## 核心交互逻辑

1. **底部动作行结构**
   - 左侧仅保留两个入口：
     - **“+” 菜单**：包含上传文件、Agent 模式、引用文件、MCP 管理。
     - **模型选择**：保持现有 ModelSelector 行为。
   - 右侧仅保留 **一个主操作按钮**（语音/发送/终止），视觉样式统一，仅内部 Icon 变化。

2. **“+” 菜单与二级面板**
   - 菜单项：
     - Upload files（直接触发文件选择，无二级面板）。
     - Agent Mode（Hover 右侧二级面板）。
     - Reference files（Hover 右侧二级面板）。
     - MCP（Hover 右侧二级面板）。
   - 二级面板使用“右侧展开”样式，Hover 时显示，鼠标移动到子面板保持展开。
   - **二级面板底部与对应项底部对齐**；若面板更高，则向上延伸（不贴屏幕底部）。

3. **Agent 模式二级面板**
   - 两个选项：
     - Agent
     - Agent (Full Access)
   - 选择即切换，无额外确认弹窗。

4. **@ 触发引用文件面板**
   - **任意位置键入 `@` 即打开引用面板**（面板显示在输入框上方）。
   - 选择文件后自动**移除文本中的 `@`**，并添加到引用文件列表。
   - 引用面板复用当前文件搜索与最近文件逻辑（不新增数据源）。

5. **主操作按钮状态规则（统一样式）**
   - 优先级从高到低：
     1. 生成中 → Stop（终止）
     2. 录音中 → Stop（结束录音）
     3. 有文本或有附件/引用 → Send
     4. 其余 → Mic
   - **按钮外观保持完全一致**：同尺寸、同圆角、同背景/边框/hover，仅图标变化。

6. **占位文案**
   - 输入框 placeholder 改为英文提示，包含 `@` 引用说明：
     - 示例：`Write something... Use @ to reference files`

---

## 具体修改方案（结构与组件划分）

### 1) ChatPromptInput 组件结构收敛

- 现有 `ChatPromptInput` 内底部工具区包含多项入口（Agent、Model、MCP、附件、@、发送）。
- 改造后拆分为三个小组件 + 纯函数工具，降低 JSX 复杂度：
  - `ChatPromptInputPlusMenu`：负责 “+” 菜单与二级面板。
  - `ChatPromptInputPrimaryAction`：统一主操作按钮（Mic/Send/Stop）。
  - `FileContextPanel`：引用文件面板（“+” 菜单与 `@` 触发共用）。
  - `at-mention.ts`：`@` 触发检测与移除工具（纯函数，便于测试）。

### 2) “+” 菜单实现建议

- 使用 Radix DropdownMenu 的 `DropdownMenuSub` + `DropdownMenuSubContent`，天然支持 hover 展开与右侧二级面板。
- 子菜单内容复用/拆分为独立面板：
  - **Agent**：复用现有 mode 切换逻辑，仅 UI 换到子菜单。
  - **Reference files**：提取为 `FileContextPanel`（Command + 列表），在子菜单中展示。
  - **MCP**：提取为 `McpPanel`，在子菜单中展示。

### 3) “@” 触发面板实现建议

- 利用 `usePromptInputController().textInput.value` 监听输入内容，捕获 `@` 触发位。
- 触发时在输入框上方展示 `FileContextPanel`（仅展示面板，不再使用按钮触发）。
- 选择文件后：
  1. 从文本中移除触发的 `@`。
  2. 将文件加入 `contextFiles`。
  3. 关闭面板并保持光标在输入框。

### 4) 主操作按钮统一样式

- 将所有状态按钮统一为：
  - 基于 `InputGroupButton` 或 `PromptInputButton` 的 **固定样式**（同 size / radius / variant）。
  - icon 使用 Lucide，统一 `size-4`。
- 仅替换内部图标：Mic / ArrowUp / SquareStop。

---

## 布局与交互示意

### 1) 结构布局（底部动作行）

```
┌──────────────────────────────────────────────────────────┐
│  [chips row: referenced files + uploads]                │
├──────────────────────────────────────────────────────────┤
│  [ PromptInputTextarea ]                                │
├──────────────────────────────────────────────────────────┤
│  Left:  [+ menu]  [Model Selector]         Right: [●]   │
│                           (● = Primary Action Button)   │
└──────────────────────────────────────────────────────────┘
```

### 2) “+” 菜单与二级面板（Hover 展开）

```
+ Menu
├─ Upload files           (click → open file dialog)
├─ Agent Mode   ─────────────►  Agent
│                              Agent (Full Access)
├─ Reference files ────────►  [Recent / Search file list]
└─ MCP          ───────────►  [Server list + Manage]

Note: 子面板底部与对应项底部对齐，若子面板更高则向上延展。
```

### 3) “@” 触发流程

```
输入任意位置键入 @
          │
          ▼
[输入框上方弹出 Reference files 面板]
          │
          ▼
选择文件 → 插入引用 + 自动移除 @ + 关闭面板
```

---

## 执行计划（按步骤）

1. 在 `ChatPromptInput` 拆分子组件：PlusMenu / PrimaryAction / AtPanel。
2. 将 Agent / Reference / MCP 入口迁移到 “+” 菜单并补齐 Hover 子面板布局。
3. 实现 `@` 触发面板逻辑（监听输入、移除 `@`、复用文件面板）。
4. 统一主操作按钮样式与 icon 规格，按规则切换状态。
5. 更新 placeholder 文案与 i18n key。
6. 补充单元测试（@ 触发、主按钮状态）与执行 `pnpm lint/typecheck/test:unit`。
