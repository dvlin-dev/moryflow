---
title: AI 轮次结束自动折叠方案（不改 Tool/Reasoning 渲染）
date: 2026-03-06
scope: packages/agents-runtime + packages/ui + packages/types + packages/i18n + moryflow/pc + anyhunt/console + moryflow/admin + moryflow/mobile
status: completed
---

<!--
[INPUT]:
- 用户需求：AI 一轮回复过程中正常逐条展示；结束后自动折叠同轮前置 assistant 消息，仅保留最后一条结论消息。
- 关键约束：Tool/Reasoning 渲染行为保持不变；支持手动展开/折叠且手动优先；全端统一。

[OUTPUT]:
- 轮次折叠共享算法（Assistant Round ViewModel）与全端接入方案
- 时长摘要文案与持久化策略
- 可执行步骤与进度追踪

[POS]: Moryflow Features / Chat 消息轮次折叠重构方案

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/features/index.md` 与 `docs/CLAUDE.md`。
-->

# AI 轮次结束自动折叠方案（不改 Tool/Reasoning 渲染）

## 1. 摘要

1. 保持现有消息渲染不变：Tool、Reasoning、Text 在流式阶段继续按当前逻辑逐条渲染。
2. 仅在一轮 AI 回复结束后生效：同轮 assistant 消息仅保留最后一条结论可见，其余过程消息折叠。
3. 折叠区展示一条摘要触发器（时长型文案 + 箭头），支持手动展开/折叠，手动优先。
4. 能力统一覆盖 PC、Console、Admin、Mobile，复用共享纯函数，端侧只做渲染适配。

## 2. 冻结交互

1. 运行中（`submitted/streaming`）：本轮 assistant 全部消息展开展示。
2. 结束后（`ready/error`）：自动折叠过程消息，仅显示结论消息。
3. 用户手动展开后可查看过程消息；手动收起后恢复“仅结论可见”。
4. 占位 assistant 空消息不计入过程消息。

## 3. 架构与职责

1. 新增 `Assistant Round ViewModel` 共享纯函数层，负责轮次划分、可见性判定、时长格式化。
2. `ChatMessage / ToolPart / Reasoning` 保持单条消息渲染职责，不感知轮次折叠。
3. `ConversationSection / MessageList` 上层负责根据 ViewModel 插入摘要行并控制过程消息显隐。

## 4. 数据与接口变更

1. `packages/types/src/common/chat.ts`：`ChatMessageMeta` 新增：
   - `assistantRound?: { version: 1; roundId: string; startedAt: number; finishedAt: number; durationMs: number; processCount: number }`
2. `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts` 新增导出：
   - `resolveAssistantRounds(messages)`
   - `buildAssistantRoundRenderItems({ messages, status, manualOpenPreferenceByRoundId })`
   - `resolveAssistantRoundOpenState({ status, hasManualExpanded, isCurrentRound })`
   - `formatAssistantRoundDuration(durationMs)`
   - `annotateLatestAssistantRoundMetadata(messages, finishedAt?)`
3. `packages/i18n/src/translations/chat/*` 新增键：
   - `assistantRoundProcessed`
   - `assistantRoundProcessedWithDuration`
   - `assistantRoundExpand`
   - `assistantRoundCollapse`

## 5. 轮次算法

1. 轮次边界：按 user 消息切分；一个 user 到下一个 user 之间的 assistant 消息属于同轮。
2. 结论消息：该轮最后一条 assistant。
3. 过程消息：该轮除结论外的 assistant 消息。
4. 自动折叠触发：该轮从运行态进入结束态且 `processCount > 0`。
5. 自动展开仅针对“当前运行轮次”；历史轮次保持折叠状态。
6. 手动偏好优先：`manual-expanded`/`manual-collapsed` 覆盖自动判定。

## 6. 时长事实源

1. 时长定义：该轮首条 assistant 到轮次结束时刻的耗时。
2. 持久化位置：结论消息 `metadata.chat.assistantRound.durationMs`。
3. 展示优先级：持久化 `durationMs` 优先；缺失时使用运行态兜底；仍缺失则显示无时长文案。

## 7. 分端落位

1. PC 主进程：
   - `apps/moryflow/pc/src/main/chat/chat-request.ts`（onFinish 写入结论消息 round metadata）
2. PC 渲染：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx`
3. Console：
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.tsx`
4. Admin：
   - `apps/moryflow/admin/src/features/chat/components/conversation-section.tsx`
5. Mobile：
   - `apps/moryflow/mobile/components/chat/components/ChatMessageList.tsx`
   - `apps/moryflow/mobile/components/chat/hooks/use-chat-state.ts`
6. 共享 UI：
   - `packages/ui/src/ai/assistant-round-summary.tsx`（Web 摘要触发器）

## 8. 执行计划与进度

### Step 1（completed）：文档落地与执行计划建档

1. 新建方案文档并补充分步执行清单。
2. 将状态初始化为 `in_progress`，后续每步完成后同步回写本节。

执行结果（2026-03-06）：

1. 已创建本文档并完成分步计划。

### Step 2（completed）：共享类型与算法模块（packages/types + packages/agents-runtime）

1. 扩展 `ChatMessageMeta.assistantRound` 类型。
2. 新增 `assistant-round-collapse.ts` 纯函数与单测。
3. 导出 `index.ts` 与 `package.json exports` 子路径。

执行结果（2026-03-06）：

1. `packages/types/src/common/chat.ts` 已新增 `ChatAssistantRoundMeta` 与 `ChatMessageMeta.assistantRound`。
2. 已新增 `packages/agents-runtime/src/ui-message/assistant-round-collapse.ts`，包含轮次分组、渲染项构建、开合状态、时长格式化、元数据注入。
3. 已新增测试 `packages/agents-runtime/src/__tests__/assistant-round-collapse.test.ts`。
4. 已更新导出：
   - `packages/agents-runtime/src/index.ts`
   - `packages/agents-runtime/package.json`（新增 `./ui-message/assistant-round-collapse` 子路径）
5. 验证通过：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/assistant-round-collapse.test.ts`
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit`
   - `pnpm --filter @moryflow/types exec tsc --noEmit`

### Step 3（completed）：共享摘要行组件与 i18n 键（packages/ui + packages/i18n）

1. 新增 `AssistantRoundSummary` 组件（Web）。
2. `packages/ui/src/ai/index.ts` 导出新组件并补单测。
3. chat 命名空间多语言补齐轮次摘要文案键。

执行结果（2026-03-06）：

1. 已新增 `packages/ui/src/ai/assistant-round-summary.tsx`（左右分割线 + 文案 + 箭头触发器）。
2. 已更新 `packages/ui/src/ai/index.ts` 导出。
3. 已新增测试 `packages/ui/test/assistant-round-summary.test.tsx`。
4. 已补齐 i18n 键：
   - `packages/i18n/src/translations/chat/{en,zh-CN,ja,de,ar}.ts`
5. 验证通过：
   - `pnpm --filter @moryflow/ui exec vitest run test/assistant-round-summary.test.tsx`
   - `pnpm --filter @moryflow/ui typecheck`
   - `pnpm --filter @moryflow/i18n exec tsc --noEmit`

### Step 4（completed）：PC 接入（主进程持久化 + 渲染层折叠）

1. `chat-request.ts` onFinish 写入 latest round metadata。
2. `conversation-section.tsx` 接入 render items（摘要 + 过程显隐）。
3. 补齐/更新 PC 受影响测试。

执行结果（2026-03-06）：

1. 已在 `apps/moryflow/pc/src/main/chat/chat-request.ts` 的 `onFinish` 接入 `annotateLatestAssistantRoundMetadata`，并在持久化前写入 latest round metadata。
2. 已在 `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.tsx` 接入轮次 render items：
   - 结束态插入摘要行；
   - 折叠隐藏过程 assistant 消息；
   - 支持手动展开/收起且手动优先。
3. 已新增回归测试：
   - `apps/moryflow/pc/src/renderer/components/chat-pane/components/conversation-section.test.tsx`
4. 验证通过：
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx`
   - `pnpm --filter @moryflow/pc typecheck`

### Step 5（completed）：Console 接入

1. `AgentMessageList.tsx` 接入 render items 与摘要行。
2. 保持 `MessageRow` 单条渲染不变。
3. 补齐 Console 受影响测试。

执行结果（2026-03-06）：

1. 已在 `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.tsx` 接入 round render items：
   - 结束态插入摘要行；
   - 折叠隐藏过程 assistant 消息；
   - 支持手动展开/收起且手动优先。
2. 已新增回归测试：
   - `apps/anyhunt/console/src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx`
3. 验证通过：
   - `pnpm --filter @anyhunt/console test -- src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.test.tsx`
   - `pnpm --filter @anyhunt/console typecheck`

### Step 6（completed）：Admin 接入

1. `conversation-section.tsx` 接入 render items 与摘要行。
2. 保持 `message.tsx` 单条渲染不变。
3. 补齐 Admin 受影响测试。

执行结果（2026-03-06）：

1. 已在 `apps/moryflow/admin/src/features/chat/components/conversation-section.tsx` 接入 round render items：
   - 结束态插入摘要行；
   - 折叠隐藏过程 assistant 消息；
   - 支持手动展开/收起且手动优先。
2. 已新增回归测试：
   - `apps/moryflow/admin/src/features/chat/components/conversation-section.test.tsx`
3. 验证通过：
   - `pnpm --filter @moryflow/admin test -- src/features/chat/components/conversation-section.test.tsx src/features/chat/components/message-tool.test.tsx`
   - `pnpm --filter @moryflow/admin typecheck`

### Step 7（completed）：Mobile 接入与持久化

1. `use-chat-state.ts` 在轮次结束时注入 latest round metadata 并随消息持久化。
2. `ChatMessageList.tsx` 接入 render items 与摘要行（RN）。
3. 补齐 Mobile 受影响测试。

执行结果（2026-03-06）：

1. 已新增纯函数模块：
   - `apps/moryflow/mobile/components/chat/hooks/assistant-round-persistence.ts`
   - 统一收口“轮次结束时注入 metadata”逻辑。
2. 已在 `apps/moryflow/mobile/components/chat/hooks/use-chat-state.ts` 接入：
   - 结束态自动注入 latest round metadata；
   - 写回 `setMessages`；
   - 随 `saveUiMessages` 持久化。
3. 已在 `apps/moryflow/mobile/components/chat/components/ChatMessageList.tsx` 接入：
   - 结束态摘要行；
   - 折叠隐藏过程 assistant 消息；
   - 手动展开/收起且手动优先。
4. `apps/moryflow/mobile/components/chat/ChatScreen.tsx` 已透传 `status + threadId` 给消息列表层。
5. 已新增回归测试：
   - `apps/moryflow/mobile/lib/chat/__tests__/assistant-round-persistence.spec.ts`
6. 验证结果：
   - `pnpm --filter @moryflow/mobile test:unit` 通过。
   - `pnpm --filter @moryflow/mobile check:type` 失败（既有 `ChatSessionSummary.mode` 类型迁移遗留问题，报错集中在 `session-store/use-chat-sessions/ChatScreen`，不属于本次轮次折叠改造新增错误）。

### Step 8（completed）：文档回写、CLAUDE 同步与校验

1. 回写本文档每步执行结果并将状态改为 `completed`。
2. 同步受影响目录 `CLAUDE.md` 与 docs 索引。
3. 执行验证命令并记录结果。

执行结果（2026-03-06）：

1. 文档回写完成：
   - 本文档 Step 1~8 已全部回写，状态更新为 `completed`。
2. docs 索引同步完成：
   - `docs/design/moryflow/features/index.md`
   - `docs/index.md`
   - `docs/CLAUDE.md`
3. 受影响目录 `CLAUDE.md` 同步完成：
   - `packages/agents-runtime/CLAUDE.md`
   - `packages/ui/CLAUDE.md`
   - `packages/types/CLAUDE.md`
   - `packages/i18n/CLAUDE.md`
   - `apps/anyhunt/console/src/features/CLAUDE.md`
   - `apps/moryflow/admin/CLAUDE.md`
   - `apps/moryflow/mobile/CLAUDE.md`
   - `apps/moryflow/mobile/components/CLAUDE.md`
   - `apps/moryflow/pc/src/main/CLAUDE.md`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/CLAUDE.md`
4. 验证结果：
   - `pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/assistant-round-collapse.test.ts src/__tests__/tool-command-summary.test.ts` 通过
   - `pnpm --filter @moryflow/agents-runtime exec tsc --noEmit` 通过
   - `pnpm --filter @moryflow/ui exec vitest run test/assistant-round-summary.test.tsx test/tool-shell-redesign.test.tsx` 通过
   - `pnpm --filter @moryflow/ui typecheck` 通过
   - `pnpm --filter @moryflow/types exec tsc --noEmit` 通过
   - `pnpm --filter @moryflow/i18n exec tsc --noEmit` 通过
   - `pnpm --filter @anyhunt/console test -- src/features/agent-browser-playground/components/AgentMessageList/AgentMessageList.test.tsx src/features/agent-browser-playground/components/AgentMessageList/components/message-tool.test.tsx` 通过
   - `pnpm --filter @anyhunt/console typecheck` 通过
   - `pnpm --filter @moryflow/admin test -- src/features/chat/components/conversation-section.test.tsx src/features/chat/components/message-tool.test.tsx` 通过
   - `pnpm --filter @moryflow/admin typecheck` 通过
   - `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/conversation-section.test.tsx src/renderer/components/chat-pane/components/message/tool-part.test.tsx` 通过
   - `pnpm --filter @moryflow/pc typecheck` 通过
   - `pnpm --filter @moryflow/mobile test:unit` 通过
   - `pnpm --filter @moryflow/mobile check:type` 失败（既有 `ChatSessionSummary.mode` 类型迁移基线问题，非本次 round 折叠改造新增）

## 9. 验收标准

1. Tool/Reasoning 单条渲染样式与行为无回归。
2. 折叠仅在轮次结束后发生，运行中不提前折叠。
3. 默认阅读路径为“用户问题 + AI 结论”，过程可手动展开。
4. 全端语义一致，时长摘要可显示并在支持持久化的端可重开恢复。

## 10. 假设与默认

1. “一轮”按 user 边界定义，不引入 runId 协议。
2. 手动开合偏好按 `threadId + roundId` 仅作用当前会话，不跨会话同步。
3. Console/Admin 无持久会话元数据时允许运行态/消息态兜底。
4. 不引入兼容开关，直接统一新结构。
