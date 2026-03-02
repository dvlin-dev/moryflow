---
title: Moryflow 选中文本 AI 入口收敛方案（删除 Improve，PC 统一右侧 Chat）
date: 2026-03-02
scope: apps/moryflow/pc, packages/tiptap, packages/agents-runtime
status: draft
---

<!--
[INPUT]: Moryflow PC 编辑器选中文本 AI 入口（Improve 下拉 + 二级菜单）与右侧 Chat 输入面板
[OUTPUT]: 单版本交互与技术落地方案（删除 Improve，PC 选区引用统一走右侧 Chat）
[POS]: Moryflow Features / Editor Selection + Chat 引用收敛

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Moryflow PC 选中文本能力收敛方案

## 1. 背景与问题

当前 PC 编辑器在文本选中后会出现 `Improve` 入口，且包含多层二级菜单（改写、翻译、语气等）。同一时期右侧已有统一 Chat 输入面板，导致同一类能力存在两套入口与状态语义：

1. **入口分裂**：编辑器浮动工具栏（Improve）与右侧 Chat 并行，用户需要在“就地改写”和“右侧对话”之间反复切换。
2. **状态分裂**：Improve 直接在编辑器侧发起 AI 行为，右侧 Chat 侧的会话、模型、模式、技能选择无法完整复用。
3. **维护成本高**：同类能力分散在 `packages/tiptap` 与 `apps/moryflow/pc` 两条交互链路，后续策略（权限、模型、日志）需要双处维护。

本方案目标是收敛为**单入口单语义**：编辑器选中文本仅负责“提供引用上下文”，AI 处理统一在右侧 Chat 输入框发起。

## 2. 目标与非目标

### 2.1 目标

1. **完全删除 Improve 功能**（含按钮、下拉、二级菜单及对应渲染链路），在共享包层生效，不保留开关与兼容分支。
2. **PC 端选中文本后自动注入右侧 Chat 引用胶囊**（Notion 同型交互）。
3. **PC 发送时将选中文本作为结构化上下文传入 Agent**，而非拼接污染用户原始输入。
4. **遵循 Store-first**：通过 Zustand 单一状态源在 Editor 与 Chat Pane 间同步“选区引用”。

### 2.2 非目标

1. 本期不为 Mobile/Web 增加“选区引用 -> Chat”替代入口（仅删除 Improve，不补新入口）。
2. 本期不重做 Slash 菜单能力集合（仅收敛“选中文本 Improve”链路）。
3. 本期不改模型/权限计费策略，仅复用现有 Chat 会话策略。

## 3. 目标交互（单版本口径）

1. 全端删除 Improve（浮动工具栏、移动工具栏及其子菜单均移除）。
2. PC 用户在编辑器中选中一段文本后，右侧 Chat 输入框顶部出现引用胶囊（示例：`AI <选中文本预览...>`），支持手动移除。
3. 用户在右侧输入指令（如 “rewrite this shorter”）并发送。
4. 系统以“用户输入 + 选中文本上下文”统一交给 Chat Runtime。
5. 发送后默认清空该次选区引用（避免下一条误带上下文）。

> 旧交互（Improve 按钮 + 下拉 + 子菜单）在共享包层统一删除，不做并存。

## 4. 端能力矩阵与共享边界

| 端             | 目标行为                                       | 是否改动           |
| -------------- | ---------------------------------------------- | ------------------ |
| PC（Electron） | 删除 Improve；新增“选区 -> 右侧 Chat 引用胶囊” | 是（本期完整落地） |
| Web            | 删除 Improve（不新增替代入口）                 | 是（受共享包影响） |
| Mobile         | 删除 Improve（不新增替代入口）                 | 是（受共享包影响） |

### 4.1 共享逻辑抽离边界

- **可复用（packages）**
  - `packages/tiptap`: 浮动工具栏与移动工具栏组件装配能力（本次删除 Improve 装配点）。
  - `packages/agents-runtime`: 继续复用 `context.summary` 注入机制（不新增并行协议）。
- **仅 PC 业务层（apps/moryflow/pc）**
  - 编辑器选区采集与去抖。
  - 右侧 Chat 引用胶囊渲染、发送后清理策略。
  - Chat 折叠面板自动展开策略（如启用）。

## 5. 技术设计

### 5.1 删除 Improve（共享包生效）

### 现状

- Improve 渲染入口：`packages/tiptap/src/ui/floating-toolbar/floating-toolbar.tsx`
- Improve 移动端入口：`packages/tiptap/src/ui/mobile-toolbar/components/main-content.tsx`
- 编辑器挂载点：`packages/tiptap/src/editors/notion-editor/editor-content.tsx`
- PC 业务编辑器：`apps/moryflow/pc/src/renderer/components/editor/index.tsx`

### 改造策略

1. 直接删除 `ImproveDropdown` 在 `floating-toolbar` 与 `mobile-toolbar` 中的装配代码，不新增 `showImproveDropdown` 之类的开关。
2. 清理 Improve 相关死代码（导入、样式、无调用组件与测试）。
3. 删除后保留其余文本格式化能力（Turn Into / Mark / Link 等），确保工具栏职责单一。

该方案遵循“零兼容 + 无历史包袱”：不做隐藏，不保留死代码。

### 5.2 Editor -> Chat 选区引用状态通道

新增 PC 侧状态模块（建议）：

- `apps/moryflow/pc/src/renderer/workspace/stores/editor-selection-reference-store.ts`

建议状态结构：

```ts
type EditorSelectionReference = {
  filePath: string;
  text: string;
  preview: string;
  charCount: number;
  capturedAt: number;
  captureVersion: number;
};
```

约束：

1. 仅接受有效文本选区（过滤空选区、代码块、表格单元格、图片节点）。
2. 统一裁剪上限（`MAX_SELECTION_CHARS = 10000`），超出则截断并标记。
3. 每次有效捕获都要刷新 `captureVersion`（即使同文件同文本再次选中），用于提交成功后的并发安全清理判定。
4. `store` 仅存状态与 setter；业务流程放在 methods（满足 Store-first）。

### 5.3 选区采集（Editor 侧）

在 `NotionEditor` 增加 `activeFilePath` 与 `onSelectionReferenceChange`：

1. 订阅 `editor.on('selectionUpdate')`。
2. 从当前 selection 提取 `doc.textBetween(from, to)`。
3. 归一化（trim + 连续空白折叠用于 preview）。
4. 结合 `activeFilePath` 推送到 `editor-selection-reference-store`。
5. 选区无效时不抖动清空；采用“最新有效选区保留，直到用户移除/发送后清理”的一次性引用模型。

### 5.4 Chat 输入面板引用渲染与提交流水

改造位置：

- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/use-chat-prompt-input-controller.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-controller.ts`

方案：

1. 在输入框 chip 行增加“选区引用胶囊”（复用 `FileChip` 风格，改用引用图标）。
2. 提交 payload 固定增加 `contextSummary` 字段（不引入 `selectionContextSummary` 等别名）。
3. `use-chat-pane-controller` 调用 `computeAgentOptions` 时透传该摘要到 `context.summary`。
4. Runtime 继续走现有 `applyContextToInput`（`packages/agents-runtime/src/context.ts`），不新建兼容协议。
5. 发送成功后仅在“当前引用仍是本次提交使用的 captureVersion”时清空；发送失败保留；手动点 x 也可清空。
6. 若选区超过 1w 字，Chat 侧胶囊需显示“已截断”提示（仅提示，不阻断发送）。

### 5.5 Chat 面板折叠态策略

若用户在 Home 模式下将 Chat 折叠，选中文本后需要保证“右侧可见并可操作”。默认策略：

1. 捕获到有效选区且 `chatCollapsed=true` 时，自动展开一次 Chat 面板。
2. 仅在“无当前引用 -> 首次捕获引用”时触发，避免频繁闪动。

## 6. 数据与协议约束

1. **不新增旧版兼容字段**：仅使用 `AgentChatContext.summary` 作为文本引用通道。
2. **不把选区硬拼到用户输入框文本**：保持用户输入纯净，降低误编辑概率。
3. **长度治理**：选区最大 1w 字，超过上限截断，避免 prompt 膨胀与 token 浪费。
4. **文件一致性**：引用携带 `filePath`，用于后续审计和可能的 UI 提示。

## 7. 实施步骤

1. `packages/tiptap`：删除 floating toolbar 与 mobile toolbar 中的 Improve 装配与相关死代码。
2. `apps/moryflow/pc/editor`：实现选区采集回调与 store 写入。
3. `apps/moryflow/pc/chat-pane`：接入选区引用 chip、提交 payload、发送后清理。
4. `apps/moryflow/pc/workspace`：接入折叠态自动展开。
5. i18n：补充引用胶囊相关文案 key（含超 1w 字截断提示）。
6. 文档与 CLAUDE 同步回写。

## 8. 测试与验收

### 8.1 单元测试（必需）

1. `floating-toolbar/mobile-toolbar`：不再渲染 Improve。
2. `editor selection store`：有效选区写入、空选区不污染、超过 1w 字截断。
3. `chat-prompt-input controller`：引用胶囊渲染、手动移除、发送后清空。
4. `chat-pane-controller`：`contextSummary -> context.summary` 正确透传到 `computeAgentOptions`。

### 8.2 集成/手工回归

1. 选中文本后右侧输入区立即出现引用胶囊。
2. 发送后 AI 回答体现对引用段落的处理，且下一条不自动携带旧引用。
3. Chat 折叠时选中触发展开（仅首次）。
4. 编辑器浮动工具栏不再出现 Improve 与其子菜单。

### 8.3 风险分级

- 本变更属于 **L1（中风险）**：涉及组件交互与状态同步，不改后端核心业务。
- 验证最低要求：受影响包 `typecheck` + `test:unit`。

## 9. 风险与治理

1. **风险：提交并发导致新选区被旧提交误清空**
   - 治理：每次捕获生成单调递增 `captureVersion`；发送成功仅清理与提交快照版本一致的引用。
2. **风险：上下文过长影响回复质量**
   - 治理：统一长度上限 + preview 截断提示。
3. **风险：跨文件切换后引用失真**
   - 治理：文件切换时清理非当前文件引用，或在 UI 明确展示来源文件。
4. **风险：共享包删除 Improve 带来多端行为变化**
   - 治理：在 Web/Mobile 回归中确认“仅移除 Improve，不影响其他工具栏能力”。

## 10. 验收标准（DoD）

1. 各端编辑器工具栏均不再出现 Improve。
2. 选中文本后右侧 Chat 输入区稳定出现引用胶囊，可手动删除。
3. 发送请求包含 `context.summary` 且可在运行时生效。
4. 相关单测与回归测试通过，文档与索引同步完成。

## 11. 实施进度（执行中）

- [x] Step 1（2026-03-02）：`packages/tiptap` 已删除 `floating-toolbar` / `mobile-toolbar` 的 Improve 装配，并移除 `ui/improve-dropdown/*` 死代码。
- [x] Step 2（2026-03-02）：已新增 `editor-selection-reference-store`（1w 截断 + `captureVersion` 身份刷新），并在 `NotionEditor` 接入 `selectionUpdate` 采集。
- [x] Step 3（2026-03-02）：Chat 输入区已接入选区引用胶囊；提交 payload 固定透传 `contextSummary`，发送成功后按 `captureVersion` 精确清理引用（失败保留）。
- [x] Step 4（2026-03-02）：`EditorPanel` 已接入“首次捕获引用且 chat 折叠时自动展开”策略。
- [x] Step 5（2026-03-02）：已补齐文案复用与单测；校验通过 `pnpm --filter @moryflow/pc typecheck`、`pnpm --filter @moryflow/pc test:unit -- src/renderer/workspace/stores/editor-selection-reference-store.test.ts src/renderer/components/chat-pane/components/chat-prompt-input/use-chat-prompt-input-controller.test.tsx`。
