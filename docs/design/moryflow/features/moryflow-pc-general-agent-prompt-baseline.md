---
title: Moryflow PC 通用 Agent Prompt 基线设计（个性化指令）
date: 2026-03-02
scope: docs/design/moryflow/features
status: draft
---

# Moryflow PC 通用 Agent Prompt 基线设计（个性化指令）

## 0. 目标与边界

- 目标：将 Moryflow PC 默认 Agent 定位为“通用执行型 Agent”，写作是核心能力之一，但不是唯一定位。
- 目标：吸收 Manus 的模块化 prompt 结构与执行循环，同时保留 Moryflow 本地工作流能力。
- 目标：将 soul 风格规则直接写入默认 system prompt（不新增独立 `SOUL.md`）。
- 目标：删除设置弹窗里“系统提示词 + 模型参数”外露逻辑，改为“个性化”Tab，提供单一 `自定义指令` 输入区，并注入到 system prompt。
- 边界：本方案按“全新基线”执行，不保留历史兼容逻辑。

## 1. 已确认决策

1. **语言策略**：严格跟随用户语言。
2. **人格规则落地方式**：不单独创建 `SOUL.md`，直接融合进 Prompt。
3. **风格强度**：采用“明确立场 + 简洁表达 + 克制幽默 + 必要时直言”。
4. **设置改造**：删除 `system-prompt` 页与参数覆盖 UI，新增 `personalization` 页，仅保留一个输入项：`自定义指令`。
5. **兼容策略**：不做历史兼容；旧字段直接下线。

## 2. 当前事实源（代码现状）

### 2.1 默认 Prompt 与运行时注入

- 默认 prompt：`packages/agents-runtime/src/prompt/build.ts` 的 `buildSystemPrompt()`，由共享 core prompt 与 `pc-bash-first` 平台 prompt 组成。
- PC 注入路径：`apps/moryflow/pc/src/main/agent-runtime/index.ts` 的 `resolveSystemPrompt()`。
- 当前优先级：
  1. `agentDefinition.systemPrompt`
  2. 默认 core prompt + `pc-bash-first` 平台 prompt
  3. 用户自定义 `personalization.customInstructions`

### 2.2 设置弹窗当前外露范围

- 导航包含 `system-prompt` 分区：`apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`。
- 渲染组件为 `SystemPromptSection`：`.../components/section-content.tsx` + `.../components/system-prompt-section.tsx`。
- 表单与持久化包含 `systemPrompt`、`modelParams`：
  - renderer：`.../settings-dialog/const.ts`、`.../settings-dialog/handle.ts`
  - main：`apps/moryflow/pc/src/main/agent-settings/const.ts`、`normalize.ts`
  - shared 类型：`apps/moryflow/pc/src/shared/ipc/agent-settings.ts`

## 3. 外部参考：Manus Prompt 结构（2026-03-02 采集）

参考来源：

- `Prompt.txt`
- `Modules.txt`
- `Agent loop.txt`
- `tools.json`

可复用模式：

1. 用分段模块描述系统行为（定位、能力、循环、规则）。
2. 强制执行循环（分析 -> 执行 -> 反馈），减少“只回答不推进”。
3. 工具策略与消息节奏明确，避免行为漂移。

## 4. Prompt 新基线设计（目标态）

### 4.1 定位

Mory 是运行在 Moryflow 内的通用执行型 Agent：

- 能研究、能写作、能工程化落地、能用工具推进任务闭环。
- 写作是强项，但默认目标是“完成任务并交付结果”。

### 4.2 结构

Prompt 固定为以下段落：

1. `Identity`
2. `Capabilities`
3. `Execution Loop`
4. `Tool Strategy`
5. `Response Style`
6. `Vibe`（内含 soul 规则）
7. `Safety Boundaries`
8. `Language Policy`（follow user language）

### 4.3 Soul 规则融合（直接入 Prompt）

必须落入 `Response Style` 与 `Vibe`：

1. 直给判断，减少无效保留态。
2. 删除企业手册腔。
3. 禁止模板化开场（`Great question` / `I'd be happy to help` / `Absolutely`）。
4. 简洁优先。
5. 幽默可用但不表演。
6. 可指出错误决策，不拐弯。
7. 允许克制的强表达，不滥用。
8. `Vibe` 结尾保留原句：
   `Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.`

### 4.4 产物落盘规则（直接入 Prompt）

当任务需要创建文档、报告、代码或其它产物时，Prompt 必须强制以下行为：

1. 先扫描用户 Vault 目录结构，再决定写入位置。
2. 优先复用语义匹配的现有目录，禁止默认落到 Vault 根目录。
3. 若无合适目录，先创建语义清晰子目录，再写文件。
4. 多文件产物必须归档到同一任务目录，保证可追踪。

## 5. 设置改造方案（关键）

### 5.1 IA 调整

- 删除原导航项：`system-prompt`。
- 新增导航项：`personalization`（文案：个性化）。
- `personalization` 页面只保留 1 个输入区域：
  - 字段标题：`自定义指令`
  - 控件：多行 `Textarea`
  - 用途：用户输入偏好、写作/输出习惯、行为倾向。

### 5.2 数据结构调整

将 Agent 设置中的“可注入用户偏好”改为显式字段：

- 新增：
  - `personalization.customInstructions: string`
- 删除：
  - `systemPrompt.mode`
  - `systemPrompt.template`
  - `modelParams.temperature/topP/maxTokens`

说明：

- 模型参数回归“模型默认值 + Provider 能力默认”，不再允许用户在设置页覆盖。
- 系统提示词回归内置维护，不再允许用户直接替换。

### 5.3 Prompt 注入策略

运行时按以下顺序拼接（单轨）：

1. 内置 Prompt 新基线（系统维护，固定主干）
2. 用户 `customInstructions`（如果非空，注入 `<custom_instructions>` 块）
3. 可用技能块（`available_skills`）
4. 最终再走 runtime hook（保留既有控制面）

优先级与边界：

- `customInstructions` 是偏好层，不可覆盖安全边界与系统硬约束。
- 不支持“整体替换系统提示词”。
- 产物落盘规则是硬约束，不可被 `customInstructions` 覆盖。

## 6. 代码改造触点（审核通过后实施）

### 6.1 Runtime / Prompt

- `packages/agents-runtime/src/prompt/*`
  - 将默认 prompt 重构为共享 core prompt + 平台 prompt + builder（通用 Agent + soul 规则内嵌）。
- `apps/moryflow/pc/src/main/agent-runtime/index.ts`
  - `resolveSystemPrompt()` 改为注入 `customInstructions`，移除对 `settings.systemPrompt.*` 的依赖。
  - `resolveModelSettings()` 改为不再读取 `settings.modelParams`（默认返回 `undefined` 或仅 agentDefinition 覆盖）。

### 6.2 Main 设置层

- `apps/moryflow/pc/src/shared/ipc/agent-settings.ts`
  - 新增 `personalization` 类型；移除 `systemPrompt/modelParams` 类型。
- `apps/moryflow/pc/src/main/agent-settings/const.ts`
  - schema 与默认值切换到 `personalization.customInstructions`。
- `apps/moryflow/pc/src/main/agent-settings/normalize.ts`
  - 删除旧字段规范化逻辑，直接收敛到新 schema。
- `apps/moryflow/pc/src/main/agent-settings/__tests__/normalize.test.ts`
  - 改为覆盖新 schema 的强约束与降级行为。

### 6.3 Renderer 设置页

- `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`
  - `SettingsSection` 用 `personalization` 替换 `system-prompt`。
  - 表单 schema 删除 `systemPrompt/modelParams`，新增 `personalization.customInstructions`。
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/section-content.tsx`
  - 替换 `SystemPromptSection` 为 `PersonalizationSection`。
- 新增组件：`.../components/personalization-section.tsx`
  - 仅一个 `Textarea` + 标题 `自定义指令`。
- 删除组件：`.../components/system-prompt-section.tsx`。
- `.../settings-dialog/handle.ts`
  - 读写映射切换到 `personalization.customInstructions`。

### 6.4 i18n

- `packages/i18n/src/translations/settings/*.ts`
  - 删除 `systemPrompt*` 相关键。
  - 新增 `personalization`、`personalizationDescription`、`customInstructionsLabel`、`customInstructionsHint`、`customInstructionsPlaceholder`。

## 7. 测试与验收

### 7.1 风险等级

- 本变更涉及共享类型、主进程设置规范化、运行时注入逻辑、设置页结构与多语言，判定为 **L2**。

### 7.2 必测项

1. `resolveSystemPrompt` 拼接回归：
   - 无个性化输入时输出主干 prompt。
   - 有个性化输入时正确注入块。
2. 设置页回归：
   - 不再出现 system prompt 与模型参数 UI。
   - “个性化”Tab 仅有一个输入区。
3. 设置存储回归：
   - 新结构持久化正确。
   - 旧结构输入被直接归一到新默认结构（不保留旧字段语义）。
4. i18n 回归：多语言无缺失 key。

### 7.3 L2 校验命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

## 8. 成功标准

1. 默认 Agent 定位明确为通用 Agent，写作为核心能力之一。
2. Prompt 内置 soul 风格规则，且保留指定结尾原句。
3. 语言策略为“跟随用户语言”。
4. 设置弹窗不再外露系统提示词与参数。
5. 新“个性化”Tab 只保留“自定义指令”输入，并被稳定注入 system prompt。
6. 代码中不再存在对旧 `systemPrompt/modelParams` 设置语义的运行时依赖。
7. Agent 创建文档/产物时，默认会在 Vault 内选择合适目录而非根目录直写。

## 9. 参考

- Manus Prompt 目录：
  - https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools/tree/main/Manus%20Agent%20Tools%20%26%20Prompt
- Manus raw：
  - https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/Manus%20Agent%20Tools%20%26%20Prompt/Prompt.txt
  - https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/Manus%20Agent%20Tools%20%26%20Prompt/Modules.txt
  - https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/Manus%20Agent%20Tools%20%26%20Prompt/Agent%20loop.txt
  - https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/Manus%20Agent%20Tools%20%26%20Prompt/tools.json

## 10. 按步骤执行计划（Runbook）

### 步骤 1：冻结事实源与改造边界

1. 基于本方案第 2 节与第 6 节，先执行一次代码基线扫描，确认当前仍存在以下旧语义入口：`systemPrompt.*`、`modelParams.*`。
2. 输出一份“改造触点清单”（仅文件路径 + 变更类型：新增/修改/删除），作为后续评审事实源。
3. 明确本次不做兼容层：不新增 legacy 字段、不保留旧 UI、不中间态双写。

完成标准：触点清单与本文第 6 节完全一致，且无额外不必要改动。

进度同步（2026-03-02）：✅ 已完成。已确认旧语义入口集中在 `agent-settings`/`agent-runtime`/`settings-dialog`/`i18n settings`，并与第 6 节触点一致。

### 步骤 2：重写默认 Prompt 基线

1. 重构 `packages/agents-runtime/src/prompt/*`，按第 4 节固定结构拆分为 core prompt、platform prompt 与统一 builder。
2. 将 soul 规则直接写入 `Response Style` + `Vibe`，并保留指定结尾原句。
3. 将“产物落盘规则”作为硬约束写入 Prompt 主干。

完成标准：默认 Prompt 可读结构化，且覆盖第 4.1~4.4 全部约束。

进度同步（当前状态）：默认 prompt 已重构为共享 core prompt、平台 prompt 与统一 builder，并内置 soul 规则、执行循环与产物落盘硬约束。

### 步骤 3：收敛 Runtime 注入链路

1. 修改 `apps/moryflow/pc/src/main/agent-runtime/index.ts`：
   - `resolveSystemPrompt()` 改为“内置基线 + customInstructions + available_skills + runtime hook”单轨拼接。
   - 删除对 `settings.systemPrompt.*` 的读取分支。
2. `resolveModelSettings()` 删除 `settings.modelParams` 读取，仅保留模型默认策略（或 agentDefinition 显式覆盖）。

完成标准：运行时不再依赖旧字段语义，且 `customInstructions` 仅作为偏好附加层。

进度同步（2026-03-02）：✅ 已完成。Runtime 侧已切到 `personalization.customInstructions` 注入，`resolveModelSettings` 不再读取 settings 参数覆盖。

### 步骤 4：重构 Main 设置 schema 与归一化

1. 更新 `apps/moryflow/pc/src/shared/ipc/agent-settings.ts`，定义 `personalization.customInstructions`。
2. 更新 `apps/moryflow/pc/src/main/agent-settings/const.ts` 默认值与 schema。
3. 更新 `apps/moryflow/pc/src/main/agent-settings/normalize.ts`，删除旧字段迁移与兜底逻辑，直接收敛到新结构。
4. 更新 `apps/moryflow/pc/src/main/agent-settings/__tests__/normalize.test.ts`，覆盖新 schema 与异常输入降级行为。

完成标准：Main 层输入输出结构统一到 `personalization.customInstructions`，测试可证明旧字段不会残留运行时语义。

进度同步（2026-03-02）：✅ 已完成。Shared IPC 类型、Main schema/defaults、normalize 及对应单测已切换到新结构。

### 步骤 5：重构 Renderer 设置页 IA 与表单

1. 更新 `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`：
   - 导航项 `system-prompt` -> `personalization`。
   - 表单 schema 删除 `systemPrompt/modelParams`，新增 `personalization.customInstructions`。
2. 更新 `.../components/section-content.tsx`：接入 `PersonalizationSection`。
3. 新增 `.../components/personalization-section.tsx`：仅保留“自定义指令”多行输入。
4. 删除 `.../components/system-prompt-section.tsx`。
5. 更新 `.../settings-dialog/handle.ts`，完成新字段读写映射。

完成标准：设置弹窗仅出现“个性化”Tab，且该 Tab 只有一个“自定义指令”输入区。

进度同步（2026-03-02）：✅ 已完成。`system-prompt` 分区已替换为 `personalization`，并新增 `personalization-section.tsx` 单输入区，旧组件已删除。

### 步骤 6：同步 i18n 文案键

1. 修改 `packages/i18n/src/translations/settings/*.ts`：
   - 删除 `systemPrompt*` 相关键。
   - 新增并接入 `personalization`、`personalizationDescription`、`customInstructionsLabel`、`customInstructionsHint`、`customInstructionsPlaceholder`。
2. 跑一次 i18n 键一致性检查（若仓库已有脚本，直接用现有脚本）。

完成标准：多语言无缺失 key、无孤儿 key、UI 不出现回退文案。

进度同步（2026-03-02）：✅ 已完成。EN/ZH-CN/JA/DE/AR 已删除 `systemPrompt*` 键并新增 personalization + customInstructions 系列键。

### 步骤 7：补齐回归测试并执行 L2 校验

1. 按第 7.2 必测项完成/更新对应测试（重点覆盖 Prompt 拼接、设置持久化、UI 展示与 i18n）。
2. 执行 L2 全量校验命令：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

完成标准：三条命令全部通过；若失败，按根因修复后重跑至通过。

进度同步（2026-03-02）：✅ 已完成。新增 Prompt 注入回归测试与设置页 schema 回归测试，`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过。

### 步骤 8：清理残留与文档闭环

1. 全仓搜索并清理旧字段残留引用：`systemPrompt`、`modelParams`（仅保留与本次背景文档相关的说明文本）。
2. 更新受影响目录文档（若存在对应 `CLAUDE.md`，按协议同步更新）。
3. 回读本文件第 8 节“成功标准”，逐条对照实现与测试结果，形成验收记录。

完成标准：代码、测试、文档三者一致，且无旧语义运行时依赖。

进度同步（2026-03-02）：✅ 已完成。旧 `systemPrompt/modelParams` 运行时依赖已清理，仅保留与 Agent Markdown 语义及变更文档相关文本；已同步更新受影响目录 `CLAUDE.md`。

补充进度（2026-03-02 Code Review 收口）：✅ 已移除 `agentDefinition.systemPrompt` 对运行时主干 Prompt 的覆盖能力，`resolveSystemPrompt` 固定以内置基线为起点；并完成全量 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 复检通过。
