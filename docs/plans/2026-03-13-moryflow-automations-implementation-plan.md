# Moryflow Automations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Moryflow PC 内一次性实现“对话内创建 + Automations 模块创建 + 本地调度执行 + runtime 级权限约束 + Telegram 定时推送 + 稳定 reply conversation”完整自动化链路。

**Architecture:** 以 `@moryflow/automations-core` 作为唯一 domain 合同源，在 Electron main process 内实现 job store、endpoint store、automation context store、scheduler、runner、delivery、run log 和 IPC service。`Automations` 页创建的后台执行上下文不复用 chat session store；Telegram endpoint 必须复用现有 canonical thread binding，并把投递结果写入稳定 `replySessionId` 后通过现有 chat broadcast 同步到 UI。

**Tech Stack:** TypeScript, Zod, Vitest, Electron main/preload, React, react-hook-form, Zustand, `electron-store`, Telegram channel runtime

**稳定事实回写目标：** `docs/design/moryflow/core/pc-navigation-and-workspace-shell.md`、`docs/design/moryflow/core/pc-permission-architecture.md`、`docs/design/moryflow/core/harness-engineering-baseline.md`、`docs/reference/testing-and-validation.md`

---

## Execution Status

- [x] Task 1: 建立 `automations-core` 唯一合同源
- [x] Task 2: 实现 main process 的 job store、endpoint store 与 automation context store
- [x] Task 3: 为 automation run 补齐真正可执行的 runtime policy override
- [x] Task 4: 实现 scheduler 与 runner
- [x] Task 5: 把 Telegram endpoint 绑定到 canonical thread，并实现 delivery + broadcast
- [x] Task 6: 接入 shared IPC、main handlers 与 preload bridge
- [x] Task 7: 实现 Automations 页的数据层、endpoint 管理和顶层模块 UI
- [x] Task 8: 接入对话内 `Automate` 创建入口
- [x] Task 9: 串联最终验证

### Post-Review Hardening Status

- [x] `run-log.ts` 已收敛到 `userData/automation-run-logs`，不再依赖 `process.cwd()` 作为 production 路径
- [x] 删除 automation 时会同步清理对应 run log 文件
- [x] `automation-context` history 已限制为最近 `200` 条，避免无限增长
- [x] scheduler 在 skip / 重入判断前会读取 live job，避免 stale `runningAt` 快照回写
- [x] 创建态 `Confirm unattended execution` 默认未勾选，必须显式确认后才能提交

---

### Task 1: 建立 `automations-core` 唯一合同源

**Files:**

- Create: `packages/automations-core/package.json`
- Create: `packages/automations-core/tsconfig.json`
- Create: `packages/automations-core/src/index.ts`
- Create: `packages/automations-core/src/schema.ts`
- Create: `packages/automations-core/test/automations-core.test.ts`

**Step 1: 写失败测试**

- 为以下冻结 contract 写 schema / type coverage：
  - `AutomationJob`
  - `AutomationJobState`
  - `AutomationSource`
  - `AutomationContextRecord`
  - `AutomationPayload`
  - `AutomationSchedule`
  - `AutomationDelivery`
  - `AutomationEndpoint`
  - `AutomationExecutionPolicy`
- 关键断言：
  - `AutomationSource.kind` 只允许 `conversation-session | automation-context`
  - `AutomationContextRecord` 与 `ChatSessionSummary` 解耦
  - endpoint 的 Telegram target 必须包含 `chatId/threadId` 和 canonical `peerKey/threadKey`
  - endpoint 必须包含 `replySessionId`
  - `AutomationExecutionPolicy` 必须能派生到 runtime permission config 所需字段

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/automations-core test:unit`

Expected: `Cannot find module` 或 schema / export 缺失。

**Step 3: 实现最小合同**

- 使用 Zod 定义并导出 schema，再用 `z.infer` 派生类型。
- 不再新增 `types.ts` 作为第二事实源。
- 包导出以下 schema / types：
  - `automationJobSchema`
  - `automationContextRecordSchema`
  - `automationEndpointSchema`
  - `automationExecutionPolicySchema`
  - 对应 infer types

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/automations-core test:unit`

Expected: 合同测试全部通过。

### Task 2: 实现 main process 的 job store、endpoint store 与 automation context store

**Files:**

- Create: `apps/moryflow/pc/src/main/automations/store.ts`
- Create: `apps/moryflow/pc/src/main/automations/context-store.ts`
- Create: `apps/moryflow/pc/src/main/automations/run-log.ts`
- Create: `apps/moryflow/pc/src/main/automations/run-log.test.ts`
- Create: `apps/moryflow/pc/src/main/automations/store.test.ts`
- Create: `apps/moryflow/pc/src/main/automations/context-store.test.ts`

**Step 1: 写失败测试**

- `store.test.ts` 覆盖：
  - create/update/delete/list/get job
  - endpoint 持久化
  - canonical `peerKey/threadKey` 不丢失
  - `replySessionId` 不丢失
- `context-store.test.ts` 覆盖：
  - create/list/get automation contexts
  - append/read recent history
  - automation context 不出现在 chat session 列表
- `run-log.test.ts` 覆盖：
  - append
  - read recent
  - 按 job 过滤
- `context-store.test.ts` 额外覆盖：
  - `toSession(contextId)` adapter 与 SDK `Session` 所需接口兼容

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/run-log.test.ts`

Expected: automation store / context store 尚未实现。

**Step 3: 实现 store**

- `store.ts`
  - 用 `electron-store` 管理 jobs、endpoints、轻量 run state
  - 直接使用 `@moryflow/automations-core` 的 schema 校验读写
- `context-store.ts`
  - 单独持久化 `AutomationContextRecord`
  - 提供 recent-history 读取与 append 接口
  - 不依赖 `chat-session-store`
  - 导出 `toSession(contextId)` adapter，匹配 SDK `Session` 所需接口
- `run-log.ts`
  - 使用独立 jsonl 或按 job 分文件方式持久化最近 N 条 run records

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/run-log.test.ts`

Expected: store 与 context store 测试通过。

### Task 3: 为 automation run 补齐真正可执行的 runtime policy override

**Files:**

- Modify: `packages/agents-runtime/src/types.ts`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/index.ts`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.ts`
- Modify: `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.test.ts`
- Create: `apps/moryflow/pc/src/main/automations/policy.ts`
- Create: `apps/moryflow/pc/src/main/automations/policy.test.ts`

**Step 1: 写失败测试**

- policy 测试覆盖：
  - `AutomationExecutionPolicy` 可映射为 runtime permission override
  - 未被允许的工具目标在 unattended automation run 中直接 deny
  - automation run 不会进入 approval-store 等待用户审批
- runtime 测试覆盖：
  - `runChatTurn` 支持 `runtimeConfigOverride`
  - `runChatTurn` 支持 `approvalMode: 'interactive' | 'deny_on_ask'`
  - `deny_on_ask` 时 ask 决策直接返回 denied output

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/policy.test.ts src/main/agent-runtime/permission-runtime.test.ts`

Expected: runtime 尚无 automation 专用 override / approval mode。

**Step 3: 实现 runtime policy override**

- `packages/agents-runtime/src/types.ts`
  - 为 run context 增加非交互审批语义所需字段
- `agent-runtime/index.ts`
  - `AgentRuntimeOptions` 增加 `runtimeConfigOverride` 与 `approvalMode`
  - 执行前通过 `mergeRuntimeConfig(base, override)` 生成本次 run 的有效 config
- `permission-runtime.ts`
  - 在 `approvalMode: 'deny_on_ask'` 时把 ask 决策即时收敛为 deny
  - 不触发交互式审批链路
  - 插入点固定在现有决策流水线的最终阶段：`applyFullAccessOverride(...)` 之后，再执行 `applyDenyOnAsk(...)`
- `automations/policy.ts`
  - 把 `AutomationExecutionPolicy` 映射成 runtime 可执行 override
  - 创建 automation 时校验该 policy 是否可执行；不可执行则直接阻止保存

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/policy.test.ts src/main/agent-runtime/permission-runtime.test.ts`

Expected: automation policy 已能在 runtime 层真正生效。

### Task 4: 实现 scheduler 与 runner

**Files:**

- Create: `apps/moryflow/pc/src/main/automations/scheduler.ts`
- Create: `apps/moryflow/pc/src/main/automations/runner.ts`
- Create: `apps/moryflow/pc/src/main/automations/scheduler.test.ts`
- Create: `apps/moryflow/pc/src/main/automations/runner.test.ts`

**Step 1: 写失败测试**

- scheduler 测试覆盖：
  - `at` 只触发一次
  - `every` 正确计算下一次时间
  - `runningAt` 存在时跳过重入
  - `powerMonitor.resume` 后只 catch up 最近一次 missed run
- runner 测试覆盖：
  - `conversation-session` source 从 chat session 取最近 `6` 个 turn
  - `automation-context` source 从 context store 取最近 `6` 个 turn
  - runner 固定走 isolated 模式
  - 对 scheduler / delivery 只暴露最终文本
  - runner 使用 Task 3 的 policy override
  - source conversation 缺失时降级为仅执行 `payload.message`，并记录 `source_missing` warning
  - run 完成后先把 `(payload.message, assistantOutput)` 追加回 source history

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts`

Expected: scheduler / runner 尚未实现。

**Step 3: 实现 scheduler / runner**

- `scheduler.ts`
  - 启动时装载 jobs 并 arm nearest timer
  - 监听 `electron.powerMonitor` 的 `suspend/resume`
  - `resume` 后 catch up 最近一次 missed run
  - 在 `init()` 时注册 powerMonitor listener，在 `shutdown()` 时移除
- `runner.ts`
  - 暴露 `runAutomationTurn(job)`
  - 统一读取 source context
  - 使用 Task 3 的 runtime override
  - 对外输出最终可投递文本和 run record
  - 成功执行后把 turn 写回 `conversation-session` 或 `automation-context`

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts`

Expected: scheduler 与 runner 测试通过。

### Task 5: 把 Telegram endpoint 绑定到 canonical thread，并实现 delivery + broadcast

**Files:**

- Create: `apps/moryflow/pc/src/main/automations/endpoints.ts`
- Create: `apps/moryflow/pc/src/main/automations/delivery.ts`
- Create: `apps/moryflow/pc/src/main/automations/service.ts`
- Create: `apps/moryflow/pc/src/main/automations/delivery.test.ts`
- Create: `apps/moryflow/pc/src/main/automations/integration.test.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/conversation-service.ts`
- Modify: `apps/moryflow/pc/src/main/channels/telegram/inbound-reply-service.test.ts`
- Modify: `apps/moryflow/pc/src/main/chat-session-store/handle.ts`
- Modify: `apps/moryflow/pc/src/main/chat/broadcast.ts`
- Modify: `apps/moryflow/pc/src/main/index.ts`

**Step 1: 写失败测试**

- endpoint / delivery 测试覆盖：
  - `bindEndpoint` 会把 Telegram target 解析成 canonical `peerKey/threadKey`
  - `replySessionId` 只能通过现有 `conversation-service` 创建/复用
  - 同一 canonical thread 重复绑定不会生成第二个 reply session
  - `bindEndpoint` 发送测试消息成功后才写入 `verifiedAt`
  - 未验证 endpoint 不能被 automation 引用
  - 推送成功后会把 assistant message 写入 `replySessionId`
  - 写入后会触发 `chat:session-event` / `chat:message-event`
  - delivery 前若 `replySessionId` 失效，会基于 canonical thread 自愈并回写 endpoint
- inbound regression 测试覆盖：
  - automation delivery 写入某 endpoint 后，用户下一条 Telegram 回复仍会被路由到同一个 `replySessionId`
- integration 测试覆盖：
  - `scheduler -> runner -> delivery -> replySession append -> broadcast`

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/channels/telegram/inbound-reply-service.test.ts`

Expected: canonical endpoint binding / delivery broadcast 尚未实现。

**Step 3: 实现 canonical binding 与 delivery**

- `endpoints.ts`
  - 主进程接收 `chatId/threadId`，统一解析 canonical `peerKey/threadKey`
  - 基于现有 `conversation-service` 建立或复用 `replySessionId`
  - bind 时向目标发送测试消息；发送成功才标记 `verifiedAt`
- `delivery.ts`
  - 只实现 Telegram adapter
  - 从 endpoint target 提取 `(chatId, threadId)` 构造 `OutboundEnvelope`
  - 发送完成后写入 `replySessionId` transcript
  - 写入后触发现有 chat broadcast
  - 写入前先验证 `replySessionId` 是否仍有效，失效则自愈更新 endpoint
- `chat-session-store/handle.ts`
  - 增加 automation delivery 专用 append helper
- `chat/broadcast.ts`
  - 复用现有 session/message event 机制，不再造第二套通知渠道
- `main/index.ts`
  - 在 `initTelegramChannelForAppStartup(telegramChannelService)` 成功后调用 `automationService.init()`
  - 在应用退出链路调用 `automationService.shutdown()`

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/channels/telegram/inbound-reply-service.test.ts`

Expected: Telegram endpoint、reply session 与 delivery broadcast 测试通过。

### Task 6: 接入 shared IPC、main handlers 与 preload bridge

**Files:**

- Create: `apps/moryflow/pc/src/shared/ipc/automations.ts`
- Create: `apps/moryflow/pc/src/main/app/automations-ipc-handlers.ts`
- Create: `apps/moryflow/pc/src/main/app/automations-ipc-handlers.test.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/index.ts`
- Modify: `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- Modify: `apps/moryflow/pc/src/preload/index.ts`
- Modify: `apps/moryflow/pc/src/main/app/ipc-handlers.ts`

**Step 1: 写失败测试**

- IPC handler 测试覆盖：
  - `listAutomations`
  - `getAutomation`
  - `createAutomation`
  - `updateAutomation`
  - `deleteAutomation`
  - `toggleAutomation`
  - `runAutomationNow`
  - `listRuns`
  - `listEndpoints`
  - `bindEndpoint`
  - `updateEndpoint`
  - `deleteEndpoint`
  - `setDefaultEndpoint`
- 断言 shared IPC DTO 由 `@moryflow/automations-core` schema / infer 派生，而不是手写重复 interface。

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/automations-ipc-handlers.test.ts`

Expected: automation IPC handlers / bridge 尚未实现。

**Step 3: 实现 IPC**

- `shared/ipc/automations.ts`
  - 只承载 DTO schema re-export、input/output schema 和主进程调用签名
- `automations-ipc-handlers.ts`
  - 做 payload 校验与 service 调用编排
- `desktop-api.ts` / preload
  - 暴露 `desktopAPI.automations.*`
  - 统一使用中性命名，不暴露 `bindTelegramEndpoint`

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/main/app/automations-ipc-handlers.test.ts`

Expected: IPC 测试通过。

### Task 7: 实现 Automations 页的数据层、endpoint 管理和顶层模块 UI

**Files:**

- Create: `apps/moryflow/pc/src/renderer/lib/desktop/automations-api.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/store/use-automations-store.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/store/automations-methods.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/forms/automation-form-schema.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/forms/endpoint-form-schema.ts`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/index.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/automation-editor.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/endpoint-manager.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/run-history.tsx`
- Create: `apps/moryflow/pc/src/renderer/workspace/components/automations/index.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content-model.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content-model.test.ts`
- Modify: `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.test.tsx`

**Step 1: 写失败测试**

- 页面 / store 测试覆盖：
  - 顶层模块顺序变为 `Remote Agents -> Automations -> Memory -> Skills -> Sites`
  - `ModuleDestination` / main view state / keep-alive 都支持 `automations`
  - `Automations` 页面通过 store + methods + functional API client 驱动
  - create/edit form 使用 `react-hook-form + zod`
  - endpoint 管理支持 list / bind / relabel / delete / set default
  - endpoint 仅在 verified 后可被选择为 push target
  - 页面展示 list / run history / run now / endpoint health

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/workspace-shell-main-content-model.test.ts src/renderer/workspace/components/workspace-shell-main-content.test.tsx src/renderer/workspace/components/automations/index.test.tsx`

Expected: 顶层模块、data layer 和 endpoint 管理 UI 尚未接入。

**Step 3: 实现 Renderer**

- `automations-api.ts`
  - 封装所有 `desktopAPI.automations.*` 调用
- `use-automations-store.ts` + `automations-methods.ts`
  - 实现 Zustand Store + Methods
- `automation-form-schema.ts` / `endpoint-form-schema.ts`
  - 定义 create/edit/bind 表单 schema
- `index.tsx` / `automation-editor.tsx` / `endpoint-manager.tsx` / `run-history.tsx`
  - 实现列表、详情、run history、run now、endpoint 管理
- 导航层接入 `Automations` 顶层模块

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/workspace-shell-main-content-model.test.ts src/renderer/workspace/components/workspace-shell-main-content.test.tsx src/renderer/workspace/components/automations/index.test.tsx`

Expected: Automations 模块测试通过。

### Task 8: 接入对话内 `Automate` 创建入口

**Files:**

- Modify: `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-pane-header.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-pane-header.test.tsx`
- Modify: `apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx`

**Step 1: 写失败测试**

- 头部测试覆盖：
  - 显示 `Automate` 单一主入口
  - 点击后打开与 `Automations` 页共用的 editor
  - 默认预填最近一条用户消息到 `payload.message`
  - 若只有一个已验证 endpoint，则默认预选

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/chat-pane-header.test.tsx`

Expected: `Automate` 入口和创建器预填逻辑缺失。

**Step 3: 实现对话入口**

- 在 chat header 增加单一入口
- 与 `Automations` 页复用同一 editor 和表单 schema
- 对话创建时：
  - `source.kind = 'conversation-session'`
  - `payload.message` 默认取最近一条用户消息
  - endpoint 不做自动猜测，只从已有 endpoint 列表中选；若只有一个已验证 endpoint，则自动预选

**Step 4: 跑测试确认通过**

Run: `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/components/chat-pane-header.test.tsx`

Expected: 对话入口测试通过。

### Task 9: 串联最终验证

**Files:**

- Review: 本计划涉及的全部新增与修改文件

**Step 1: 运行包级与目标测试**

Run:

- `pnpm --filter @moryflow/automations-core test:unit`
- `pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/run-log.test.ts src/main/automations/policy.test.ts src/main/automations/endpoints.test.ts src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/automations/service.test.ts src/main/app/automations-ipc-handlers.test.ts src/main/channels/telegram/inbound-reply-service.test.ts src/main/agent-runtime/permission-runtime.test.ts src/renderer/workspace/components/workspace-shell-main-content-model.test.ts src/renderer/workspace/components/workspace-shell-main-content.test.tsx src/renderer/workspace/components/automations/index.test.tsx src/renderer/components/chat-pane/components/chat-pane-header.test.tsx`

**Step 2: 运行类型检查**

Run: `pnpm --filter @moryflow/pc typecheck`

**Step 3: 人工检查冻结语义**

- 检查以下行为是否和冻结设计一致：
  - `Automations` 模块与对话入口都可创建
  - `Automations` 创建走独立 `automation-context`，不进入 chat 线程列表
  - automation run 使用 per-job policy override，不走 `full_access`
  - endpoint 持久化了 canonical `peerKey/threadKey`
  - Telegram 推送写入稳定 `replySessionId`
  - 用户后续回复不按单次 automation run 新建会话
  - endpoint 管理闭环完整
  - schedule 仍只有 `at / every`

**Step 4: 如环境阻塞则记录真实状态**

- 若 `better-sqlite3`、Electron rebuild 或包构建导致本地测试阻塞，记录具体命令、错误输出和阻塞点，不得宣称通过。

### Current Verification Baseline

- `CI=1 pnpm --filter @moryflow/pc exec vitest run src/main/automations/store.test.ts src/main/automations/context-store.test.ts src/main/automations/run-log.test.ts src/main/automations/policy.test.ts src/main/automations/endpoints.test.ts src/main/automations/scheduler.test.ts src/main/automations/runner.test.ts src/main/automations/delivery.test.ts src/main/automations/integration.test.ts src/main/automations/service.test.ts src/main/app/automations-ipc-handlers.test.ts src/renderer/workspace/components/automations/index.test.tsx src/renderer/components/chat-pane/components/chat-pane-header.test.tsx`
  - Result: `13` files, `44` tests passed
- `CI=1 pnpm --filter @moryflow/pc typecheck`
  - Result: passed
