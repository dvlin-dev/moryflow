# Moryflow 对话自动化与 Telegram 定时推送设计文档

**目标：** 基于 Openclaw 的现有实现，给 Moryflow 设计一套可落地的自动化架构，让“对话开启定时任务”和“定时向已绑定 Telegram 推送结果”成为同一个能力体系，并为未来多渠道接入预留稳定底座。

**稳定事实回写目标：** `docs/design/moryflow/core/pc-navigation-and-workspace-shell.md`、`docs/design/moryflow/core/pc-permission-architecture.md`、`docs/reference/testing-and-validation.md`

**结论先行：**

1. Openclaw 的核心价值不在“Cron 语法”本身，而在于它把自动化做成了独立 domain：`job spec + scheduler + runner + delivery + management UI`。
2. Moryflow 现有 Telegram 集成已经具备不错的渠道底座，但还没有自动化 domain，也没有“可复用的推送目标抽象”。
3. 对你们来说，正确落点不是照搬 Openclaw 的 `Cron Jobs` agent admin panel，而是：
   - 对话内提供“开启自动化”入口
   - 在 PC Workspace 顶层模块新增 `Automations`
   - 导航顺序调整为 `Remote Agents -> Automations -> Memory -> Skills -> Sites`
   - 主进程建立独立 `automation service`
   - 自动化只在 PC 本地调度与执行，不做跨端共享调度
   - 底层把“调度执行”和“通知投递”做成可扩展到多渠道的边界

---

## 1. 本次分析范围

- Openclaw 本地拉取路径：`/Users/lin/.codex/worktrees/d000/_external/openclaw`
- Moryflow 当前分析范围：
  - `packages/channels-core`
  - `packages/channels-telegram`
  - `apps/moryflow/pc/src/main/channels/telegram`
  - `apps/moryflow/pc/src/shared/ipc`
  - `apps/moryflow/pc/src/preload`
  - `apps/moryflow/pc/src/renderer/workspace`

---

## 2. Openclaw 是怎么做定时任务的

## 2.1 对话里开启定时任务，不是 UI 特判，而是一个工具

Openclaw 把“创建/修改定时任务”暴露成 agent tool：

- `src/agents/tools/cron-tool.ts`

这个文件有三个非常关键的设计：

1. tool 直接支持 `status/list/add/update/remove/run/runs/wake`
2. `cron.add` 时会自动补齐当前会话上下文
3. 如果当前会话本身来自某个消息渠道，它会尝试从 `sessionKey` 推断默认 delivery 目标

其中最值得参考的是两个函数：

- `buildReminderContextLines(...)`
- `inferDeliveryFromSessionKey(...)`

这意味着 Openclaw 的“对话里开启定时任务”不是前端单独拼一个调度请求，而是让 agent 在当前会话上下文里直接调用 `cron` 工具，把“当前线程”和“默认投递目标”一起写进 job。

这正是你们要的能力形态。

## 2.2 调度不是挂在渠道代码里，而是独立 `cron` 域

Openclaw 的自动化核心集中在：

- `src/cron/types.ts`
- `src/cron/store.ts`
- `src/cron/service.ts`
- `src/cron/service/jobs.ts`
- `src/cron/service/ops.ts`
- `src/cron/service/timer.ts`
- `src/cron/delivery.ts`
- `src/cron/isolated-agent/delivery-target.ts`
- `src/cron/run-log.ts`

它的 job 模型包含：

- schedule
  - `at`
  - `every`
  - `cron`
- payload
  - `systemEvent`
  - `agentTurn`
- delivery
  - `none`
  - `announce`
  - `webhook`
- state
  - `nextRunAtMs`
  - `runningAtMs`
  - `lastRunAtMs`
  - `lastDurationMs`
  - `lastRunStatus`
  - `lastDeliveryStatus`
  - `lastError`
  - `lastDeliveryError`
  - `consecutiveErrors`

也就是说，Openclaw 不是“定时器触发一段回调”，而是持久化一个完整的 automation contract。

## 2.3 持久化是本地文件 store，不依赖外部队列

Openclaw 的 job store 在：

- `src/cron/store.ts`

默认落到：

- `~/.openclaw/cron/jobs.json`

特征是：

1. 本地 JSON 文件持久化
2. 原子写入、带 backup
3. 服务启动后重新装载 job
4. 定时器按“最近一次 next run”重新 arm

这点非常适合 Moryflow PC。

你们当前需求明显是桌面侧的对话自动化和 Telegram 推送，不应该先绕远路引入 BullMQ/Redis。  
首期正确方案应该像 Openclaw 一样，在 Electron main process 内做本地持久化调度服务。

## 2.4 推送链路是独立 delivery 规划，而不是直接写 Telegram API

Openclaw 把 delivery plan 与 failure notification 相关逻辑放在：

- `src/cron/delivery.ts`

把“目标解析”放在：

- `src/cron/isolated-agent/delivery-target.ts`

把“实际投递分发”放在：

- `src/cron/isolated-agent/delivery-dispatch.ts`

这里的关键不是支持了多少渠道，而是结构：

1. job 上只描述 `delivery`
2. `delivery.ts` 先解析 delivery plan 与 failure destination
3. `delivery-target.ts` 再根据 `channel / to / accountId / last session` 解析出最终目标
4. `delivery-dispatch.ts` 最后走统一 outbound send

这就是你们未来多渠道必须先建立的边界。

## 2.5 管理界面是完整的 job workbench

Openclaw 的 UI 不是只有一个“开关”，而是多入口管理。

状态与控制器：

- `ui/src/ui/app-view-state.ts`
- `ui/src/ui/controllers/cron.ts`

界面入口与视图：

- `ui/src/ui/views/agents.ts`
- `ui/src/ui/views/cron.ts`
- `apps/macos/Sources/OpenClaw/SettingsRootView.swift`
- `apps/macos/Sources/OpenClaw/CronJobsStore.swift`

它提供了：

1. job 列表
2. 创建/编辑表单
3. next run / last run / status
4. enable/disable
5. run now / run if due
6. 历史 run log
7. delivery 与 failure alert 配置

这里可借鉴的是“自动化有自己的管理面板和运行历史”，不是具体 UI 布局，更不是它放在哪个入口。

---

## 3. Openclaw 哪些值得借鉴，哪些不该照搬

## 3.1 值得直接借鉴的部分

1. 把自动化做成独立 domain，而不是塞在 Telegram 代码里
2. 对话内创建自动化，自动继承当前会话上下文
3. 调度、执行、投递、管理 UI 四层拆开
4. 运行结果和 delivery 结果分开建模
5. 本地持久化 + 启动恢复 + next-run 重算

## 3.2 不应该照搬的部分

1. 它现有的入口布局
2. 以 cron 为中心的产品命名
3. 过强的 CLI / Gateway 视角

对 Moryflow 用户来说，用户心智不应该是“Cron Job”，而应该是：

- 自动化
- 定时执行
- 定时把结果发到 Telegram

因此你们的产品层入口应该是：

1. 对话动作里的 `Automate`
2. 顶层模块 `Automations`

而不是新造一个“运维式 Cron 管理台”。

---

## 4. Moryflow 当前现状

## 4.1 已有的好基础

### 4.1.1 Telegram 已经不是散装接入

当前仓库已经有：

- `packages/channels-core/src/types.ts`
- `packages/channels-core/src/ports.ts`
- `packages/channels-telegram/src/telegram-runtime.ts`
- `apps/moryflow/pc/src/main/channels/telegram/service.ts`
- `apps/moryflow/pc/src/main/channels/telegram/persistence-store.ts`

说明你们已经具备：

1. 渠道 envelope 抽象
2. Telegram runtime
3. pairing / allowlist / conversation binding
4. Telegram 主进程服务装配

这比“直接 bot token 发消息”高一个层级，后面可以继续扩。

### 4.1.2 Renderer 端已有稳定的模块导航与 IPC 模式

导航与主区域分发在：

- `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content-model.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`

Skills 页面在：

- `apps/moryflow/pc/src/renderer/workspace/components/skills/index.tsx`
- `apps/moryflow/pc/src/renderer/hooks/use-agent-skills.ts`

IPC 模式在：

- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/main/app/memory-ipc-handlers.ts`
- `apps/moryflow/pc/src/main/app/cloud-sync-ipc-handlers.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`

所以从工程上看，加一个新的顶层模块 `Automations` 也是顺手的：

1. 导航单一事实源已经存在
2. 主内容分发已经被收敛到 `layout-resolver + main-content-model + main-content`
3. IPC 桥接模式已经稳定，且主进程开始采用“按领域拆分 handler helper，再在 `ipc-handlers.ts` 注册”的组织方式

需要注意的是，当前默认模块顺序是 `Remote Agents -> Memory -> Skills -> Sites`，如果按本方案落地，应明确改成：

- `Remote Agents -> Automations -> Memory -> Skills -> Sites`

## 4.2 当前缺口

### 4.2.1 没有自动化 domain

当前没有看到：

- automation job type
- automation store
- scheduler
- run history
- automation IPC
- automation UI

这意味着“对话开启定时任务”现在还无处落盘，也没有可管理生命周期。

### 4.2.2 当前 chat session 摘要里没有来源渠道元数据

当前 `ChatSessionSummary` 并不包含：

- `originChannel`
- `originAccountId`
- `originPeerKey`
- `originThreadKey`

这意味着文档里“如果当前对话来自 Telegram，就默认当前 peer 作为 delivery target”这件事，现状不能直接在 Renderer 实现。

如果以后要支持这个能力，必须先补其中一种：

1. 会话摘要里持久化来源元数据
2. 独立 `desktopAPI.automations.resolveSuggestedDeliveryTarget(sessionId)` IPC

但在这层补齐前，首期 implementation baseline 不应依赖它。  
Phase 1 更稳的做法是：

1. Renderer 只传 `sessionId`
2. 用户从已绑定 endpoint 列表中显式选择推送目标
3. “按当前会话推导建议目标”留到后续增强

### 4.2.3 当前渠道目标抽象仍然偏 Telegram-specific

`packages/channels-core/src/types.ts` 里当前是：

- `ChannelKind = 'telegram'`
- `OutboundTarget = { chatId: string; threadId?: string }`

这个形状对 Telegram 没问题，但它还不是未来多渠道的稳定底座。

这会直接影响：

1. 自动化推送目标如何抽象
2. 以后接 Discord / Slack / Email / Webhook 时是否要重写一层

### 4.2.4 当前 Telegram 设置页是“渠道配置页”，不是“通知终端管理页”

现有 Telegram UI 在：

- `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-section.tsx`
- `apps/moryflow/pc/src/renderer/workspace/components/remote-agents/telegram-dm-access.tsx`

它解决的是：

- bot token
- proxy
- pairing
- allowlist

但没有解决：

- 哪些 Telegram chat 可作为 automation push endpoint
- 用户绑定了哪个 Telegram 目标
- 自动化默认往哪里发

这部分需要补一层“通知目标”模型。

---

## 5. Moryflow 冻结实现方案

## 5.1 总体设计

Moryflow 应新增一个独立 automation domain，结构上分五层：

1. **Conversation Action Layer**
   - 从当前对话创建 automation
2. **Automation Domain Layer**
   - job spec / schedule / delivery / run state / endpoint binding
3. **Scheduler Layer**
   - 本地持久化、next-run 计算、启动恢复、timer arm
4. **Runner + Delivery Layer**
   - 执行对话任务、生成结果、分发到 Telegram/未来渠道
5. **Management UI Layer**
   - 顶层模块 `Automations`

## 5.2 产品入口

### 5.2.1 对话内入口

每个会话需要增加一个显式动作：

- `Automate`

作用：

1. 从当前 conversation 预填 automation 表单
2. 默认继承当前 `sessionId` 与当前会话标题
3. 用户明确确认要执行的 prompt、schedule 与 push target 后才可保存

首期固定行为：

1. source conversation 固定为当前 `sessionId`
2. `payload.message` 默认预填当前对话最近一条用户消息，用户可编辑后保存
3. push target 从已绑定 endpoint 列表中显式选择
4. 如果用户只有一个已验证 endpoint，UI 可以预选它；否则必须手选

### 5.2.2 顶层模块入口

按你最新要求，`Automations` 不放在 `Skills` 里面，而是作为与 `Skills` 同级的顶层模块。

顺序固定为：

1. `Remote Agents`
2. `Automations`
3. `Memory`
4. `Skills`
5. `Sites`

理由：

1. 自动化是长期运行系统，不只是 skill 管理的附属能力
2. 它需要独立的列表、运行状态、日志与 endpoint 管理面板
3. 顶层模块更符合“持续资产”心智，而不是“装配项”心智

### 5.2.3 两个入口是同一个创建器，不是两套能力

本方案固定为：

1. 对话页可以创建 automation
2. `Automations` 顶层模块页也可以创建 automation
3. 两个入口复用同一套创建表单与领域合同
4. 差别只在默认值来源：
   - 对话入口：自动带入当前 `sessionId`、当前标题、最近一条用户消息
   - `Automations` 入口：创建空白 automation，并由主进程分配一个独立的 automation context record

## 5.3 领域模型

本方案只新增 `packages/automations-core`，先冻结跨层合同，不再同时引入第二个 `notification-core`。

原因：

1. 当前仓库已经有 `packages/channels-core`
2. 如果同时新增 `automations-core + notification-core`，会形成三套边界重叠
3. 首期最佳实践是只新增一个 automation domain 包，把 endpoint/delivery contract 一并放进去

### 5.3.1 `AutomationJob`

字段固定为：

- `id`
- `name`
- `enabled`
- `source`
- `schedule`
- `payload`
- `delivery`
- `state`
- `createdAt`
- `updatedAt`

### 5.3.1.1 `AutomationJob.state`

至少包含：

- `nextRunAt?: number`
- `runningAt?: number`
- `lastRunAt?: number`
- `lastRunStatus?: 'ok' | 'error' | 'skipped'`
- `lastError?: string`
- `lastDurationMs?: number`
- `consecutiveErrors?: number`
- `lastDeliveryStatus?: 'delivered' | 'not-delivered' | 'unknown' | 'not-requested'`
- `lastDeliveryError?: string`

其中：

1. `runningAt` 用于防止同一个 job 重入执行
2. `lastDurationMs` 用于调试与超时判断
3. delivery 状态要与运行状态分开记录

### 5.3.2 `AutomationSource`

`AutomationSource` 不再复用“隐藏 chat session”这种做法，而是冻结为一个显式 union：

- `kind: 'conversation-session' | 'automation-context'`
- `origin: 'conversation-entry' | 'automations-module'`
- `vaultPath`
- `displayTitle`

分支字段：

1. `conversation-session`
   - `sessionId`
2. `automation-context`
   - `contextId`

这里不要把“执行来源”和“推送目的地”混在一起。

首期约束：

1. 如果从对话创建，source 固定为 `conversation-session`
2. 如果从 `Automations` 模块创建，source 固定为 `automation-context`
3. `automation-context` 是自动化域内独立持久化对象，不写入 chat session store，不出现在用户线程列表，也不参与现有聊天搜索索引
4. 来源渠道元数据允许为空
5. 如果来源渠道元数据为空，不能假设可自动推导 Telegram peer

### 5.3.2.1 `AutomationContextRecord`

为避免污染当前聊天线程体系，`Automations` 页创建的后台执行上下文固定落到独立记录：

- `id`
- `vaultPath`
- `title`
- `history`
- `createdAt`
- `updatedAt`

固定规则：

1. `AutomationContextRecord` 只服务于 automation runner
2. 它不是 `ChatSessionSummary`
3. 它不能被 `chat:sessions:list` 返回
4. 它也不能通过“隐藏字段”硬塞进现有 chat session store
5. runner 每次执行完成后，必须把本次 `(payload.message, assistantOutput)` 以 turn 形式追加回 source 对应的 history
6. `automation-context` 必须导出与 SDK `Session` 兼容的 adapter，供 runtime 直接消费

这条边界是本方案的最佳实践要求，不接受“先复用 chat session，后面再清理”。

### 5.3.3 `AutomationSchedule`

首期固定支持：

- `at`
- `every`

原因：

1. 用户要的是“定时自动化”，不是通用 cron 平台
2. 你们未来可以在底层保留扩展位，但 UI 首期不必暴露 cron expression
3. 这样更符合产品定位，也更少误操作
4. `weekly` 不应成为独立 domain kind

说明：

1. UI 上的“每周”只是 `every` 的快捷选项
2. 例如“每周一次”可映射为 `every = 7d`
3. `at` 类型 job 执行完成后，自动设置 `enabled = false`，保留 job 记录与 run log，不自动删除

如果底层要兼容复杂表达式，可以内部保留：

- `kind: 'cron'`

但首期 UI 不推荐暴露。

### 5.3.4 `AutomationDelivery`

固定建模为多渠道合同：

- `mode: 'none' | 'push'`
- `endpointId`
- `failureEndpointId?`
- `bestEffort?`

而不是把 Telegram 细节直接写在 job 上。

### 5.3.5 `NotificationEndpoint`

这是最关键的未来边界。

固定字段：

- `id`
- `channel`
- `accountId`
- `label`
- `target`
- `verifiedAt`
- `lastUsedAt`
- `replySessionId`

其中 `target` 用 discriminated union：

- Telegram:
  - `kind: 'telegram'`
  - `chatId`
  - `threadId?`
  - `peerKey`
  - `threadKey`
  - `username?`
  - `title?`

未来新增 Discord / Slack 时，只扩展 union，不改 automation job 本身。

`replySessionId` 的固定语义是：

1. 它表示这个 endpoint 在 Moryflow 内绑定的稳定回复会话
2. Telegram 用户后续回复消息时，总是路由回这条会话
3. 不按某次 automation run 临时创建新会话
4. 如果多个 automations 绑定同一个 endpoint，它们共享这条回复会话

`peerKey/threadKey` 的固定语义是：

1. 它们是当前 Telegram thread 的 canonical 标识
2. endpoint 持久化必须复用现有 Telegram inbound routing 所使用的同一套 thread resolution
3. `replySessionId` 只能通过现有 `conversation-service` 基于这组 canonical thread keys 创建或复用
4. 不允许在 automation 域里再造第二套 `chatId/threadId -> conversation` 映射
5. delivery 前必须做 reply session health check；若 `replySessionId` 已失效，必须基于同一 canonical thread keys 自愈并回写 endpoint

### 5.3.5.1 `bindEndpoint` 输入合同

为了不破坏多渠道抽象，IPC 与主进程服务不应暴露 `bindTelegramEndpoint` 这类特化命名。

统一为：

- `bindEndpoint(input)`

其中 `input.target` 用 discriminated union：

- Telegram:
  - `channel: 'telegram'`
  - `accountId`
  - `chatId`
  - `threadId?`
  - `label?`

主进程在持久化前必须补齐并校验：

- `peerKey`
- `threadKey`
- `replySessionId`

也就是说，Renderer 只负责选择目标；真正的 canonical thread binding 一律由 main process 统一解析。

### 5.3.6 `AutomationExecutionPolicy`

这是自动化能否安全上线的关键合同，不能直接复用普通 chat 的交互式权限模型。

固定字段：

- `approvalMode: 'unattended'`
- `toolPolicy`
- `networkPolicy`
- `fileSystemPolicy`
- `requiresExplicitConfirmation`

原则：

1. 自动化任务不能依赖运行时弹审批框
2. 创建时必须一次性确认其后台执行能力
3. 默认应限制危险能力，只在用户明确同意后提升
4. 不允许直接沿用 chat 的 `full_access` 交互式路径

冻结实现要求：

1. `runAutomationTurn` 必须支持 `runtimeConfigOverride`
2. override 必须映射到 runtime 现有的 `permission.rules` 与 `permission.toolPolicy`
3. automation run 固定使用非交互审批策略：
   - 未被 policy 明确允许的能力，直接 deny
   - 不能弹 UI 审批框等待用户
4. 因此 automation run 的执行语义固定为：
   - `mode: 'ask'`
   - `approvalMode: 'deny_on_ask'`
   - `runtimeConfigOverride.permission = AutomationExecutionPolicy -> runtime permission config`
5. 如果某个 `AutomationExecutionPolicy` 无法映射成 runtime 可执行限制，创建阶段就必须阻止保存，而不是先保存、运行时再兜底
6. `deny_on_ask` 的实现位置固定为 permission pipeline 的最终收口阶段：
   - 先做原有 enforced decision / tool policy / external path / rules / full access override
   - 再执行 `applyDenyOnAsk(finalDecision, approvalMode)`

这条要求意味着：本次交付必须补 runtime per-run policy override，不再把它延期到后续阶段。

### 5.3.7 `AutomationPayload`

这是 runner 能否落地的核心合同。首期必须冻结，不允许只留字段名。

首期只支持一种 payload：

- `kind: 'agent-turn'`

字段：

- `message: string`
- `modelId?: string`
- `thinking?: AgentThinkingSelection`
- `contextDepth?: number`
- `contextSummary?: string`

含义：

1. `message` 是执行时真正传给 agent 的 prompt
2. `modelId` / `thinking` 是本次自动化运行的可选覆盖
3. `contextDepth` 固定默认值为 `6`，单位是最近 `6` 个对话 turn，而不是底层原始 `AgentInputItem` 条数
4. `contextSummary` 是主进程在创建 automation 时固化的可选说明文本

首期明确不支持：

1. “重放整段 conversation”
2. “把最后一条用户消息自动当作 payload，且完全不经用户确认”
3. `system-event` 这类主会话注入模式

## 5.4 渠道底层如何改，才能支持未来多渠道

当前最大的底层问题是 `channels-core` 的 target 形状过于 Telegram 化。

### 5.4.1 不推荐的做法

不推荐继续把 automation delivery 直接绑死到：

- `channel='telegram'`
- `target.chatId`

这样未来接第二个渠道时，一定会返工 automation core。

### 5.4.2 冻结做法

首期不要新建第二个基础包。  
冻结边界是：

1. `packages/automations-core`
   - job
   - schedule
   - endpoint
   - execution policy
   - run state
2. `packages/channels-core`
   - 继续承载渠道 envelope / outbound 协议
3. `packages/channels-telegram`
   - 继续承载 Telegram runtime adapter
4. `AutomationEndpoint.target`
   - 固定复用 `channels-core` 的 canonical thread resolution

落地方式：

1. `automations-core` 定义 `AutomationEndpoint`
2. 主进程 `automations/delivery.ts` 把 endpoint 映射为渠道发送请求
3. 首期只接 Telegram adapter
4. 第二渠道真正进入时，再决定是否要把 endpoint/delivery contract 抽成独立包
5. shared IPC DTO 必须由 `automations-core` schema / infer 派生，不允许在 main / renderer 各自重复定义 domain interface

这比同时引入 `notification-core` 更稳，也更符合当前仓库的演进成本。

## 5.5 主进程服务设计

新增：

- `apps/moryflow/pc/src/main/automations/context-store.ts`
- `apps/moryflow/pc/src/main/automations/store.ts`
- `apps/moryflow/pc/src/main/automations/scheduler.ts`
- `apps/moryflow/pc/src/main/automations/run-log.ts`
- `apps/moryflow/pc/src/main/automations/runner.ts`
- `apps/moryflow/pc/src/main/automations/delivery.ts`
- `apps/moryflow/pc/src/main/automations/endpoints.ts`
- `apps/moryflow/pc/src/main/automations/service.ts`

主进程装配点固定为：

1. 在 `apps/moryflow/pc/src/main/index.ts` 中初始化
2. `automationService.init()` 必须在 `initTelegramChannelForAppStartup(telegramChannelService)` 成功之后执行
3. `automationService.shutdown()` 必须在应用退出链路中显式调用

职责拆分：

### `store.ts`

- 持久化 job 定义
- 持久化 endpoint
- 持久化 run state
- 不承载后台执行 history

首期固定为：

1. job / endpoint / 轻量状态：`electron-store`
2. run log：单独文件持久化，使用 `jsonl` 或按 job 分文件存储

### `context-store.ts`

- 持久化 `AutomationContextRecord`
- 为 `Automations` 页创建的 job 提供独立后台上下文
- 提供最近 N 条历史读取与写入接口
- 提供 `Session` adapter

固定要求：

1. 不复用 `chat-session-store`
2. 不广播到 chat 线程列表
3. 不参与现有搜索索引
4. 必须支持把 `AutomationContextRecord.history` 适配成 SDK `Session`

原因：

1. run log 是 append-heavy 数据
2. 不适合和 job 定义混在同一个 `electron-store` 文档里
3. 这也更接近 Openclaw 的设计

### `scheduler.ts`

- 启动时加载 job
- 计算 `nextRunAt`
- 只 arm 最近一个 timer
- job 变更后重算
- 应用重启后恢复
- 对过期 job 做 catch-up 或 skip 判定
- 处理应用 suspend / resume 后的 missed jobs
- 在同一 job 正在运行时拒绝重入

额外约束：

1. `runningAt` 存在且未超时的 job，不允许再次触发
2. 如果系统休眠、合盖或应用被挂起，timer 恢复后要做一次 catch-up 扫描
3. 需要显式监听 Electron 生命周期事件，例如 `powerMonitor` 的 `suspend/resume`
4. `powerMonitor` listener 固定由 `scheduler.init()` 注册，在 `scheduler.shutdown()` 时移除

### `runner.ts`

- 读取 `AutomationPayload`
- 根据 `AutomationSource.sessionId` 读取来源会话的有限上下文
- 组装本次自动化运行输入
- 执行 isolated automation turn
- 消费运行结果，提取最终可投递文本

首期执行模型固定为：

1. **只支持 isolated 模式**
   - 每次自动化执行都创建独立运行上下文
   - 不直接把内容注入用户正在使用的交互式 chat session
2. **不重放整段会话**
   - 只执行 `payload.message`
   - 固定附带来源会话最近 `6` 个 turn 作为上下文
3. **对外提供 `runAutomationTurn` wrapper**
   - 它是 automation runner 的稳定边界
   - 内部是否复用现有 runtime 能力，是实现细节
4. **结果消费以最终文本为准**
   - runner 可以内部消费 stream
   - 但对 scheduler / delivery 暴露的是最终可投递文本与状态

冻结要求：

1. `runAutomationTurn` 必须真的把 `AutomationExecutionPolicy` 映射成 per-run runtime override
2. automation run 不允许走 `full_access`
3. 如果 runtime 侧缺少 `runtimeConfigOverride + deny_on_ask`，本次交付必须先把这层补齐
4. 任何不能被 policy 映射和执行的 automation，都不能进入 enabled 状态
5. source 缺失时必须显式降级，而不是崩溃：
   - `conversation-session` 对应 session 已被删除时，runner 退化为“仅执行 payload.message，无上下文”
   - 本次 run record 必须记录 `warning: source_missing`
   - `AutomationJob.state` 必须记录最近一次 warning，供 UI 显示修复提示
6. runner 执行完成后，必须先把本次 `(payload.message, assistantOutput)` 追加回 source history，再进入 delivery

### `delivery.ts`

- 根据 `endpointId` 解析目标
- 分发到 Telegram adapter
- 记录 delivery success/failure
- 把最终已投递文本写入 endpoint 对应的 `replySessionId` transcript
- 追加 transcript 后必须触发现有 chat broadcast，保证 Renderer 和搜索索引都同步

Telegram 映射规则固定为：

1. `channel = 'telegram'`
2. `accountId = endpoint.accountId`
3. `OutboundEnvelope.target.chatId = endpoint.target.chatId`
4. `OutboundEnvelope.target.threadId = endpoint.target.threadId`

### `endpoints.ts`

- 管理绑定的通知终端
- 提供 endpoint 列表给 UI 选择
- 管理 endpoint 验证、默认值与显式绑定流程
- 为 endpoint 建立稳定的 `replySessionId`

说明：

1. Phase 1 只要求“显式绑定/显式选择 endpoint”
2. endpoint 首次绑定成功时，就应确保存在稳定的 `replySessionId`
3. endpoint 持久化必须同时写入 canonical `peerKey/threadKey`
4. “从当前 Telegram conversation 自动推导并绑定 endpoint”留到后续增强
5. verification 流程固定为：
   - `bindEndpoint` 成功解析 canonical target 后，主进程立即向该目标发送一条测试消息
   - 测试消息发送成功时写入 `verifiedAt`
   - 发送失败则 endpoint 保持未验证，不允许被 automation 引用
6. default endpoint 只能在已验证 endpoint 中设置

## 5.6 IPC 设计

在 `desktop-api` 新增：

- `desktopAPI.automations.list()`
- `desktopAPI.automations.get(input)`
- `desktopAPI.automations.create(input)`
- `desktopAPI.automations.update(input)`
- `desktopAPI.automations.remove(input)`
- `desktopAPI.automations.toggle(input)`
- `desktopAPI.automations.runNow(input)`
- `desktopAPI.automations.listRuns(input)`
- `desktopAPI.automations.listEndpoints(input?)`
- `desktopAPI.automations.bindEndpoint(input)`
- `desktopAPI.automations.updateEndpoint(input)`
- `desktopAPI.automations.removeEndpoint(input)`
- `desktopAPI.automations.setDefaultEndpoint(input)`
- `desktopAPI.automations.onStatusChange(handler)`

Phase 1 不要求新增独立 `resolveSuggestedDeliveryTarget` IPC。  
如果以后确实要做“基于当前会话推导建议目标”，再由主进程补这层 helper。

对应新增：

- `apps/moryflow/pc/src/shared/ipc/automations.ts`
- `apps/moryflow/pc/src/preload/index.ts`
- `apps/moryflow/pc/src/main/app/automations-ipc-handlers.ts`
- `apps/moryflow/pc/src/main/app/ipc-handlers.ts`

主进程侧固定沿用当前最新模式：

1. 在 `automations-ipc-handlers.ts` 中实现 payload 校验与领域编排 helper
2. 在 `ipc-handlers.ts` 中只做注册与依赖装配

## 5.7 Renderer 设计

新增：

- `apps/moryflow/pc/src/renderer/lib/desktop/automations-api.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/automations/store/*`
- `apps/moryflow/pc/src/renderer/workspace/components/automations/*`

以及导航相关扩展点：

- `apps/moryflow/pc/src/renderer/workspace/navigation/state.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/modules-registry.ts`
- `apps/moryflow/pc/src/renderer/workspace/navigation/layout-resolver.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content-model.ts`
- `apps/moryflow/pc/src/renderer/workspace/components/workspace-shell-main-content.tsx`

需要显式补齐的类型/映射：

1. `ModuleDestination` 增加 `'automations'`
2. `MainViewState` 增加 `'automations'`
3. `MODULES_REGISTRY` 插入新项
4. `workspace-shell-main-content-model.ts` 的 keep-alive key map 增加 `'automations'`
5. `renderModuleMain()` 增加 `AutomationsPage`

说明：

1. 当前 keep-alive 机制有一部分来自 registry 派生，不是完全手工维护
2. 但类型联合和分发映射仍需要显式更新，不能在文档里只写“顺手加模块”

`Automations` 模块至少需要：

1. automation 列表
2. enable/disable
3. next run / last run / last delivery
4. create / edit / delete
5. run now
6. run history
7. endpoint picker
8. endpoint management

状态管理必须遵循当前仓库规范：

- Zustand Store + Methods + Functional API Client

冻结要求：

1. `Automations` 列表状态必须有独立 store
2. create / edit / endpoint bind 表单必须使用 `react-hook-form + zod`
3. desktop IPC 调用必须经由函数式 `automations-api` 封装
4. 不要把 automation form 拆成一堆局部 `useState`

## 5.8 “绑定 Telegram” 应该怎么建模

这里不要把“Telegram 是否已接入”和“某个 automation 发给谁”混为一谈。

应该拆成两层：

### 第一层：Telegram runtime 接入

已经基本存在：

- bot token
- proxy
- pairing
- runtime status

### 第二层：Notification endpoints

这是本次要补的：

- endpoint list
- endpoint verification
- default endpoint
- automation -> endpoint 绑定
- endpoint create / relabel / remove
- endpoint reply session health

这样未来：

1. 一个 bot account 可以对应多个 endpoint
2. 一个用户可以给不同自动化绑定不同目标
3. 换渠道时只换 endpoint，不改 automation runner

## 5.8.1 endpoint 管理必须是完整闭环

本次交付里，endpoint 不能只是“有个 picker”。

至少必须完成：

1. 列表
2. 绑定
3. 重命名
4. 删除
5. default endpoint 设定
6. 验证状态显示
7. reply session 绑定状态显示
8. endpoint health 自愈后状态刷新

---

## 6. 冻结交互方案

## 6.1 对话内创建自动化

在当前 conversation header 或 thread actions 增加：

- `Automate`

点击后弹出表单：

1. Name
2. Schedule
3. What to run
4. Push result to
5. Enable now

默认值来源：

1. Name：当前会话标题
2. What to run：默认预填当前对话最近一条用户消息，用户可编辑后确认
3. Push result to：
   - 首期直接展示已绑定 endpoint 列表
   - 如果只有一个已验证 endpoint，可以预选
   - 如果没有 endpoint，则先引导用户完成绑定

## 6.2 顶层模块 Automations

这里既是管理页，也是第二个创建入口。

页面结构固定为：

1. 顶部摘要
   - active jobs
   - next run
   - failed deliveries
2. 顶部主按钮 `New automation`
3. 列表区
4. 右侧详情/编辑抽屉，或 modal

列表每行显示：

1. job name
2. source conversation
3. schedule summary
4. endpoint label
5. next run
6. last run
7. status

从 `Automations` 页点击 `New automation` 后：

1. 打开与对话入口同一套创建表单
2. 不要求用户先选某条现有对话
3. 主进程在保存时自动创建一条系统管理的 source conversation
4. 主进程在保存时自动创建一条独立 `automation-context`
5. 这条 `automation-context` 只承担 automation 执行上下文，不进入用户 chat 线程列表
6. Name 默认值为 `New automation`
7. What to run 默认空白，等待用户输入

## 6.2.1 首期创建表单固定为 4 个核心字段

首期创建器无论从哪里进入，都只突出这 4 项：

1. Name
2. Schedule
3. What to run
4. Push result to

`Enable now` 作为辅助开关保留，但不再扩展高级字段到首屏。

## 6.2.2 `Run now` 是必需操作，不是可选增强

`Automations` 列表和详情里都保留 `Run now`。  
这是首期调试和建立用户信任的必要能力。

## 6.3 创建阶段的权限确认

创建自动化时必须显式展示：

1. 该任务会在 PC 本地后台运行
2. 它会使用哪些工具能力
3. 是否允许写文件 / 访问网络 / 执行命令
4. 是否会向 Telegram 推送结果

用户确认后，才生成该 job 的 `AutomationExecutionPolicy` 快照。

这里需要明确：

1. Phase 1 的确认首先是“用户知情确认”
2. 它记录该自动化被允许在后台以何种风险边界运行
3. Phase 1 已经要求在权限层真正执行 `deny_on_ask + runtimeConfigOverride`
4. Phase 1 不做的是进程级沙箱隔离、OS 级系统调用限制和独立容器执行

## 6.4 Telegram 推送与用户回复上下文

这部分在首期必须固定，不留实现层自由发挥。

固定规则：

1. automation 每次运行都使用自己的 source conversation 作为执行上下文
2. Telegram 推送只是把最终结果投递到某个 endpoint，对用户表现为一条普通 bot 消息
3. 不为每次 automation run 新建一个用户可见会话
4. 用户在 Telegram 里的后续回复，总是路由到该 endpoint 绑定的稳定 `replySessionId`
5. 因此“automation 执行上下文”和“Telegram 回复上下文”是两条不同但稳定的会话链路

具体含义：

1. 从对话创建的 automation：
   - source conversation = 当前对话
   - Telegram 回复 conversation = endpoint.replySessionId
2. 从 `Automations` 页创建的 automation：
   - source conversation = 独立 `automation-context`
   - Telegram 回复 conversation = endpoint.replySessionId
3. 如果多个 automations 绑定同一个 endpoint，它们共享同一条 Telegram 回复 conversation
4. 首期不按单次 run 创建临时 reply conversation，也不尝试把 reply 精确关联回某一次 run transcript

---

## 7. 冻结交付范围

这次交付必须一次性完成以下能力，缺一不可：

1. 对话可创建 automation
2. `Automations` 顶层模块也可创建 automation
3. `Automations` 页创建使用独立 `automation-context`，不污染 chat session 列表
4. automation 可按本地 schedule 运行
5. runtime 必须按 job 级 policy 真正限制后台执行能力
6. endpoint 管理必须是完整闭环，而不是只留 picker 入口
7. 结果可推送到 Telegram
8. Telegram 推送后的用户回复必须稳定路由到 `replySessionId`
9. 顶层模块 `Automations` 可完整管理 job、endpoint 与 run history

本次冻结范围固定为：

- endpoint 仅支持 Telegram
- schedule 仅支持 `at / every`
- payload 仅支持 `agent-turn`
- job / endpoint / 轻量状态使用本地 `electron-store`
- `automation-context` 使用自动化域独立 store
- run log 使用主进程本地文件
- 调度权威仅在当前 PC
- push target 由用户从 endpoint 列表显式选择
- 创建时必须落盘并可执行 `AutomationExecutionPolicy`
- runner 对外固定为 `runAutomationTurn`，且仅支持 isolated 模式
- endpoint 必须持久化 canonical `peerKey/threadKey` 与稳定 `replySessionId`
- Telegram 用户回复永远复用 endpoint.replySessionId，不按 run 新建会话

后续只允许做非阻塞增强：

1. delivery retry / backoff
2. failure notification
3. 自动建议 endpoint
4. 第二渠道 adapter
5. 如果出现第二个非 automation 消费者，再评估是否抽独立 notification 基础包

---

## 8. 关键判断

## 8.1 首期不要用 BullMQ

原因：

1. 当前需求落点在桌面端主进程
2. 已有 Telegram runtime 也在本地主进程
3. Openclaw 的本地调度模型更贴合你们当前形态
4. 引入 Redis/BullMQ 会让部署和离线可用性变复杂

## 8.1.1 调度权威固定在当前 PC

本方案明确不做：

1. 云端统一 scheduler
2. 多设备共享同一个 automation 的抢占/选主
3. 手机或其他桌面实例接管同一 job

因此文档里的所有调度、状态、run log、endpoint 解析，都以当前 PC 主进程为唯一权威。

## 8.2 首期不要把“自动化”做成纯 TG 功能

虽然首期只发 Telegram，但自动化域必须独立。

否则以后：

1. 接 Discord 要返工
2. 接 Slack 要返工
3. 甚至接 webhook/email 也要返工

## 8.3 首期不要暴露 cron expression 给普通用户

因为你们要做的是产品能力，不是调度平台。

底层可以保留 cron 扩展位，UI 首期建议只给：

1. once
2. every N hours
3. every day / weekday / week

这些 UI 选项最终都应映射回 domain 层的 `at / every`，而不是再引入新的 schedule kind。

---

## 9. 冻结实施顺序

1. 先补 `automations-core` 合同
2. 再做 main process `automation service`
3. 再接 Telegram endpoint adapter
4. 再加 `desktopAPI.automations.*`
5. 再做顶层模块 `Automations`
6. 最后补对话内 `Automate` 入口

这样能保证底层先稳，UI 不会反复返工。

---

## 10. 最终定案

如果按你的目标来做，Moryflow 应该采用：

- **Openclaw 的 domain 分层**
- **Moryflow 的产品入口布局**
- **本地主进程 scheduler**
- **`automations-core` 内建 endpoint 抽象**
- **Telegram 作为第一渠道 adapter**

一句话总结：

**不是把 Openclaw 的 cron 搬过来，而是借它的调度与投递架构，在 Moryflow 内落成“对话自动化 + Telegram 定时推送 + 未来多渠道扩展”的产品化版本。**

---

## 11. Implementation Plan

本冻结方案对应的执行计划已经单独落盘到：

- `docs/plans/2026-03-13-moryflow-automations-implementation-plan.md`

后续进入实现阶段时，应以该 implementation plan 作为唯一执行基线；本设计文档只继续承担产品与架构冻结事实源，不再承载任务拆解。
