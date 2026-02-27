---
title: Moryflow/Anyhunt Thinking 统一重构方案（OpenCode 对齐，C 端优先）
date: 2026-02-27
scope: apps/moryflow/server + apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/server + apps/anyhunt/console + packages/agents-runtime + packages/api
status: implemented
---

<!--
[INPUT]:
- 现状：Moryflow 与 Anyhunt 的 Thinking 逻辑存在等级命名不一致、跨模型映射、用户可编辑 patch 导致认知与执行脱节。
- 约束：本次允许零兼容重构，不做历史数据迁移。
- 产品要求：平台预设保证稳定性；最佳实践（模块化/单一职责）；用户交互尽量简单、直觉。

[OUTPUT]:
- 一份可直接执行的 Thinking 统一方案：统一契约、模块边界、稳定性防线、发布闸门与验收标准。

[POS]: Moryflow + Anyhunt Thinking 体系下一版标准方案（C 端）。

[PROTOCOL]: 本文更新需同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/architecture/CLAUDE.md`，若影响全局再同步根 `CLAUDE.md`。
-->

# Moryflow/Anyhunt Thinking 统一重构方案（OpenCode 对齐，C 端优先）

## 0. 执行进度（实时回写）

> 更新时间：2026-02-27

| 阶段    | 任务                                                                | 状态      | 最近进展                                                                                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 1 | 契约收敛（移除 `enabledLevels/levelPatches`）                       | ✅ 已完成 | `packages/agents-runtime` / `packages/agents-model-registry` / `packages/api` 类型已统一到 `thinking_profile + visibleParams`；Moryflow PC 设置页已删除 patch/勾选入口                                                                                                   |
| Phase 2 | 运行时改造（模板执行单一路径）                                      | ✅ 已完成 | `agents-runtime` 与 Anyhunt/Moryflow server 均改为按 `thinking_profile.levels[].visibleParams` 解析执行参数；Anyhunt 错误码统一为 `THINKING_LEVEL_INVALID/THINKING_NOT_SUPPORTED`；Moryflow `/v1/chat/completions` 请求统一为 `thinking` 选择                            |
| Phase 3 | 前端收敛（统一交互 + 参数展示）                                     | ✅ 已完成 | Moryflow PC / Anyhunt Console Thinking 选择器统一展示模型原生等级 + 默认参数；Console transport 改为 RFC7807 `code` 边界重试                                                                                                                                             |
| Phase 4 | 观测与收口（错误码/告警/清理）                                      | ✅ 已完成 | 后端补齐 thinking 结构化日志（requested/resolved level）、前端/后端重试边界统一、旧 `enabledLevels/levelPatches` 代码路径清理                                                                                                                                            |
| Phase 5 | Code Review 发现项修复（Provider 生效链路 + 单一事实源 + 回归测试） | ✅ 已完成 | 已修复 Moryflow server OpenAI/Anthropic/Google thinking 注入链路；新增 `@moryflow/api` 共享 defaults 并替换 Anyhunt/Moryflow/PC/runtime 重复映射；Moryflow thinking 边界错误补齐结构化 code（`THINKING_LEVEL_INVALID/THINKING_NOT_SUPPORTED`）；补齐专项回归测试（7 条） |

### 0.1 本轮校验记录

1. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/thinking-profile.test.ts src/__tests__/thinking-adapter.test.ts src/__tests__/reasoning-config.test.ts` ✅
2. `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts src/llm/__tests__/llm-language-model.service.spec.ts` ✅
3. `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
4. `pnpm --filter @anyhunt/console test src/features/agent-browser-playground/transport/agent-chat-transport.test.ts` ✅
5. `pnpm --filter @anyhunt/console typecheck` ✅
6. `pnpm --filter @moryflow/pc test:unit src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-thinking-selector.test.ts` ✅
7. `pnpm --filter @moryflow/pc typecheck` ✅
8. `pnpm --filter @moryflow/server typecheck` ✅
9. `pnpm --filter @moryflow/api build` ✅
10. `pnpm --filter @moryflow/server test src/ai-proxy/ai-proxy.thinking.spec.ts src/ai-proxy/providers/model-provider.factory.thinking.spec.ts` ✅
11. `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts src/llm/__tests__/llm-language-model.service.spec.ts` ✅
12. `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
13. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/reasoning-config.test.ts src/__tests__/thinking-profile.test.ts src/__tests__/thinking-adapter.test.ts` ✅

## 1. 冻结决策

1. 统一契约只保留 `thinking_profile`，不再引入 `v2` 命名。
2. Thinking 等级采用模型原生等级直出，不做平台映射。
3. 用户不可编辑 Thinking patch 或 provider 参数（包括本地模型）。
4. 云端模型与本地模型统一交互与协议：用户只选模型与等级。
5. 运行参数必须来自平台预设（Preset Registry），保证服务稳定。
6. 任一模型如无有效预设，系统强制 `off-only`，不允许进入“未知等级”执行路径。

## 2. 设计原则（最佳实践）

1. 单一事实源：等级与执行参数由服务端预设目录权威定义。
2. 分层隔离：展示契约与执行契约分离，客户端不持有可执行 provider 参数。
3. 失败可控：预设异常时优先“服务可用 + 能力降级”，避免服务中断。
4. 交互减法：C 端只暴露必要选择，不暴露底层技术概念。
5. 零兼容清理：删除旧映射、旧 patch、旧兜底表，避免双轨逻辑。

## 3. 统一数据契约

### 3.1 客户端可见契约（Public Contract）

```ts
type ThinkingVisibleParamKey =
  | 'reasoningEffort'
  | 'thinkingBudget'
  | 'includeThoughts'
  | 'reasoningSummary';

type ThinkingVisibleParam = {
  key: ThinkingVisibleParamKey;
  value: string;
};

type ThinkingLevel = {
  id: string;
  label: string;
  description?: string;
  visibleParams?: ThinkingVisibleParam[];
};

type ThinkingProfile = {
  supportsThinking: boolean;
  defaultLevel: string;
  levels: ThinkingLevel[];
};
```

强约束：

1. `levels` 必须包含 `off`。
2. `defaultLevel` 必须属于 `levels`。
3. `visibleParams` 仅允许白名单字段。
4. 不允许暴露 `rawConfig`、token 上限细节、provider 私有开关。

### 3.2 服务端执行契约（Runtime Contract，仅内部）

```ts
type ThinkingRuntimeLevel = {
  id: string;
  providerOptions: Record<string, unknown>;
};

type ThinkingRuntimeProfile = {
  defaultLevel: string;
  levels: ThinkingRuntimeLevel[];
};

type ThinkingPresetBinding = {
  provider: string;
  modelId: string;
  runtimeProfile: ThinkingRuntimeProfile;
  profile: ThinkingProfile;
};
```

约束：

1. `profile.levels.id` 与 `runtimeProfile.levels.id` 必须一一对应。
2. 任何请求只能按 `modelId + level` 命中 `runtimeProfile`。
3. 客户端永远不接触 `providerOptions`。

### 3.3 请求契约（统一）

```ts
type ThinkingSelection = { mode: 'off' } | { mode: 'level'; level: string };
```

约束：

1. `mode='level'` 时 `level` 必须存在于 `thinking_profile.levels`。
2. 省略 `thinking` 等价 `{ mode: 'off' }`。

## 4. 稳定性防线（服务预设优先）

### 4.1 预设目录（Preset Registry）加载策略

1. 启动阶段：加载并校验预设快照（结构校验 + 业务校验）。
2. 刷新阶段：仅在新快照校验通过后原子替换。
3. 快照异常处理：
   - 有“最后一次可用快照”时继续使用旧快照（服务不中断）。
   - 无可用快照时所有模型降级为 `off-only`（服务可用，能力降级）。
4. 预设版本化：记录 `version/hash/updatedAt`，用于观测与回滚。

### 4.2 请求执行路径（单一路径）

1. 解析 `modelId`，读取该模型 `thinking_profile` + `runtimeProfile`。
2. 校验 `thinking.selection` 是否在允许等级内。
3. 组装 provider 请求：仅从 `runtimeProfile` 取参数模板。
4. 发起 LLM 调用并写入结构化观测日志。

### 4.3 自动重试边界（防重复执行）

仅当满足全部条件时允许自动重试：

1. HTTP `400`。
2. 错误码属于 `THINKING_LEVEL_INVALID` / `THINKING_NOT_SUPPORTED`。
3. 尚未收到任何流式分片（pre-stream）。

恢复流程：

1. 刷新模型目录一次。
2. 仍失败则单次降级 `off` 重试。
3. 已进入 streaming 后严禁重试。

### 4.4 观测与告警（必须落地）

核心指标：

1. `thinking_requests_total{model,level,result}`
2. `thinking_fallback_total{reason}`
3. `thinking_preset_refresh_total{result}`
4. `thinking_off_only_models_total`

核心日志字段：

1. `modelId`
2. `requestedLevel`
3. `resolvedLevel`
4. `presetVersion`
5. `fallbackReason`
6. `isPreStreamRetry`

## 5. 用户交互（最小化且直觉）

1. 输入区只保留：模型选择 + Thinking 等级选择。
2. 当 `levels.length <= 1`（仅 `off`）时隐藏等级下拉。
3. 等级展示内容：`label + visibleParams`。
4. 设置页只展示：
   - 模型默认等级；
   - 预设摘要（只读）。
5. 禁止出现：`enabledLevels`、`levelPatches`、JSON patch、provider 参数输入框。
6. 云端与本地模型 UI 完全一致，避免双套心智模型。

## 6. 模块职责（单一职责）

1. `packages/api`
   - 定义并导出 `ThinkingProfile`、`ThinkingSelection`。
2. `apps/moryflow/server`、`apps/anyhunt/server`
   - 下发 `thinking_profile`。
   - 维护预设目录加载/校验/原子切换。
   - 在请求入口做等级合法性校验。
3. `packages/agents-runtime`
   - 只负责根据 `model + level` 解析执行模板并调用 provider。
   - 不再维护全局等级映射逻辑。
4. `apps/moryflow/pc`、`apps/moryflow/mobile`、`apps/anyhunt/console`
   - 只消费 `thinking_profile` 展示与选择。
   - 不推导等级、不拼接 provider 参数。

## 7. 删除清单（零兼容）

1. `thinking.enabledLevels`
2. `thinking.levelPatches`
3. 所有 patch 编辑/解析/校验逻辑
4. 各端自建等级映射表与默认等级推导表
5. 任何“客户端直传 provider thinking 参数”路径

## 8. 实施计划（推荐顺序）

### Phase 1（L2）契约与预设目录

1. 在 `packages/api` 固化新类型。
2. 两端服务统一输出 `thinking_profile`。
3. 新增预设目录校验器与原子切换机制。

验收：模型目录接口通过结构校验；不合规模型在发布前阻断。

### Phase 2（L2）运行时改造

1. `agents-runtime` 切到“模板执行”单一路径。
2. 删除映射与 patch 运行时代码。
3. 统一 400 错误码与重试边界。

验收：全链路仅能通过预设执行，失败可自动降级到 `off`（pre-stream）。

### Phase 3（L1）前端收敛

1. PC/Console 统一等级展示组件。
2. 设置页删除复杂配置，只保留只读预设摘要与默认等级。
3. Mobile 先对齐契约，按节奏补 UI。

验收：前端无 patch 入口，无映射逻辑，无 provider 参数编辑入口。

### Phase 4（L2）观测与收口

1. 落地指标、日志、告警。
2. 清理旧字段与死代码。
3. 预设快照发布加门禁（必须可校验、可回滚）。

验收：异常可观测、可定位、可回滚；无双轨代码。

## 9. 验收标准（DoD）

1. 云端/本地模型统一 `thinking_profile` 契约。
2. 用户看到的等级名称即模型原生等级名称。
3. 运行时参数仅来源于平台预设，用户无法注入。
4. 设置页不再出现 `enabledLevels/levelPatches` 或 JSON patch。
5. 服务在预设异常场景下保持可用（至少 `off-only`）。
6. 自动重试严格遵守 pre-stream 边界。

## 10. 方案结论

1. 稳定性：以平台预设为唯一执行入口，避免配置漂移与未知行为。
2. 用户体验：用户只选模型与原生等级，不学习额外概念。
3. 工程质量：职责清晰、模块解耦、观测完整，符合长期维护最佳实践。

## 11. Code Review 后专项修复方案（2026-02-27）

### 11.1 发现的问题（本轮确认）

1. Moryflow server `AiProxyService` 已解析 `thinking`，但 `ModelProviderFactory` 仅在 OpenRouter 分支消费，OpenAI/Anthropic/Google 分支未注入 provider thinking 参数，导致“可选等级”与“实际执行”可能不一致。
2. 默认 thinking 参数映射在多个模块重复维护（Anyhunt server、Moryflow server、Moryflow PC、agents-runtime），存在漂移风险，不满足单一事实源。
3. Moryflow server 缺少 thinking 核心链路回归测试（profile 合同校验、等级选择校验、provider 参数注入），当前仅有 typecheck，缺少行为保障。

### 11.2 修复目标（必须同时达成）

1. 任何开启 thinking 的请求都必须在 provider 层真正生效（包含 OpenAI/Anthropic/Google/OpenRouter）。
2. 默认参数映射收敛到一个共享模块，其他项目只能消费，不得复制映射表。
3. Moryflow server thinking 关键路径具备单元测试覆盖，修复后由测试锁定行为。

### 11.3 设计决策（最佳实践）

1. 新建共享模块 `packages/agents-runtime/src/thinking-defaults.ts`（或同级命名）作为唯一事实源，提供：
   - `getDefaultThinkingLevelsForSdkType`
   - `getDefaultVisibleParamsForLevel`
   - `resolveReasoningConfigFromThinkingSelection`
2. Moryflow server / Anyhunt server / Moryflow PC 全部改为调用共享模块，不再维护本地映射常量。
3. Provider 注入层保持单一职责：
   - `AiProxyService` 仅负责校验/选择等级并生成 `ReasoningOptions`
   - `ModelProviderFactory` 仅负责将 `ReasoningOptions` 映射到具体 provider SDK 参数
4. 不做历史兼容：直接删除旧重复映射与无效分支，避免双轨逻辑。

### 11.4 实施步骤（执行顺序）

#### Step A（L2）修复 Moryflow server Provider 生效链路（✅ 已完成，2026-02-27）

1. 修改 `apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.ts`：
   - `openai/openai-compatible` 分支支持 `reasoningEffort`
   - `anthropic` 分支支持 `thinking.budgetTokens`
   - `google` 分支支持 `thinkingConfig.thinkingBudget/includeThoughts`
2. 保持 `openrouter` 分支现有行为，并补齐入参约束（避免 silent ignore）。

验收结果：

1. `ModelProviderFactory` 已为 OpenAI/Anthropic/Google 分支注入 thinking 参数（不再仅 OpenRouter 生效）。
2. 新增 `model-provider.factory.thinking.spec.ts`（4 tests）并通过。

#### Step B（L2）收敛默认映射为单一事实源（✅ 已完成，2026-02-27）

1. 提取并集中默认映射逻辑到共享模块（levels + visibleParams + budget/effort 规则）。
2. 替换以下重复实现，全部改为共享函数调用：
   - `apps/anyhunt/server/src/llm/thinking-profile.util.ts`
   - `apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/models.ts`
3. 删除重复常量（`THINKING_EFFORT_BY_LEVEL` / `THINKING_BUDGET_BY_LEVEL` 等本地副本）。

验收结果：

1. 新增 `packages/api/src/membership/thinking-defaults.ts` 作为唯一映射源。
2. Anyhunt server / Moryflow server / Moryflow PC / agents-runtime 已切换为共享函数调用。
3. `THINKING_EFFORT_BY_LEVEL` / `THINKING_BUDGET_BY_LEVEL` 重复副本已从调用侧移除。

#### Step C（L2）补齐 Moryflow server thinking 回归测试（✅ 已完成，2026-02-27）

1. 新增测试文件（建议）：
   - `apps/moryflow/server/src/ai-proxy/__tests__/thinking-profile.contract.spec.ts`
   - `apps/moryflow/server/src/ai-proxy/__tests__/thinking-reasoning-resolution.spec.ts`
   - `apps/moryflow/server/src/ai-proxy/providers/__tests__/model-provider.factory.thinking.spec.ts`
2. 覆盖场景：
   - `off` 必含与 `defaultLevel` 合法性
   - 无效 level 拒绝 + 错误消息
   - OpenAI/Anthropic/Google/OpenRouter 参数注入正确
   - 无预设参数时降级/拒绝行为符合契约

验收结果：

1. 新增 `apps/moryflow/server/src/ai-proxy/ai-proxy.thinking.spec.ts`（3 tests）。
2. 新增 `apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.thinking.spec.ts`（4 tests）。
3. 两组测试共 7 条全部通过。

#### Step D（L2）最终收口（✅ 已完成，2026-02-27）

1. 更新本方案文档进度表（Phase 5 置为 ✅）。
2. 同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/architecture/CLAUDE.md` 的最近更新记录。
3. 清理死代码与旧注释，确保无 patch/enabledLevels 相关残留。

### 11.5 验收命令（Phase 5）

```bash
pnpm --filter @moryflow/server test
pnpm --filter @moryflow/server typecheck
pnpm --filter @moryflow/server test src/ai-proxy/ai-proxy.thinking.spec.ts src/ai-proxy/providers/model-provider.factory.thinking.spec.ts
pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts src/llm/__tests__/llm-language-model.service.spec.ts
pnpm --filter @anyhunt/anyhunt-server typecheck
pnpm --filter @moryflow/api build
pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/reasoning-config.test.ts src/__tests__/thinking-profile.test.ts src/__tests__/thinking-adapter.test.ts
pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-thinking-selector.test.ts
pnpm --filter @moryflow/pc typecheck
```

### 11.6 完成定义（Phase 5 DoD）

1. Moryflow server 四类 provider 的 thinking 均可执行（非仅 OpenRouter）。
2. 默认映射仅有一处实现；其余为调用方。
3. Moryflow server thinking 新增测试全部通过，且覆盖核心分支。
4. 文档与代码一致，无“文档写完成但实现缺失”的差异。
