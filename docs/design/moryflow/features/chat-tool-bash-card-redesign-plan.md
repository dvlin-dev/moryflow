---
title: Chat Tool 渲染重构方案（Codex Bash 交互对齐）
date: 2026-03-05
scope: packages/ui + apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/console
status: completed
---

<!--
[INPUT]:
- 用户诉求：当前 tool 渲染“过于工具化”，希望参考 Codex Bash tool 的信息层级与交互。
- 关键约束：保留可执行语义，弱化开发者面板感；颜色遵循项目设计系统。
- 范围：当前所有 Tool 渲染（Moryflow PC/Mobile + Anyhunt Console）。

[OUTPUT]:
- 单版本（无兼容分支）Tool 渲染重构方案
- 方案对比与推荐路径
- 组件结构、交互规范、端能力矩阵、实施与验收清单

[POS]: Moryflow Features / Tool 渲染统一重构方案（Notion 风格，Bash Card 交互）

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md` 与 `docs/CLAUDE.md`。
-->

# Chat Tool 渲染重构方案（Codex Bash 交互对齐）

## 0. 冻结决策（单版本）

1. 本次采用单版本改造，不保留旧 Tool 卡片样式，不引入兼容开关。
2. Tool Header 固定为两行：第一行“脚本类型”，第二行“执行命令”。
3. 输出区统一为固定最大高度滚动容器，顶部增加模糊蒙版，右上角固定复制按钮。
4. 执行状态统一为右下角悬浮状态标记；删除 Header 前置状态 icon。
5. 删除非必要交互（如下载/打开完整输出等弱价值入口），保留必要动作最小集。

## 1. 现状问题（代码事实）

1. `packages/ui/src/ai/tool.tsx` 当前仍以“参数/结果分段 + 多种专用块”组织，信息密度偏开发者面板。
2. `ToolHeader` 当前有前置状态图标，视觉重心分散，不符合“阅读命令 + 看结果”的主路径。
3. `CommandOutput` 元信息（`cwd/exit/duration/stdout/stderr`）堆叠较多，第一眼不聚焦。
4. Anyhunt Console 与 Mobile 已复用开合策略，但视觉形态尚未统一到同一 Bash 卡片语言。

## 2. 方案对比（2-3 选 1）

### A. 微调现有卡片（不推荐）

1. 只调 spacing/颜色，保留现有分段与结构。
2. 成本低，但“工具化面板”心智仍在，无法达到目标。

### B. 统一 Bash Card 壳层（推荐）

1. 对所有 Tool 统一为 Bash 风格壳层：两行头 + 固定输出窗 + 浮层状态。
2. 非 bash 工具将动作语义映射成“命令行句式”展示。
3. 兼顾一致性与实施成本，可直接覆盖 Web/PC/Mobile。

### C. 终端拟态增强版（不推荐）

1. 增加终端主题、更多视觉装饰、复杂状态动画。
2. 设计成本与维护成本高，偏离“Notion 风格克制”目标。

## 3. 推荐方案（B）详细规范

## 3.1 统一结构

每个 Tool 卡片固定 4 个区块：

1. `Line 1`（左上）：脚本类型标签，如 `Bash`、`Web Fetch`、`File Edit`。
2. `Line 2`：执行命令（单行省略），如 `$ pnpm --filter ... test:unit`。
3. `Output`：固定最大高度滚动区，展示 stdout/stderr/结果文本。
4. `Status`：右下角悬浮执行状态（`Running / Success / Error / Skipped`）。

## 3.2 Header 规范（对应你的 1、2、6 条）

1. 第一行只显示工具类型，不显示前置状态 icon。
2. 第二行只显示命令文本，不叠加多余标签。
3. 展开箭头保留在右侧，作为唯一主交互入口。
4. Header 不再展示 `Preparing/Running` 文案 tooltip，由右下角状态承担状态表达。

## 3.3 输出区规范（对应你的 3 条）

1. 输出区使用固定 `max-height`：
   - Desktop（PC/Web）：`240px`
   - Mobile：`180px`
2. 内容超出后内部滚动，不拉伸外层消息卡片。
3. 输出区顶部常驻一层 `blur mask`（渐隐蒙版），强化“内容可滚动”提示。
4. 输出区右上角固定“复制”按钮，复制当前完整可见输出文本。

## 3.4 状态浮层规范（对应你的 4 条）

1. 状态标记固定在卡片右下角，悬浮于内容之上。
2. 状态仅保留文字 + 低对比底色，不再使用左侧状态图标。
3. 状态映射：
   - `input-streaming/input-available/approval-requested` -> `Running`
   - `output-available` -> `Success`
   - `output-error` -> `Error`
   - `output-denied` -> `Skipped`

## 3.5 简化清单（对应你的 5 条）

1. 删除 Tool 卡片内“下载/打开完整输出”等弱价值入口。
2. 删除工具参数展示区（`ToolInput`）。
3. 删除重复元信息区（`cwd/exit/duration` 的独立块）；必要时内联到命令摘要。
4. 保留业务必要动作：`Apply to file`（仅 diff 工具需要时出现）。

## 3.6 视觉方向（Notion 风格 + 项目色板）

1. 主体采用低对比中性色（基于 `background/muted/border` 变量），避免“终端霓虹风”。
2. 状态色只用于右下角浮层，不进入大面积背景，保证内容可读性优先。
3. 统一圆角与留白节奏：`12px` 外层圆角，`8px` 内层滚动区圆角，遵循现有 UI 系统。
4. 不新增品牌外色系，直接消费项目设计 token（PC/Web 与 Mobile 分别映射到现有主题变量）。

## 4. 不同 Tool 的“命令行句式”统一

1. `bash`：直接显示真实命令。
2. `web_fetch`：`fetch <url>`。
3. `web_search`：`search "<query>"`。
4. `read/write/edit/move/delete`：`<action> <path>`。
5. `todo/update_plan`：`update_plan (<n> tasks)`。
6. 其他动态工具：`run <tool-name>`.

要求：全部通过统一 formatter 生成，避免各端拼接口径漂移。

## 5. 端能力矩阵（强制）

| 能力项                     | Moryflow PC | Moryflow Mobile     | Anyhunt Console |
| -------------------------- | ----------- | ------------------- | --------------- |
| 两行 Header（类型 + 命令） | ✅          | ✅                  | ✅              |
| 固定高度输出滚动区         | ✅          | ✅（较小高度）      | ✅              |
| 顶部模糊蒙版               | ✅          | ✅（RN 渐变层模拟） | ✅              |
| 输出复制按钮               | ✅          | ✅（长按/按钮）     | ✅              |
| 右下角浮层状态             | ✅          | ✅                  | ✅              |
| 删除 Header 前置状态 icon  | ✅          | ✅                  | ✅              |

## 6. 共享逻辑抽离边界（强制）

可复用（共享）：

1. `packages/agents-runtime/src/ui-message/visibility-policy.ts`：开合状态语义。
2. 新增 `packages/agents-runtime/src/ui-message/tool-command-summary.ts`：统一命令句式 formatter。
3. `packages/ui/src/ai/tool.tsx`：Web/PC 通用 Tool 壳层（`ToolSummary` 外层折叠标题 + 内层 Bash Card）。

不可复用（端特有）：

1. Mobile 的 blur/mask 与滚动体验（React Native 实现差异）。
2. PC 的文件相关动作（`Apply to file`）与桌面 API 交互。

## 7. 实施落位（文件级）

1. `packages/ui/src/ai/tool.tsx`：重写 Tool 结构为 Bash Card 布局，删除前置状态 icon 与弱价值入口。
2. `packages/ui/src/ai/code-block.tsx`：复用复制能力到 Tool 输出区右上角。
3. `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx`：接入新壳层，保留审批动作区。
4. `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.tsx`：接入同一结构。
5. `apps/moryflow/mobile/components/ai-elements/tool/{Tool.tsx,ToolHeader.tsx,ToolContent.tsx}`：按同一信息层级重构。

## 8. 验收标准

1. 每个 Tool 卡片第一行都能看到类型，第二行都能看到命令。
2. 输出区高度固定，超长输出仅在内部滚动。
3. 输出区顶部存在可见的模糊蒙版，右上角可复制输出。
4. 右下角状态浮层在执行生命周期中正确变化。
5. Header 左侧状态 icon 全量移除。
6. 下载/打开完整输出等弱价值入口从默认视图移除。

## 9. 风险与缓解

1. 风险：非 bash 工具命令摘要不准确。  
   缓解：统一 formatter + 快照测试覆盖各工具输入形态。
2. 风险：Mobile 端滚动与遮罩实现手感不一致。  
   缓解：单独定义 RN 渐变层与滚动阈值，验收以“可读性一致”而非像素一致为标准。
3. 风险：删减入口影响少量高级用户。  
   缓解：保留必要动作（如 Apply），其余高级入口转为二级菜单（默认隐藏）。

## 10. 执行计划与进度（2026-03-05）

### Step 1（completed）：补齐共享命令摘要能力（TDD）

1. 在 `packages/agents-runtime` 先新增失败测试，覆盖不同 tool 的命令句式摘要。
2. 实现 `tool-command-summary` 并导出。
3. 验证 `@moryflow/agents-runtime` 相关单测通过。

执行结果（2026-03-05）：

1. 已新增 `packages/agents-runtime/src/ui-message/tool-command-summary.ts`。
2. 已新增测试 `packages/agents-runtime/src/__tests__/tool-command-summary.test.ts`。
3. 已完成导出更新：
   - `packages/agents-runtime/src/index.ts`
   - `packages/agents-runtime/package.json`（新增 `./ui-message/tool-command-summary` 子路径）
4. 已验证通过：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/tool-command-summary.test.ts`
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit`

### Step 2（completed）：重构 Web/PC 通用 Tool 壳层（TDD）

1. 在 `packages/ui` 先新增失败测试，覆盖两行 Header、右下状态、固定输出滚动区、复制按钮。
2. 改造 `packages/ui/src/ai/tool.tsx` 为 Bash Card 结构。
3. 删除前置状态 icon 与默认弱价值入口（保留 `Apply to file`）。
4. 验证 `@moryflow/ui` 单测通过。

执行结果（2026-03-05）：

1. 已新增 RED/GREEN 测试：`packages/ui/test/tool-shell-redesign.test.tsx`。
2. 已重构 `packages/ui/src/ai/tool.tsx`：
   - 两行 Header（`scriptType` + `command`）
   - 移除前置状态 icon
   - 固定高度输出滚动区（`data-testid=\"tool-output-scroll\"`）
   - 输出区顶部模糊蒙版 + 右上复制按钮
   - 右下状态浮层（`Running/Success/Error/Skipped`）
   - 保留 `Apply to file` 条件动作
3. 已验证通过：
   - `pnpm --filter @moryflow/ui exec vitest run test/tool-shell-redesign.test.tsx`
   - `pnpm --filter @moryflow/ui test:unit`
   - `pnpm --filter @moryflow/ui typecheck`

### Step 3（completed）：接入 PC / Anyhunt Console / Moryflow Admin

1. 在三个端侧消息组件先补失败测试，覆盖命令摘要透传与状态展示。
2. 接入共享命令摘要，完成 Header 数据透传。
3. 验证受影响前端包单测通过。

执行结果（2026-03-05）：

1. 已完成命令摘要接入：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx`
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.tsx`
   - `apps/moryflow/admin/src/features/chat/components/message-tool.tsx`
2. 三端已移除旧的“去容器化覆盖 className”（`border-0 bg-transparent`），改为使用新的统一 Tool 壳层默认样式。
3. 已补齐 RED/GREEN 测试并通过：
   - `apps/moryflow/pc/.../tool-part.test.tsx`
   - `apps/anyhunt/console/.../message-tool.test.tsx`
   - `apps/moryflow/admin/.../message-tool.test.tsx`
4. 已验证通过：
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/message/tool-part.test.tsx`
   - `pnpm --filter @anyhunt/console exec vitest run src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.test.tsx`
   - `pnpm --filter @moryflow/admin exec vitest run src/features/chat/components/message-tool.test.tsx`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @anyhunt/console typecheck`
   - `pnpm --filter @moryflow/admin typecheck`

### Step 4（completed）：接入 Mobile Tool 渲染

1. 先补失败测试（或组件级快照/行为测试），覆盖同一信息层级。
2. 重构 `ToolHeader/ToolContent`（两行头 + 固定滚动输出区 + 右下状态）。
3. 验证 `@moryflow/mobile` 受影响测试通过。

执行结果（2026-03-05）：

1. 已新增 Mobile 纯函数事实源：
   - `apps/moryflow/mobile/lib/chat/tool-shell.ts`
   - `apps/moryflow/mobile/lib/chat/__tests__/tool-shell.spec.ts`
2. 已完成组件接入：
   - `apps/moryflow/mobile/components/ai-elements/tool/Tool.tsx`
   - `apps/moryflow/mobile/components/ai-elements/tool/ToolHeader.tsx`
   - `apps/moryflow/mobile/components/ai-elements/tool/ToolContent.tsx`
   - `apps/moryflow/mobile/components/ai-elements/tool/const.ts`
3. 已落地交互：
   - 两行 Header（脚本类型 + 命令）
   - 右下状态浮层
   - 固定高度输出滚动区（180）
   - 右上复制按钮与顶部遮罩
4. 已验证：
   - `pnpm --filter @moryflow/mobile test:unit` ✅
   - `pnpm --filter @moryflow/mobile check:type` ⚠️（存在仓库既有基线错误，均位于 `ChatSessionSummary.mode` 相关历史文件，与本次改动文件无直接关联）

### Step 5（completed）：文档回写与最终校验

1. 回写本方案文档“执行结果”与各 Step 完成态。
2. 同步索引文档与对应目录 `CLAUDE.md` 变更记录。
3. 执行最终校验命令并记录结果。

执行结果（2026-03-05）：

1. 已完成文档回写：
   - 本文档 Step 1~5 均标记为 `completed`，并补充每步执行结果。
   - 索引同步：`docs/design/moryflow/features/index.md`、`docs/index.md`。
   - 目录协作文档同步：`docs/CLAUDE.md`。
2. 已完成根级最终校验（同一轮）：
   - `pnpm lint` ✅（退出码 0；含 1 条既有 warning：`apps/moryflow/server/src/auth/auth-social.controller.ts` 的 `@typescript-eslint/require-await`）
   - `pnpm typecheck` ✅（Turbo `24/24` 成功）
   - `pnpm test:unit` ✅（Turbo `22/22` 成功）
3. 结论：本方案的执行计划已全部完成，进入可验收状态。

### Step 6（completed）：外层摘要来源收口（`input.summary` 优先）

1. 共享摘要事实源扩展为 `resolveToolOuterSummary`，输出 `outerSummary + scriptType + command`。
2. 外层标题规则冻结为：优先使用 Tool 内置摘要（`input.summary` 等），缺失时按状态 + 命令句式 fallback。
3. 全端统一结构为“外层摘要可折叠 + 内层 Bash Card”，并移除内层二级折叠触发。

执行结果（2026-03-05）：

1. 共享层已完成：
   - `packages/agents-runtime/src/ui-message/tool-command-summary.ts`
   - `packages/agents-runtime/src/__tests__/tool-command-summary.test.ts`
2. Web/PC 壳层已完成：
   - `packages/ui/src/ai/tool.tsx`（新增 `ToolSummary`，`ToolHeader` 改为纯展示）
   - `packages/ui/test/tool-shell-redesign.test.tsx`
3. 端侧接入已完成：
   - PC：`apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx`
   - Console：`apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.tsx`
   - Admin：`apps/moryflow/admin/src/features/chat/components/message-tool.tsx`
   - Mobile：`apps/moryflow/mobile/components/ai-elements/tool/{Tool.tsx,ToolHeader.tsx}`、`apps/moryflow/mobile/lib/chat/tool-shell.ts`
4. 回归验证已完成：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/tool-command-summary.test.ts` ✅
   - `pnpm --filter @moryflow/ui exec vitest run test/tool-shell-redesign.test.tsx` ✅
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/message/tool-part.test.tsx` ✅
   - `pnpm --filter @anyhunt/console exec vitest run src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.test.tsx` ✅
   - `pnpm --filter @moryflow/admin exec vitest run src/features/chat/components/message-tool.test.tsx` ✅
   - `pnpm --filter @moryflow/mobile test:unit -- lib/chat/__tests__/tool-shell.spec.ts` ✅
5. 类型验证：
   - `@moryflow/ui` / `@moryflow/pc` / `@anyhunt/console` / `@moryflow/admin` / `@moryflow/agents-runtime` typecheck 均通过 ✅
   - `@moryflow/mobile check:type` 仍受仓库既有 `ChatSessionSummary.mode` 基线错误影响（与本次改动无直接关联）⚠️
