# Telegram C+ Conversation Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 以 C+ 架构重构 Telegram 入站会话路由，根治“未找到对应的对话”错误，并支持 `/start`（幂等建连）与 `/new`（强制新会话）命令。

**Architecture:** 将“渠道线程路由”和“应用会话创建”彻底解耦：`packages/channels-*` 只负责协议、线程键与命令解析，`apps/moryflow/pc` 负责会话绑定与持久化。运行时在调用 Agent 前必须先拿到真实 `chatSessionId`，禁止再把渠道 key 当作 chatId 使用。

**Tech Stack:** TypeScript, Electron(main), better-sqlite3, Vitest, pnpm workspace

---

## 执行进度

- [x] Task 1: 方案与契约重构（channels-core/channels-telegram）
- [x] Task 2: PC 会话绑定服务与 DB 绑定仓储落地
- [x] Task 3: Telegram 入站命令路由（`/start`、`/new`）与会话解析接入
- [x] Task 4: 回归测试补齐（共享包 + PC）
- [x] Task 5: 文档/CLAUDE 同步与验证收口

### Progress Log

- 2026-03-04 18:33 Task 1 / Step 1-2 完成（Red）：
  - `@moryflow/channels-core test:unit` 失败：`thread key` 用例仍存在 `sessionKey`。
  - `@moryflow/channels-telegram test:unit` 失败：`parseTelegramCommand` 尚未实现。
- 2026-03-04 18:35 Task 1 / Step 3-4 完成（Green）：
  - 已移除 `ThreadResolution.sessionKey` 与 runtime 对 `ports.sessions` 的依赖。
  - 已新增 `parseTelegramCommand`（支持 `/start`、`/new`、`/cmd@bot`）。
  - 验证通过：
    - `pnpm --filter @moryflow/channels-core test:unit`
    - `pnpm --filter @moryflow/channels-telegram test:unit`
- 2026-03-04 18:36 Task 2 / Step 1-2 完成（Red）：
  - 新增 `conversation-service.test.ts`（覆盖 ensure/create-new/self-heal）。
  - `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/conversation-service.test.ts` 失败（预期）：`conversation-service.js` 尚未实现。
- 2026-03-04 18:37 Task 2 / Step 3-4 完成（Green）：
  - 已新增 `conversation-service.ts`，实现 ensure/new/self-heal 三种会话解析策略。
  - `sqlite-store.ts` 已新增 `conversationBindings` 仓储并收敛映射语义到 `conversationId`。
  - `runtime-orchestrator.ts` 已移除 runtime `ports.sessions` 注入。
  - 验证通过：
    - `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/conversation-service.test.ts src/main/channels/telegram/runtime-orchestrator.test.ts`
- 2026-03-04 18:39 Task 3 / Step 1-2 完成（Red）：
  - `inbound-reply-service.test.ts` 已改为命令路由 + conversationId 语义。
  - `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/inbound-reply-service.test.ts` 失败（预期）：
    - handler 仍依赖 `thread.sessionKey`；
    - `/start`、`/new` 尚未路由到会话服务。
- 2026-03-04 18:42 Task 3 / Step 3-4 完成（Green）：
  - `inbound-reply-service.ts` 已接入 `parseTelegramCommand`，并实现 private chat 下 `/start` 与 `/new` 的分流回执。
  - 普通消息路径已改为先解析真实 `conversationId` 再执行 `runChatTurn`，不再使用 `sessionKey`。
  - 验证通过：
    - `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/inbound-reply-service.test.ts`
- 2026-03-04 18:42 Task 4 / Step 1-2 完成（Red）：
  - 回归中发现 `runtime-orchestrator.test.ts` 在 node 环境触发真实 `electron-store` 初始化（缺少 `projectName`）。
  - 根因为 `runtime-orchestrator.ts` 新增 `chat-session-store` 依赖后，测试未 mock `../../chat-session-store/index.js` 与 `../../vault.js`。
- 2026-03-04 18:43 Task 4 / Step 3-4 完成（Green）：
  - `runtime-orchestrator.test.ts` 已补齐 `chatSessionStore/getStoredVault` mock，避免测试环境误触真实存储。
  - 全量回归通过：
    - `pnpm --filter @moryflow/channels-core test:unit`
    - `pnpm --filter @moryflow/channels-telegram test:unit`
    - `pnpm --filter @moryflow/pc test:unit`
- 2026-03-04 18:44 Task 5 / Step 1 完成：
  - 设计文档已同步 C+ 边界：删除 `sessionKey` 语义、落地 `channel_conversation_bindings(conversation_id)`、新增 `/start` `/new` 命令语义。
  - 已更新 `apps/moryflow/pc/CLAUDE.md`、`apps/moryflow/pc/src/main/CLAUDE.md`，并新增：
    - `packages/channels-core/CLAUDE.md` + `AGENTS.md -> CLAUDE.md`
    - `packages/channels-telegram/CLAUDE.md` + `AGENTS.md -> CLAUDE.md`
- 2026-03-04 18:45 Task 5 / Step 2-3 完成（Green）：
  - `pnpm --filter @moryflow/pc typecheck` 初次失败，暴露共享包类型产物过期（未导出 `parseTelegramCommand`、仍要求 `ports.sessions`）。
  - 通过 `pnpm --filter @moryflow/channels-core exec tsc -p tsconfig.json` 与 `pnpm --filter @moryflow/channels-telegram exec tsc -p tsconfig.json` 刷新类型产物后复测通过。
  - 最终验证通过：
    - `pnpm --filter @moryflow/channels-core test:unit`
    - `pnpm --filter @moryflow/channels-telegram test:unit`
    - `pnpm --filter @moryflow/pc test:unit`
    - `pnpm --filter @moryflow/pc typecheck`
- 2026-03-04 19:02 Review Follow-up 完成（按验收新约束）：
  - 保留回显策略：`proxyUrl` 明文回显、`botToken` 密文输入回显。
  - 保存语义更新为“有值即保存、手动清空即删除”：
    - renderer `telegram-section` 提交 `botToken/proxyUrl` 时改为 `string | null`；
    - main `settings-application-service` 复用既有 `null => clear keytar` 逻辑完成删除。
  - 会话绑定补偿：`conversation-service` 在“新建会话后绑定写入失败”场景新增回滚删除，避免 orphan conversation。
  - 测试去漂移：`inbound-reply-service.test.ts` 删除手写 `parseTelegramCommand` mock，改为走真实解析实现。
- 2026-03-04 20:10 Review Follow-up 验证收口：
  - 共享包验证通过：
    - `pnpm --filter @moryflow/channels-core test:unit`
    - `pnpm --filter @moryflow/channels-telegram test:unit`
  - Telegram 变更最小回归通过：
    - `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/conversation-service.test.ts src/main/channels/telegram/inbound-reply-service.test.ts src/main/channels/telegram/runtime-orchestrator.test.ts src/renderer/workspace/components/agent-module/telegram-section.behavior.test.tsx src/main/channels/telegram/settings-application-service.test.ts`
  - 全量验证通过：
    - `pnpm --filter @moryflow/pc typecheck`
    - `pnpm --filter @moryflow/pc test:unit`

## Task 1: 方案与契约重构（channels-core/channels-telegram）

**Files:**

- Modify: `packages/channels-core/src/types.ts`
- Modify: `packages/channels-core/src/thread.ts`
- Modify: `packages/channels-core/src/ports.ts`
- Modify: `packages/channels-core/test/core.test.ts`
- Modify: `packages/channels-telegram/src/types.ts`
- Modify: `packages/channels-telegram/src/telegram-runtime.ts`
- Create: `packages/channels-telegram/src/commands.ts`
- Modify: `packages/channels-telegram/src/index.ts`
- Test: `packages/channels-telegram/test/telegram.test.ts`、`packages/channels-telegram/test/commands.test.ts`

**Step 1: 写失败测试**

- 为 `ThreadResolution` 去除 `sessionKey` 增加断言。
- 为 `parseTelegramCommand` 增加 `/start`、`/new`、`/cmd@bot`、非命令文本场景。
- 为 runtime 去除 `ports.sessions` 依赖增加编译/单测失败基线。

**Step 2: 运行失败测试确认 Red**

- Run: `pnpm --filter @moryflow/channels-core test:unit`
- Run: `pnpm --filter @moryflow/channels-telegram test:unit`

**Step 3: 最小实现到 Green**

- 删除 `ThreadResolution.sessionKey`。
- runtime 移除 `ports.sessions.upsertSession` 调用与类型依赖。
- 新增 Telegram 命令解析器并导出。

**Step 4: 运行通过验证**

- Run: `pnpm --filter @moryflow/channels-core test:unit`
- Run: `pnpm --filter @moryflow/channels-telegram test:unit`

## Task 2: PC 会话绑定服务与 DB 绑定仓储落地

**Files:**

- Modify: `apps/moryflow/pc/src/main/channels/telegram/sqlite-store.ts`
- Create: `apps/moryflow/pc/src/main/channels/telegram/conversation-service.ts`
- Create: `apps/moryflow/pc/src/main/channels/telegram/conversation-service.test.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/runtime-orchestrator.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/runtime-orchestrator.test.ts`

**Step 1: 写失败测试**

- 新增会话绑定服务测试：
  - 无绑定 -> 创建会话并绑定。
  - 有绑定且会话存在 -> 复用。
  - 有绑定但会话不存在 -> 自愈重建并回写。
  - `/new` 场景 -> 强制新建并覆盖绑定。

**Step 2: 运行失败测试确认 Red**

- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/conversation-service.test.ts`

**Step 3: 最小实现到 Green**

- sqlite 增加 conversation binding 仓储方法（复用 `channel_sessions` 结构，语义收敛为 `conversationId`）。
- 新建 `conversation-service`，统一实现 ensure/create-new/self-heal。

**Step 4: 运行通过验证**

- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/conversation-service.test.ts src/main/channels/telegram/runtime-orchestrator.test.ts`

## Task 3: Telegram 入站命令路由（`/start`、`/new`）与会话解析接入

**Files:**

- Modify: `apps/moryflow/pc/src/main/channels/telegram/inbound-reply-service.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/inbound-reply-service.test.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/runtime-orchestrator.ts`

**Step 1: 写失败测试**

- `/start`：确保会话存在并回执，不进入模型执行。
- `/new`：创建新会话并回执，不进入模型执行。
- 普通消息：确保先解析真实 `conversationId` 再调用 `runChatTurn`。

**Step 2: 运行失败测试确认 Red**

- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/inbound-reply-service.test.ts`

**Step 3: 最小实现到 Green**

- 注入 `resolveConversationId` + `createNewConversationId`。
- 命令仅 private chat 生效，统一英文回执消息。
- 移除 `dispatch.thread.sessionKey` 依赖。

**Step 4: 运行通过验证**

- Run: `pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/inbound-reply-service.test.ts`

## Task 4: 回归测试补齐（共享包 + PC）

**Files:**

- Modify: `packages/channels-core/test/core.test.ts`
- Modify: `packages/channels-telegram/test/telegram.test.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/*.test.ts`

**Step 1: 写失败测试**

- 重点回归：
  - update 处理链路不再依赖会话存在。
  - `/start` 幂等、`/new` 强制切换。
  - 旧绑定脏数据自愈。

**Step 2: 运行失败测试确认 Red**

- 分包运行相关测试文件。

**Step 3: 最小实现到 Green**

- 修正 mock 与断言，确保契约一致。

**Step 4: 运行通过验证**

- Run: `pnpm --filter @moryflow/channels-core test:unit`
- Run: `pnpm --filter @moryflow/channels-telegram test:unit`
- Run: `pnpm --filter @moryflow/pc test:unit`

## Task 5: 文档/CLAUDE 同步与验证收口

**Files:**

- Modify: `docs/design/moryflow/features/moryflow-pc-telegram-integration-architecture.md`
- Modify: `apps/moryflow/pc/src/main/CLAUDE.md`
- Modify: `apps/moryflow/pc/src/renderer/workspace/CLAUDE.md`（如涉及）
- Modify: `apps/moryflow/pc/CLAUDE.md`
- Modify: `packages/channels-core/CLAUDE.md`
- Modify: `packages/channels-telegram/CLAUDE.md`

**Step 1: 文档同步**

- 写明 C+ 分层边界、命令语义、会话绑定事实源与不兼容点。

**Step 2: 验证**

- Run: `pnpm --filter @moryflow/channels-core test:unit`
- Run: `pnpm --filter @moryflow/channels-telegram test:unit`
- Run: `pnpm --filter @moryflow/pc test:unit`
- Run: `pnpm --filter @moryflow/pc typecheck`

**Step 3: 进度收口**

- 将本计划文档勾选为全部完成，并记录验证结果。
