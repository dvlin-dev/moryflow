---
title: Model Bank 全量重构方案（单一事实源，零兼容）
date: 2026-02-27
scope: packages/model-bank + packages/agents-runtime + apps/moryflow/server + apps/anyhunt/server + apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/console + apps/moryflow/admin + apps/anyhunt/admin/www + packages/api + packages/agents-model-registry + packages/model-registry-data + scripts
status: completed
---

<!--
[INPUT]:
- 目标：以 `packages/model-bank` 作为模型设置与 thinking 规则唯一事实源。
- 约束：不考虑历史兼容；允许破坏性重构；无用代码直接删除。
- 背景：当前模型数据与 thinking 规则分散在 `model-bank` / `agents-model-registry` / `api` / `runtime` / `server` / `pc` 多处，存在多源漂移风险。

[OUTPUT]:
- 一份可执行的重构方案：全量数据口径、分层边界、删除清单、验证闸门与接口快照。

[POS]: Moryflow + Anyhunt 模型设置与 Thinking 体系的唯一改造方案。

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Model Bank 全量重构方案（单一事实源，零兼容）

## 0. 当前状态

1. `packages/model-bank` 已成为模型、Provider、Thinking 与标准参数的唯一事实源。
2. `@moryflow/agents-model-registry`、`@moryflow/model-registry-data` 与 `packages/api` 中的 provider 级 thinking 默认映射已退出主链路。
3. server、runtime、PC、Mobile、Console、Admin 都改为消费 `model-bank` 解析结果，不再本地维护默认等级与 provider fallback。
4. 模型唯一标识已统一为 `providerId/modelId`，设置页、输入框、请求 payload 与 Provider 调用围绕同一标识收口。
5. 本文只保留当前架构、删除边界、验证基线与接口快照；历史 Phase、复查记录与逐轮修复账本不再继续维护。

## 1. 决策冻结

1. `packages/model-bank` 是唯一事实源，统一定义：
   - provider 元数据
   - model 元数据
   - thinking 等级、默认值、可见参数、互斥约束
   - model-native `thinking_profile` 解析器
2. 历史兼容全部放弃：
   - 旧 provider 级默认 thinking 映射删除
   - 旧模型快照包删除
   - 旧 registry 包删除
3. 调用侧只消费解析结果，不重复声明等级集合、默认值或 provider 参数语义。
4. 无原生 thinking 合同的模型统一 `off-only`。

## 2. 目标架构（统一后）

1. `model-bank`：定义事实与解析规则。
2. `agents-runtime`：消费事实并构造运行时 provider options、请求参数与模型工厂语义。
3. Anyhunt/Moryflow server：负责 API 边界、会员校验、错误码与 provider 调用装配。
4. PC/Mobile/Console/Admin：只负责展示、选择与提交，不再本地推导 thinking 规则。

## 3. 必删清单（强制）

1. `packages/agents-model-registry/**`
2. `packages/model-registry-data/**`
3. `packages/api/src/membership/thinking-defaults.ts`
4. 历史 `prepare:model-registry-data` 构建链路与相关脚本
5. 各端自建的 provider 级 thinking 默认映射、等级 fallback 与重复 registry 壳层

## 4. 验收标准（DoD）

1. 模型设置与 thinking 规则唯一来源为 `packages/model-bank`。
2. `@moryflow/agents-model-registry` 不再存在于工作区与依赖图中。
3. `@moryflow/model-registry-data` 不再存在于工作区与构建链路中。
4. `@moryflow/api` 不再包含 thinking 默认映射实现。
5. 设置页、输入框、请求 payload、provider 调用四处行为一致。
6. OpenRouter one-of 错误不再复现。

## 5. 当前验证基线

1. `@moryflow/model-bank` 负责 registry、thinking、standard parameters 的 `typecheck`、`test:unit` 与 `build` 回归。
2. `@moryflow/agents-runtime` 负责模型工厂、reasoning config、thinking profile 与 OpenRouter one-of 回归。
3. Moryflow/Anyhunt server 负责 provider factory、thinking profile 与会员模型合同回归。
4. PC/Mobile/Console/Admin 在修改模型设置或等级展示时，至少执行各自受影响包的 `typecheck` 与 `test:unit`。
5. 涉及跨包模型合同、Provider 导出或构建顺序的变更时，按 L2 执行根级校验。

## 6. 当前接口快照

### 6.1 导出入口与导入约束

1. 包根入口 `@moryflow/model-bank` 当前导出：
   - `aiModels/*`
   - `const/modelProvider`
   - `standard-parameters/*`
   - `thinking/*`
   - `types/*`
   - `buildProviderModelRef / parseProviderModelRef`
2. `searchModels/getModelById/getProviderById/getModelCount` 等检索 API 不在根入口，必须通过子路径导入：
   - `@moryflow/model-bank/registry`

### 6.2 Registry 合同（canonical id 单轨）

1. 模型唯一标识固定为 `providerId/modelId`。
2. 统一使用：
   - `buildProviderModelRef(providerId, modelId)`
   - `parseProviderModelRef(value)`
3. 查询与映射能力在 `@moryflow/model-bank/registry`：
   - `getModelById/getModelByProviderAndId`
   - `normalizeModelId/toApiModelId`
   - `searchModels/getProviders/getAllModels/getModelCount/getSyncMeta`

### 6.3 Thinking 合同（模型级优先）

1. 模型 thinking 解析统一由 `thinking/*` 子域提供：
   - `resolveModelThinkingProfile/resolveModelThinkingProfileById`
   - `resolveProviderSdkType/resolveRuntimeChatSdkType`
   - `resolveReasoningFromThinkingSelection`
   - `buildThinkingProfileFromCapabilities`
2. 规则层保留 fail-closed 原则：
   - 无合同或非法等级时收敛为 `off-only` 或显式报错
   - OpenRouter 等 one-of 约束由合同层与运行时双重保证

### 6.4 Standard Parameters 合同

1. 图像参数合同：
   - `validateModelParamsSchema`
   - `extractDefaultValues`
2. 视频参数合同：
   - `validateVideoModelParamsSchema`
   - `extractVideoDefaultValues`
3. 约束：参数 schema 只在 `model-bank` 定义，调用侧只消费解析结果，不重复声明默认值。
