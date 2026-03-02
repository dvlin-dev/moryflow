---
title: Moryflow PC 通用 Agent Prompt 新基线方案（个性化指令）
date: 2026-03-02
scope: docs/design/moryflow/features
status: draft
---

# Moryflow PC 通用 Agent Prompt 新基线方案（个性化指令）

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

- 默认 prompt：`packages/agents-runtime/src/prompt.ts` 的 `getMorySystemPrompt()`。
- PC 注入路径：`apps/moryflow/pc/src/main/agent-runtime/index.ts` 的 `resolveSystemPrompt()`。
- 当前优先级：
  1. `agentDefinition.systemPrompt`
  2. 用户自定义 `settings.systemPrompt.template`（mode=custom）
  3. 默认 `getMorySystemPrompt()`

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

- `packages/agents-runtime/src/prompt.ts`
  - 重写 `getMorySystemPrompt()` 为新基线（通用 Agent + soul 规则内嵌）。
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
