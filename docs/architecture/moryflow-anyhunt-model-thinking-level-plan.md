---
title: Moryflow/Anyhunt 模型思考等级分层方案（对标 OpenCode）
date: 2026-02-26
scope: apps/moryflow/pc + apps/anyhunt/console + packages/agents-runtime + apps/anyhunt/server
status: implemented
---

<!--
[INPUT]:
- 现状：Moryflow 与 Anyhunt 在模型“思考/推理”能力上仅有能力标记或后台静态配置，缺少“按模型独立适配 + 会话显式等级切换”的统一方案。
- 目标：参考 OpenCode，设计最佳实践方案；不考虑历史兼容，允许重构。
- 用户期望交互：选中支持思考的模型后，在模型下拉框右侧出现“思考等级”下拉；支持“关闭 + 多等级切换”。

[OUTPUT]:
- 一份可执行的方案文档：需求分析、前期调研（方法+过程）、技术方案占位、执行计划。
- 执行计划可持续回写进度，作为后续实施的单一事实来源。

[POS]: Moryflow/Anyhunt 模型思考能力改造总方案（调研先行版）。

[PROTOCOL]: 本文件更新需同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/architecture/CLAUDE.md`。
-->

# Moryflow/Anyhunt 模型思考等级分层方案（对标 OpenCode）

## 1. 需求分析

### 1.1 核心问题

1. 不同模型/服务商的思考参数形态不同（`reasoning.effort`、`thinkingConfig.thinkingBudget`、`thinking` 等），当前缺少统一且可扩展的模型级适配层。
2. 输入框缺少显式“思考等级”控制入口，用户无法在会话内快速切换“关闭/低/中/高”等档位。
3. 运行时已有部分 reasoning 能力（如 `packages/agents-runtime`、Anyhunt Server LLM `capabilitiesJson.reasoning`），但没有打通“前端显式选择 -> 请求协议 -> 模型调用”的完整链路。

### 1.2 目标（本方案范围）

1. 按模型独立定义“可用思考等级 + 等级到 provider 参数的映射”，而不是全局硬编码一套参数。
2. 在模型选择器右侧提供“思考等级”下拉，且仅在“当前模型支持思考且存在可选等级”时显示。
3. 思考等级至少包含 `关闭`，并支持模型自定义等级集合（例如 `low/medium/high/max` 或 `minimal/low/high/xhigh`）。
4. 请求层显式传递本次会话选择，运行时只按该选择生效，不依赖隐式推断。

### 1.3 已确认交互（来自需求）

1. 用户在输入框选中支持思考的模型。
2. 模型下拉框右侧出现新的下拉框“思考等级”。
3. 思考等级可在“关闭”与多个等级之间切换。

### 1.4 约束与原则

1. 不考虑历史兼容，可进行结构性重构。
2. 不做历史用户迁移方案（当前按新项目处理）。
3. 优先模块化、单一职责：模型元数据、会话状态、请求协议、provider 参数映射必须分层。
4. 用户可见文案保持英文；开发与文档保持中文。

### 1.5 验收标准（DoD）

1. 支持思考的模型被选中时，输入框区域出现“思考等级”下拉；不支持时不显示该控件。
2. 思考等级选择可稳定透传到运行时，并映射为对应服务商参数。
3. “关闭”必须可选，且能保证本次请求不带 reasoning/thinking 参数。
4. 新增/变更模型时，仅需更新模型配置，不需要改业务编排代码。

## 2. 前期调研

### 2.1 调研方法（如何进行调研）

1. 外部对标：直接阅读 OpenCode 源码（固定 commit），抽取“数据建模、交互入口、请求透传、provider 映射、测试策略”。
2. 本仓盘点：扫描 Moryflow PC、Anyhunt Console、`packages/agents-runtime`、Anyhunt Server LLM 相关代码，确认可复用能力与缺口。
3. 输出方式：形成“对标结论 + 差距清单 + 方案输入约束”，作为技术方案阶段的前置材料。

### 2.2 调研过程（全过程记录）

#### 2.2.1 OpenCode 对标（已完成）

- 调研仓库与版本：
  - 仓库：[anomalyco/opencode](https://github.com/anomalyco/opencode)
  - commit：`b368181ac90b0365af535b3d0bd8284c2032240c`
- 关键代码证据：
  - 前端输入框同时提供模型选择与 variant 选择：
    - [packages/app/src/components/prompt-input.tsx](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/app/src/components/prompt-input.tsx)
  - variant 状态解析与循环逻辑（selected/configured/current）：
    - [packages/app/src/context/model-variant.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/app/src/context/model-variant.ts)
    - [packages/app/src/context/local.tsx](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/app/src/context/local.tsx)
  - 请求透传 `variant`：
    - [packages/app/src/components/prompt-input/submit.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/app/src/components/prompt-input/submit.ts)
    - [packages/opencode/src/session/prompt.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/src/session/prompt.ts)
  - 运行时将 variant 合并到最终 provider options：
    - [packages/opencode/src/session/llm.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/src/session/llm.ts)
  - 按模型/SDK 自动生成 variants（含 OpenAI/Anthropic/Google/Bedrock/OpenRouter 等分支）：
    - [packages/opencode/src/provider/transform.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/src/provider/transform.ts)
  - 支持在配置中覆盖/禁用某些 variants，并有单测保障：
    - [packages/opencode/src/provider/provider.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/src/provider/provider.ts)
    - [packages/opencode/test/provider/provider.test.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/test/provider/provider.test.ts)
    - [packages/opencode/test/provider/transform.test.ts](https://github.com/anomalyco/opencode/blob/b368181ac90b0365af535b3d0bd8284c2032240c/packages/opencode/test/provider/transform.test.ts)

#### 2.2.2 本仓现状盘点（已完成）

1. Moryflow PC 输入框已具备模型下拉，但无思考等级下拉与请求字段：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
   - `apps/moryflow/pc/src/shared/ipc/chat.ts`
2. Moryflow PC 当前已存在两类模型来源：
   - 云端会员模型：`auth-methods.ts -> fetchMembershipModels -> buildMembershipModelGroup`
   - 用户自定义 API Key 模型：`AgentSettings.providers/customProviders -> buildModelGroupsFromSettings`
3. `packages/agents-runtime` 已有 reasoning 类型与 providerOptions 构建器，但未被会话输入显式驱动：
   - `packages/agents-runtime/src/types.ts`
   - `packages/agents-runtime/src/reasoning-config.ts`
   - `packages/agents-runtime/src/model-factory.ts`
4. Anyhunt Console Agent Playground 当前仅支持模型选择，不支持思考等级：
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-run-panel.tsx`
   - `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
5. Anyhunt Server 已支持模型级 reasoning 配置（`capabilitiesJson.reasoning`），但请求级显式思考等级未打通：
   - `apps/anyhunt/server/src/agent/dto/agent.schema.ts`
   - `apps/anyhunt/server/src/llm/llm-language-model.service.ts`
   - `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`

### 2.3 调研结论（作为技术方案输入）

1. OpenCode 的核心可复用思想不是“固定几个等级”，而是“每个模型有自己的 variants 字典 + 前端只渲染当前模型可用项 + 运行时按映射合并参数”。
2. 你们仓库已经具备 reasoning 参数底层能力（Anyhunt Server 与 `packages/agents-runtime`），当前主要缺少统一协议与 UI/状态编排。
3. 最佳实践方向应为“模型能力目录驱动 UI + 请求显式字段 + provider 适配层”，而不是在 UI 层硬编码每家参数。
4. 当前方案可以同时覆盖两类来源：
   - 云端模型下发（Anyhunt Server 管理模型、Moryflow Membership 模型）
   - 用户自定义配置（Moryflow `providers/customProviders` 用户自填 API Key）

## 3. 技术方案

### 3.1 结论先行（本次补齐范围）

1. 本方案明确支持两条链路：
   - 云端模型下发链路：Anyhunt `GET /api/v1/agent/models` 与 Moryflow Membership `/v1/models`。
   - 用户自定义配置链路：Moryflow Settings 中 `providers/customProviders`（用户自己填写 API Key）。
2. 两条链路统一进入同一个 `ModelThinkingProfile` 解析器，保证 UI 与运行时使用同一语义。
3. 思考等级始终走请求级显式字段 `thinking`，不再依赖隐式推断。
4. 所有 provider 参数由独立适配模块生成，UI/业务编排层禁止直接拼接 `reasoning/thinking` 字段。

### 3.2 架构分层（模块化）

- L1 模型源层：采集模型来源（云端 / 本地用户配置）。
- L2 档案层：将原始模型能力解析为统一 `ModelThinkingProfile`。
- L3 交互层：根据当前模型渲染“Thinking level”并维护会话状态。
- L4 协议层：请求显式传递 `thinking`。
- L5 运行时层：将 `thinking` 转换为 provider 参数并调用模型。
- L6 校验与观测层：服务端二次校验、错误返回、日志埋点。

### 3.3 统一数据结构

#### 3.3.1 思考等级与档案

```ts
type ThinkingLevelId =
  | 'off'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'max'
  | 'xhigh'
  | string;

type ThinkingProviderPatch = {
  sdkType: 'openai' | 'openai-compatible' | 'openrouter' | 'anthropic' | 'google' | 'xai';
  patch: Record<string, unknown>;
};

type ThinkingLevelOption = {
  id: ThinkingLevelId;
  label: string; // user-facing, English
  description?: string;
  providerPatches: ThinkingProviderPatch[];
};

type ModelThinkingProfile = {
  modelKey: string; // 全局唯一：provider/model 或 membership:model
  supportsThinking: boolean;
  defaultLevel: ThinkingLevelId;
  levels: ThinkingLevelOption[]; // 必须包含 off
};
```

#### 3.3.2 模型来源归一化

```ts
type ModelSource =
  | 'moryflow-membership-cloud'
  | 'moryflow-local-provider'
  | 'moryflow-local-custom-provider'
  | 'anyhunt-cloud';

type RuntimeModelDescriptor = {
  modelKey: string;
  modelId: string;
  providerId: string;
  providerType: string;
  source: ModelSource;
  displayName: string;
  thinkingProfile: ModelThinkingProfile;
};
```

#### 3.3.3 请求协议（显式）

```ts
type AgentThinkingSelection =
  | { mode: 'off' }
  | { mode: 'level'; level: ThinkingLevelId };

type AgentChatRequestOptions = {
  preferredModelId?: string;
  thinking?: AgentThinkingSelection;
  // existing fields
};
```

约束：

1. `mode='off'` 时不得带 `level`。
2. `mode='level'` 时 `level` 必须在当前模型 profile 内。
3. 客户端应显式传 `thinking`；未传时服务端按 `off` 处理（安全默认）。

### 3.4 模块拆分设计（按职责）

#### M1. 模型源采集模块（Cloud + User Config）

职责：只负责读取模型数据，不处理 thinking 语义。

输入：

1. Moryflow cloud：`fetchMembershipModels()`。
2. Moryflow local：`AgentSettings.providers/customProviders`。
3. Anyhunt cloud：`GET /api/v1/agent/models`。

输出：`RawModelSourceItem[]`。

落点：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/models.ts`
2. `apps/moryflow/pc/src/renderer/lib/server/auth-methods.ts`
3. `apps/anyhunt/server/src/agent/agent-model.service.ts`
4. `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-agent-models.ts`

#### M2. 思考档案解析模块（Thinking Profile Resolver）

职责：把 `capabilities/reasoning/customCapabilities` 解析成统一 `ModelThinkingProfile`。

输入：`RawModelSourceItem` + provider 类型 + 可选显式配置。

输出：`ModelThinkingProfile`。

规则：

1. 必须包含 `off`。
2. `supportsThinking=false` 时只保留 `off`。
3. 对可思考模型生成 provider 对应等级集。
4. 支持云端显式覆盖与本地用户覆盖。

建议落点：

1. `packages/agents-runtime/src/thinking-profile.ts`（新增）
2. `packages/agents-runtime/src/types.ts`（扩展类型）

#### M3. 会话选择状态模块（Per Model）

职责：管理“当前模型选中的 thinking level”，与模型切换联动。

状态：

1. `selectedThinkingByModelKey: Record<string, ThinkingLevelId>`
2. `selectedModelId`
3. `resolvedThinkingProfileByModelKey`

行为：

1. 切模型时恢复该模型上次等级。
2. 首次进入模型默认 `off`；等级失效回退顺序为 `defaultLevel -> off`。
3. 运行中禁用切换，避免一轮参数漂移。

落点：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-model-selection.ts`
2. `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-run-panel.tsx`

#### M4. 输入框交互模块（双下拉）

职责：仅负责展示与交互，不承担协议映射。

要求：

1. 模型下拉右侧新增 `Thinking level` 下拉。
2. 仅当 `levels.length > 1` 时显示。
3. 选项始终包含 `Off`。
4. 文案英文：`Thinking level`、`Off`、`Low`、`Medium`、`High`。

落点：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
2. `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-run-panel.tsx`

#### M5. 请求协议模块（IPC/HTTP）

职责：把 UI 选择转成稳定请求字段。

落点：

1. Moryflow IPC：
   - `apps/moryflow/pc/src/shared/ipc/chat.ts`
   - `apps/moryflow/pc/src/main/chat/agent-options.ts`
   - `apps/moryflow/pc/src/main/chat/chat-request.ts`
2. Anyhunt HTTP：
   - `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
   - `apps/anyhunt/server/src/agent/dto/agent.schema.ts`

#### M6. 运行时适配模块（Thinking -> Provider Params）

职责：把 `thinking` 选择映射成 provider 参数，统一注入模型工厂。

落点：

1. Moryflow runtime：
   - `apps/moryflow/pc/src/main/agent-runtime/index.ts`
   - `packages/agents-runtime/src/reasoning-config.ts`
   - `packages/agents-runtime/src/model-factory.ts`
2. Anyhunt runtime：
   - `apps/anyhunt/server/src/agent/agent.service.ts`
   - `apps/anyhunt/server/src/llm/llm-language-model.service.ts`
   - `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`

#### M7. 服务端校验模块（Boundary Guard）

职责：拒绝非法等级，防止客户端伪造。

规则：

1. 模型不支持 thinking 时，`mode=level` 直接 `400`。
2. level 不在该模型 profile 中时，`400`。
3. 错误文案英文，包含字段路径与可选值。

落点：

1. `apps/anyhunt/server/src/agent/dto/agent.schema.ts`
2. `apps/moryflow/pc/src/main/chat/agent-options.ts`（IPC 边界）

#### M8. 观测与审计模块

职责：记录思考等级选择与实际映射结果（不记录敏感 key）。

日志建议：

1. `modelId`
2. `thinking.mode`
3. `thinking.level`
4. `providerType`
5. `effectivePatch`
6. `requestId`

落点：

1. Moryflow：`main/chat/chat-request.ts`（debug 级别）
2. Anyhunt：`agent/agent.service.ts` + `llm-language-model.service.ts`

### 3.5 云端模型下发链路（明确覆盖）

#### 3.5.1 Anyhunt（已具备基础，需扩展 thinking profile 下发）

现状：`AgentModelService.listModels()` 已返回 `capabilitiesJson`。

改造：

1. 在服务端把 `capabilitiesJson.reasoning` 归一化为 `thinkingProfile`（可保留原字段）。
2. Console 直接消费 `thinkingProfile`，无需前端猜测 provider 细节。
3. 请求体显式携带 `thinking`，服务端再校验并映射。

#### 3.5.2 Moryflow Membership（需补齐云端 thinking 元数据）

现状：`/v1/models` 仅有 `id/display_name/min_tier/available`，未携带 thinking 信息。

改造：

1. Membership 模型接口新增字段：`thinking_profile`（最佳实践：由云端权威下发）。
2. PC 端解析并写入 `ModelThinkingProfile`。
3. `thinking_profile` 为强制契约字段：缺失时视为服务端契约错误，客户端记录 error 并过滤该模型（不进入可选列表）。
4. 云端/服务端与 CI 增加契约校验：任何模型缺失 `thinking_profile` 或不含 `off` 均阻断发布。

### 3.6 用户自定义 API Key 配置链路（明确覆盖）

#### 3.6.1 Moryflow 本地 providers/customProviders

现状：用户可在 Settings 中填写 API Key 并配置模型，且可标记 `customCapabilities.reasoning`。

改造：

1. 在本地模型配置中新增可选 `thinking` 段（建议字段）：

```ts
type ThinkingPatchOpenAI = {
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
};

type ThinkingPatchOpenRouter = {
  effort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  maxTokens?: number;
  exclude?: boolean;
  rawConfig?: Record<string, unknown>;
};

type ThinkingPatchAnthropic = {
  budgetTokens?: number;
};

type ThinkingPatchGoogle = {
  thinkingBudget?: number;
  includeThoughts?: boolean;
};

type UserModelThinkingOverride = {
  defaultLevel?: ThinkingLevelId;
  enabledLevels?: ThinkingLevelId[];
  levelPatches?: Record<
    ThinkingLevelId,
    {
      openai?: ThinkingPatchOpenAI;
      'openai-compatible'?: ThinkingPatchOpenAI;
      xai?: ThinkingPatchOpenAI;
      openrouter?: ThinkingPatchOpenRouter;
      anthropic?: ThinkingPatchAnthropic;
      google?: ThinkingPatchGoogle;
    }
  >;
};
```

2. 若用户未配置 override：按 `sdkType + reasoning capability` 自动生成。
3. 若用户配置 override：以用户配置为准（必须包含 `off`，并通过 provider 级 schema 校验）。
4. 设置页在保存前即校验 `levelPatches`，非法配置直接拒绝，不落库。

#### 3.6.2 Anyhunt Console API Key

1. `ah_` API Key 负责访问 Anyhunt cloud 模型目录与执行 Agent。
2. thinking 等级仍由模型目录（云端）驱动；用户不直接填写上游 provider key。
3. 行为一致性：请求协议与 UI 控件与 Moryflow 对齐。

### 3.7 覆盖优先级（统一规则）

从高到低：

1. 请求显式 `thinking`（本次会话选择）
2. 用户模型 `thinking.levelPatches[currentLevel][provider]`
3. 云端下发 `thinkingProfile`
4. provider 安全钳制（budget/effort 边界、字段白名单）
5. `off`

### 3.8 Provider 映射策略（等级到参数）

| Provider SDK | off | level 映射 |
| --- | --- | --- |
| `openrouter` | 不传 `reasoning` | `reasoning.effort` 或 `reasoning.max_tokens` |
| `anthropic` | 不传 `thinking` | `thinking.type='enabled' + budgetTokens` |
| `google` | 不传 `thinkingConfig` | `thinkingConfig.includeThoughts + thinkingBudget` |
| `openai` | 不传 reasoning 字段 | 映射到 SDK 支持字段（如 `reasoningEffort`） |
| `openai-compatible` | 不传 reasoning 字段 | 网关支持则映射，不支持则降级 `off` 并提示 |
| `xai` | 不传 reasoning 字段 | 先按 openai-compatible 处理，能力确认后再细化 |

强约束：

1. `off` 必须是硬关闭。
2. 不支持细粒度等级的 provider，允许只暴露 `off + high`。
3. 对用户不可见的 provider 不支持场景，UI 不展示可选 thinking 等级。
4. 服务端对非法 level 保持 `400`；客户端遇到该错误自动单次重试 `off`，避免用户硬失败。
5. `levelPatches` 合成顺序固定为：`base(level mapping) -> user patch -> provider clamp`。

### 3.9 关键文件改造清单（按模块）

#### Moryflow PC

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
2. `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-model-selection.ts`
3. `apps/moryflow/pc/src/renderer/components/chat-pane/handle.ts`
4. `apps/moryflow/pc/src/shared/ipc/chat.ts`
5. `apps/moryflow/pc/src/main/chat/agent-options.ts`
6. `apps/moryflow/pc/src/main/chat/chat-request.ts`
7. `apps/moryflow/pc/src/main/agent-runtime/index.ts`
8. `apps/moryflow/pc/src/renderer/components/chat-pane/models.ts`

#### Anyhunt Console

1. `apps/anyhunt/console/src/features/agent-browser-playground/components/agent-run-panel.tsx`
2. `apps/anyhunt/console/src/features/agent-browser-playground/transport/agent-chat-transport.ts`
3. `apps/anyhunt/console/src/features/agent-browser-playground/types.ts`
4. `apps/anyhunt/console/src/features/agent-browser-playground/api.ts`

#### Anyhunt Server

1. `apps/anyhunt/server/src/agent/dto/agent.schema.ts`
2. `apps/anyhunt/server/src/agent/agent.service.ts`
3. `apps/anyhunt/server/src/agent/agent-model.service.ts`
4. `apps/anyhunt/server/src/llm/llm-language-model.service.ts`
5. `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`

#### Shared Runtime

1. `packages/agents-runtime/src/types.ts`
2. `packages/agents-runtime/src/reasoning-config.ts`
3. `packages/agents-runtime/src/model-factory.ts`
4. `packages/agents-runtime/src/thinking-profile.ts`（新增）
5. `packages/agents-runtime/src/thinking-adapter.ts`（新增）

### 3.10 测试矩阵与验收

#### 单元测试

1. `thinking-profile` 生成规则（cloud/custom/auto fallback）。
2. thinking 选择状态机（恢复、失效回退、off 强制）。
3. provider 映射输出（各 sdkType）。
4. schema 校验（非法 level、不支持模型）。

#### 集成测试

1. Moryflow：`renderer -> IPC -> main chat -> runtime/modelFactory`。
2. Anyhunt：`console transport -> DTO -> agent service -> llm service -> provider factory`。

#### E2E

1. 支持 thinking 的模型显示第二下拉。
2. 切换 `Off` 后请求不带 thinking 参数。
3. 切换 `High` 后 provider 收到正确 patch。

#### 风险分级

本改造属于跨端协议 + 运行时映射，按 L2 执行：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

### 3.11 回滚与降级

1. 上线策略：本期默认全开（Moryflow/Anyhunt 均直接上线，不做灰度）。
2. 异常降级：运行时未知等级自动回退 `off`；服务端非法输入返回 `400`。
3. 服务端兜底：未传 `thinking` 一律按 `off`。
4. 应急开关：保留运维级开关能力，仅用于事故止损，不作为日常灰度手段。

### 3.12 已确认产品决策（2026-02-26）

1. 默认思考等级为 `off`。
2. Membership 云端接口 `thinking_profile` 为必填契约；客户端不再做自动推断。
3. 客户端切模型遵循“首次 off + 按模型记忆”；无效等级回退 `defaultLevel -> off`。
4. provider 不支持细粒度 thinking 时 UI 不展示；边界非法由服务端 `400`，客户端自动单次重试 `off`。
5. 实施顺序固定为 `Moryflow -> Anyhunt`。
6. 本期包含“设置 UI”改造（支持用户自定义 API Key 模型的 thinking override）。
7. 上线策略为默认全开，直接上线。
8. `levelPatches` 一次性完整落地（强类型、保存校验、运行时消费、provider clamp）。

## 4. 执行计划（持续更新）

> 强制规则：每完成一个模块，必须回写本节“状态/完成日期/验证结果/备注”。

### 4.1 里程碑拆分

| 里程碑 | 范围 | 输出 | 状态 |
| --- | --- | --- | --- |
| P0 | 类型、协议、核心解析器 | Thinking 类型 + profile resolver + request schema | ✅ 已完成 |
| P1 | Moryflow 全链路（云端+自定义） | PC 双下拉 + IPC + runtime 映射 | ✅ 已完成 |
| P2 | Anyhunt 全链路（云端） | Console 双下拉 + Server 校验映射 | ✅ 已完成 |
| P3 | 测试与观测 | 单测/集成/E2E + 观测 + 回滚验证 | ✅ 已完成 |

### 4.2 模块级执行清单

| 模块 ID | 模块 | 子任务 | 关键文件 | 依赖 | 风险级别 | 验证 | 状态 | 完成日期 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DOC-01 | 文档基线 | 需求/调研/技术方案初稿 | 本文档 | 无 | L0 | 人工 review | ✅ 已完成 | 2026-02-25 | 初稿完成 |
| DOC-02 | 文档深化 | 技术方案与执行计划按模块细化（本次） | 本文档 + 索引 CLAUDE | DOC-01 | L0 | 人工 review | ✅ 已完成 | 2026-02-25 | 已覆盖云端+自定义链路 |
| DOC-03 | 决策冻结 | 回写已确认产品决策（默认 off、Membership thinking_profile、默认全开上线） | 本文档 + 索引 CLAUDE | DOC-02 | L0 | 人工 review | ✅ 已完成 | 2026-02-25 | 可直接进入开发 |
| CORE-01 | 共享类型 | 增加 `ThinkingLevelId`、`ModelThinkingProfile`、`AgentThinkingSelection` | `packages/agents-runtime/src/types.ts` | DOC-02 | L1 | 包内 typecheck + unit | ✅ 已完成 | 2026-02-25 | 已同步 `agents-runtime` + `agents-model-registry` |
| CORE-02 | Profile 解析器 | 实现 `thinking-profile.ts`，支持 cloud/custom/auto 三源 | `packages/agents-runtime/src/thinking-profile.ts` | CORE-01 | L1 | unit | ✅ 已完成 | 2026-02-25 | 已落地 profile 构建与默认等级推导 |
| CORE-03 | Adapter | 实现 `thinking-adapter.ts`，统一 patch 输出 | `packages/agents-runtime/src/thinking-adapter.ts` | CORE-01 | L1 | unit | ✅ 已完成 | 2026-02-25 | 已接入 `model-factory` + `agent-factory` |
| MORY-01 | 模型聚合 | Moryflow 合并 membership + local providers 的 thinking profile | `chat-pane/models.ts` | CORE-02 | L1 | `@anyhunt/moryflow-pc` unit | ✅ 已完成 | 2026-02-25 | 已覆盖 membership + preset/custom provider |
| MORY-02 | 输入框交互 | ChatPromptInput 增加 `Thinking level` 下拉与显示/禁用规则 | `chat-prompt-input/index.tsx` | MORY-01 | L1 | unit + 手工验证 | ✅ 已完成 | 2026-02-25 | 第二下拉与模型切换联动已接入 |
| MORY-03 | 状态与协议 | `use-chat-model-selection` 增加 per-model thinking 状态并透传 IPC | `use-chat-model-selection.ts` `handle.ts` `shared/ipc/chat.ts` | MORY-02 | L1 | typecheck + unit | ✅ 已完成 | 2026-02-25 | 已增加 per-model localStorage 与请求显式字段 |
| MORY-04 | 主进程归一化 | `agent-options`/`chat-request`/`agent-runtime` 接入 thinking | `agent-options.ts` `chat-request.ts` `agent-runtime/index.ts` | MORY-03 CORE-03 | L2 | moryflow-pc unit | ✅ 已完成 | 2026-02-25 | IPC 边界校验与 runtime thinking 透传完成 |
| MORY-05 | 自定义 API Key 覆盖 | `providers/customProviders` 模型配置支持 thinking override | `agent-settings/const.ts` `shared/ipc/agent-settings.ts` | CORE-02 | L2 | schema unit + renderer unit | ✅ 已完成 | 2026-02-25 | 设置 UI + schema + form 映射已落地 |
| CLOUD-01 | Membership 下发扩展 | Membership `/v1/models` 下发 `thinking_profile`（目标全量） | Membership API + `packages/api` types | CORE-02 | L2 | server+client contract test | ✅ 已完成 | 2026-02-25 | server 返回 `thinking_profile`，PC 端已解析接入 |
| ANY-01 | 模型目录下发 | Anyhunt `agent/models` 返回 thinkingProfile | `agent-model.service.ts` | CORE-02 | L2 | anyhunt-server unit | ✅ 已完成 | 2026-02-25 | 模型目录已携带 `thinkingProfile` |
| ANY-02 | Console 交互 | AgentRunPanel 增加 second selector + 状态 | `agent-run-panel.tsx` | ANY-01 | L1 | console unit | ✅ 已完成 | 2026-02-25 | Playground 已支持 model + thinking 双下拉 |
| ANY-03 | Transport 协议 | Console 请求体增加 `thinking` 字段 | `agent-chat-transport.ts` | ANY-02 CORE-01 | L1 | transport unit | ✅ 已完成 | 2026-02-25 | 请求体显式携带 thinking selection |
| ANY-04 | DTO 校验 | Agent DTO 增加 thinking schema 与校验 | `agent.schema.ts` | ANY-03 CORE-01 | L2 | anyhunt-server unit | ✅ 已完成 | 2026-02-25 | Schema 已支持 `off/level` 两种模式 |
| ANY-05 | 运行时映射 | AgentService -> LLM service -> ModelProviderFactory 注入 thinking override | `agent.service.ts` `llm-language-model.service.ts` `model-provider.factory.ts` | ANY-04 CORE-03 | L2 | anyhunt-server unit/integration | ✅ 已完成 | 2026-02-25 | request > model config 优先级已实现 |
| OBS-01 | 观测 | 增加思考等级日志字段与错误码 | server + pc main | MORY-04 ANY-05 | L1 | log snapshot test | ✅ 已完成 | 2026-02-25 | 已补充思考等级相关 debug 日志 |
| TEST-01 | 回归测试 | 补齐 Moryflow/Anyhunt 全链路回归 | 各测试目录 | 全部实现 | L2 | `pnpm lint && pnpm typecheck && pnpm test:unit` | ✅ 已完成 | 2026-02-26 | 三项闸门全部通过（全仓执行） |
| ROLL-01 | 上线与降级 | 默认全开上线 + 自动降级 off + 应急止损预案验证 | 配置与运行时 | TEST-01 | L2 | 手工演练 + unit | ✅ 已完成 | 2026-02-26 | 默认全开策略落地；非法/不支持等级由边界校验或运行时降级 `off` |
| FIX-01 | Anyhunt 规则统一 | 抽离 thinking profile util，移除 `agent-model/llm-language-model` 重复规则 | `agent-model.service.ts` `llm-language-model.service.ts` `llm/thinking-profile.util.ts` | ANY-01 ANY-05 | L2 | anyhunt-server unit + typecheck | ✅ 已完成 | 2026-02-26 | 修复“未知等级静默回退 medium” |
| FIX-02 | Runtime 降级修复 | 未知 thinking level 不再默认映射 `medium`，改为显式降级 `off` | `packages/agents-runtime/src/reasoning-config.ts` | CORE-03 | L2 | agents-runtime unit | ✅ 已完成 | 2026-02-26 | 防止自定义等级误触发默认参数 |
| FIX-03 | Membership 执行链路对齐 | `thinkingProfile` 从 Renderer 显式透传到 IPC/Main/Runtime/ModelFactory | `shared/ipc/chat.ts` `main/chat/agent-options.ts` `main/agent-runtime/index.ts` `packages/agents-runtime/src/model-factory.ts` | MORY-04 CLOUD-01 | L2 | moryflow-pc typecheck + unit | ✅ 已完成 | 2026-02-26 | 执行端不再固定 `openai-compatible` 默认 profile |
| FIX-04 | 回归补测 | 新增 Anyhunt + Runtime + PC 边界回归测试 | `llm-language-model.service.spec.ts` `reasoning-config.test.ts` `thinking-adapter.test.ts` `agent-options.test.ts` `handle.test.ts` | FIX-01 FIX-02 FIX-03 | L2 | 目标包 unit + 全仓 test:unit | ✅ 已完成 | 2026-02-26 | 覆盖自定义等级映射/降级/profile 归一化透传 |
| DOC-04 | 决策升级回写 | 回写“thinking_profile 强制契约 + levelPatches 一次性落地 + 默认 off 直觉化规则” | 本文档 + docs 索引 | DOC-03 | L0 | 人工 review | ✅ 已完成 | 2026-02-26 | 已同步 `docs/index.md` 与 docs 架构索引 |
| CLOUD-02 | Membership 契约强制化 | `/v1/models` 全量强制下发 `thinking_profile`，缺失即阻断 | `apps/moryflow/server/src/ai-proxy/*` `packages/api/src/membership/*` | DOC-04 | L2 | server unit/e2e + contract test | ✅ 已完成 | 2026-02-26 | `thinking_profile` 改为强制契约，服务端新增契约守卫（e2e 断言已补，当前环境 Docker 不可用未实跑） |
| MORY-06 | 客户端契约守卫 | PC 端缺失 `thinking_profile` 记 error 并过滤模型；默认等级改为首次 off | `auth-methods.ts` `chat-pane/models.ts` `use-chat-model-selection.ts` | CLOUD-02 | L2 | moryflow-pc unit | ✅ 已完成 | 2026-02-26 | 已实现“首次 off + 模型记忆 + 失效回退” |
| CORE-04 | levelPatches 强类型 | shared/runtime 类型与 schema 升级为 provider typed patch | `packages/agents-*` `agent-settings/*` `settings-dialog/*` | DOC-04 | L2 | typecheck + unit | ✅ 已完成 | 2026-02-26 | provider 级 patch 类型与 schema 校验已落地 |
| CORE-05 | levelPatches 运行时消费 | 实现 `base -> user patch -> clamp` 并统一注入 provider options | `thinking-adapter.ts` `reasoning-config.ts` `model-factory.ts` | CORE-04 | L2 | agents-runtime unit | ✅ 已完成 | 2026-02-26 | adapter 按 `base -> patch -> clamp` 固化 |
| ANY-06 | Server 默认 off + 客户端重试 | Anyhunt 未传 thinking 默认 off；400 thinking 错误自动单次重试 off | `llm-language-model.service.ts` `agent-chat-transport.ts` | ANY-05 CORE-05 | L2 | anyhunt-server/console unit | ✅ 已完成 | 2026-02-26 | 未传 thinking 不再隐式启用，客户端单次降级重试 `off` |
| TEST-02 | 全量回归 | 覆盖新契约、patch、降级与重试场景并跑全仓闸门 | 相关测试目录 | CLOUD-02 MORY-06 CORE-05 ANY-06 | L2 | `pnpm lint && pnpm typecheck && pnpm test:unit` | ✅ 已完成 | 2026-02-26 | 全仓三项闸门通过 |
| REVIEW-01 | PR 评论分级 | 核对 PR#97 评论有效性并形成修复清单 | PR#97 comments + 相关源码 | TEST-02 | L1 | 人工 review | ✅ 已完成 | 2026-02-26 | 结论：SSE 阻塞/patch 优先级/runtime thinking 生效问题均需修复 |
| FIX-05 | Console SSE 非阻塞 | thinking=level 场景仅在 `status=400` 读取 response body，避免 200 SSE 被 drain | `agent-chat-transport.ts` `agent-chat-transport.test.ts` | REVIEW-01 | L2 | console unit + typecheck | ✅ 已完成 | 2026-02-26 | 修复 realtime streaming 被阻塞问题 |
| FIX-06 | Server patch 优先级 | `generic -> provider -> direct` 固化合并顺序，保证 provider patch 不被覆盖 | `thinking-profile.util.ts` `thinking-profile.util.spec.ts` | REVIEW-01 | L2 | anyhunt-server unit + typecheck | ✅ 已完成 | 2026-02-26 | 与“provider 特化高于通用默认”契约一致 |
| FIX-07 | Runtime thinking 下发 | Anthropic/Google 在 model 构建阶段注入 thinking 参数；Agent 调用链注入 providerOptions | `model-factory.ts` `agent-factory.ts` `model-factory.test.ts` `agent-factory.test.ts` | REVIEW-01 | L2 | agents-runtime unit + tsc | ✅ 已完成 | 2026-02-26 | 修复“计算了 reasoning 但调用未生效”风险 |
| TEST-03 | PR 评论回归 | 聚焦回归执行（console/server/runtime）并确认修复闭环 | 相关测试目录 | FIX-05 FIX-06 FIX-07 | L2 | 受影响包 unit + typecheck | ✅ 已完成 | 2026-02-26 | 三端受影响用例全部通过 |
| REVIEW-02 | PR 新评论核对 | 核对新增评论（dead fallback、重复查询）并输出修复方案 | PR#97 comments + 相关源码 | TEST-03 | L1 | 人工 review | ✅ 已完成 | 2026-02-26 | 结论：两条评论均成立且应修复 |
| FIX-08 | Runtime 默认值修复 | `supportsThinking` 移除不可达回退，未配置 capability 默认 `true` | `model-factory.ts` `model-factory.test.ts` | REVIEW-02 | L2 | agents-runtime unit + tsc | ✅ 已完成 | 2026-02-26 | 显式 `false` 仍会降级 `off`，未配置保持可思考 |
| FIX-09 | Server 查询去重 | 移除 `getAllModelsWithAccess` 内重复契约预检查询并补回归 | `ai-proxy.service.ts` `ai-proxy.service.spec.ts` | REVIEW-02 | L2 | moryflow-server unit + typecheck | ✅ 已完成 | 2026-02-26 | `/v1/models` 路径数据库查询降为一次 |
| TEST-04 | 增量回归 | 执行本轮受影响包测试与类型检查，确认修复闭环 | 相关测试目录 | FIX-08 FIX-09 | L2 | 受影响包 unit + typecheck | ✅ 已完成 | 2026-02-26 | agents-runtime + moryflow/server 受影响用例通过 |

### 4.3 执行顺序与并行策略

1. 串行必选：`CORE-01 -> CORE-02 -> CORE-03`。
2. 可并行：`MORY-*` 与 `ANY-*` 在 core 完成后并行。
3. `CLOUD-01` 可与 `ANY-*` 并行，但上线前必须完成 contract 对齐。
4. `TEST-01` 必须在所有功能模块完成后执行。

### 4.4 进度回写模板（每步完成都要填）

- 模块 ID：
- 状态：`✅ 已完成 / 🚧 进行中 / ⏳ 待开始 / ❌ 阻塞`
- 完成日期：
- 验证结果：
- 影响范围：
- 备注（风险/回滚点）：

### 4.5 当前进度快照

1. `DOC-01`：✅ 已完成（2026-02-25）
2. `DOC-02`：✅ 已完成（2026-02-25）
3. `DOC-03`：✅ 已完成（2026-02-25）
4. `CORE-01`：✅ 已完成（2026-02-25）
5. `CORE-02`：✅ 已完成（2026-02-25）
6. `CORE-03`：✅ 已完成（2026-02-25）
7. `MORY-01`：✅ 已完成（2026-02-25）
8. `MORY-02`：✅ 已完成（2026-02-25）
9. `MORY-03`：✅ 已完成（2026-02-25）
10. `MORY-04`：✅ 已完成（2026-02-25）
11. `MORY-05`：✅ 已完成（2026-02-25）
12. `CLOUD-01`：✅ 已完成（2026-02-25）
13. `ANY-01`：✅ 已完成（2026-02-25）
14. `ANY-02`：✅ 已完成（2026-02-25）
15. `ANY-03`：✅ 已完成（2026-02-25）
16. `ANY-04`：✅ 已完成（2026-02-25）
17. `ANY-05`：✅ 已完成（2026-02-25）
18. `OBS-01`：✅ 已完成（2026-02-25）
19. `TEST-01`：✅ 已完成（2026-02-26）
20. `ROLL-01`：✅ 已完成（2026-02-26）
21. `FIX-01`：✅ 已完成（2026-02-26）
22. `FIX-02`：✅ 已完成（2026-02-26）
23. `FIX-03`：✅ 已完成（2026-02-26）
24. `FIX-04`：✅ 已完成（2026-02-26）
25. `DOC-04`：✅ 已完成（2026-02-26）
26. `CLOUD-02`：✅ 已完成（2026-02-26）
27. `MORY-06`：✅ 已完成（2026-02-26）
28. `CORE-04`：✅ 已完成（2026-02-26）
29. `CORE-05`：✅ 已完成（2026-02-26）
30. `ANY-06`：✅ 已完成（2026-02-26）
31. `TEST-02`：✅ 已完成（2026-02-26）
32. `REVIEW-01`：✅ 已完成（2026-02-26）
33. `FIX-05`：✅ 已完成（2026-02-26）
34. `FIX-06`：✅ 已完成（2026-02-26）
35. `FIX-07`：✅ 已完成（2026-02-26）
36. `TEST-03`：✅ 已完成（2026-02-26）
37. `REVIEW-02`：✅ 已完成（2026-02-26）
38. `FIX-08`：✅ 已完成（2026-02-26）
39. `FIX-09`：✅ 已完成（2026-02-26）
40. `TEST-04`：✅ 已完成（2026-02-26）

### 4.6 最新执行记录（2026-02-26）

- 模块 ID：`TEST-01`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：已执行并通过 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。
- 影响范围：`apps/moryflow/pc`、`apps/anyhunt/console`、`apps/anyhunt/server`、`packages/agents-runtime` 及其依赖链路。
- 备注（风险/回滚点）：测试过程中出现 `Redis 127.0.0.1:6379 ECONNREFUSED` 的 stderr 日志，但测试用例全部通过且未导致失败。

- 模块 ID：`ROLL-01`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：上线策略按“默认全开”固化，`off` 降级与非法等级边界已由运行时/DTO 单测覆盖（含 Anyhunt LLM + Agents Runtime）。
- 影响范围：模型目录下发、Console/PC 双下拉、请求协议、服务端校验、provider 映射。
- 备注（风险/回滚点）：保留运维级应急止损能力；出现 provider 不支持场景时按方案自动回退 `off`。

- 模块 ID：`FIX-01`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：Anyhunt 侧新增 `llm/thinking-profile.util.ts` 并通过 `pnpm --filter @anyhunt/anyhunt-server typecheck` + `test`（含 `llm-language-model.service.spec.ts`）。
- 影响范围：`AgentModelService`/`LlmLanguageModelService` thinking profile 解析与等级映射。
- 备注（风险/回滚点）：未知等级若无 provider 映射将返回 `400`，不再静默 fallback。

- 模块 ID：`FIX-02`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`packages/agents-runtime` 单测通过（含新增 unknown level 降级用例）。
- 影响范围：`resolveReasoningConfigFromThinkingSelection` 降级策略。
- 备注（风险/回滚点）：未知自定义 level 统一降级 `off`，避免误发默认 `medium`。

- 模块 ID：`FIX-03`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`@moryflow/pc` typecheck 通过，`agent-options/handle` 回归测试通过。
- 影响范围：Renderer -> IPC -> Main -> Runtime -> ModelFactory。
- 备注（风险/回滚点）：membership 模型执行端优先使用请求透传 profile，消除 UI/执行端档案不一致。

- 模块 ID：`FIX-04`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：全仓执行通过 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。
- 影响范围：Anyhunt Server、agents-runtime、moryflow-pc 相关回归覆盖。
- 备注（风险/回滚点）：`test:unit` 期间存在 `better-sqlite3` rebuild 与部分 stderr 日志，不影响最终通过。

- 模块 ID：`DOC-04`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：已回写冻结决策到方案正文，并同步 `docs/index.md`、`docs/architecture/CLAUDE.md`、`docs/CLAUDE.md`。
- 影响范围：文档层（架构方案与索引）。
- 备注（风险/回滚点）：仅文档改动，无运行时风险。

- 模块 ID：`CLOUD-02`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`@moryflow/server` typecheck 通过，`/v1/models` 契约断言已补到 `test/ai-proxy.e2e-spec.ts`；`@moryflow/api` 类型升级并经 `pnpm build:packages` 校验。
- 影响范围：Membership 模型下发、Moryflow Server AI Proxy、API 类型定义。
- 备注（风险/回滚点）：服务端启动期新增契约校验，若模型配置缺失 `thinking_profile` 会直接阻断；本地 Docker daemon 不可用，e2e 未实跑。

- 模块 ID：`MORY-06`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @moryflow/pc typecheck` 与 `pnpm --filter @moryflow/pc test:unit` 通过。
- 影响范围：PC Renderer 模型聚合、会话状态、Membership 模型过滤与默认等级策略。
- 备注（风险/回滚点）：缺失 `thinking_profile` 的 Membership 模型会被过滤并记录 error。

- 模块 ID：`CORE-04`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm build:packages` + `@moryflow/pc` typecheck 通过；settings schema/provider 类型约束生效。
- 影响范围：`packages/agents-runtime`、`packages/agents-model-registry`、PC 设置 schema 与表单类型。
- 备注（风险/回滚点）：`levelPatches` 由弱类型升级为 provider 强类型，非法字段会被拒绝。

- 模块 ID：`CORE-05`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/reasoning-config.test.ts src/__tests__/thinking-adapter.test.ts src/__tests__/thinking-profile.test.ts` 通过。
- 影响范围：Runtime thinking adapter、reasoning config clamp、model factory provider options。
- 备注（风险/回滚点）：未知等级统一降级 `off`，避免误发默认 reasoning 参数。

- 模块 ID：`ANY-06`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @anyhunt/console test:unit -- src/features/agent-browser-playground/transport/agent-chat-transport.test.ts` 与 `pnpm --filter @anyhunt/anyhunt-server test:unit -- src/llm/__tests__/llm-language-model.service.spec.ts src/agent/__tests__/agent.schema.spec.ts` 通过。
- 影响范围：Anyhunt Console transport、AgentRunPanel、Anyhunt Server LLM service。
- 备注（风险/回滚点）：仅针对 thinking 边界 400 自动单次重试，避免无限重试。

- 模块 ID：`TEST-02`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：全仓闸门通过：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。
- 影响范围：全仓受影响模块（Moryflow PC/Server、Anyhunt Console/Server、agents-runtime、api/types）。
- 备注（风险/回滚点）：测试过程中有 Redis 连接警告与 native rebuild 警告，未导致失败。

- 模块 ID：`REVIEW-01`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：已逐条核对 PR#97 机器人评论与源码，确认 3 类问题需要修复（SSE 阻塞、patch 优先级、runtime thinking 注入链路）。
- 影响范围：`apps/anyhunt/console`、`apps/anyhunt/server`、`packages/agents-runtime`。
- 备注（风险/回滚点）：该模块仅判定问题，不含代码变更。

- 模块 ID：`FIX-05`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @anyhunt/console test:unit -- src/features/agent-browser-playground/transport/agent-chat-transport.test.ts` + `pnpm --filter @anyhunt/console typecheck` 通过。
- 影响范围：Anyhunt Console Agent Playground transport。
- 备注（风险/回滚点）：仅在 `status=400` 才读取错误响应体，避免 200 SSE 流被阻塞。

- 模块 ID：`FIX-06`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @anyhunt/anyhunt-server test:unit -- src/llm/__tests__/thinking-profile.util.spec.ts src/llm/__tests__/llm-language-model.service.spec.ts` + `pnpm --filter @anyhunt/anyhunt-server typecheck` 通过。
- 影响范围：Anyhunt Server thinking profile 合并逻辑与 LLM 路由。
- 备注（风险/回滚点）：合并优先级固定为 `generic -> provider -> direct`，与 provider 特化契约对齐。

- 模块 ID：`FIX-07`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/model-factory.test.ts src/__tests__/agent-factory.test.ts` + `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit` 通过。
- 影响范围：`packages/agents-runtime` 的 `model-factory` 与 `agent-factory`。
- 备注（风险/回滚点）：Anthropic/Google thinking 参数在模型构建即生效；providerOptions 通过 `modelSettings.providerData.providerOptions` 注入调用链。

- 模块 ID：`TEST-03`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：本轮修复的 console/server/runtime 受影响测试与 typecheck 全部通过。
- 影响范围：PR#97 评论涉及的三个模块。
- 备注（风险/回滚点）：仍有 Redis 连接警告日志，但不影响单测通过与修复结论。

- 模块 ID：`REVIEW-02`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：已核对 PR#97 新增两条评论与源码实现，确认“`supportsThinking` 不可达回退”与“`/v1/models` 重复查询”均为有效问题。
- 影响范围：`packages/agents-runtime`、`apps/moryflow/server`。
- 备注（风险/回滚点）：该模块仅做问题确认与修复方案冻结，不改业务行为。

- 模块 ID：`FIX-08`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/model-factory.test.ts` 与 `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit` 通过。
- 影响范围：`packages/agents-runtime/src/model-factory.ts` 及其回归测试。
- 备注（风险/回滚点）：`customCapabilities.reasoning` 未配置时默认 `true`，显式 `false` 仍按契约降级为 `off`。

- 模块 ID：`FIX-09`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：`pnpm --filter @moryflow/server test -- src/ai-proxy/ai-proxy.service.spec.ts` 与 `pnpm --filter @moryflow/server typecheck` 通过。
- 影响范围：`apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts` 与 `ai-proxy.service.spec.ts`。
- 备注（风险/回滚点）：移除方法内重复预检后，契约校验仍由启动期 `onModuleInit` 与模型解析路径守卫覆盖。

- 模块 ID：`TEST-04`
- 状态：`✅ 已完成`
- 完成日期：`2026-02-26`
- 验证结果：本轮受影响包（`agents-runtime`、`moryflow/server`）目标单测与 typecheck 均通过。
- 影响范围：本轮 PR 评论增量修复闭环。
- 备注（风险/回滚点）：`@moryflow/server typecheck` 含 `prisma:generate` 前置步骤，输出无错误即视为通过。
