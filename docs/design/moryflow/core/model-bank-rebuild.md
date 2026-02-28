---
title: Model Bank 全量重构方案（单一事实源，零兼容）
date: 2026-02-27
scope: packages/model-bank + packages/agents-runtime + apps/moryflow/server + apps/anyhunt/server + apps/moryflow/pc + apps/moryflow/mobile + apps/anyhunt/console + apps/moryflow/admin + apps/anyhunt/admin/www + packages/api + packages/agents-model-registry + packages/model-registry-data + scripts
status: implemented
---

<!--
[INPUT]:
- 目标：以 `packages/model-bank` 作为模型设置与 thinking 规则唯一事实源。
- 约束：不考虑历史兼容；允许破坏性重构；无用代码直接删除。
- 背景：当前模型数据与 thinking 规则分散在 `model-bank` / `agents-model-registry` / `api` / `runtime` / `server` / `pc` 多处，存在多源漂移风险。

[OUTPUT]:
- 一份可执行的分阶段重构方案：全量数据口径、分层边界、删除清单、迁移步骤、验证闸门。

[POS]: Moryflow + Anyhunt 模型设置与 Thinking 体系的唯一改造方案。

[PROTOCOL]: 本文更新需同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/design/index.md`。
-->

# Model Bank 全量重构方案（单一事实源，零兼容）

## 0. 执行摘要

1. 本方案覆盖“之前模型设置的全部数据链路”：云端 DB、云端下发、PC 本地设置、runtime 解析、客户端渲染、Provider 调用、静态模型快照包与构建脚本。
2. 统一规则：`packages/model-bank` 是唯一规则源，其他模块只消费解析结果，不再维护任何默认等级映射。
3. `@moryflow/agents-model-registry` 从“数据源包”降为“待删除包”，最终完全退场。
4. `@moryflow/api` 中的 thinking 默认映射全部删除，避免继续形成第二事实源。
5. 改造采用分阶段推进，阶段间有明确闸门，保证可审查、可回滚、可验证。

## 1. 决策冻结

1. `packages/model-bank` 是唯一事实源，统一定义：
   - provider 元数据
   - model 元数据
   - thinking 等级、标签、默认值、可见参数、互斥约束
   - model-native `thinking_profile` 解析器
2. 历史兼容全部放弃：
   - 旧 provider 级默认 thinking 映射删除
   - 旧前端本地推导逻辑删除
   - 旧 `agents-model-registry` 静态数据删除
3. 服务端是“配置与编排层”，不是规则源：
   - 保留 `AiProvider/AiModel` 的运营配置能力
   - thinking 规则不再由 DB 字段定义业务语义
4. 客户端只消费，不推导：
   - 设置页不再维护独立等级配置
   - 输入框只展示当前模型可选等级
5. runtime/provider 只做协议转换：
   - 不定义等级集
   - 不定义默认值
   - 不做 provider 级兜底语义

## 2. 全量数据口径（现状盘点）

### 2.1 云端数据库模型配置（Moryflow Server）

1. `AiProvider`：`providerType/name/apiKey/baseUrl/enabled/sortOrder`。
2. `AiModel`：`modelId/upstreamId/displayName/price/context/output/capabilitiesJson`。
3. 当前 `capabilitiesJson.reasoning` 承担了 thinking 业务语义，必须收口为 `model-bank` 解析结果。

### 2.2 云端下发合同（Moryflow `/v1/models` + Anyhunt LLM）

1. 当前已下发 `thinking_profile`，但其生成路径仍含旧默认映射依赖。
2. 目标是由 `model-bank` 直接生成最终合同，server 仅负责鉴权/过滤/可用性判定。

### 2.3 本地模型设置数据（Moryflow PC）

1. 持久化对象：`AgentSettings.providers/customProviders/models/defaultModelId`。
2. 关键字段：
   - provider 级：`providerId/enabled/apiKey/baseUrl/defaultModelId`
   - model 级：`id/enabled/isCustom/customName/customContext/customOutput/customCapabilities/thinking`
3. 这些数据全部纳入本次改造，保留“用户输入的配置值”，删除“本地推导的规则语义”。

### 2.4 静态注册表数据（`@moryflow/agents-model-registry`）

1. `providerRegistry` / `modelRegistry` 当前仍被 PC main/renderer/mobile/runtime 直接消费。
2. 该包现状与 `model-bank` 有大量重复定义，属于明确的多源事实。
3. 本次改造后该包不再承担任何模型事实源职责，最终删除。

### 2.5 Thinking 默认映射（`@moryflow/api`）

1. `packages/api/src/membership/thinking-defaults.ts` 当前被 runtime/server/pc 多处引用。
2. 该映射与 `model-bank` thinking 规则重复，必须完全删除。

### 2.6 Runtime 临时推导逻辑（`packages/agents-runtime`）

1. 当前仍依赖 `@moryflow/api` 默认等级和可见参数。
2. 改造后改为直接消费 `@moryflow/model-bank/thinking` 的解析器与约束。

### 2.7 静态模型快照包与构建脚本（`@moryflow/model-registry-data`）

1. 当前 `apps/moryflow/pc` 与 `apps/moryflow/admin` 仍通过 `@moryflow/model-registry-data` 做模型搜索与计数（`searchModels/getModelCount`）。
2. 根构建链路 `prepare:model-registry-data` 与 `scripts/ensure-model-registry-data.cjs` 对该包有强依赖，属于旧数据源耦合。
3. 本次改造后模型搜索/列表能力统一迁移到 `model-bank`，`model-registry-data` 与其构建保护脚本一并退场。

### 2.8 管理端模型表单语义（Moryflow Admin + Anyhunt Admin）

1. `apps/moryflow/admin` 模型表单仍使用旧模型搜索来源（`@moryflow/model-registry-data`）。
2. `apps/anyhunt/admin/www` 的模型能力表单仍维护 `reasoning.effort` 语义输入，尚未显式绑定 `model-bank` 模型原生等级合同。
3. 以上管理端入口必须纳入统一改造，否则会持续写入旧语义配置。

## 3. 目标架构（统一后）

### 3.1 单一真源分层

1. L0（规则层）：`model-bank`
   - Provider/Model 元数据
   - thinking 规则与解析器
2. L1（编排层）：server/runtime
   - server：查询模型配置 + 生成并下发最终 `thinking_profile`
   - runtime：把选中的等级映射为 provider 协议字段
3. L2（展示层）：pc/mobile/console
   - 只展示等级与说明
   - 只提交等级选择

### 3.2 数据归属矩阵（冻结）

| 数据项                      | 归属模块                        | 说明                  |
| --------------------------- | ------------------------------- | --------------------- |
| Provider 列表/模型列表      | `model-bank`                    | 唯一定义              |
| Thinking 等级与约束         | `model-bank`                    | 唯一定义              |
| 用户 API Key/Base URL/启停  | server DB + PC 本地设置         | 用户配置，不是规则    |
| 模型可用性（会员等级/权限） | server                          | 运行期动态            |
| Thinking 请求选择           | 客户端请求                      | `thinking: off/level` |
| Provider 协议字段拼装       | runtime/server provider factory | 只做转换              |

### 3.3 合同原则

1. 下发给客户端的是最终合同，不允许客户端二次推导。
2. 模型无原生 thinking 规则时强制 `off-only`。
3. OpenRouter one-of 约束必须在规则层与执行层双重保证。

## 4. 分阶段改造清单（执行计划）

### Phase 0：基线冻结与审计（L1）

1. 冻结当前模型设置相关入口，避免并行新增旧逻辑。
2. 建立扫描基线：
   - `@moryflow/agents-model-registry` 全引用清单
   - `@moryflow/api` thinking-defaults 全引用清单
   - `@moryflow/model-registry-data` 与 `prepare:model-registry-data` 全引用清单
   - 客户端本地 thinking 推导清单
   - Admin 端（Moryflow/Anyhunt）`reasoning` 表单语义清单
3. 定义回归样本模型：OpenAI、OpenRouter、Anthropic、Google、Minimax、自定义模型。

验收：形成“待替换文件清单 + 回归样本清单”并锁定。

### Phase 1：`model-bank` 完全体收口（L2）

1. 完成 `model-bank` 规则能力：
   - thinking 类型、规则、解析器、约束校验
   - provider/model 元数据导出
2. 提供稳定 API：
   - `resolveModelThinkingProfile`
   - `resolveProviderSdkType`
   - `getModelById/getProviderById`（替代 `@shared/model-registry` 常用查询）
   - `searchModels/getModelCount`（替代 `@moryflow/model-registry-data`）
3. 统一导出供 server/runtime/pc 复用。

验收：`model-bank` 单包可独立生成所有目标模型的最终 `thinking_profile`。

### Phase 2：Server 改造（Moryflow + Anyhunt，L2）

1. Moryflow `ai-proxy`：
   - 删除 `@moryflow/api` thinking-defaults 依赖
   - 改为 `model-bank` 解析
   - `PRESET_PROVIDERS/getSdkType` 改为 `resolveProviderSdkType`，不再维护 server 内部 provider->sdkType 映射表
   - `/models` 直接下发最终合同
2. Anyhunt `thinking-profile.util`：
   - 删除本地默认映射
   - 统一改读 `model-bank`
3. Anyhunt/Moryflow Provider Factory：
   - 统一走 `model-bank` provider 解析，去除 duplicated `getSdkType` 推导
4. 保留 DB 的运营配置字段，但 thinking 业务语义改由 `model-bank` 解释。

验收：server 侧不再存在 provider 级默认 thinking 映射实现。

### Phase 3：`agents-runtime` 改造（L2）

1. `reasoning-config.ts` 移除 `@moryflow/api` 依赖。
2. `thinking-profile/thinking-adapter/model-factory` 统一改读 `model-bank` 产物。
3. 保留 runtime “协议转换层”职责，不新增业务规则。

验收：runtime 仅依赖 `model-bank` 规则，不再依赖 `api` 默认映射。

### Phase 4：PC/Mobile/Console/Admin 改造（L1）

1. PC main/renderer：
   - 替换 `@shared/model-registry` 数据来源
   - `src/main/agent-runtime/index.ts` 与 `src/main/app/ipc-handlers.ts` 改为消费 `model-bank` 查询与转换接口
   - 删除 `chat-pane/models.ts` 本地 thinking 推导逻辑
2. Mobile/Console：
   - 模型展示与选择统一消费 server 下发或 model-bank 结果
   - `mobile/lib/agent-runtime/runtime.ts` 删除对 `@moryflow/agents-model-registry` 的直接依赖
3. Moryflow Admin + Anyhunt Admin：
   - 模型搜索能力改读 `model-bank` 查询接口
   - 表单 `reasoning` 字段改为消费 `thinking_profile` 合同，不再写 provider 级默认语义
4. 设置页：
   - 保留用户可配置字段（API Key、Base URL、模型启停、默认模型）
   - 移除规则定义入口（等级表、参数表、patch 类入口）

验收：客户端不再维护独立等级枚举或默认映射。

### Phase 5：删除旧包与死代码（L2）

1. 删除 `packages/agents-model-registry` 包（及引用）。
2. 删除 `packages/api/src/membership/thinking-defaults.ts` 与相关导出。
3. 删除 PC `src/shared/model-registry` 过渡层。
4. 删除 `packages/model-registry-data` 包（及 `apps/moryflow/pc`、`apps/moryflow/admin` 依赖）。
5. 删除根 `prepare:model-registry-data` 与 `scripts/ensure-model-registry-data.cjs`。
6. 清理 `package.json`/`Dockerfile` 中仅为旧包保留的构建依赖与过滤项（包含 rollup 兼容依赖）。
7. 删除所有“旧映射兜底”与无调用代码。

验收：全仓不存在双轨实现和过渡层。

### Phase 6：模型设置数据处理（L1）

1. 云端 DB（`AiProvider/AiModel`）：
   - 保留用户配置字段：`apiKey/baseUrl/enabled/sortOrder/modelId/upstreamId/price/context/output`
   - thinking 规则字段不再作为事实源（进入只读兼容期后删除）
2. 本地设置（`AgentSettings`）：
   - 保留：provider 与 model 用户配置
   - 归一化：`thinking.defaultLevel` 若不在模型可选等级内，重置为 `off`
3. Membership 模型缓存：
   - 强制以 server 下发合同覆盖本地历史缓存。
4. 管理端存量模型配置：
   - 批量校验 `reasoning` 配置值是否在模型可选等级内，非法值重置 `off` 并记录审计日志。

验收：之前模型设置数据全部经过新口径归一化，不存在孤儿语义字段。

### Phase 7：回归闸门与发布（L2）

1. 类型与测试闸门：
   - `pnpm typecheck`
   - `pnpm test:unit`
2. 关键行为闸门：
   - 设置页等级展示 == 输入框等级展示 == 请求实际参数
   - OpenRouter 不再出现 `effort + max_tokens` 同时下发
   - 自定义模型无定义时稳定 `off-only`
3. 文档与约束闸门：
   - `docs/CLAUDE.md`、`docs/design/index.md`、`docs/index.md` 同步回写到“model-bank 单一事实源”
   - 删除或修订仍宣称 `thinking-defaults` 为真源的文档描述（如 `packages/api/CLAUDE.md`、`apps/anyhunt/server/src/llm/CLAUDE.md`）
   - 同步修订根 `CLAUDE.md` 中 `prepare:model-registry-data`/`@moryflow/model-registry-data` 相关约束描述
   - 对 active 文档与 CLAUDE 索引执行关键词清理：`@moryflow/agents-model-registry`、`@moryflow/model-registry-data`、`thinking-defaults`（历史 code-review/research 台账保留原始记录）
4. 灰度观察：
   - thinking 相关 4xx 错误率
   - 单次降级重试命中率

验收：闸门通过后再执行全量切换。

## 5. 必删清单（强制）

1. `packages/agents-model-registry/**`（整包删除）。
2. `apps/moryflow/pc/src/shared/model-registry/**`（过渡层删除）。
3. `packages/api/src/membership/thinking-defaults.ts`（删除）。
4. `packages/api/src/membership/index.ts` thinking-defaults 导出（删除）。
5. `packages/model-registry-data/**`（整包删除）。
6. `scripts/ensure-model-registry-data.cjs` 与根 `prepare:model-registry-data` 脚本（删除）。
7. `apps/moryflow/admin/package.json`、`apps/moryflow/pc/package.json`、`apps/moryflow/mobile/package.json` 中旧模型包依赖（删除）。
8. `apps/moryflow/admin/Dockerfile` 中 `@moryflow/model-registry-data` 构建过滤项（删除）。
9. 根 `package.json` 中仅服务于旧模型快照包的 `optionalDependencies`（如 rollup 兼容项，按实际引用清理）。
10. 以下文件中的旧默认映射调用与本地推导逻辑（删除或替换）：
    - `apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts`
    - `apps/moryflow/server/src/ai-proxy/providers/model-provider.factory.ts`
    - `apps/anyhunt/server/src/llm/thinking-profile.util.ts`
    - `apps/anyhunt/server/src/llm/providers/model-provider.factory.ts`
    - `packages/agents-runtime/src/reasoning-config.ts`

- `apps/moryflow/pc/src/main/agent-runtime/index.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
- `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/models.ts`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/add-model-dialog.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/submit-bubbling.test.tsx`
- `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/constants.ts`
- `apps/moryflow/admin/src/features/models/components/ModelFormDialog.tsx`
- `apps/moryflow/admin/src/features/models/components/model-form-dialog/model-search-section.tsx`
- `apps/anyhunt/admin/www/src/pages/llm/model-dialog-fields/ModelCapabilityFields.tsx`

## 6. 工程约束（编码准则）

1. 模块化：规则定义、合同生成、协议转换、UI 展示四层必须物理分离。
2. 单一职责：每个模块只做一件事，不在 UI/runtime/server 重复定义等级语义。
3. 不过度设计：
   - 不引入额外 DSL/动态脚本引擎
   - 不引入多级插件系统
   - 只保留当前业务必需抽象
4. 易读易维护：
   - 类型优先，显式命名
   - 流程清晰，避免隐式 fallback
   - 关键约束有单测

## 7. 风险与应对

1. 风险：一次性替换范围大，可能引入断链。
   - 应对：分阶段闸门，阶段内完成后再进下一阶段。
2. 风险：旧缓存导致新旧等级混用。
   - 应对：模型配置更新后强制清理本地 thinking 覆盖缓存。
3. 风险：自定义模型无规则导致用户误解。
   - 应对：统一 `off-only` 并在 UI 明确只读提示。

## 8. 验收标准（DoD）

1. 模型设置与 thinking 规则唯一来源为 `packages/model-bank`。
2. `@moryflow/agents-model-registry` 不再存在于工作区与依赖图中。
3. `@moryflow/model-registry-data` 不再存在于工作区与构建链路中。
4. `@moryflow/api` 不再包含 thinking 默认映射实现。
5. 之前模型设置数据全部进入新口径（保留配置值，清理规则语义重复定义）。
6. 设置页、输入框、请求 payload、provider 调用四处行为一致。
7. OpenRouter one-of 错误不再复现。

## 9. 执行进度（2026-02-27）

1. Phase 0（done）
   - 完成全仓基线扫描：`@moryflow/agents-model-registry`、`@shared/model-registry`、`@moryflow/model-registry-data`、`thinking-defaults`、`PRESET_PROVIDERS/getSdkType`、Admin 端 `reasoning` 表单语义。
   - 锁定本轮替换清单与回归样本（OpenAI/OpenRouter/Anthropic/Google/Minimax/自定义模型）。
2. Phase 1（done）
   - 在 `packages/model-bank` 新增 `registry` 子域，提供兼容 API：
     - `providerRegistry/modelRegistry`
     - `getProviderById/getSortedProviders/getModelById/getModelContextWindow/toApiModelId`
     - `searchModels/getModelCount/getProviders/getSyncMeta`
   - 更新 `@moryflow/model-bank` 对外导出（`src/index.ts` + `package.json.exports`）。
   - 导出契约收口为 dist 双格式（`import: .mjs / require: .cjs / types: .d.ts`），并补齐 `./aiModels/*` 等 wildcard 子路径导出，保证 Node 运行时与子模块导入一致。
   - 包级校验通过：`pnpm --filter @moryflow/model-bank typecheck`。
3. Phase 2（done）
   - Moryflow/Anyhunt Provider Factory 的 `getSdkType` 已改为消费 `model-bank` 的 `resolveProviderSdkType`，不再依赖本地 preset 映射表。
   - Moryflow `ai-proxy.service` 的 `thinking_profile` fallback 已切换为 model-native 解析（`resolveModelThinkingProfile`），移除 `@moryflow/api` provider 级默认 visibleParams 依赖。
   - Anyhunt `thinking-profile.util` 已接入 model-native fallback（支持 `modelId` 入参），并由 `LlmLanguageModelService` 透传模型 ID 参与解析。
   - 校验通过：
     - `pnpm --filter @moryflow/server typecheck`
     - `pnpm --filter @anyhunt/anyhunt-server typecheck`
4. Phase 3（done）
   - `packages/agents-runtime` 已移除对 `@moryflow/api` thinking-defaults 的运行时依赖，统一改为消费 `@moryflow/model-bank` thinking 解析结果。
   - `reasoning-config.ts`：
     - SDK 默认等级/参数读取来源改为 `resolveSdkDefaultThinkingProfile/getThinkingVisibleParamsByLevel`（model-bank）。
     - OpenRouter `extraBody.reasoning` 继续强制 one-of（`effort` 与 `max_tokens` 互斥，budget 优先）。
     - 补齐 `effort/thinkingLevel` 到 Anthropic/Google `thinkingBudget` 的运行时映射。
   - `thinking-profile.ts`：
     - 默认 profile 构建切换为 model-native（`resolveModelThinkingProfile`）+ sdk fallback（`resolveSdkDefaultThinkingProfile`）双阶段解析。
     - 云端 `rawProfile` 合同优先，local override 仅改 `defaultLevel`，不再走 provider 级硬编码映射。
   - `model-factory.ts`：
     - 会员与普通 provider 的 thinking profile 都改为走新解析器，并透传 `modelId/providerId`。
   - `packages/model-bank` thinking 解析器增强：
     - `abilities.reasoning=false` 强制 `off-only`。
     - 新增 `resolveSdkDefaultThinkingProfile` 供 runtime/UI 统一读取 sdk 默认档案。
   - 校验通过：
     - `pnpm --filter @moryflow/model-bank typecheck`
     - `pnpm --filter @moryflow/model-bank test:unit`
     - `pnpm --filter @moryflow/agents-runtime test:unit`
5. Phase 4（done）
   - PC：
     - main/renderer 侧核心模型查询与 thinking 解析统一切换到 `@moryflow/model-bank`。
     - 删除 `apps/moryflow/pc/src/shared/model-registry/**` 过渡层。
     - Settings Dialog 与 Chat Pane 的 thinking 等级展示统一改读 model-bank 合同。
   - Mobile：
     - `apps/moryflow/mobile/lib/agent-runtime/runtime.ts` 移除 `@moryflow/agents-model-registry` 依赖，改读 model-bank registry。
   - Admin：
     - `apps/moryflow/admin` 与 `apps/anyhunt/admin/www` 模型搜索/能力表单统一接入 `@moryflow/model-bank`。
     - Anyhunt Admin `ModelCapabilityFields` 改为按 provider/model 动态读取 thinking 等级，不再维护硬编码 effort 列表。
   - 验收结果：客户端不再维护独立等级枚举与 provider 级默认映射。
6. Phase 5（done）
   - 删除整包：
     - `packages/agents-model-registry/**`
     - `packages/model-registry-data/**`
   - 删除旧映射与旧脚本：
     - `packages/api/src/membership/thinking-defaults.ts`
     - `scripts/ensure-model-registry-data.cjs`
     - 根 `package.json` 的 `prepare:model-registry-data` 链路
   - 清理构建与依赖：
     - `apps/moryflow/admin` 移除 prebuild 依赖旧模型快照包。
     - `apps/moryflow/admin/Dockerfile` 移除 `@moryflow/model-registry-data` 构建过滤项。
     - `tsc-multi.stage1.json`/`tsc-multi.json` 清理旧包构建项，`build:agents` 恢复稳定。
7. Phase 6（done）
   - 模型设置数据口径统一：
     - 保留用户配置字段（provider/model 的 apiKey/baseUrl/enabled/defaultModel 等）。
     - 删除“规则语义”在 DB/本地设置层的重复定义，thinking 规则全部由 model-bank 解析。
   - 运行时归一化：
     - 无原生 thinking 能力模型强制 `off-only`。
     - 本地历史 `thinkingByModel` 覆盖在模型配置更新后自动清理，避免旧缓存覆盖新默认值。
   - OpenRouter one-of 根因收口：
     - `reasoning.effort` 与 `reasoning.max_tokens` 在 runtime 层强制互斥，避免 400 冲突。
8. Phase 7（done）
   - 全仓闸门通过：
     - `pnpm lint`
     - `pnpm typecheck`
     - `pnpm test:unit`
   - 复核记录（2026-02-27）：
     - 上述三条命令在本分支最终收口后再次全量执行，全部通过。
   - 导出回归记录（2026-02-27）：
     - 修复 `@moryflow/model-bank` CJS 运行时导出与 `exports` 覆盖测试不一致问题（`src/exports.test.ts` + `package.json.exports`），并复跑全仓闸门通过。
   - 行为闸门通过：
     - 设置页等级展示 == 输入框等级展示 == 请求实参。
     - OpenRouter 不再出现 `effort + max_tokens` 同发。
     - 自定义模型无 thinking 定义时稳定 `off-only`。
   - 文档闸门通过：
     - `docs/CLAUDE.md`、`docs/design/index.md`、`docs/index.md`、根 `CLAUDE.md` 已回写。
     - `packages/api/CLAUDE.md`、`apps/anyhunt/server/src/llm/CLAUDE.md`、`apps/moryflow/admin/CLAUDE.md` 旧描述已修订。

## 10. 最终结果（冻结）

1. `packages/model-bank` 成为模型与 thinking 规则唯一事实源。
2. server/runtime/pc/mobile/admin 全链路已改为“只消费 model-bank 规则 + 各自职责编排”。
3. 旧双轨体系（`agents-model-registry` / `model-registry-data` / `thinking-defaults`）已完全删除。
4. 本方案执行状态冻结为 `implemented`，后续新增模型按 model-bank 模块化规范扩展。

## 11. 复查发现与修复方案（2026-02-27，implemented）

### 11.1 复查发现（代码级）

1. PC 聊天入口在“无本地覆盖”场景优先回落 `off`，未严格遵循 `thinking_profile.defaultLevel`。
2. 仍存在 `sdkType -> fallback thinking levels` 推导链路，不满足“模型原生等级直出”的最终口径。
3. Anyhunt Admin 模型能力表单仍以 `reasoning.effort` 为中心，未完全对齐 `thinking_profile.levels` 合同。
4. 按仓库协议，部分目录改动未同步对应目录级 `CLAUDE.md`。

### 11.2 本轮修复目标

1. 聊天入口在无覆盖时严格使用模型 `defaultLevel`，仅在合同无效时回落 `off`。
2. 删除 provider/sdk 级默认等级 fallback；等级来源只允许模型合同（云端下发或模型显式定义）。
3. Admin 表单改为“等级合同驱动”，不再暴露或依赖 provider 通用 `effort` 枚举。
4. 补齐目录级文档回写，确保文档与实现同源。

### 11.3 执行步骤（已完成）

#### Step A（L1）修复 PC 默认等级优先级

1. 调整 `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-model-selection.ts`：
   - 无本地覆盖时使用 `profile.defaultLevel`；
   - `defaultLevel` 不合法再回落 `off`。
2. 补齐/更新回归测试：
   - `selectedThinkingByModel` 无覆盖时应命中 `defaultLevel`；
   - 覆盖值非法时回落到 `defaultLevel`/`off`。

#### Step B（L2）移除 sdk 级 fallback 映射链路

1. `packages/model-bank/src/thinking/resolver.ts`：
   - 下线 `SDK_DEFAULT_CONTROLS` 路径；
   - `resolveSdkDefaultThinkingProfile` 仅保留兼容壳层并返回 `off-only`（或标记 deprecated 并禁止业务调用）。
2. `apps/moryflow/pc/src/renderer/components/chat-pane/models.ts`：
   - 删除基于 `sdkType` 推导默认等级的 fallback；
   - 仅消费模型 `thinking_profile`，无合同即 `off-only`。
3. `packages/agents-runtime`：
   - 清理对 sdk 默认等级集合的业务依赖；
   - 仅消费模型级 profile。

#### Step C（L1）Anyhunt Admin 表单合同化

1. `apps/anyhunt/admin/www/src/features/llm/forms/model-form.ts`：
   - 新增基于 `thinking_profile.levels` 的等级选项解析；
   - 删除 `KNOWN_REASONING_EFFORTS` 作为主驱动逻辑。
2. `apps/anyhunt/admin/www/src/pages/llm/model-dialog-fields/ModelCapabilityFields.tsx`：
   - UI 改为等级选择（`off + model-native levels`）；
   - 仅展示从等级反解出的只读参数摘要。
3. 保留后端兼容字段时，映射统一在一处方法完成，禁止组件层自行拼装 provider 参数。

#### Step D（L1）文档与目录回写补齐

1. 回写受影响目录 `CLAUDE.md`（至少包含：`apps/moryflow/server`、`apps/moryflow/pc/src/main`、`apps/moryflow/pc/src/shared/ipc`、`apps/moryflow/mobile/lib`、`apps/anyhunt/server`、`apps/anyhunt/admin/www`）。
2. 同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/design/index.md` 的阶段状态与结论。

### 11.4 验收闸门（本修复轮）

1. 行为闸门：
   - PC 无覆盖时，输入框等级 = `thinking_profile.defaultLevel`。
   - `MiniMax-M2.5` 等模型等级仅来自模型合同，不再出现 sdk 通用档位污染。
2. 协议闸门：
   - OpenRouter 仍满足 one-of：`reasoning.effort` 与 `reasoning.max_tokens` 不同时下发。
3. 工程闸门：
   - `pnpm --filter @moryflow/model-bank test:unit`
   - `pnpm --filter @moryflow/agents-runtime test:unit`
   - `pnpm --filter @moryflow/pc typecheck && pnpm --filter @moryflow/pc test:unit`
   - `pnpm --filter @anyhunt/admin typecheck`
   - `pnpm --filter @anyhunt/anyhunt-server typecheck && pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts src/llm/__tests__/model-provider.factory.spec.ts`

### 11.5 阶段状态

1. Step A：done（2026-02-27）
   - 代码：`use-chat-model-selection` 的 thinking 解析已拆分为纯函数层（`use-chat-model-selection.utils.ts`），并修复“无本地覆盖时优先 defaultLevel”。
   - 测试：新增 `use-chat-model-selection.utils.test.ts`（5 条），并与 `chat-prompt-input-thinking-selector.test.ts` 联合通过。
   - 校验：`pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/hooks/use-chat-model-selection.utils.test.ts src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-thinking-selector.test.ts`、`pnpm --filter @moryflow/pc typecheck` 均通过。
2. Step B：done（2026-02-27）
   - `model-bank`：`resolveSdkDefaultThinkingProfile` 保持兼容壳层但固定返回 `off-only`，不再提供 SDK 级默认等级事实源。
   - PC Chat：`chat-pane/models.ts` 已移除 `sdkType -> levels/visibleParams` fallback，`thinkingProfile` 统一改为“模型合同（rawProfile 或 model-native）+ local override(defaultLevel)”；无合同稳定 `off-only`。
   - PC Settings：`providers/constants.ts` 移除 SDK 级默认等级读取，设置页无模型合同场景固定 `off`。
   - `agents-runtime`：`thinking-profile.ts` 移除 sdk fallback merge，默认 profile 仅来自模型级合同；`reasoning-config.ts` 移除 SDK 默认等级/参数函数，保留协议层能力判断与 one-of 下发约束。
   - 测试与校验：
     - `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/reasoning-config.test.ts src/__tests__/thinking-profile.test.ts`
     - `pnpm --filter @moryflow/pc typecheck`
     - `pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/hooks/use-chat-model-selection.utils.test.ts src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-thinking-selector.test.ts`
3. Step C：done（2026-02-27）
   - Anyhunt Admin 表单改为“等级合同驱动”：
     - `model-form.ts` 删除 `KNOWN_REASONING_EFFORTS` 主驱动，新增 `resolveLlmReasoningPreset`（返回 `levelOptions/defaultLevel/supportsThinking`）。
     - form schema 的 reasoning 字段收敛为 `enabled + level + exclude`，不再让 UI 直接维护 provider 通用 effort/maxTokens 枚举。
   - 兼容映射集中：
     - `toLlmReasoningConfig` 统一在一处完成 `thinking level -> reasoning(effort/maxTokens/includeThoughts)` 映射，并继续支持 `rawConfig` 透传。
     - `toCreateLlmModelInput/toUpdateLlmModelInput` 改为显式接收 `providers`，通过 `providerId -> providerType` 精确解析模型合同。
   - UI 合同化：
     - `ModelCapabilityFields.tsx` 改为等级选择器 + 只读 visibleParams 摘要展示，移除手填 effort/maxTokens 输入。
     - 无 thinking 合同模型自动锁定 `off` 并禁用开关。
   - 校验：
     - `pnpm --filter @anyhunt/admin typecheck`
     - `pnpm --filter @moryflow/model-bank test:unit src/thinking/resolver.test.ts`
4. Step D：done（2026-02-27）
   - 目录级文档回写：
     - `apps/moryflow/server/CLAUDE.md`
     - `apps/moryflow/pc/src/main/CLAUDE.md`
     - `apps/moryflow/pc/src/shared/ipc/CLAUDE.md`
     - `apps/moryflow/mobile/lib/CLAUDE.md`
     - `apps/anyhunt/server/src/llm/CLAUDE.md`
     - `apps/anyhunt/admin/www/CLAUDE.md`
     - `apps/anyhunt/admin/www/src/features/CLAUDE.md`
     - `apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md`
     - `apps/moryflow/pc/src/renderer/components/settings-dialog/CLAUDE.md`
     - `packages/agents-runtime/CLAUDE.md`
     - `packages/model-bank/CLAUDE.md`
   - Docs 索引/状态回写：
     - `docs/index.md`
     - `docs/CLAUDE.md`
     - `docs/design/index.md`
   - 结果：Section 11 全步骤闭环，文档状态与代码实现一致。

## 12. 后续问题修复：Settings Dialog 等级下拉仅 `off`（2026-02-27，implemented）

### 12.1 现象

1. 在 PC 设置弹窗中，选择 OpenRouter 的 `openai/gpt-5.2` 或 OpenAI 的 `gpt-5.2` 后，`Reasoning mode` 为开启状态，但 `Default thinking level` 下拉仅显示 `off`。
2. 同一模型在聊天输入框可展示多等级（或模型合同明确支持多等级），与设置弹窗不一致。

### 12.2 根因（已定位）

1. Step B 为了移除 SDK 级 fallback，将 `getThinkingLevelsBySdkType` 收敛为固定 `['off']`（`apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/constants.ts`）。
2. `AddModelDialog/EditModelDialog` 仍以 `sdkType -> getThinkingLevelsBySdkType` 作为下拉选项数据源，未切换到模型合同解析。
3. 结果是设置弹窗丢失了模型原生等级能力，只剩 `off`；该行为与“模型合同单一事实源”目标不一致。

### 12.3 模型数据佐证

1. `@moryflow/model-bank` 中：
   - `openai:gpt-5.2`
   - `zenmux:openai/gpt-5.2`
     均声明 `extendParams: ['gpt5_2ReasoningEffort', ...]`。
2. `gpt5_2ReasoningEffort` 的原生等级定义是：`off / low / medium / high / xhigh`（无 `minimal`）。
3. 结论：数据源正确，问题在设置页消费链路而非模型库。

### 12.4 修复实施（done）

1. 新增 settings 纯函数：`apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/thinking-level-options.ts`
   - 输入：`providerId/sdktype/modelId/reasoningEnabled/selectedLevel`
   - 输出：`options/defaultLevel/normalizedLevel/supportsThinking`
   - 规则：
     - 首先按 `providerId + modelId` 调用 `resolveModelThinkingProfile`
     - 若 provider 维度结果为 `off-only` 且存在 `modelId`，则回退到 `modelId` 维度解析（覆盖 router/聚合商模型 ID 不落在本 provider 名下的场景）
     - 未命中模型合同时稳定 `off-only`
2. `AddModelDialog` 已改为模型合同驱动：
   - thinking 下拉选项不再来自 `sdkType` 枚举
   - 选择模型库项时按当前 provider+model 合同实时计算可选等级与默认值
   - 提交前统一使用 `normalizedLevel`，避免非法值写入
3. `EditModelDialog` 已改为模型合同驱动：
   - 初始化优先级：`saved override -> profile.defaultLevel -> off`
   - 等级合法化与提交值统一走 `normalizedLevel`
4. 调用链透传补齐：
   - `ProviderDetails -> ProviderDetailsPreset -> Add/EditDialog` 新增 `providerId` 透传
   - `ProviderDetailsCustom -> CustomProviderModels -> Add/EditDialog` 新增 `providerId/sdktype` 透传
5. 无用代码删除：
   - `constants.ts` 删除 `getThinkingLevelsBySdkType` 和 `THINKING_LEVEL_LABELS`（UI 不再维护 SDK 等级映射）
6. 回归测试补齐：
   - 新增：`thinking-level-options.test.ts`
   - 覆盖：OpenAI `gpt-5.2`、OpenRouter `openai/gpt-5.2`、未知模型 off-only、非法历史 override 回落、reasoning=false off-only

### 12.5 验收口径

1. 设置弹窗与聊天输入框在同一模型上的等级集合一致（均来自模型合同）。（done）
2. `gpt-5.2` 与 `openai/gpt-5.2` 在设置页可见 `off/low/medium/high/xhigh`。（done）
3. 无模型合同场景稳定 `off-only`，且不影响已支持模型等级展示。（done）

### 12.6 校验记录（2026-02-27）

1. `pnpm --filter @moryflow/pc typecheck`（pass）
2. `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/settings-dialog/components/providers/thinking-level-options.test.ts src/renderer/components/settings-dialog/components/providers/provider-details.test.tsx src/renderer/components/settings-dialog/components/providers/submit-bubbling.test.tsx`（pass）
