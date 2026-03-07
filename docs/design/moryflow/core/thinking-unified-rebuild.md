---
title: Moryflow/Anyhunt Thinking 统一重构方案（OpenCode 对齐，C 端优先）
date: 2026-02-27
scope: apps/moryflow/server + apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/server + apps/anyhunt/console + packages/agents-runtime + packages/api
status: completed
---

<!--
[INPUT]:
- 现状：Moryflow 与 Anyhunt 的 Thinking 逻辑存在等级命名不一致、跨模型映射、用户可编辑 patch 导致认知与执行脱节。
- 约束：本次允许零兼容重构，不做历史数据迁移。
- 产品要求：平台预设保证稳定性；最佳实践（模块化/单一职责）；用户交互尽量简单、直觉。

[OUTPUT]:
- 一份可直接执行的 Thinking 统一方案：统一契约、模块边界、稳定性防线、发布闸门与验收标准。

[POS]: Moryflow + Anyhunt Thinking 体系下一版标准方案（C 端）。

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Moryflow/Anyhunt Thinking 统一重构方案（OpenCode 对齐，C 端优先）

## 0. 当前状态

1. Thinking 统一契约已经冻结为 `thinking_profile + visibleParams + defaultLevel + levels`，旧 `enabledLevels` / `levelPatches` / 多套默认映射已退出主链路。
2. `@moryflow/model-bank` 是唯一事实源：Provider 能力、模型等级、visible params、reasoning 映射与 resolver 语义都从这里下发。
3. Moryflow / Anyhunt 的 server、runtime、PC、Console 已统一消费同一套 Thinking 合同；UI 只展示模型原生等级，不再暴露 patch/兜底语义。
4. 本文只保留冻结决策、统一契约、稳定性防线、交互约束、模块职责与验证基线；历史分批 hardening、逐轮 review 与长校验日志不再作为事实源保留。

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

1. 解析 `modelId`，读取该模型 `thinking_profile` 与 `runtimeProfile`。
2. 校验 `thinking.selection` 是否在允许等级内。
3. 组装 provider 请求：仅从 `runtimeProfile` 取参数模板。
4. 发起 LLM 调用并写入结构化观测日志。

### 4.3 自动重试边界（防重复执行）

仅当满足全部条件时允许自动重试：

1. HTTP `400`。
2. 错误码属于 `THINKING_LEVEL_INVALID` 或 `THINKING_NOT_SUPPORTED`。
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

## 5. 用户交互（最小化且直觉）

1. 用户只选择“模型 + Thinking 等级”，不接触 provider 私有参数。
2. 设置页仅展示当前模型支持的原生等级与只读摘要，不再提供 patch/JSON 配置入口。
3. 等级列表、默认等级和可见参数必须与模型合同一致；没有合同的模型统一 `off-only`。
4. 运行时不向用户暴露 transport/provider fallback、legacy 字段或调试术语。

## 6. 模块职责（单一职责）

1. `packages/model-bank`：定义模型、Provider、Thinking、visible params 与 canonical model ref 合同。
2. `packages/agents-runtime`：消费合同并组装 provider options、runtime thinking 参数、raw-only stream 语义。
3. Moryflow/Anyhunt server：执行等级校验、错误码边界、模型工厂注入与 API 契约输出。
4. PC / Console / Mobile：展示等级选择、清理 override、消费模型合同，不再维护本地默认映射。

## 7. 删除清单（零兼容）

1. `thinking.enabledLevels`
2. `thinking.levelPatches`
3. 所有 patch 编辑、解析、校验逻辑
4. 各端自建等级映射表与默认等级推导表
5. 任何“客户端直传 provider thinking 参数”路径

## 8. 实施收口

1. 合同与 resolver 已收敛到 `model-bank`，调用侧不再维护重复映射。
2. Provider 参数注入已覆盖 OpenAI、Anthropic、Google、OpenRouter 等执行分支，不再停留在单 provider 生效。
3. 文本与 reasoning 都只消费 canonical raw 事件，run-item/双通道回退与 legacy bridge 已退出主链路。
4. `providerId/modelId` 已成为统一 canonical 标识；默认等级、custom provider、agent-options 语义也已完成单轨化。

## 9. 验收标准（DoD）

1. 云端与本地模型统一 `thinking_profile` 契约。
2. 用户看到的等级名称即模型原生等级名称。
3. 运行时参数仅来源于平台预设，用户无法注入。
4. 设置页不再出现 `enabledLevels`、`levelPatches` 或 JSON patch。
5. 服务在预设异常场景下保持可用（至少 `off-only`）。
6. OpenRouter reasoning 保持 one-of 约束，不再出现 `effort + max_tokens` 同发。
7. 自动重试严格遵守 pre-stream 边界。

## 10. 方案结论

1. 稳定性：以平台预设为唯一执行入口，避免配置漂移与未知行为。
2. 用户体验：用户只选模型与原生等级，不学习额外概念。
3. 工程质量：职责清晰、模块解耦、观测完整，符合长期维护最佳实践。

## 11. 当前验证基线

1. `@moryflow/model-bank` 负责 Thinking 合同、canonical model ref、reasoning 映射与 registry 回归。
2. `@moryflow/agents-runtime` 负责 provider options、OpenRouter one-of、raw-only reasoning 通道与模型工厂回归。
3. Anyhunt/Moryflow server 负责错误码、模型工厂注入与 API 契约回归。
4. PC / Console / Mobile 负责设置页、等级选择器、override 清理与 transport 行为回归。
5. 后续修改 Thinking 契约时，至少执行受影响包的 `typecheck` 与 `test:unit`；涉及跨端或跨包合同则按 L2 执行根级校验。

## 12. 当前事实补充

1. 模型与 Thinking 选择已经统一为 `providerId/modelId` 单轨标识，调用侧不再依赖裸 `modelId` 推断。
2. 可视 reasoning 与文本都只消费 canonical raw 事件，不再保留顶层/子通道双轨解析。
3. 无原生 Thinking 合同的模型统一收敛为 `off-only`；用户可见等级始终来自模型合同，不再来自 provider 级 fallback。
4. 构建链路必须保证 `@moryflow/agents-runtime` 产物与源码一致，避免旧 `dist` 重新带回已删除的双轨语义。
