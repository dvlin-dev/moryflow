---
title: Moryflow PC Automations 与 Telegram Delivery 基线
date: 2026-03-14
scope: apps/moryflow/pc + packages/automations-core + packages/channels-telegram
status: completed
---

<!--
[INPUT]: Moryflow PC Automations 当前实现、无人值守执行策略、Telegram endpoint/delivery 以及双入口创建链路
[OUTPUT]: Automations 功能的单一事实源：合同、运行边界、UI 入口、投递语义与验证基线
[POS]: Moryflow Features / PC Automations + Telegram Delivery

[PROTOCOL]: 仅在 Automations 合同、运行边界、投递语义、关键入口或验证基线失真时更新；不维护计划过程。
-->

# Moryflow PC Automations 与 Telegram Delivery 基线

## 1. 当前结论

1. `Automations` 已是 Moryflow PC 的顶层模块，调度与执行都只发生在本地 Electron main process，不做跨端共享调度。
2. 功能入口固定为两条：
   - 顶层模块 `Automations`
   - Chat Header 的 `Automate`
3. 两条入口必须复用同一套 `automations` domain、同一编辑器与同一 IPC 合同；禁止再拆第二套创建流程。
4. 自动化结果当前只支持两种去向：
   - `Keep local only`
   - 推送到已验证的 Telegram endpoint
5. Telegram 推送不是直接“发一条消息就结束”，而是绑定到 canonical thread，并把结果同步写回稳定 `replySessionId`，保证后续 Telegram 回复仍落在同一会话。

## 2. 合同与持久化事实

### 2.1 单一合同源

`@moryflow/automations-core` 是自动化领域合同唯一事实源，固定承载：

1. `AutomationJob`
2. `AutomationContextRecord`
3. `AutomationEndpoint`
4. `AutomationExecutionPolicy`
5. `AutomationRunRecord`

当前冻结合同：

1. source 只允许：
   - `conversation-session`
   - `automation-context`
2. source origin 只允许：
   - `conversation-entry`
   - `automations-module`
3. schedule 只允许：
   - `at`
   - `every`
4. payload 当前只支持 `agent-turn`，并固定包含 `message`；`modelId`、`thinking`、`contextDepth`、`contextSummary` 为可选扩展。
5. delivery 只允许：
   - `none`
   - `push`
6. endpoint 当前只支持 Telegram，且必须保存：
   - `chatId`
   - `threadId`（可选）
   - canonical `peerKey`
   - canonical `threadKey`
   - `replySessionId`

### 2.2 本地存储

1. `apps/moryflow/pc/src/main/automations/store.ts`
   - 使用桌面端本地 store 持久化 jobs、endpoints 与 `defaultEndpointId`
2. `apps/moryflow/pc/src/main/automations/context-store.ts`
   - 单独持久化 `automation-context`
   - 不复用 chat session 列表
   - history 上限固定为最近 `200` 条
3. `apps/moryflow/pc/src/main/automations/run-log.ts`
   - 按 job 写入独立 `jsonl`
   - 正常路径落到 `userData/automation-run-logs`
   - E2E 路径落到 `MORYFLOW_E2E_USER_DATA/stores/automation-run-logs`

## 3. 运行时与权限边界

### 3.1 无人值守执行

1. 自动化 run 固定走无人值守模式，不进入交互式审批链路。
2. 运行时入口固定使用：
   - `mode: 'ask'`
   - `approvalMode: 'deny_on_ask'`
3. 任何本次 run 仍需要 ask 的操作，都会在当前 run 内即时拒绝，而不是创建审批卡等待用户处理。

### 3.2 当前产品预设

创建与编辑自动化时，UI 预设固定为：

1. `approvalMode: unattended`
2. `toolPolicy.allow = Read + Edit`
3. `fileSystemPolicy = vault_only`
4. `networkPolicy = deny`
5. `requiresExplicitConfirmation = true`

这意味着当前产品语义是：

1. 自动化默认可以读写当前 Vault
2. 自动化默认不能联网
3. 保存前必须显式勾选 `Confirm unattended execution`

### 3.3 Runner 与 Scheduler

1. runner 只读取 source 最近 `6` 个 turns，当前默认上下文深度不开放成自由配置。
2. 若 source history 缺失，runner 会退化为仅执行 `payload.message`，并记录 `source_missing` warning。
3. runner 先把 `(payload.message, assistantOutput)` 追加回 source history，再决定是否执行外部 delivery。
4. scheduler 固定在本地 main process 计时：
   - 启动时重建最近 timer
   - `powerMonitor.resume` 后补跑已到期任务
   - 若 job 仍处于未过期 `runningAt`，本轮记为 `skipped`，避免重入

## 4. Telegram Endpoint 与 Delivery

### 4.1 Endpoint 绑定

1. 绑定 Telegram endpoint 时，主进程必须先解析 canonical thread：
   - `peerKey`
   - `threadKey`
   - `replySessionId`
2. 同一 canonical thread 重复绑定时，复用已有 endpoint / reply conversation，不再生成第二套 reply session。
3. endpoint 只有在验证消息发送成功后才会得到 `verifiedAt`。
4. 只有 `verified` endpoint 才能被设置为默认投递目标，也才能被 `push` delivery 引用。

### 4.2 Delivery 语义

1. 当前只支持 Telegram delivery adapter。
2. 每次投递前都会重新 `ensureReplyConversation(...)`，以便自愈：
   - canonical keys
   - `replySessionId`
3. 投递成功后必须同步做三件事：
   - 更新 endpoint `lastUsedAt`
   - 把 assistant output 追加到 `replySessionId`
   - 触发现有 conversation UI 同步
4. 若 Telegram 发送成功，但本地 transcript / UI 同步失败，本次 delivery 仍记为 delivered，同时记录 `localSyncError`。

## 5. UI 入口与交互不变量

### 5.1 顶层模块 `Automations`

1. 模块页固定包含三块：
   - automation list
   - editor + run history
   - endpoint manager
2. `Automations` 模块创建的新任务默认使用 `automation-context` 作为 source。
3. 顶层模块入口的产品定位是“本地 scheduler workbench”，不是聊天页里的临时弹窗替代品。

### 5.2 Chat Header `Automate`

1. `Automate` 只在当前会话 ready 时可用。
2. 入口会预填最近一条用户消息作为 automation prompt。
3. 该入口创建的 source 固定是 `conversation-session`，并复用当前会话 `vaultPath` 与 title。
4. Chat Header 与顶层模块共享同一 `AutomationEditor`，字段、校验与保存合同必须一致。

### 5.3 Editor 不变量

1. schedule 只提供：
   - `Every N hours`
   - `One time`
2. delivery 只提供：
   - `Send to Telegram`
   - `Keep local only`
3. 若没有 verified endpoint，`Send to Telegram` 不能完成保存。
4. `Confirm unattended execution` 默认必须未勾选，用户显式确认后才能创建。

## 6. 关键代码索引

### 6.1 Domain / IPC

- `packages/automations-core/src/schema.ts`
- `apps/moryflow/pc/src/shared/ipc/automations.ts`
- `apps/moryflow/pc/src/preload/index.ts`

### 6.2 PC Main

- `apps/moryflow/pc/src/main/automations/store.ts`
- `apps/moryflow/pc/src/main/automations/context-store.ts`
- `apps/moryflow/pc/src/main/automations/run-log.ts`
- `apps/moryflow/pc/src/main/automations/policy.ts`
- `apps/moryflow/pc/src/main/automations/runner.ts`
- `apps/moryflow/pc/src/main/automations/scheduler.ts`
- `apps/moryflow/pc/src/main/automations/endpoints.ts`
- `apps/moryflow/pc/src/main/automations/delivery.ts`
- `apps/moryflow/pc/src/main/automations/service.ts`
- `apps/moryflow/pc/src/main/app/automations-ipc-handlers.ts`

### 6.3 Renderer

- `apps/moryflow/pc/src/renderer/workspace/components/automations/index.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/automations/automation-editor.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/automations/forms/automation-form-schema.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-pane-automation-entry.tsx`
- `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`

## 7. 当前验证基线

1. 合同层：
   - `pnpm --filter @moryflow/automations-core test:unit`
2. PC main automations：
   - `pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/policy.test.ts src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts src/main/automations/endpoints.test.ts src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/app/automations-ipc-handlers.test.ts src/main/channels/telegram/inbound-reply-service.test.ts`
3. Renderer / shell smoke：
   - `pnpm --filter @moryflow/pc exec playwright test tests/automations-harness.spec.ts`
4. 若同时触及模块导航、共享运行时权限或仓库文档契约，还需叠加对应 `pc-navigation`、`pc-permission` 与 `docs/reference/testing-and-validation.md` 中的最小闭环。
