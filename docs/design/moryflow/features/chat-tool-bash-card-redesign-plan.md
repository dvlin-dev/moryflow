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

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
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
5. `todo/update_plan`：`run <tool-name>`（不再保留 `<n> tasks` 专用格式）。
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

## 10. 当前实现收口

1. 工具摘要事实源已冻结为共享 `resolveToolOuterSummary`：优先消费 Tool 内置摘要，缺失时再按状态与命令句式 fallback。
2. `packages/ui` 的 Tool 壳层已经统一为两行 Header、固定输出滚动区、顶部遮罩、右上复制按钮与右下状态浮层，不再保留旧的前置状态 icon 与弱价值入口。
3. PC、Anyhunt Console、Moryflow Admin 与 Mobile 已全部接入同一结构；端侧不再各自覆盖一套 Tool 卡片布局。
4. 内层 Bash Card 只负责展示与操作，外层摘要负责折叠入口；`Apply to file` 保留为条件动作。
5. 历史步骤、`CLAUDE.md`/docs 回写播报已删除，本文只保留当前 UI 与事实源约束。

## 11. 当前验证基线

1. 共享摘要解析、Web/PC 壳层、Console/Admin 接入与 Mobile Tool 渲染均有对应定向回归。
2. 受影响验证以 `@moryflow/agents-runtime`、`@moryflow/ui`、`@moryflow/pc`、`@anyhunt/console`、`@moryflow/admin`、`@moryflow/mobile` 的 `typecheck/test` 为准。
3. 若根级全量校验存在仓库既有基线，应单独评估，不再在本文重复维护逐轮执行记录。
