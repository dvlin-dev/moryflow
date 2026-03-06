---
title: AI 轮次结束自动折叠方案（消息级 + 最后一条 assistant 内部 parts）
date: 2026-03-06
scope: packages/agents-runtime + packages/types + packages/i18n + moryflow/pc + anyhunt/console + moryflow/admin + moryflow/mobile
status: completed
---

<!--
[INPUT]:
- 用户需求：AI 一轮回复过程中正常逐条展示；结束后自动折叠同轮前置 assistant 消息，并且最后一条 assistant message 内部也只保留最后一个结论 part。
- 关键约束：不改 Tool/Reasoning 单体渲染协议；运行态不提前折叠；支持手动展开/折叠且手动优先；全端统一。

[OUTPUT]:
- 轮次折叠共享算法（Assistant Round ViewModel）从 message-level 扩展为 message + conclusion parts。
- 全端消息渲染入口仅接收“隐藏的 message 索引 / hidden orderedPart 索引”，不把折叠逻辑塞进 Tool/Reasoning。
- 可执行步骤与进度追踪。

[POS]: Moryflow Features / Chat 消息轮次折叠重构方案

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md` 与 `docs/CLAUDE.md`。
-->

# AI 轮次结束自动折叠方案（消息级 + 最后一条 assistant 内部 parts）

## 1. 摘要

1. 保持现有消息流式渲染不变：运行中仍按当前顺序展示所有 assistant messages 与其中的 Tool/Reasoning/Text parts。
2. 仅在一轮 AI 回复结束后生效：同轮 assistant 中，最终只保留“最后一条 assistant message 的最后一个非文件 part”可见。
3. 折叠范围包含两层：
   - 前置 assistant messages；
   - 最后一条 assistant message 内部的前置 orderedParts（如 reasoning、tool、前置 text）。
4. Tool/Reasoning 组件不感知轮次折叠；它们继续只负责单个 part 的渲染。折叠能力属于消息列表层与消息体入口层。
5. 统一覆盖 PC、Console、Admin、Mobile；共享事实源放在 `packages/agents-runtime`，端侧只做渲染适配。

## 2. 冻结交互

1. 运行中（`submitted/streaming`）：
   - 本轮 assistant messages 全部可见；
   - 最后一条 assistant message 内部 orderedParts 也全部可见。
2. 结束后（`ready/error`）：
   - 折叠本轮所有“过程消息”；
   - 若结论位于最后一条 assistant message 的最后一个 orderedPart，则该 message 内部仅保留这一个 orderedPart。
3. 折叠区展示一条摘要触发器（时长文案 + 箭头）。
4. 用户手动展开后，该轮完整展示；手动收起后恢复“仅结论可见”。
5. 占位 assistant 空消息不计入折叠模型；文件附件继续按当前消息渲染职责展示，不纳入“前置 orderedPart”折叠。

## 3. 根因与目标修正

1. 当前实现只做 `message-level round collapse`：只会隐藏“最后一条结论 message 之前的 assistant messages”。
2. 真实 UI 数据中，很多“正在思考 / tool / 表格 / 结论文本”实际是同一条 assistant message 的多个 `parts`，因此旧方案不会折叠这些前置过程。
3. 本次重构目标不是给 Tool/Reasoning 加额外折叠，而是把共享事实源升级为：
   - 轮次级消息显隐；
   - 轮次结论 message 内部 orderedParts 显隐。

## 4. 架构与职责

1. `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`
   - 继续作为唯一事实源；
   - 负责轮次划分、当前轮判定、摘要插入位置、隐藏的 assistant message 索引、隐藏的 conclusion orderedPart 索引。
2. 各端 `ConversationSection / AgentMessageList / ChatMessageList`
   - 只负责读取 shared view model；
   - 插入摘要行；
   - 把 `hiddenOrderedPartIndexes` 透传给单条消息入口组件。
3. 各端单条消息入口（PC `ChatMessage`、Console `MessageRow`、Admin `Message`、Mobile `MessageBubble`）
   - 只负责把 `orderedParts` 过滤成“当前可见 orderedParts”；
   - 不处理轮次状态机，不生成摘要。
4. Tool / Reasoning / Text part 组件
   - 完全不变；
   - 继续按收到的 part 渲染。

## 5. 共享数据结构

1. `AssistantRound`
   - `processIndexes`: 前置 assistant message 索引。
   - `conclusionOrderedPartIndexes`: 结论 message 的全部非文件 orderedPart 索引。
   - `hiddenConclusionOrderedPartIndexes`: 结束折叠时应隐藏的前置 orderedPart 索引（即 `conclusionOrderedPartIndexes.slice(0, -1)`）。
   - `summaryAnchorMessageIndex`: 摘要应插入到哪条 message 之前；有前置 assistant message 时取首条过程 message，否则取结论 message。
   - `processCount`: 折叠后的总隐藏单元数，语义更新为 `process message count + hidden conclusion orderedPart count`。
2. `buildAssistantRoundRenderItems(...)` 返回值扩展：
   - `hiddenAssistantIndexSet`
   - `hiddenOrderedPartIndexesByMessageIndex: Map<number, Set<number>>`
   - `items`
3. `ChatMessageMeta.assistantRound.processCount`
   - 同步更新为“总隐藏单元数”，不再仅表示前置 assistant message 数量。
   - 渲染时优先按 live messages 重新计算，不依赖持久化 `processCount` 做显隐判断。

## 6. 轮次算法

1. 轮次边界：按 user message 切分；一个 user 到下一个 user 之间的 assistant messages 属于同一轮。
2. 结论单元定义：
   - 该轮最后一条 assistant message；
   - 该 message 的最后一个非文件 orderedPart。
3. 过程单元定义：
   - 该轮除结论 message 外的所有 assistant messages；
   - 结论 message 内除最后一个非文件 orderedPart 外的所有前置 orderedParts。
4. 自动折叠触发：
   - 该轮从运行态进入结束态；
   - 且过程单元数 `processCount > 0`。
5. 自动展开仅针对当前运行轮次；历史轮次保持折叠。
6. 手动偏好优先：用户显式展开/收起后，状态迁移不再覆盖。

## 7. 分端实施范围

1. 共享 runtime：
   - `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`
   - `packages/agents-runtime/src/__tests__/assistant-round-collapse.test.ts`
2. 类型：
   - `packages/types/src/common/chat.ts`
3. PC：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-body.tsx`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/message-body-model.ts`
   - 对应测试
4. Console：
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.tsx`
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/components/message-row.tsx`
   - 对应测试
5. Admin：
   - `apps/moryflow/admin/src/features/chat/components/conversation-section.tsx`
   - `apps/moryflow/admin/src/features/chat/components/message.tsx`
   - 对应测试
6. Mobile：
   - `apps/moryflow/mobile/components/chat/components/ChatMessageList.tsx`
   - `apps/moryflow/mobile/components/chat/MessageBubble.tsx`
   - 对应测试/回归

## 8. 测试场景

1. 单轮包含多条 assistant messages：结束后仅最后一条 message 可见，前置 messages 折叠。
2. 单轮只有一条 assistant message，但其内部包含 `reasoning + tool + text`：结束后摘要行出现，且只保留最后一个 text/tool/result part 可见。
3. 单轮既有前置 assistant messages，又有最后一条 message 内部多个 parts：前两层都应折叠。
4. 运行态不折叠。
5. 手动展开后保持展开；手动收起后恢复仅结论可见。
6. metadata 持久化的 `processCount` 与新语义一致。

## 9. 执行计划与进度

### Step 1（completed）：方案修正与执行计划回写

1. 将方案从“只折前置 assistant messages”修正为“折前置 assistant messages + 结论 message 的前置 orderedParts”。
2. 明确共享职责边界：`agents-runtime` 负责 view model，端侧消息入口负责过滤 visible orderedParts。
3. 补充分步执行清单与进度追踪。

执行结果（2026-03-06）：

1. 本文档已重写为新方案，状态改为 `in_progress`。
2. 已确认当前根因是旧方案只覆盖 `message-level`，未覆盖最后一条 assistant message 内部 parts。

### Step 2（completed）：共享 runtime 视图模型升级（TDD）

1. 先写失败测试，覆盖“最后一条 assistant message 内部前置 orderedParts 也会被折叠”。
2. 扩展 `AssistantRound` 与 `buildAssistantRoundRenderItems(...)`：
   - 输出 `hiddenOrderedPartIndexesByMessageIndex`
   - 修正 `summaryAnchorMessageIndex`
   - 修正 `processCount` 语义
3. 更新 round metadata 注入逻辑与相关测试。

执行结果（2026-03-06）：

1. 已先写失败测试，覆盖：
   - 单条结论 assistant message 内部前置 orderedPart 折叠；
   - 前置 assistant message + 结论 message 前置 orderedPart 同时折叠；
   - `processCount` 新语义持久化。
2. `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts` 已完成共享视图模型升级：
   - `AssistantRound` 新增 `conclusionOrderedPartIndexes`、`hiddenConclusionOrderedPartIndexes`、`summaryAnchorMessageIndex`；
   - `buildAssistantRoundRenderItems(...)` 新增 `hiddenOrderedPartIndexesByMessageIndex`；
   - `processCount` 统一为“总隐藏单元数”。
3. `annotateLatestAssistantRoundMetadata(...)` 已按新语义写入 `processCount`。
4. 验证通过：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/assistant-round-collapse.test.ts`
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit`

### Step 3（completed）：PC 接入结论 message part 折叠

1. `ConversationSection` 改为按 `summaryAnchorMessageIndex` 插入摘要。
2. `ChatMessage/MessageBody` 支持 `hiddenOrderedPartIndexes`，只渲染可见 orderedParts。
3. 补齐 PC 回归测试：
   - 结束后只显示最后一个 orderedPart；
   - 手动展开后恢复完整 parts。

执行结果（2026-03-06）：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`
   - 摘要插入位置已改为 `summaryAnchorMessageIndex`；
   - 已透传 `hiddenOrderedPartIndexes` 给 `ChatMessage`。
2. `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/index.tsx`
   - 新增 `hiddenOrderedPartIndexes` 输入；
   - 仅向 `MessageBody` 透传可见 orderedParts；
   - Streamdown 最后 text part 判定同步改为基于可见 orderedParts。
3. `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/const.ts`
   - `ChatMessageProps` 已补齐 `hiddenOrderedPartIndexes`。
4. 已新增/更新回归：
   - `conversation-section.test.tsx`
   - `message/index.test.tsx`
5. 验证通过：
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx src/renderer/components/chat-pane/components/message/index.test.tsx`
   - `pnpm --filter @moryflow/pc typecheck`

### Step 4（completed）：Console / Admin / Mobile 接入同一视图模型

1. 各端消息列表层接入 `hiddenOrderedPartIndexesByMessageIndex`。
2. 各端单条消息入口组件按 hidden indexes 过滤 orderedParts。
3. 补齐最小必要回归测试。

执行结果（2026-03-06）：

1. Console：
   - `AgentMessageList.tsx` 已切到 `summaryAnchorMessageIndex` 并透传 `hiddenOrderedPartIndexes`；
   - `components/message-row.tsx` 已按 hidden indexes 过滤 `visibleOrderedParts`；
   - `AgentMessageList.test.tsx` 新增“仅折结论 message 前置 orderedPart”回归。
2. Admin：
   - `conversation-section.tsx` 已切到 `summaryAnchorMessageIndex` 并透传 `hiddenOrderedPartIndexes`；
   - `message.tsx` 已按 hidden indexes 过滤 `visibleOrderedParts`；
   - `conversation-section.test.tsx` 新增对应回归。
3. Mobile：
   - `components/chat/components/ChatMessageList.tsx` 已切到 `summaryAnchorMessageIndex` 并透传 `hiddenOrderedPartIndexes`；
   - `components/chat/MessageBubble.tsx` 接入 `hiddenOrderedPartIndexes`；
   - 新增纯函数 `lib/chat/assistant-visible-parts.ts` 收口 RN 侧按 orderedPart 索引过滤 assistant parts；
   - 新增回归 `lib/chat/__tests__/assistant-visible-parts.spec.ts`；
   - `assistant-round-persistence.spec.ts` 已补齐 `processCount` 新语义回归。
4. 验证通过：
   - `pnpm --filter @anyhunt/console test -- src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx`
   - `pnpm --filter @anyhunt/console typecheck`
   - `pnpm --filter @moryflow/admin test -- src/features/chat/components/conversation-section.test.tsx`
   - `pnpm --filter @moryflow/admin typecheck`
   - `pnpm --filter @moryflow/mobile test:unit -- lib/chat/__tests__/assistant-visible-parts.spec.ts lib/chat/__tests__/assistant-round-persistence.spec.ts`
   - `pnpm --filter @moryflow/mobile check:type`

### Step 5（completed）：文档、CLAUDE 与验证收尾

1. 回写本文档 Step 2~5 执行结果并改为 `completed`。
2. 同步受影响 `CLAUDE.md`、`docs/design/moryflow/features/index.md`、`docs/CLAUDE.md`。
3. 按风险分级执行受影响包测试与 typecheck，并记录结果。

执行结果（2026-03-06）：

1. 本文档已回写 Step 2~5，并将状态更新为 `completed`。
2. 已同步：
   - `packages/agents-runtime/CLAUDE.md`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md`
   - `apps/anyhunt/console/src/features/CLAUDE.md`
   - `apps/moryflow/admin/CLAUDE.md`
   - `apps/moryflow/mobile/CLAUDE.md`
   - `apps/moryflow/mobile/components/CLAUDE.md`
   - `apps/moryflow/mobile/lib/CLAUDE.md`
   - `docs/design/moryflow/features/index.md`
   - `docs/index.md`
   - `docs/CLAUDE.md`
3. 最终验证通过：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/assistant-round-collapse.test.ts`
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit`
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx src/renderer/components/chat-pane/components/message/index.test.tsx`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @anyhunt/console test -- src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx`
   - `pnpm --filter @anyhunt/console typecheck`
   - `pnpm --filter @moryflow/admin test -- src/features/chat/components/conversation-section.test.tsx`
   - `pnpm --filter @moryflow/admin typecheck`
   - `pnpm --filter @moryflow/mobile test:unit -- lib/chat/__tests__/assistant-visible-parts.spec.ts lib/chat/__tests__/assistant-round-persistence.spec.ts`
   - `pnpm --filter @moryflow/mobile check:type`

### Step 6（completed）：摘要显示 `已处理 0s` 的根因治理

1. 补充 `assistantRound.durationMs` 的事实源约束：它是轮次级元数据，不应依赖 `UIMessage.createdAt` 猜测。
2. 修复写入链路：
   - PC：在主进程 chat 流里以“首个 assistant 可见 chunk 发出”作为本轮 `startedAt`，并在 `onFinish` 写入 metadata。
   - Mobile：在 chat lifecycle hook 内以“首个真实 assistant 内容进入 messages”作为本轮 `startedAt`，结束时再注入 metadata。
3. 修复读链路：
   - 摘要展示只在 `durationMs > 0` 时显示时长；
   - `durationMs <= 0` 统一退化为无时长文案，避免显示 `已处理 0s`。
4. 按 TDD 补失败测试，覆盖“无 `createdAt` 但有显式 `startedAt`”与“旧 metadata 中 `durationMs=0` 不展示时长”。

执行结果（2026-03-06）：

1. 已确认根因：
   - `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts` 当前优先从 `UIMessage.createdAt` 推导 `startedAt/durationMs`；
   - `apps/moryflow/pc/src/main/chat/chat-request.ts` 的 `onFinish` 调用 `annotateLatestAssistantRoundMetadata(nextMessages)` 时没有传入 round-level `startedAt`；
   - `apps/moryflow/mobile/components/chat/hooks/assistant-round-persistence.ts` 也只传 `finishedAt`，没有稳定的 round-level `startedAt`；
   - 各端摘要展示把 `durationMs=0` 当成有效值格式化，导致出现 `已处理 0s`。
2. 已冻结修复方案：
   - 将 `annotateLatestAssistantRoundMetadata(...)` / `buildAssistantRoundMetadata(...)` 升级为显式接收 round-level timestamps；
   - PC/Mobile 从执行编排层提供稳定 `startedAt`；
   - 共享折叠视图模型在生成 summary item 时过滤 `durationMs <= 0`。
3. 共享事实源已完成根因修复：
   - `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`
   - `buildAssistantRoundMetadata(...)` / `annotateLatestAssistantRoundMetadata(...)` 现在显式接收 `startedAt/finishedAt`
   - metadata 幂等判断改为对比完整 round metadata，旧的 `durationMs=0` 不会再阻止正确时长覆盖
   - summary item 统一过滤 `durationMs <= 0`，跨端不再展示 `0s`
4. PC 已完成写入链路修复：
   - `apps/moryflow/pc/src/main/chat/messages.ts` 新增 `onFirstRenderableAssistantChunk`
   - `apps/moryflow/pc/src/main/chat/chat-request.ts` 改为在首个可见 assistant chunk 到达时记录 `roundStartedAt`
   - `onFinish` 持久化时显式传入 `{ startedAt: roundStartedAt, finishedAt: Date.now() }`
5. Mobile 已完成生命周期修复：
   - 新增 `apps/moryflow/mobile/lib/chat/assistant-round-timing.ts`，以“最新 user 轮次 + 首个 assistant 内容出现”维护 round timestamps
   - `apps/moryflow/mobile/components/chat/hooks/use-chat-state.ts` 改为消费该纯函数，不再把 `submitted/streaming` 当作 startedAt
   - `apps/moryflow/mobile/components/chat/hooks/assistant-round-persistence.ts` 继续接收显式 timestamps
6. 回归测试已补齐：
   - `packages/agents-runtime/src/__tests__/assistant-round-collapse.test.ts`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.test.tsx`
   - `apps/moryflow/mobile/lib/chat/__tests__/assistant-round-persistence.spec.ts`
7. 定向验证通过：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/assistant-round-collapse.test.ts`
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit`
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @moryflow/mobile lint`
   - `pnpm --filter @moryflow/mobile test:unit -- lib/chat/__tests__/assistant-round-persistence.spec.ts`
   - `pnpm --filter @moryflow/mobile check:type`
   - `pnpm --filter @anyhunt/console exec vitest run src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx`
   - `pnpm --filter @moryflow/admin exec vitest run src/features/chat/components/conversation-section.test.tsx`
8. 根级校验结果：
   - `pnpm lint` 通过
   - `pnpm typecheck` 通过
   - `pnpm test:unit` 未全绿，存在仓库基线失败，与本次修复无关：
     - `apps/moryflow/admin/src/stores/auth.test.ts`
     - `apps/anyhunt/console/src/stores/auth.test.ts`
     - `apps/anyhunt/admin/www/src/app/AppRouter.test.tsx`
     - `apps/moryflow/pc` 的 `better-sqlite3` rebuild/test 环境中断

### Step 7（completed）：Review finding 收口为“首个 assistant 可见内容起算”

1. 评审确认当前实现仍有语义偏差：
   - PC 把 `startedAt` 记在请求启动前，错误地把附件构建/网络等待计入“已处理”时长；
   - Mobile 把 `startedAt` 绑在 `status -> running`，同样早于 assistant 内容真正出现。
2. 根因修复目标：
   - `startedAt` 必须绑定“首个 assistant 可见内容出现”，而不是请求开始或状态切换。
3. 实施结果（2026-03-06）：
   - PC：`chat/messages.ts` 新增只触发一次的 `onFirstRenderableAssistantChunk`；`chat-request.ts` 仅在该回调触发时记录 `roundStartedAt`。
   - Mobile：新增 `lib/chat/assistant-round-timing.ts` 纯函数，以最新 user 轮次与首个 assistant 内容出现时刻维护 `startedAt/finishedAt`；`use-chat-state.ts` 删除原先 `status` 边界计时逻辑。
   - 新增回归：
     - `apps/moryflow/pc/src/main/chat/__tests__/stream-agent-run.test.ts`
     - `apps/moryflow/mobile/lib/chat/__tests__/assistant-round-timing.spec.ts`
4. 本轮验证通过：
   - `pnpm --filter @moryflow/pc exec vitest run src/main/chat/__tests__/stream-agent-run.test.ts`
   - `pnpm --filter @moryflow/pc typecheck`
   - `pnpm --filter @moryflow/mobile test:unit -- lib/chat/__tests__/assistant-round-timing.spec.ts lib/chat/__tests__/assistant-round-persistence.spec.ts`
   - `pnpm --filter @moryflow/mobile check:type`

## 10. 摘要 `0s` 问题说明

1. 问题现象：
   - AI 一轮结束后，摘要行偶发显示 `已处理 0s`，与真实执行耗时不符。
2. 根因：
   - `assistantRound.durationMs` 目前部分场景依赖 `UIMessage.createdAt` 推导；
   - `UIMessage.createdAt` 不是可靠的轮次事实源，尤其在 PC 主进程流式持久化与 Mobile 客户端 `useChat` 场景中，assistant message 并没有稳定的 `createdAt`；
   - 当 `startedAt` 缺失时，共享层退化为 `startedAt = finishedAt`，最终将 `durationMs` 写成 `0`。
3. 修复原则：
   - 把“轮次开始时间”提升为执行编排层事实，而不是消息层猜测；
   - 把“是否展示时长”提升为共享 summary view model 规则，而不是各端各自判断。
4. 验收标准补充：
   - 新轮次结束后，若编排层提供了 `startedAt`，摘要应展示真实时长；
   - 旧会话或异常数据中的 `durationMs <= 0` 不再显示 `0s`，只显示无时长摘要文案。
