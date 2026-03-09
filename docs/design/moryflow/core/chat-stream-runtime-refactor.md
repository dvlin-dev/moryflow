---
title: Moryflow PC 对话流运行时重构方案（streamAgentRun）
date: 2026-02-28
scope: apps/moryflow/pc + packages/agents-runtime
status: completed
owners: [moryflow-pc, agents-runtime]
---

<!--
[INPUT]: 现有 streamAgentRun 逻辑、OpenAI Agents 事件流、UIMessage chunk 协议
[OUTPUT]: 可执行的对话流运行时重构方案（去补丁化、顺序语义单一化、状态机化）+ 日志驱动 follow-up 修复方案
[POS]: Moryflow PC 对话主链路重构基线文档（已实施）

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
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

## 9. 当前实现收口

1. `streamAgentRun` 已收口为 `ingest -> reduce -> emit` 管道装配，主函数不再同时承担协议补丁、状态推进、日志拼接与 UI 推断。
2. 可视文本与 reasoning 统一只消费 canonical raw 事件；`response_done` 仅承担 `usage/finishReason` 收口语义。
3. `chat-debug-log` 已稳定为文件/console 双 sink；文件不可写时自动降级到 console-only，不再静默丢日志。
4. 本文只保留当前架构、状态机约束、风险边界与验证基线；历史执行步骤、PR follow-up 与 review 轮次不再保留。

## 10. 风险与决策点（已决策）

1. `response_done` 中的 reasoning 不再作为 fallback 消费，避免重复/顺序补丁。
2. 可视 reasoning 仅由 raw 增量事件驱动，run-item 只用于工具/审批/统计与日志观测。
3. 展示顺序严格跟随事件时序，不做“先 thinking 后正文”的本地强制重排。

### 10.1 已知风险（暂不修复）

1. 当前 canonical raw 解析仅消费三类事件：`output_text_delta`、`model.event.reasoning-delta`、`response_done`。
2. 若未来某些 provider/SDK 版本把文本或 reasoning 改为其它等价事件形态（例如不同命名的 delta/finish 事件），当前实现会将其归为 ignored，可能出现“模型有返回但 UI 不展示”的静默回归。
3. 本阶段选择先保留该风险（不扩展兼容分支），通过日志中的 `ignoredRawEventTypeCounts` 监控实际命中情况，再按真实样本做下一轮协议扩展。

## 11. 当前验证基线

1. `@moryflow/agents-runtime` 负责 canonical raw 事件、normalizer 与 reasoning/text 可视协议回归。
2. `@moryflow/pc` 负责 `streamAgentRun`、`chat-debug-log` 与主进程装配层回归。
3. 运行时主链路回归之外，当前还固定依赖共享运行时控制面场景回放：`packages/agents-runtime/test/runtime-harness.spec.ts`。
4. 触及 PC 对话壳层语义时，至少执行 `conversation-section.test.tsx`、`use-chat-pane-controller.approval.test.tsx`、`tool-part.test.tsx`、`task-hover-panel.test.tsx` 与 `tests/agent-runtime-harness.spec.ts`。
5. 后续触及协议边界时，至少需要执行受影响包的 `typecheck` 与 `test:unit`；若涉及跨包契约或主链路行为，按 L2 执行根级校验。

## 12. 当前事实补充

1. reasoning 可视链路当前以 `CanonicalRawEvent` 为唯一事实源，不再从 run-item 或 `response_done` 做补丁式补写。
2. `finishReason` 必须从真实完成事件提取，禁止再写死为 `stop`。
3. debug 日志必须保持恒可写，文件 sink 异常时只能降级，不能静默失效。
