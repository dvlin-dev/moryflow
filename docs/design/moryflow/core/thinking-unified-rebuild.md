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

[PROTOCOL]: 本文更新需同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/design/index.md`，若影响全局再同步根 `CLAUDE.md`。
-->

# Moryflow/Anyhunt Thinking 统一重构方案（OpenCode 对齐，C 端优先）

## 0. 执行进度（实时回写）

> 更新时间：2026-02-27

| 阶段    | 任务                                                                | 状态      | 最近进展                                                                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | 契约收敛（移除 `enabledLevels/levelPatches`）                       | ✅ 已完成 | `packages/model-bank` / `packages/agents-runtime` / server/client 合同类型已统一到 `thinking_profile + visibleParams`；Moryflow PC 设置页已删除 patch/勾选入口                                                                                |
| Phase 2 | 运行时改造（模板执行单一路径）                                      | ✅ 已完成 | `agents-runtime` 与 Anyhunt/Moryflow server 均改为按 `thinking_profile.levels[].visibleParams` 解析执行参数；Anyhunt 错误码统一为 `THINKING_LEVEL_INVALID/THINKING_NOT_SUPPORTED`；Moryflow `/v1/chat/completions` 请求统一为 `thinking` 选择 |
| Phase 3 | 前端收敛（统一交互 + 参数展示）                                     | ✅ 已完成 | Moryflow PC / Anyhunt Console Thinking 选择器统一展示模型原生等级 + 默认参数；Console transport 改为 RFC7807 `code` 边界重试                                                                                                                  |
| Phase 4 | 观测与收口（错误码/告警/清理）                                      | ✅ 已完成 | 后端补齐 thinking 结构化日志（requested/resolved level）、前端/后端重试边界统一、旧 `enabledLevels/levelPatches` 代码路径清理                                                                                                                 |
| Phase 5 | Code Review 发现项修复（Provider 生效链路 + 单一事实源 + 回归测试） | ✅ 已完成 | 已修复 Moryflow server OpenAI/Anthropic/Google thinking 注入链路；统一切换到 `@moryflow/model-bank` 单一事实源；Moryflow thinking 边界错误补齐结构化 code（`THINKING_LEVEL_INVALID/THINKING_NOT_SUPPORTED`）；补齐专项回归测试（7 条）        |
| Phase 6 | 用户自配置回归专项（OpenRouter + Thinking 覆盖缓存）                | ✅ 已完成 | 三段根因均已收口：设置弹窗 `sdkType` 透传修复、`thinkingByModel` 历史覆盖自动清理、runtime OpenRouter one-of（`effort`/`max_tokens`）互斥强约束；复测通过                                                                                     |

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
14. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/model-factory.test.ts src/__tests__/thinking-profile.test.ts src/__tests__/thinking-adapter.test.ts src/__tests__/reasoning-config.test.ts src/__tests__/ui-stream.test.ts` ✅
15. `pnpm --filter @moryflow/pc test:unit src/main/chat/__tests__/stream-agent-run.test.ts` ✅
16. `pnpm --filter @moryflow/pc typecheck` ✅
17. `pnpm build:packages` ✅
18. `pnpm --filter @moryflow/mobile check:type` ⚠️（存在仓库既有基线类型错误，未在本轮范围内清债）
19. `pnpm --filter @moryflow/model-bank test:unit src/thinking/resolver.test.ts` ✅
20. `pnpm --filter @moryflow/model-bank build && pnpm --filter @moryflow/model-bank typecheck` ✅
21. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/model-factory.test.ts` ✅
22. `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/models.test.ts src/renderer/components/settings-dialog/components/providers/thinking-level-options.test.ts src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx` ✅
23. `pnpm --filter @moryflow/pc typecheck` ✅
24. `pnpm --filter @moryflow/mobile check:type` ⚠️（仍为仓库既有基线问题，报错集中在 chat input 类型导出、tasks/cloud-sync TS 泛型、tiptap 模块声明，和本次 raw-only 改动无直接耦合）
25. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/ui-stream.test.ts` ✅
26. `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/components/settings-dialog/components/providers/submit-bubbling.test.tsx src/renderer/components/settings-dialog/components/providers/thinking-level-options.test.ts` ✅
27. `pnpm --filter @moryflow/pc typecheck` ✅
28. `pnpm --filter @moryflow/model-bank test:unit src/thinking/reasoning.test.ts src/thinking/resolver.test.ts` ✅
29. `pnpm --filter @moryflow/model-bank build` ✅
30. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/reasoning-config.test.ts` ✅
31. `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts` ✅
32. `pnpm --filter @anyhunt/admin typecheck` ✅
33. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/ui-stream.test.ts src/__tests__/reasoning-config.test.ts` ✅
34. `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/lib/chat-thinking-overrides.test.ts` ✅
35. `pnpm --filter @moryflow/pc typecheck` ✅
36. `pnpm --filter @moryflow/model-bank typecheck` ✅
37. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/thinking-adapter.test.ts src/__tests__/thinking-profile.test.ts src/__tests__/model-factory.test.ts` ✅
38. `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
39. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/model-factory.test.ts` ✅
40. `pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/models.test.ts` ✅
41. `pnpm --filter @moryflow/model-bank test:unit src/registry/index.test.ts` ✅
42. `pnpm --filter @moryflow/model-bank typecheck` ✅
43. `CI=1 pnpm --filter @moryflow/pc test:unit src/main/agent-settings/__tests__/normalize.test.ts src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx src/renderer/components/settings-dialog/components/providers/submit-bubbling.test.tsx` ✅
44. `CI=1 pnpm --filter @moryflow/pc test:unit src/main/chat/__tests__/agent-options.test.ts` ✅
45. `pnpm --filter @moryflow/pc typecheck` ✅
46. `pnpm --filter @moryflow/mobile check:type` ⚠️（仓库既有基线类型错误，和本轮变更无直接耦合，错误集中在 mobile chat/types、tasks/cloud-sync、tiptap 模块声明）
47. `CI=1 pnpm --filter @moryflow/pc test:unit src/main/agent-settings/__tests__/normalize.test.ts` ✅
48. `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/model-factory.test.ts` ✅
49. `pnpm --filter @moryflow/server test src/ai-proxy/ai-proxy.service.spec.ts` ✅
50. `pnpm --filter @moryflow/server test src/ai-proxy/ai-proxy.thinking.spec.ts` ✅
51. `pnpm --filter @moryflow/pc typecheck` ✅
52. `pnpm --filter @moryflow/model-bank test:unit src/thinking/resolver.test.ts` ✅
53. `pnpm --filter @moryflow/model-bank build` ✅
54. `pnpm --filter @moryflow/server test src/ai-proxy/providers/model-provider.factory.thinking.spec.ts` ✅
55. `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/model-provider.factory.spec.ts` ✅
56. `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/handle.test.ts src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx` ✅
57. `pnpm --filter @moryflow/model-bank typecheck` ✅

### 0.2 补丁治理二次整改（已完成）

> 目标：删除“临时 fallback/桥接”实现，收敛为单一路径根因方案。  
> 执行顺序：`2 -> 1 -> 5 -> 3 -> 4 -> 6`（按你已确认顺序）。

| 步骤 | 事项                               | 目标                                                                          | 状态      | 进度备注                                                                                                                                                                  |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | `model-bank` resolver 根因修复     | 将跨 provider 聚合模型解析能力下沉到 resolver，删除“外层二次查 modelId”的前提 | ✅ 已完成 | `resolveBuiltinModel` 新增候选链：provider 精确命中 -> modelId 语义前缀命中 -> modelId 全局命中；补齐 `resolver.test.ts` 回归用例（openrouter/custom + `openai/gpt-5.2`） |
| 1    | 删除 UI 双轨 fallback              | Settings + ChatPane 仅调用一次 resolver，不再 provider miss 后二次回退        | ✅ 已完成 | 删除 `thinking-level-options.ts` 与 `chat-pane/models.ts` 的 fallback 分支；相关 PC 单测改为新契约描述并通过                                                              |
| 5    | Mobile 流式消费改为 raw-only       | 移除 `reasoning_item_created` 可视渲染路径，和 PC 契约一致                    | ✅ 已完成 | `mobile/lib/chat/transport.ts` 删除 run-item reasoning 渲染，只消费 raw model stream reasoning                                                                            |
| 3    | 删除 DOM CustomEvent 桥接          | thinking 覆盖清理改为 store/method 单源，不再跨模块事件广播                   | ✅ 已完成 | 新增 `renderer/lib/chat-thinking-overrides.ts` 作为单源；Settings 保存模型时直接调用 `clearChatThinkingOverride`；ChatPane 通过订阅共享状态同步                           |
| 4    | 移除 runtime legacy reasoning 直传 | `buildModelOptions.reasoning` 旧入口删除，只保留 thinking 合同路径            | ✅ 已完成 | `agents-runtime/model-factory.ts` 删除 `buildOptions.reasoning` 与 `useLegacyReasoning` 双轨逻辑，返回统一的 resolved thinking 结果                                       |
| 6    | `agent:test-provider` fail-fast    | 去掉 `sdkType` 静默回退 `openai-compatible`，配置缺失直接报错                 | ✅ 已完成 | `ipc-handlers.ts` 改为：无 `sdkType` 直接失败；非法 `sdkType` 直接失败；不再静默兜底                                                                                      |

结论（2026-02-27）：

1. 已按确认顺序 `2 -> 1 -> 5 -> 3 -> 4 -> 6` 全量完成。
2. 补丁式临时逻辑已清理，统一收敛到 model-bank resolver / raw-only stream / 单源 store method / fail-fast 契约。
3. 文档与测试已同步回写，可作为后续同类问题治理基线。

### 0.3 Root-Cause Follow-up（已完成）

> 目标：继续清理“补丁味道”实现，确保思考链路长期可维护（单路径、强类型、单源规则）。
> 执行顺序：`1 -> 2 -> 3 -> 4 -> 5`（已确认）。

| 步骤 | 事项                             | 目标                                                                                     | 状态      | 进度备注                                                                                                                                |
| ---- | -------------------------------- | ---------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 流通道单选（top-level only）     | 文本/思考只消费顶层 raw event，彻底移除 model 子通道回退，消除顺序敏感重复               | ✅ 已完成 | `createRunModelStreamNormalizer` 改为永久忽略 `model.text-delta/reasoning-delta`；补齐 model-first/top-level-first 回归测试             |
| 2    | `sdkType` 必填化                 | Settings Add/Edit/CustomModels 删除 `openai-compatible` 默认兜底，缺失时编译期暴露       | ✅ 已完成 | `AddModelDialog/EditModelDialog/CustomProviderModels` 的 `sdkType` 改为必填并移除默认值；补齐受影响单测                                 |
| 3    | thinking 映射单源化              | Admin/Server/Runtime 的 `level -> reasoning` 映射统一下沉 `model-bank`，移除三处重复解析 | ✅ 已完成 | `model-bank` 新增 `resolveReasoningConfigFromThinkingLevel`；`agents-runtime` / `anyhunt-server` / `anyhunt-admin` 全部改为调用单源函数 |
| 4    | 删除 run-item reasoning 残留导出 | 移除 `extractReasoningTextFromRunItemEvent` 对外导出，避免后续误接回 run-item 渲染路径   | ✅ 已完成 | `ui-stream.ts` 删除函数；`index.ts` 移除导出；对应测试删除并通过回归                                                                    |
| 5    | override store 快照不可变        | `chat-thinking-overrides` 只暴露只读快照（拷贝/冻结），杜绝外部绕过 method 直接改内存    | ✅ 已完成 | `getSnapshot/subscribe` 改为返回快照副本；新增防篡改回归单测                                                                            |

结论（2026-02-27）：

1. 0.3 follow-up 的 5 个根治项已全部完成。
2. Thinking 链路进一步收敛为：顶层流单通道 + `sdkType` 强类型必填 + 映射单源 `model-bank` + 无 run-item 残留导出 + override 快照只读化。
3. 相关回归测试与类型检查已同步通过，可作为后续迭代的基线。

### 0.4 Root-Cause Follow-up（第二轮，已完成）

> 目标：继续清理“隐式协议/双轨语义/legacy 兼容”残留，收敛为 model-bank 单一规则与显式结构约束。
> 执行顺序：`1 -> 2 -> 3 -> 4`（本轮按该顺序推进并实时回写）。

| 步骤 | 事项                                 | 根因问题                                                                                                       | 解决方案                                                                                              | 状态      | 进度备注                                                                                                                                                                             |
| ---- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | 默认模型决策收敛                     | `config.models` 为空时，Runtime/ChatPane 默认启用首模型，忽略 `defaultModelId`，导致同配置在不同链路表现不一致 | 统一为“`defaultModelId` 优先，缺失再回退首模型”的单规则；Runtime 与 ChatPane 共用同语义并补齐回归测试 | ✅ 已完成 | `model-factory.ts` 与 `chat-pane/models.ts` 已统一默认模型规则；新增回归：`model-factory.test.ts`、`chat-pane/models.test.ts` 并通过                                                 |
| 2    | model-bank 模型标识单轨化            | registry 同时保留裸 `modelId` 与 `provider/modelId` 查找，存在歧义与重复来源                                   | registry 仅接受/返回 `provider/modelId` 作为 canonical model id；移除裸 id 读取路径并同步调用方       | ✅ 已完成 | `registry/index.ts` 已改为 provider-ref 单轨；PC/Mobile context window 默认读取已移除裸 id 回退；新增 `registry/index.test.ts` 并通过                                                |
| 3    | custom provider 判定去前缀协议       | 多处逻辑以 `providerId.startsWith('custom-')` 判定 custom provider，属于隐式字符串协议                         | 改为基于 `customProviders` 结构判定（数据事实源）；`custom-` 仅可作为生成策略，不再承载业务语义       | ✅ 已完成 | `provider-list.tsx`/`use-provider-details-controller.ts` 已移除前缀判定；`agent:test-provider` 新增显式 `providerType` 契约；`agent-settings` 已改为结构校验（非前缀）并补齐回归测试 |
| 4    | 删除 `agent-options` legacy 字段桥接 | 主进程仍兼容 `activeFilePath/contextSummary` 旧字段，保留双入口                                                | 仅保留 `context.{filePath,summary}` 合同入口，删除 legacy 解析与测试分支                              | ✅ 已完成 | `agent-options.ts` 已删除 legacy 解析；`agent-options.test.ts` 已改为 `context` 合同断言并新增“legacy 字段忽略”回归                                                                  |

阶段结论（更新于 2026-02-28）：

1. 第二轮 follow-up 的 4 个根因项已全部完成。
2. 当前收敛结果：默认模型单规则、model id 单轨 canonical、custom provider 显式类型契约、agent-options 单入口。
3. 校验结果：`@moryflow/agents-runtime` / `@moryflow/model-bank` / `@moryflow/pc` 相关单测与 typecheck 通过；`@moryflow/mobile check:type` 仍存在仓库既有基线错误（与本轮改造无直接耦合）。

### 0.5 Root-Cause Follow-up（第三轮，已完成）

> 目标：继续清理“补丁式残留”，将思考与模型链路收敛到更严格的单事实源与单语义实现。  
> 执行顺序：`1 -> 2 -> 3 -> 4 -> 5`（本轮按该顺序推进并实时回写）。

| 步骤 | 事项                              | 根因问题                                                                                                           | 解决方案                                                                                                                                                             | 状态      | 进度备注                                                                                                                                                               |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Membership modelId canonical 化   | 会员模型链路仍使用裸 `modelId`，PC/Mobile 在 compaction 上下文窗口推导时缺失 provider 维度，默认上下文窗口可能退化 | 服务端模型下发统一改为 `provider/model`；服务端 `/v1/chat/completions` 同步按 canonical id 校验模型；PC/Mobile compaction 默认上下文窗口读取直接按 canonical id 查询 | ✅ 已完成 | `AiProxyService.getAllModelsWithAccess` 下发 canonical id；`getAndValidateModel` 支持 canonical ref 解析；PC/Mobile compaction 默认 context 读取已优先走 canonical ref |
| 2    | Provider SDK 解析单一事实源       | Moryflow/Anyhunt 两端 `ModelProviderFactory` 重复维护 `knownSdkTypes` 本地回退，存在散点映射风险                   | 将“运行时可执行 SDK 类型解析”下沉到 `@moryflow/model-bank` 单一函数，两端统一调用并 fail-fast                                                                        | ✅ 已完成 | `model-bank` 新增 `resolveRuntimeChatSdkType`；Moryflow/Anyhunt 两端工厂已统一改为单源解析，移除本地 `knownSdkTypes`                                                   |
| 3    | model-bank 兼容壳清理             | `providerModelRegistry` 别名与 `resetCache` no-op 属于遗留兼容壳，容易误导后续扩展                                 | 删除兼容壳导出；registry 内部仅保留 `modelRegistry` 单实例语义                                                                                                       | ✅ 已完成 | `registry/index.ts` 已删除兼容壳 API，内部查找统一改为 `modelRegistry`                                                                                                 |
| 4    | custom provider id 去语义前缀     | 新增 custom provider 仍生成 `custom-*`，保留了字符串前缀协议的语义暗示                                             | 新增 custom provider 改为无业务语义随机 id，不再以 `custom-` 前缀表达类型                                                                                            | ✅ 已完成 | Settings 新增 custom provider 改为 `crypto.randomUUID()` 且带冲突规避，不再使用 `custom-*`                                                                             |
| 5    | ChatPane thinkingProfile 强类型化 | `computeAgentOptions` 仍使用 `as unknown as` 强转，属于类型补丁                                                    | 移除双重断言，改为显式结构映射函数构造 `AgentThinkingProfile`                                                                                                        | ✅ 已完成 | `chat-pane/handle.ts` 已移除 `as unknown as AgentThinkingProfile`，改为强类型透传                                                                                      |

本轮验收标准：

1. Membership 模型在 PC/Mobile compaction 场景下可稳定命中 model-bank context window 默认值。
2. Moryflow/Anyhunt server 不再出现 `knownSdkTypes` 本地回退逻辑，统一由 model-bank 解析。
3. model-bank registry 不再导出兼容壳 API（`providerModelRegistry`、`resetCache`）。
4. PC 新建 custom provider 不再生成 `custom-` 前缀 id。
5. ChatPane `computeAgentOptions` 不再存在 `as unknown as` 类型桥接。

阶段结论（更新于 2026-02-28）：

1. 0.5 第三轮 follow-up 的 5 个根因项已全部完成。
2. 当前收敛结果：membership canonical model ref、provider sdk 解析单源化、model-bank 兼容壳删除、custom provider id 去前缀语义、ChatPane thinkingProfile 强类型化。
3. 校验结果：`@moryflow/server` / `@anyhunt/anyhunt-server` / `@moryflow/model-bank` / `@moryflow/pc` 受影响测试与类型检查均通过。

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
2. 同步 `docs/index.md`、`docs/CLAUDE.md`、`docs/design/index.md` 的最近更新记录。
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

## 12. 用户自配置回归问题专项（2026-02-27，待审核）

### 12.1 现象与证据

1. 用户最新复测结果：设置弹窗与输入框的等级列表已一致，均为 `Off/Minimal/Low/Medium/High/X-High`。
2. 虽然两处已一致，但该列表疑似并非 `minimax/MiniMax-M2.5` 的原生等级，而是平台映射后的 provider 通用等级。
3. 用户将模型默认等级设为 `off` 后，聊天仍会带思考参数（表现为仍在 thinking 模式）。
4. 用户开启 thinking 直接报错：
   - `Only one of "reasoning.effort" and "reasoning.max_tokens" can be specified`
5. 用户日志中的请求体证据显示 OpenRouter payload 同时包含：
   - `reasoning: { effort: 'low', max_tokens: 4096, exclude: false }`
   - 这与 OpenRouter one-of 约束冲突，必然触发 400。

### 12.2 根因拆解（按影响链路）

1. 历史根因（已修复）：预设 Provider 的 Add/Edit Model Dialog 未透传真实 `sdkType`，回落到 `openai-compatible` 默认值，导致设置弹窗与输入框按不同 provider 规则渲染等级集合。该问题在最新复测中已不再出现。
2. 设计层根因（当前仍成立）：Thinking 等级映射目前是 **provider 级**，不是 **model 级**；因此 OpenRouter 下不同模型（含 MiniMax）会共享同一套等级枚举。
3. `off` 仍 thinking 根因：聊天侧本地覆盖缓存 `moryflow.chat.thinkingByModel` 优先级高于模型默认值；当用户在设置页修改默认等级时，历史覆盖未被清理，继续覆盖新默认值。
4. OpenRouter 400 根因（核心）：`packages/agents-runtime/src` 已改为 one-of 构建逻辑，但运行时实际消费 `dist` 导出；当前 `dist/reasoning-config.*` 与 `dist/model-factory.*` 仍是旧产物，仍会发送 `effort + max_tokens`。
   - 证据 A：`src/reasoning-config.ts` 的 `buildOpenRouterExtraBody` 已实现 one-of（`max_tokens` 优先，否则 `effort`）。
   - 证据 B：`dist/reasoning-config.mjs/.js` 仍是 `{ effort, max_tokens, exclude }` 同时下发。
   - 证据 C：`@moryflow/agents-runtime` 包导出指向 `dist/*`，PC 主进程依赖外部化后会直接消费该产物。

### 12.3 解决方案（先文档评审，不改业务逻辑）

#### Step 1：修复“等级展示一致性”与“默认值覆盖”链路

1. （已完成）设置弹窗 Add/Edit Model Dialog 强制透传当前 provider 的真实 `sdkType`，禁止回落到 `openai-compatible` 默认渲染。
2. （待稳定性验收）在模型配置保存成功时，按 `modelId` 精确清理 `moryflow.chat.thinkingByModel` 覆盖值，确保新默认等级立即生效（尤其 `off`）。
3. 增加回归测试：
   - 预设 OpenRouter 场景下设置弹窗与输入框等级集合一致；
   - 修改默认等级后本地覆盖被清理，重新选择模型时读取新默认值。

#### Step 2：修复 OpenRouter one-of 运行时生效链路（构建产物一致性）

1. 将 `@moryflow/agents-runtime` 作为“先编译后运行”的强约束包：变更 `src` 后必须更新 `dist` 才允许进入 PC 运行链路。
2. 在本地和 CI 的 PC 启动/测试前置流程中增加构建闸门（至少执行 `pnpm build:packages` 或等效子集构建），防止旧 dist 被继续消费。
3. 增加构建后快照校验：
   - 校验 `dist/reasoning-config.*` 中 OpenRouter payload 为 one-of；
   - 禁止出现同时包含 `reasoning.effort` 与 `reasoning.max_tokens` 的产物形态。
4. 维持 OpenRouter 规则：`max_tokens` 与 `effort` 二选一，`max_tokens` 优先；`exclude` 可与任一模式共存。

#### Step 3：发布验收与回归门禁

1. 功能验收（用户路径）：
   - `minimax2.5` 默认 `off`：请求不携带 thinking payload；
   - `minimax2.5` 开启 thinking：请求仅携带 one-of 参数，不再 400；
   - `gpt5.2` 开启 thinking：同样不再触发 one-of 冲突；
   - 设置弹窗与输入框等级列表完全一致。
2. 技术验收（构建路径）：
   - `packages/agents-runtime/src` 与 `dist` 语义一致；
   - PC 运行时不再出现旧 dist 行为。
3. 回归门禁建议（L2）：
   - `pnpm --filter @moryflow/agents-runtime test:unit`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @moryflow/pc test:unit src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-thinking-selector.test.ts`

### 12.4 风险与防回退策略

1. 若仅修业务代码但不加构建闸门，后续仍可能因旧 dist 回退复现同类错误。
2. 若仅修构建闸门但不清理本地覆盖，用户仍会感知“设置 `off` 不生效”。
3. 结论：必须同时收口“UI 展示链路 + 本地覆盖缓存 + dist 构建一致性”，三者缺一不可。

### 12.5 当前等级映射规则（代码现状，待淘汰）

1. 单一事实源：
   - `packages/api/src/membership/thinking-defaults.ts`
2. 目前是 provider 级映射，不是 model 级映射：
   - `openai/openai-compatible/xai`：`off/low/medium/high`
   - `openrouter`：`off/minimal/low/medium/high/xhigh`
   - `anthropic`：`off/low/medium/high/max`
   - `google`：`off/low/medium/high`
3. 默认可见参数映射（按 provider + level）：
   - OpenAI 系：`reasoningEffort`
   - OpenRouter：`reasoningEffort + thinkingBudget`
   - Anthropic：`thinkingBudget`
   - Google：`includeThoughts + thinkingBudget`
4. 默认预算映射（`thinkingBudget`）：
   - `minimal=1024`、`low=4096`、`medium=8192`、`high=16384`、`max=32768`、`xhigh=49152`
5. effort 映射：
   - `minimal->minimal`、`low->low`、`medium->medium`、`high->high`、`max/xhigh->xhigh`
6. 用户可配置边界：
   - 设置页当前仅允许覆写 `thinking.defaultLevel`，不允许自定义 levels 列表与 provider 参数。
7. 聊天入口优先级（当前实现）：
   - 优先读取 `localStorage(moryflow.chat.thinkingByModel)` 的模型级覆盖值；
   - 无覆盖时回退 `off`（而不是直接使用 profile.defaultLevel）；
   - 因此“默认等级”更像配置默认值，实际会被本地历史覆盖行为影响。

### 12.6 OpenCode / LobeHub 源码复核结论（2026-02-27）

#### OpenCode（`anomalyco/opencode`）

1. 思考等级不是 provider 固定枚举，而是 **模型级 variants**：
   - `packages/opencode/src/provider/transform.ts`：`ProviderTransform.variants(model)` 基于具体模型 ID 与 provider SDK 动态返回可选 variants。
   - 同文件可见 `deepseek/minimax/glm/mistral/kimi/k2p5` 直接 `return {}`（不套统一等级）。
2. variants 从模型定义进入运行时链路，而非 UI 本地硬编码：
   - `packages/opencode/src/provider/provider.ts`：加载模型时写入 `model.variants`，并允许配置层覆盖/禁用变体；
   - `packages/app/src/components/prompt-input.tsx` + `packages/app/src/context/local.tsx`：下拉选项来自当前模型 `Object.keys(model.variants)`；
   - `packages/app/src/components/prompt-input/submit.ts`：提交时透传 `variant`；
   - `packages/opencode/src/session/llm.ts`：按 `input.user.variant` 合并 `input.model.variants[variant]` 到最终请求 options。
3. 结论：OpenCode 是“模型原生能力直出”，不是“provider 统一思考等级”。

#### LobeHub（`lobehub/lobe-chat`）

1. 模型思考参数能力是 **按模型声明**：
   - `packages/model-bank/src/aiModels/*.ts`：每个模型用 `settings.extendParams` 声明支持项（如 `enableReasoning`、`reasoningBudgetToken`、`reasoningEffort`、`thinkingLevel*`、`gpt5_2ReasoningEffort`）。
2. 运行时以模型声明为准拼装请求参数：
   - `src/store/aiInfra/slices/aiModel/selectors.ts`：读取当前模型 `settings.extendParams`；
   - `src/services/chat/mecha/modelParamsResolver.ts`：仅对当前模型支持的参数键构造 payload（`thinking` / `reasoning_effort` / `thinkingLevel` 等）；
   - `src/services/chat/index.ts`：`resolveModelExtendParams` 结果并入请求。
3. OpenRouter 适配显式遵守 reasoning one-of 约束：
   - `packages/model-runtime/src/providers/openrouter/index.ts`：`thinking.budget_tokens`、`reasoning_effort`、`thinkingLevel` 使用互斥分支映射到 `reasoning`；
   - `packages/model-runtime/src/providers/openrouter/index.test.ts`：覆盖了 `reasoning.max_tokens` 与 `reasoning.effort` 的映射行为。
4. 结论：LobeHub 同样是模型原生参数驱动，不是 provider 固定等级映射。

### 12.7 结论与根本解决方案（零过渡态，待实施）

1. 结论：当前仓库 `packages/api/src/membership/thinking-defaults.ts` 的 provider 级等级映射，与 OpenCode/LobeHub 的模型原生实践不一致，属于本次问题的结构性根因。
2. 必须移除 provider 级思考等级 fallback：
   - 禁止再通过 `sdkType -> 默认等级集合` 推导 UI 等级；
   - `thinking_profile.levels` 只能来自模型目录（云端模型元数据或用户模型显式配置）。
3. 用户自定义模型改为“显式模型契约”：
   - 用户新增模型时要么提供模型原生等级清单，要么系统强制 `off-only`；
   - 不再自动分配 `Off/Minimal/Low/...` 这类 provider 通用档位。
4. 请求构建强制 one-of（尤其 OpenRouter）：
   - `reasoning.effort` 与 `reasoning.max_tokens` 编译期 + 运行时双重互斥；
   - 优先级固定且可测试（例如 `max_tokens` 优先时不再下发 `effort`）。
5. 聊天等级选择改为“模型默认优先”：
   - 无本地覆盖时使用 `thinking_profile.defaultLevel`，不再回退 `off`；
   - 设置页保存模型默认等级后，清理该模型 `thinkingByModel` 历史覆盖。
6. 构建闸门必须前置：
   - `@moryflow/agents-runtime` 变更后必须同步 `dist`，PC 运行链路禁止消费旧产物。
7. 验收标准（新增）：
   - `minimax/MiniMax-M2.5` 显示与可选等级仅来自该模型原生定义；
   - 关闭思考时请求不携带 reasoning；
   - 开启思考时不再出现 `Only one of "reasoning.effort" and "reasoning.max_tokens" can be specified`。

## 13. 根因治理修复方案（文本叠词 + Thinking 不渲染，2026-02-27，待审核）

### 13.1 新增问题事实（基于最新调试日志）

1. 同一轮流式事件中同时出现 `output_text_delta` 与 `model.text-delta`，导致文本被重复写入，出现“叠词/重复句”。
2. `openai/gpt-5.2` 选择 `medium` 后运行时已生效参数（`providerOptions.openai.reasoningEffort='medium'`），但 `hasReasoningDelta=false`，对话无思考渲染。
3. `anthropic/claude-sonnet-4.5` 选择 `medium` 后在 runtime 被降级为 `off`（`thinkingDowngradedToOff=true`），导致请求侧未下发 thinking 参数，前端自然无思考内容。

### 13.2 根因归纳（结构性，不做补丁）

1. **流式协议双源消费**：`extractRunRawModelStreamEvent` 同时消费顶层 `output_text_delta` 与嵌套 `model.text-delta`，缺少 canonical 归一化与单源约束。
2. **Thinking 语义与传输层耦合**：当前 `resolveThinkingToReasoning` 依赖 provider `sdkType`，而 router 场景下模型语义与 transport sdk 不一致，导致错误降级。
3. **渲染信号无强契约**：UI 仅依赖 reasoning delta 是否出现，缺少“已请求 thinking 但被降级/上游不返回可视 reasoning”的结构化状态。

### 13.3 修复目标（最佳实践）

1. 统一流式协议边界：下游只消费 canonical 事件，彻底消除重复文本写入。
2. 统一 thinking 语义边界：按模型原生合同解析 thinking，不再以 provider sdkType 推断等级语义。
3. 统一观测边界：能区分“用户关闭思考 / 运行时降级 / provider 不返回可视 reasoning”，避免黑盒排障。

### 13.4 实施步骤（先文档评审，后落地）

#### Step A（L2）流式事件 canonical 化（根治叠词）

1. 在 `packages/agents-runtime` 新增单一归一化入口（例如 `normalizeRunStreamEvent`）：
   - 输入：原始 `RunRawModelStreamEvent.data`
   - 输出：`{ kind: text|reasoning|finish|ignore, source, payload }`
2. 明确优先级与互斥规则：
   - 同一轮若命中顶层 `output_text_delta`，忽略等价 `model.text-delta`；
   - 若仅有 `model.text-delta`，则正常消费；
   - reasoning 事件同理执行单源锁。
3. `apps/moryflow/pc/src/main/chat/messages.ts` 与 `apps/moryflow/mobile/lib/chat/transport.ts` 统一改为消费 canonical 输出，不再各自做二次推断。

#### Step B（L2）thinking 执行语义模型化（根治错误降级）

1. 在 `model-bank` 明确输出模型级 thinking 执行合同（可落到 `thinking_profile` 扩展字段）：
   - 传输层 sdk（transport）
   - thinking 语义 sdk（thinkingSemantic）
2. `model-factory` 分离两类 sdk：
   - `transportSdkType`：仅用于创建 provider client；
   - `thinkingSemanticSdkType`：仅用于 `resolveThinkingToReasoning` 与 providerOptions 构建。
3. Router 场景按模型合同决定 thinking 语义，不再由 provider `sdkType` 兜底推断。
4. 删除“provider 触发不到再回退 modelId”的临时逻辑，统一改为“模型合同直读 + 无合同 off-only”。

#### Step C（L1）thinking 渲染状态契约化（根治“开启了但看不到”）

1. 在 chat 流式 summary 中新增结构化字段：
   - `thinkingRequested`
   - `thinkingResolvedLevel`
   - `thinkingDowngradeReason`
   - `reasoningVisibility`（`visible`/`suppressed`/`not-returned`）
2. 前端渲染层按状态展示：
   - `visible`：渲染 reasoning 内容；
   - `suppressed/not-returned`：不注入任何补充文案，仅记录日志用于排障。
3. 保持用户可控：仅当存在真实 reasoning 内容时渲染 thinking 区域。

#### Step D（L2）回归测试与验收闸门

1. `agents-runtime`：
   - 新增“混合事件去重”测试（`output_text_delta + model.text-delta` 不重复）
   - 新增“router + claude thinking 不降级”测试
2. `moryflow/pc` 与 `moryflow/mobile`：
   - 新增“同文案不重复”流式回归
   - 新增“thinking requested 但无 reasoning delta”状态渲染回归
3. 验收口径：
   - 不再出现叠词/重复句；
   - `openai/gpt-5.2` 与 `anthropic/claude-sonnet-4.5` 在开启 thinking 后，运行时等级与 UI 一致；
   - 日志可明确说明被降级原因（若存在）。

### 13.5 约束与非目标

1. 不做历史兼容桥接，不保留旧双轨解析函数。
2. 不在 UI 层新增补丁去重逻辑，所有去重统一收敛在共享协议层。
3. 不在 provider 层新增模型特判硬编码，模型语义统一来自 `model-bank` 合同。

### 13.6 阶段进度（按步骤同步）

1. Step A（L2）流式事件 canonical 化：✅ done（2026-02-27）
   - 已新增共享归一化器：`packages/agents-runtime/src/ui-stream.ts#createRunModelStreamNormalizer`。
   - 已切换消费入口：`apps/moryflow/pc/src/main/chat/messages.ts`、`apps/moryflow/mobile/lib/chat/transport.ts` 均改为统一消费归一化输出，不再直接双通道解析。
   - 已补齐回归测试：`packages/agents-runtime/src/__tests__/ui-stream.test.ts` 新增“双通道去重 + model fallback”用例。
   - 校验：`pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/ui-stream.test.ts` 通过。
2. Step B（L2）thinking 执行语义模型化：✅ done（2026-02-27）
   - `packages/agents-runtime/src/model-factory.ts` 已完成 transport/semantic sdkType 分离：transport 仅负责建模，semantic 仅负责 thinking 语义解析与 providerOptions 构建。
   - 已移除 `buildThinkingProfile` 的 provider-miss 再回退 modelId 双轨逻辑，改为模型合同直读：无命中即 `off-only`。
   - `resolveReasoningConfigFromThinkingSelection` 已补齐“按 level token 推导 effort”能力，确保云端 raw profile 未显式 visibleParams 时仍能稳定落地 OpenAI/OpenRouter thinking。
   - 已新增/更新回归：`model-factory.test.ts`、`thinking-profile.test.ts`、`thinking-adapter.test.ts`、`reasoning-config.test.ts` 全通过。
3. Step C（L1）thinking 渲染状态契约化：✅ done（2026-02-27）
   - `packages/agents-runtime/src/thinking-adapter.ts` 新增结构化降级原因：`requested-level-not-allowed` / `reasoning-config-unavailable`。
   - `BuildModelResult` 与 PC `ChatTurnResult.thinkingResolution` 已透传 `thinkingDowngradeReason`。
   - `apps/moryflow/pc/src/main/chat/messages.ts` 已实现 `reasoningVisibility` 统一判定（`visible/suppressed/not-returned`），`suppressed/not-returned` 仅写日志不输出补文案。
   - 已新增 PC 主进程回归：`stream-agent-run.test.ts` 覆盖 `not-returned` 与 `suppressed(downgrade)` 两类状态。
4. Step D（L2）回归测试与验收闸门：✅ done（2026-02-27）
   - 已通过：
     - `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/model-factory.test.ts src/__tests__/thinking-profile.test.ts src/__tests__/thinking-adapter.test.ts src/__tests__/reasoning-config.test.ts src/__tests__/ui-stream.test.ts`
     - `pnpm --filter @moryflow/pc test:unit src/main/chat/__tests__/stream-agent-run.test.ts`
     - `pnpm --filter @moryflow/pc typecheck`
     - `pnpm build:packages`（确保 `@moryflow/agents-runtime` dist 与源码一致）
   - 说明：`pnpm --filter @moryflow/mobile check:type` 当前存在仓库既有历史类型错误（与本次 thinking/stream 变更无关），本轮未做跨模块清债，已记录为独立存量问题。

### 13.7 Raw-only 收口补充（2026-02-27）

1. `apps/moryflow/pc/src/main/chat/messages.ts`
   - reasoning 可视内容严格来自 `raw_model_stream_event`。
2. `apps/moryflow/pc/src/main/chat-debug-log.ts` + `apps/moryflow/pc/src/main/index.ts`
   - 对话流日志改为全环境默认常开；
   - 应用每次启动先清空 `chat-stream.log`，初始化失败自动降级 console-only，不阻断启动。
3. 回归补充
   - `apps/moryflow/pc/src/main/chat/__tests__/stream-agent-run.test.ts` 覆盖 Raw-only 与“无 reasoning 不注入补文案”行为。

## 14. Root-Cause Hardening Batch-2（2026-02-27，执行中）

### 14.1 问题清单（当前分支复查）

1. `sdkType` 仍存在默认值与隐式兜底（`openai-compatible`），与强契约 fail-fast 冲突。
2. ChatPane 仍保留 `ensureModelIncluded` 幽灵模型注入，属于历史兼容补丁。
3. Anyhunt Server 与 Moryflow Server 仍各自维护 thinking profile/selection 解析逻辑，存在规则漂移风险。
4. Anyhunt `providerType` 到 thinking 语义未做统一 canonical 化，仍可能出现“传输层类型”和“thinking 语义类型”偏差。
5. `extractRunRawModelStreamEvent` 仍保留 `model.event.*` 分支，虽上层已 raw-only，但底层仍有双轨入口。
6. `resolveSdkDefaultThinkingProfile` 仍对外暴露（虽已 off-only），属于过渡壳层，存在误用风险。

### 14.2 根治方案（不做补丁）

1. **`sdkType` 强收敛**：
   - 预设 provider 一律内置映射，不给用户选择入口。
   - 自定义 provider 不再暴露 `sdkType`，统一固定为 `openai-compatible`。
   - 删除 schema/default 中所有 `sdkType` 默认兜底写入。
2. **删除幽灵模型兼容路径**：
   - 移除 `ensureModelIncluded` 注入逻辑；
   - 选中模型不存在时直接切换到首个可用模型（无可用则空态），不伪造占位模型。
3. **thinking 规则服务端单源化**：
   - 新增 `@moryflow/model-bank` 的 shared thinking contract/selection 解析函数；
   - Anyhunt/Moryflow server 全部改为消费 shared 实现，删除本地重复逻辑。
4. **Anyhunt canonical 化**：
   - `providerType` 在 thinking 解析前统一经过 canonical 归一（`resolveProviderSdkType`），再做 selection->reasoning。
5. **流式底层彻底 raw-only**：
   - 删除 `extractRunRawModelStreamEvent` 内 `model.event.text-delta/reasoning-delta/finish` 分支；
   - `createRunModelStreamNormalizer` 退化为轻量 passthrough（仅顶层 raw 事件语义）。
6. **清理过渡壳层导出**：
   - 删除 `resolveSdkDefaultThinkingProfile` 及对应测试；
   - `thinking` 对外 API 仅保留 model-native 路径。

### 14.3 执行顺序与进度

1. Step 1（✅ done）：`sdkType` 强收敛（预设内置 + 自定义固定 openai-compatible）
   - 设置页自定义 provider 移除 `sdkType` 可选输入（改为只读 `OpenAI Compatible`）。
   - `CustomProviderConfig` 从 PC shared IPC 与 agents-runtime 同步删除 `sdkType` 字段。
   - IPC `agent:test-provider` 对 custom provider 缺省协议统一固定 `openai-compatible`。
2. Step 2（✅ done）：删除 ChatPane 幽灵模型兼容路径
   - 删除 `ensureModelIncluded` 注入逻辑，不再伪造 `Custom` fallback 分组。
   - 新增可用模型选择纯函数：仅在真实可用模型中挑选（无效默认值会回落到首个可用模型）。
3. Step 3（✅ done）：model-bank 新增 shared thinking contract 解析并接管 server
   - 新增 `packages/model-bank/src/thinking/contract.ts`：
     - `buildThinkingProfileFromCapabilities`
     - `resolveReasoningFromThinkingSelection`
     - `ThinkingContractError`
   - Anyhunt `thinking-profile.util.ts` 重写为 model-bank 包装层（删除本地重复解析）。
   - Moryflow `ai-proxy.service.ts` 的 thinking profile / reasoning 解析改为消费 model-bank contract。
4. Step 4（✅ done）：Anyhunt providerType canonical 化接入
   - Anyhunt thinking 解析链路统一经 `model-bank.resolveProviderSdkType`（在 contract 内部完成 canonical）。
   - 消除 `providerType` 原值与 sdk 语义不一致导致的分支漂移。
5. Step 5（✅ done）：ui-stream 底层分支彻底 raw-only
   - `extractRunRawModelStreamEvent` 删除 `model.event.*` (`text-delta/reasoning-delta/finish`) 入口。
   - `createRunModelStreamNormalizer` 退化为 `consume = extractRunRawModelStreamEvent` passthrough。
6. Step 6（✅ done）：删除 `resolveSdkDefaultThinkingProfile` 壳层导出
   - 从 model-bank resolver 删除函数与对应测试用例。
   - `thinking` 对外 API 保留 model-native 路径，不再暴露 sdk-default fallback。

### 14.4 验证记录（2026-02-28）

1. 构建与类型检查
   - `pnpm build:packages` ✅
   - `pnpm --filter @moryflow/pc typecheck` ✅
   - `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
   - `pnpm --filter @moryflow/server typecheck` ✅
2. 关键单测
   - `pnpm --filter @moryflow/model-bank test:unit` ✅
   - `pnpm --filter @moryflow/agents-runtime test:unit src/__tests__/ui-stream.test.ts` ✅
   - `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/hooks/use-chat-model-selection.utils.test.ts src/renderer/components/chat-pane/models.test.ts src/main/agent-settings/__tests__/normalize.test.ts src/renderer/components/settings-dialog/handle.test.ts src/renderer/components/settings-dialog/components/providers/use-provider-details-controller.test.tsx` ✅
   - `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/thinking-profile.util.spec.ts` ✅
   - `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/llm-language-model.service.spec.ts` ✅
   - `pnpm --filter @moryflow/server test src/ai-proxy/ai-proxy.thinking.spec.ts src/ai-proxy/providers/model-provider.factory.thinking.spec.ts` ✅

### 14.5 验收标准

1. 设置页不存在“自定义 provider sdkType 选择”；新建 custom provider 后协议固定 `openai-compatible`。
2. ChatPane 不再出现注入的 `Custom` 幽灵分组；无效选中模型自动回到真实可用模型。
3. Anyhunt/Moryflow server 的 thinking profile 与 reasoning 解析行为由 model-bank 单源提供。
4. `extractRunRawModelStreamEvent` 不再消费 `model.event.*`。
5. `@moryflow/model-bank` thinking API 不再暴露 sdk-default fallback 入口。

## 15. Root-Cause Hardening Batch-3（2026-02-28，执行中）

> 目标：清理“仍有补丁味”的剩余实现，继续收敛到 model-bank 单源（类型/契约/参数适配）。
> 执行顺序：`1 -> 2 -> 4 -> 3 -> 5`（按已确认顺序）。

### 15.1 问题清单（本轮）

1. Membership `thinking_profile` 在 PC 端解析仍有 `visibleParams.key` 白名单裁剪，模型原生 key 可能被误丢弃。
2. `packages/api` 的 Membership thinking 类型仍把 `visibleParams.key` 限定为 4 个值，和 model-bank 单源契约存在漂移风险。
3. `thinking profile` 构建/归一化在 runtime 与前端有重复实现（`agents-runtime/thinking-profile` 与 `chat-pane/models`），维护成本高且容易分叉。
4. `ProviderSdkType / PresetProvider / Thinking*` 类型在 `agents-runtime` 与 model-bank/PC shared 重复定义，导致 `as unknown as` 强转。
5. provider reasoning 参数适配规则分散在 `agents-runtime` 与 Moryflow/Anyhunt 两条 server factory，存在长期漂移风险。

### 15.2 根治方案（不做补丁）

1. Membership 解析去白名单：`auth-methods` 仅校验 `key/value` 非空，不再限定 key 枚举。
2. Membership thinking 类型去硬编码：`packages/api` 的 key 类型移除固定枚举，改为开放字符串契约（不再裁剪模型原生 key）。
3. 新增 model-bank 共享归一化 helper：`rawProfile -> contract profile` 单源实现，runtime 与 chat-pane 同时消费。
4. 类型单源化：`agents-runtime` 与 PC shared 的 provider/thinking 核心类型改为引用 model-bank 类型，移除强转。
5. provider reasoning 适配单源化：在 model-bank 抽象统一适配函数，三端（runtime + 双 server factory）统一调用。

### 15.3 执行进度（实时回写）

| 步骤 | 事项                                                 | 状态      | 进度备注                                                                                                       |
| ---- | ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Membership 解析去白名单                              | ✅ 已完成 | `auth-methods` 仅保留 key/value 非空校验，删除 `visibleParams.key` 白名单裁剪                                  |
| 2    | Membership thinking 类型去硬编码                     | ✅ 已完成 | `packages/api` `MembershipThinkingVisibleParamKey` 改为 `string`，不再限定固定 4 个 key                        |
| 4    | Provider/Thinking 类型单源化（去 `as unknown as`）   | ✅ 已完成 | `agents-runtime`/PC shared 改为复用 model-bank 核心类型；PC+Mobile runtime 删除 `as unknown as` 强转           |
| 3    | thinking profile 构建归一化 helper 单源化            | ✅ 已完成 | model-bank 新增 `buildThinkingProfileFromRaw`；runtime/chat-pane/settings/anyhunt-admin 统一改用               |
| 5    | provider reasoning 适配单源化（runtime + 双 server） | ✅ 已完成 | model-bank 新增共享 reasoning settings builder；agents-runtime + Moryflow/Anyhunt 两条 server factory 全部改用 |

### 15.4 本轮验证记录（2026-02-28）

1. `pnpm --filter @moryflow/model-bank test:unit -- src/thinking/contract.test.ts src/thinking/reasoning.test.ts` ✅
2. `pnpm --filter @moryflow/model-bank build` ✅
3. `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/thinking-profile.test.ts src/__tests__/reasoning-config.test.ts src/__tests__/model-factory.test.ts` ✅
4. `pnpm --filter @moryflow/api build` ✅
5. `pnpm --filter @anyhunt/admin typecheck` ✅
6. `pnpm --filter @anyhunt/anyhunt-server test src/llm/__tests__/model-provider.factory.spec.ts src/llm/__tests__/thinking-profile.util.spec.ts` ✅
7. `pnpm --filter @anyhunt/anyhunt-server typecheck` ✅
8. `pnpm --filter @moryflow/server test src/ai-proxy/providers/model-provider.factory.thinking.spec.ts src/ai-proxy/ai-proxy.thinking.spec.ts` ✅
9. `pnpm --filter @moryflow/server typecheck` ✅
10. `CI=1 pnpm --filter @moryflow/pc test:unit src/renderer/components/chat-pane/models.test.ts src/renderer/components/settings-dialog/components/providers/thinking-level-options.test.ts` ✅
11. `pnpm --filter @moryflow/pc typecheck` ✅
12. `pnpm build:packages` ✅

## 16. Root-Cause Hardening Batch-4（2026-02-28，已完成）

> 目标：清理当前分支 remaining “补丁味”实现，统一收敛到 provider-model 强标识 + model-bank 单源契约 + runtime 单路径。
> 执行顺序：`1 -> 2 -> 3 -> 4`（按影响面与风险排序）。

### 16.1 问题清单（本轮）

1. 模型主键仍混用 bare `modelId` 与 `providerId/modelId`，导致跨 provider 同名模型冲突风险，thinking override 键也可能串写。
2. PC 主进程 `chat/agent-options.ts` 的 thinkingProfile 归一化丢失 `visibleParams`，会把模型级 thinking 合同降级为 label-only。
3. `agent:test-provider` 仍是独立模型构建分支，存在 `requested/preset/custom` 多路推断与 runtime 漂移风险。
4. model-bank `modelRegistry` 仍存在全局同名 `modelId` 首条覆盖语义；provider 上下文未显式参与模型定义解析链路。

### 16.2 根治方案（不做补丁）

1. Provider-Model 强标识单源化：
   - ChatPane / runtime / thinking override 全链路切换为 `providerId/modelId`；
   - 删除 bare `modelId` 路由推断分支（不做历史兼容）。
2. ThinkingProfile IPC 合同化：
   - `agent-options` 改为 model-bank contract 归一化，保留并透传 `visibleParams`。
3. Test Provider 与 runtime 构建链路合并：
   - `agent:test-provider` 复用 `@moryflow/agents-runtime` 模型工厂；
   - 移除重复 SDK switch 与隐式 fallback 推断。
4. Provider 上下文模型解析单源化：
   - model-bank 增加 provider-model ref helper 与 provider-scoped model definition 查询；
   - PC Settings/Chat 模型定义获取统一走 provider-scoped API，消除全局首条覆盖歧义。

### 16.3 执行进度（实时回写）

| 步骤 | 事项                                             | 状态      | 进度备注                                                                                                                                |
| ---- | ------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Provider-Model 强标识单源化                      | ✅ 已完成 | ChatPane/runtime/settings/thinking override 全链路统一 `providerId/modelId`，清理 bare `modelId` 分支                                   |
| 2    | ThinkingProfile IPC 合同化（保留 visibleParams） | ✅ 已完成 | `agent-options` 统一改为 `buildThinkingProfileFromRaw`，`visibleParams` 不再丢失                                                        |
| 3    | `agent:test-provider` 与 runtime 构建链路合并    | ✅ 已完成 | `agent:test-provider` 改为复用 `createModelFactory`，移除重复 SDK switch 与多路推断                                                     |
| 4    | Provider 上下文模型解析单源化                    | ✅ 已完成 | model-bank 增加 provider-scoped 模型 helper（含 `buildProviderModelRef/parseProviderModelRef/getModelByProviderAndId`）并完成调用点收敛 |

### 16.4 CI 根因修复（本轮新增）

1. 现象：PR CI 在 `postinstall -> build:packages` 阶段报错 `TS2307: Cannot find module '@moryflow/model-bank'`。
2. 根因：`build:packages` 执行顺序是 `build:agents -> build:model-bank`，而 `agents-runtime` 已依赖 `model-bank` 类型声明，冷启动环境下会先编译失败。
3. 修复：
   - 调整根脚本顺序：`build:packages = build:model-bank -> build:agents`；
   - `agents-runtime` 移除对子路径 `@moryflow/model-bank/registry` 的依赖，统一走包根导出；
   - 清理 `model-factory.ts` 未使用局部函数，确保 `tsc-multi` 严格模式无噪音失败。
   - `@anyhunt/anyhunt-server` 的 `action-pacing.service.spec.ts` 去除 `runAllTimersAsync` 依赖，改为同步 `setTimeout` mock，消除并行测试环境下的定时器污染与随机失败。
4. 本地验证：
   - `pnpm run build:packages` ✅
   - `pnpm --filter @moryflow/pc typecheck` ✅
   - `pnpm --filter @moryflow/agents-runtime test:unit ...` ✅
   - `pnpm --filter @anyhunt/anyhunt-server test:unit src/browser/__tests__/action-pacing.service.spec.ts` ✅
