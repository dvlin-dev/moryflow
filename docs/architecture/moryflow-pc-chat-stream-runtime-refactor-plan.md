---
title: Moryflow PC 对话流运行时重构方案（streamAgentRun）
date: 2026-02-28
scope: apps/moryflow/pc + packages/agents-runtime
status: implemented
owners: [moryflow-pc, agents-runtime]
---

<!--
[INPUT]: 现有 streamAgentRun 逻辑、OpenAI Agents 事件流、UIMessage chunk 协议
[OUTPUT]: 可执行的对话流运行时重构方案（去补丁化、顺序语义单一化、状态机化）+ 日志驱动 follow-up 修复方案
[POS]: Moryflow PC 对话主链路重构基线文档（已实施）

[PROTOCOL]: 本文档变更后，需同步更新 docs/index.md、docs/architecture/CLAUDE.md、docs/CLAUDE.md 的索引与最近更新。
-->

# Moryflow PC 对话流运行时重构方案（streamAgentRun）

## 1. 背景与问题

当前 `apps/moryflow/pc/src/main/chat/messages.ts` 内的 `streamAgentRun` 存在明显的职责混杂：

1. 协议补全（自动 start/end）
2. 顺序纠偏（text/reasoning 切段时机）
3. 兜底去重（`response_done` fallback + suppress）
4. 统计与调试日志
5. 工具事件映射

结果是：

1. 变量数量和可变状态过多，维护成本高，行为难以推断。
2. “上游真实顺序”和“本地输出顺序”耦合在一个函数中，不利于验证。
3. 同时消费多类事件（raw + run_item）时，容易形成隐式补丁逻辑。
4. 出现问题时排查成本高，容易陷入“是不是日志不全/是不是本地改序”的争议。

## 2. 根因诊断（当前实现）

### 2.1 函数职责过载

- 单函数同时负责解析、状态管理、输出、调试、统计。
- 缺少可测试的中间层（事件归一化层、状态机层、输出层）。

### 2.2 事件语义混用

- `raw_model_stream_event` 是模型原始流。
- `run_item_stream_event` 是 SDK 语义项。
- 当前链路把两者放在同一处理主循环中，边界不够清晰。

### 2.3 “行为变量”过多且分散

典型状态位过多（如 `messageStarted/textSegmentStarted/reasoningSegmentStarted/hasReasoningDelta/hasProviderReasoningDelta/...`），且跨多处分支读写，无法快速确认单轮状态机轨迹。

### 2.4 兜底行为与主行为混在一起

- fallback 与 suppress 在主循环中直接生效，读代码时难区分“规范行为”与“兼容行为”。

## 3. 重构目标（零兼容、去补丁）

1. **顺序单一化**：输出顺序严格由“已选定事件源 + 状态机”决定，不做隐式重排。
2. **职责单一化**：解析、状态推进、chunk 输出、日志分层。
3. **状态显式化**：以结构化 `TurnStreamState` 替代散落布尔变量。
4. **日志可追溯**：同一轮可完整回放“入站事件 -> 状态迁移 -> 出站 chunk”。
5. **可测试**：每层可独立单测，主流程仅做装配。

## 4. 设计原则

1. 不做“补丁式纠偏”，只保留协议必要转换。
2. 不在 UI 侧注入任何非模型返回的 reasoning 文案。
3. 主链路不做“猜测型推断”，所有状态转移必须有输入事件依据。
4. run-item 与 raw 的职责分开：
   - raw：文本/思考流主语义
   - run-item：工具/审批/统计辅助语义

## 5. 目标架构

## 5.1 分层结构

1. `EventIngestor`（入站）
   - 输入：`RunStreamEvent`
   - 输出：`CanonicalChatEvent`
2. `TurnReducer`（状态机）
   - 输入：`CanonicalChatEvent`
   - 输出：`ReducerPatch`（状态变化 + 待发 chunk）
3. `ChunkEmitter`（出站）
   - 输入：`ReducerPatch`
   - 输出：`UIMessageChunk` 写入
4. `DebugLedger`（观测）
   - 记录入站事件、状态迁移、出站 chunk（JSONL）

## 5.2 单一状态对象

引入 `TurnStreamState`（替代散落变量）：

1. `lifecycle`: message/finish/abort
2. `segments`: `text` 与 `reasoning` 的显式状态
3. `usage`: token 聚合
4. `metrics`: counters（raw/run-item/chunk）
5. `policy`: thinking 请求与降级上下文

## 5.3 事件归一化（CanonicalChatEvent）

拆出规范事件类型（示例）：

1. `raw-text-delta`
2. `raw-reasoning-delta`
3. `raw-finish`
4. `tool-event`
5. `approval-event`
6. `ignored-event`（仅记日志，不驱动 UI）

说明：

1. 是否消费 `model.event.*` 子事件，作为 **归一化层策略** 明确配置。
2. 一旦策略确定，后续 reducer 不再做二次猜测。

## 5.4 状态机约束

1. `text` 与 `reasoning` 片段切换通过 reducer 显式迁移。
2. reducer 只根据输入事件推进，不读取外部隐式条件。
3. `finish/abort` 统一由 reducer 终态收口。

## 6. `streamAgentRun` 重构后职责

`streamAgentRun` 只保留四件事：

1. 初始化上下文（writer、policy、debug）
2. 循环读取 `RunStreamEvent`
3. 调用 `ingest -> reduce -> emit`
4. 执行终态收口与返回 `usage/finishReason`

也就是从“逻辑实现函数”降级为“管道装配函数”。

## 7. 代码组织调整

建议新增/重命名模块：

1. `apps/moryflow/pc/src/main/chat/stream/ingestor.ts`
2. `apps/moryflow/pc/src/main/chat/stream/reducer.ts`
3. `apps/moryflow/pc/src/main/chat/stream/emitter.ts`
4. `apps/moryflow/pc/src/main/chat/stream/types.ts`
5. `apps/moryflow/pc/src/main/chat/stream/debug-ledger.ts`
6. `apps/moryflow/pc/src/main/chat/messages.ts`（仅保留装配）

`packages/agents-runtime`：

1. 将 raw 解析策略独立为可配置、可测模块。
2. 约束输出为稳定 canonical 结构，避免 UI 层重复理解 provider 差异。

## 8. 测试方案

## 8.1 单元测试（必须）

1. ingestor：各类 raw/run-item 事件映射
2. reducer：状态迁移、切段、终态
3. emitter：chunk 顺序、start/end 配对

## 8.2 回归测试（必须）

1. “有 thinking 返回”与“无 thinking 返回”
2. `response_done` only reasoning 场景
3. 工具调用 + 文本流并存
4. abort 场景

## 8.3 验收日志

每轮必须可从日志回放：

1. 入站事件序列
2. reducer patch 序列
3. 出站 chunk 序列

## 9. 执行计划（已完成）

你建议的流程采用如下前置：

1. 先合并当前 PR 到 `main`（避免在历史包袱上继续重构）。
2. 本地同步最新 `main`。
3. 从 `main` 新建独立重构分支（建议：`codex/chat-stream-runtime-refactor-20260228`）。
4. 在该分支按本方案实施，不夹带模型体系其他改动。

实施步骤：

1. Step 0（done，2026-02-28）：日志基座重构，`thinking-debug` 升级为 `chat-debug-log`，日志文件切换为 `chat-stream.log`，主进程调用点完成替换。
2. Step 1（done，2026-02-28）：抽离类型与状态机骨架（`types/ingestor/reducer/emitter`）。
3. Step 2（done，2026-02-28）：`streamAgentRun` 改为 `ingest -> reduce -> emit` 管道装配。
4. Step 3（done，2026-02-28）：删除 `response_done` reasoning fallback/suppress 兼容分支，收敛为“只消费增量 reasoning 事件”。
5. Step 4（done，2026-02-28）：补齐回归测试（含 `response_done` reasoning 忽略策略）与日志模块测试。
6. Step 5（done，2026-02-28）：完成代码审查与文档回写（CLAUDE/index）。

## 10. 风险与决策点（已决策）

1. `response_done` 中的 reasoning 不再作为 fallback 消费，避免重复/顺序补丁。
2. 可视 reasoning 仅由 raw 增量事件驱动，run-item 只用于工具/审批/统计与日志观测。
3. 展示顺序严格跟随事件时序，不做“先 thinking 后正文”的本地强制重排。

### 10.1 已知风险（暂不修复）

1. 当前 canonical raw 解析仅消费三类事件：`output_text_delta`、`model.event.reasoning-delta`、`response_done`。
2. 若未来某些 provider/SDK 版本把文本或 reasoning 改为其它等价事件形态（例如不同命名的 delta/finish 事件），当前实现会将其归为 ignored，可能出现“模型有返回但 UI 不展示”的静默回归。
3. 本阶段选择先保留该风险（不扩展兼容分支），通过日志中的 `ignoredRawEventTypeCounts` 监控实际命中情况，再按真实样本做下一轮协议扩展。

## 11. 验证记录

1. `pnpm --filter @moryflow/pc typecheck` 通过。
2. `pnpm --filter @moryflow/pc test:unit -- apps/moryflow/pc/src/main/chat/__tests__/stream-agent-run.test.ts apps/moryflow/pc/src/main/__tests__/chat-debug-log.test.ts` 通过。

## 12. 日志复盘结论（2026-02-28 Follow-up）

数据来源：`/Users/zhangbaolin/Library/Logs/@moryflow/pc/chat-stream.log`

本轮用户复测中（两条消息，`openrouter/anthropic/claude-sonnet-4.5`，thinking 分别为 low/medium）：

1. thinking 请求已生效：`chat.request.received` 与 `chat.stream.summary` 均为 `thinkingRequested=true`，`thinkingResolvedLevel=low/medium`。
2. Provider 确实返回了 reasoning 增量：每轮均出现大量 `raw_model_stream_event.data.type="model"` 且 `data.event.type="reasoning-delta"`（41/53 条）。
3. reasoning 增量顺序早于正文：两轮首个 reasoning-delta 均在 `eventIndex=9`，首个 `output_text_delta` 分别在 `141/179`。
4. 但当前 canonical 结果里 `extracted.reasoningDelta` 对这些事件均为空，导致 `hasReasoningDelta=false`，最终 `reasoningVisibility=not-returned`。
5. `response_done` 与 `run_item_stream_event.reasoning_item_created` 都含 reasoning 内容，但当前策略不消费 run-item 可视内容，且已移除 `response_done` fallback，因此 UI 无 thinking 卡片。

## 13. 根因（代码层）

根因是 **normalizer 协议策略与真实上游事件形态不匹配**：

1. `packages/agents-runtime/src/ui-stream.ts` 当前策略明确“只消费顶层 reasoning/text delta，忽略 `model.event.*`”。
2. 实际 OpenRouter + Claude 场景中，thinking 增量主要走 `model.event.reasoning-delta`，顶层 `reasoning-delta` 不存在。
3. 在该前提下，移除 `response_done` fallback 后，reasoning 可视链路被完全切断。

这不是模型未返回，而是我们 canonical 提取层漏消费了主通道。

## 14. 最佳实践修复方案（唯一数据源）

目标：保持“唯一数据源 + 单一语义层 + 不打补丁”的前提下，覆盖真实 provider 形态。

### 14.1 唯一数据源定义

唯一数据源定义为：**`raw_model_stream_event` 规范化后的 `CanonicalRawEvent`**。  
不直接消费 run-item 做可视 reasoning，不在 UI 层拼接推断。

### 14.2 Canonical 协议定义（语义化单轨）

在 `createRunModelStreamNormalizer` 中直接产出统一语义事件（而非“通道状态”）：

1. `text-delta`：来源固定为 `output_text_delta`
2. `reasoning-delta`：来源固定为 `data.type="model" && data.event.type="reasoning-delta"`
3. `done`：来源固定为 `response_done`

非上述协议事件统一记入 debug 日志（unknown/ignored），但不驱动 UI 渲染。

### 14.3 跨 Provider 最佳实践（差异上收）

跨 provider 能力通过 **agents-runtime 的归一化层** 实现，不把差异泄漏到 PC 渲染层：

1. provider 差异只在 normalizer 内处理一次（输入多形态 -> 输出单一 canonical）。
2. `streamAgentRun` 与 renderer 只消费 canonical 事件，不感知 provider 私有格式。
3. 新 provider 接入时，只允许新增/调整 normalizer 适配与对应单测，不允许在 UI 层追加 if/else 分支。

### 14.4 完成事件策略

1. `response_done` 仅承载 `usage/finish` 收口语义。
2. 不再从 `response_done` 注入或补写 reasoning 内容（避免隐藏补丁与重复渲染）。
3. run-item reasoning 继续仅用于统计与调试，不参与可视 thinking 渲染。

### 14.5 观测与验收

新增 summary 观测字段：

1. `canonicalTextDeltaCount`
2. `canonicalReasoningDeltaCount`
3. `canonicalDoneSeen`
4. `ignoredRawEventTypeCounts`

验收标准：

1. Claude/OpenRouter 场景中，thinking 开启后可稳定显示流式 reasoning（先于正文）。
2. 不再出现“provider 返回 reasoning 但 UI 无卡片”的 false-negative。
3. 无 reasoning 返回时，UI 不显示补充说明文案。
4. 单轮日志可明确回放 canonical 事件序列与被忽略事件类型统计。

## 15. 执行步骤（Follow-up）

1. Step F1（done, 2026-02-28）：改造 `packages/agents-runtime/src/ui-stream.ts`，建立语义化 `CanonicalRawEvent`（`text-delta`/`reasoning-delta`/`done`）并移除“通道状态枚举”。
2. Step F2（done, 2026-02-28）：补齐 `ui-stream` 单测（`output_text_delta`、`model.event.reasoning-delta`、`response_done`、unknown ignored）。
3. Step F3（done, 2026-02-28）：补齐 PC `stream-agent-run` 回归（OpenRouter/Claude reasoning 流式可视化 + 无 reasoning 不补文案）。
4. Step F4（done, 2026-02-28）：更新文档索引与 `CLAUDE.md`，日志 summary 改为 canonical 事件计数与 ignored 事件列表。

## 16. Follow-up 验证结果（2026-02-28）

1. `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/ui-stream.test.ts`：通过（18 files / 70 tests）。
2. `pnpm --filter @moryflow/pc exec vitest run src/main/chat/__tests__/stream-agent-run.test.ts src/main/__tests__/chat-debug-log.test.ts`：通过（2 files / 9 tests）。
3. `pnpm --filter @moryflow/pc typecheck`：通过。
4. `pnpm --filter @moryflow/mobile check:type`：失败（既有基线问题，集中在 mobile 既存模块，与本次改动无直接关联）。

## 17. DoD（完成定义）

1. `streamAgentRun` 主函数长度与圈复杂度显著下降（仅装配职责）。
2. 不再依赖分散布尔变量控制主行为。
3. 单轮日志可回放完整事件轨迹。
4. 关键回归测试通过且覆盖核心状态迁移。
5. 文档与实现一致，无“代码补丁先行、文档滞后”现象。
6. canonical 协议稳定落地：渲染层不再依赖 `top-level/model-event/unset` 之类实现态命名。

## 18. PR#107 Code Review Follow-up（2026-02-28）

### 18.1 评论问题核对（结论）

1. P1（成立，必须修复）  
   `packages/agents-runtime/src/ui-stream.ts` 在 `response_done` 上硬编码 `finishReason='stop'`，且未消费 `model.event.finish`，会导致 `length/max_tokens` 截断原因丢失，`shouldContinueForTruncation(...)` 无法触发自动续写。
2. P2（成立，应修复）  
   `apps/moryflow/pc/src/main/chat-debug-log.ts` 在文件日志初始化失败后直接丢弃 `logChatDebug` 输出，未真正落地“console-only fallback”，导致排障可观测性丢失。

### 18.2 根治方案

1. FinishReason 保真（不做兼容补丁）  
   在 `extractRunRawModelStreamEvent` 统一解析 `model.event.finish.finishReason`（优先 `unified`，再 `raw`），并在 `response_done` 中仅在可解析时带出 finish reason，不再硬编码 `'stop'`。
2. 日志 sink 单一路径  
   将 chat debug 日志改为“文件 sink / console sink”二态模型；初始化失败自动切到 console sink，`logChatDebug` 保证恒可写，不再依赖 `chatDebugLogPath` 判空短路。
3. 回归测试补齐
   - `packages/agents-runtime/src/__tests__/ui-stream.test.ts`：覆盖 `model.event.finish` 截断原因提取与 `response_done` 非强制 stop。
   - `apps/moryflow/pc/src/main/__tests__/chat-debug-log.test.ts`：覆盖初始化失败后仍输出 console fallback。

### 18.3 执行进度

| Step | 状态 | 说明                                                                                                            |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------- |
| R1   | done | `ui-stream` 已新增 `model.event.finish` / `response_done` finish reason 解析，不再硬编码 `response_done='stop'` |
| R2   | done | `chat-debug-log` 已重构为 file/console 双 sink；文件日志初始化失败、写入失败、裁剪失败均自动降级 console-only   |
| R3   | done | 定向测试通过：`@moryflow/agents-runtime ui-stream` + `@moryflow/pc stream-agent-run/chat-debug-log`             |
| R4   | done | 文档已回写；分支已推送 `fb8a744f`；PR 两条评论已逐条回复并 resolve                                              |
