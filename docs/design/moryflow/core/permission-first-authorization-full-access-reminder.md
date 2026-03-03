---
title: Moryflow PC 首次授权提示与 Full Access 即时切换重构方案
date: 2026-03-03
scope: apps/moryflow/pc + packages/agents-runtime + packages/agents-sandbox
status: active
owners: [moryflow-pc]
---

<!--
[INPUT]: 默认权限策略、首次授权触发点、用户风险告知、会话中权限切换诉求
[OUTPUT]: 单一权限事实源下的“首次单次提醒 + 即时生效”重构方案
[POS]: Moryflow PC 权限交互治理事实源（首次授权升级提醒）

[PROTOCOL]: 本文档变更需同步 `docs/design/moryflow/core/index.md` 与 `docs/index.md`。
-->

# Moryflow PC 首次授权提示与 Full Access 即时切换重构方案

## 1. 目标与范围

## 1.1 目标

1. 新用户进入会话时默认 `ask`。
2. 在会话内第一次触发“需要授权”的操作时，提示可切换到 `full_access`。
3. 提示中必须明确风险，且仅提示一次。
4. 用户在对话过程中切换权限后，切换结果立即生效（不等待新会话）。

## 1.2 非目标

1. 不改变“危险命令硬拦截”规则。
2. 不改变“Vault 外路径必须授权”的边界规则。
3. 不做任何历史兼容层（旧字段/旧事件/旧 UI 直接删除）。

## 2. 单一权限模型（重构后）

## 2.1 数据模型

```ts
type SessionPermissionMode = 'ask' | 'full_access';

type PermissionMeta = {
  fullAccessUpgradePromptConsumed: boolean; // default: false，消费后不再提示
};

type SessionPermissionRuntime = {
  mode: SessionPermissionMode; // 会话事实源
  epoch: number; // 每次切换 +1，用于即时生效
};
```

## 2.2 规则优先级

1. 硬拦截优先：命中高危命令直接拒绝。
2. 路径边界次之：Vault 外未授权路径先走路径授权流程。
3. 模式规则最后：仅在 Vault 内按 `ask/full_access` 判定是否需要确认。

## 3. 交互规范（用户视角）

## 3.1 首次授权提示触发条件

仅在以下条件同时满足时展示“升级 Full access 提示”：

1. 当前会话 `mode=ask`。
2. 当前权限决策原因为“Vault 内 ask”（不是硬拦截、不是 Vault 外路径授权）。
3. `fullAccessUpgradePromptConsumed=false`（该用户/设备从未消费过该提示）。

## 3.2 首次授权弹层（建议文案，用户可见必须英文）

- Title: `Switch this chat to Full access?`
- Description: `Full access can run file edits and shell commands in your Vault without asking each time.`
- Risk note: `Only enable this in trusted workspaces. Destructive commands are still blocked.`
- Primary action: `Enable Full access`
- Secondary action: `Keep Ask mode`

## 3.3 风险告知要求

必须明确三点：

1. `full_access` 会减少确认弹窗，提升效率。
2. `full_access` 允许在 Vault 内直接执行编辑/命令，误操作风险更高。
3. 仍存在底线保护（危险命令硬拦截、Vault 外路径授权不被绕过）。

## 3.4 单次提醒策略

1. 首次展示后，无论用户点击 `Enable Full access` 或 `Keep Ask mode`，都将 `fullAccessUpgradePromptConsumed` 置为 `true`。
2. 一旦消费，后续所有会话都不再展示该提示。
3. 不提供“关闭后续提醒”复选框，不提供设置页开关。

## 3.5 会话中切换权限即时生效

1. 用户通过弹层或输入框切换到 `full_access` 后，立即更新会话 `mode`。
2. 运行时 `epoch` 立即 `+1`，所有未执行的授权判定必须基于新 `epoch` 重新计算。
3. 若当前正停在“Vault 内 ask”确认点，切换后应自动续跑，无需再点一次确认。
4. 若当前是“Vault 外未授权路径”或“硬拦截”，切换模式不改变结论。

## 4. 架构收口（工程视角）

## 4.1 根因治理

权限相关逻辑统一收口到单一运行时模块，禁止以下分散实现：

1. Renderer 侧自行推断是否弹升级提醒。
2. 工具层各自维护一套模式判断。
3. 会话模式与提醒消费状态并存但不同步。

## 4.2 推荐职责分层

1. `permission-runtime`：唯一决策入口（返回 allow/ask/deny + reason + epoch）。
2. `session-store`：仅保存 `mode` 与 `epoch`，不做策略推断。
3. `permission-meta-store`：仅保存 `fullAccessUpgradePromptConsumed`（内部状态，非设置项）。
4. `ui-layer`：按 runtime 返回结果渲染弹层，不自行推导业务条件。

## 4.3 事件协议（建议）

```ts
type PermissionEvents =
  | {
      type: 'permission.mode.changed';
      sessionId: string;
      mode: SessionPermissionMode;
      epoch: number;
    }
  | { type: 'permission.upgradeReminder.consumed'; consumed: true }
  | { type: 'permission.decision.requested'; decisionId: string; epoch: number }
  | { type: 'permission.decision.resolved'; decisionId: string; result: 'allow' | 'deny' };
```

要求：每次工具执行前必须读取最新 `epoch`，若本地缓存 `epoch` 过期则强制重评估。

## 5. 不兼容重构清单（必须删除）

1. 删除旧的权限提示布尔字段与临时兜底分支。
2. 删除“首次提示”在多个 UI 组件重复实现的代码。
3. 删除任何依赖“重启会话后生效”的权限切换逻辑。
4. 删除会导致文案误导的提示（例如暗示 `full_access` 可绕过外部路径授权）。
5. 删除“关闭后续提醒”复选框与设置页开关相关实现。

## 6. 验收标准（DoD）

1. 新会话默认 `ask`，第一次 Vault 内授权时出现升级提示。
2. 用户可一键切到 `full_access`，同会话立即生效。
3. 升级提示全局仅出现一次（消费后永久不再弹）。
4. `full_access` 不绕过硬拦截、不绕过 Vault 外路径授权。
5. 权限判定日志可追踪 `mode`、`reason`、`epoch`、用户操作。

## 7. 测试计划

## 7.1 单元测试（必需）

1. 首次提示触发条件组合测试（4 条前置条件）。
2. 提示消费后不再触发（跨会话持久化）。
3. `mode` 切换后 `epoch +1` 与 stale 判定重评估。
4. `full_access` 仅影响 Vault 内 ask，不影响外部路径授权和硬拦截。

## 7.2 集成 / E2E（必需）

1. 新用户默认 `ask`，首次授权出现升级提示并含风险文案。
2. 在授权弹层点击 `Enable Full access` 后，当前会话后续操作不再重复 ask（Vault 内）。
3. 首次提示被消费后，新会话不再出现首次升级提示。
4. 会话中从 `full_access` 切回 `ask` 后，下一次 Vault 内敏感操作立即恢复确认。

## 8. 结论

该方案以“单一权限事实源 + 事件化即时生效”替代分散式提示逻辑，保证：

1. 新用户安全默认（`ask`）。
2. 首次 friction 有明确升级路径（`full_access` + 风险提示）。
3. 交互最小化（仅首次单次提醒，无设置项）。
4. 权限切换具备会话内即时一致性（`epoch` 驱动重评估）。

## 9. 执行计划（本轮）

1. [completed] 主进程：新增“审批上下文查询”能力，能区分 Vault 内 ask 与外部路径授权 ask。
2. [completed] 主进程：新增“首次升级提醒已消费”持久化，保证全局仅提示一次。
3. [completed] 主进程：会话切到 `full_access` 时自动处理同会话内可放行的挂起审批（外部路径授权除外）。
4. [completed] 渲染层：监听首次审批请求并弹出升级提示（含风险文案，按钮为 `Enable Full access` / `Keep Ask mode`）。
5. [completed] 渲染层：用户点击 `Enable Full access` 后立即切换会话模式并即时生效。
6. [completed] 测试：补齐主进程审批链路回归测试与渲染层最小交互测试（如适用）。
7. [completed] 校验：按风险分级执行必要命令并记录结果。

## 10. 执行进度（本轮）

1. [completed] 2026-03-03：已写入执行计划并按步骤推进实现。
2. [completed] 2026-03-03：主进程完成审批链路改造：新增 `chat:approvals:get-context` IPC、单次提醒消费持久化（`fullAccessUpgradePromptConsumed`）、`full_access` 切换后同会话挂起审批自动放行（排除 `external_path_unapproved`）。
3. [completed] 2026-03-03：渲染层完成首次升级提示弹窗与触发编排：检测 `approval-requested` tool part 首次出现后查询审批上下文，命中时弹出风险提示；确认后即时切换 `full_access`。
4. [completed] 2026-03-03：测试完成：新增并通过 `apps/moryflow/pc/src/main/chat/approval-store.test.ts` 回归用例（升级提示一次性消费、外部路径审批不触发升级提示、会话切换后自动放行）。
5. [completed] 2026-03-03：L2 校验完成并通过：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。

## 11. 线上反馈问题（2026-03-03）与根因

### 11.1 现象

用户在默认 `ask` 会话中，看到首次升级提示并点击切换到 `full_access` 后：

1. 对话继续，但后续新 tool 仍出现授权交互。
2. 点击授权后报错：`Approval request not found or expired.`。
3. 重启应用后，同类授权操作恢复正常。

### 11.2 根因

1. **审批协议非幂等**：`chat:approve-tool` 仅返回 `{ ok: true }`，主进程在 `approvalId` 不存在/过期/处理中时直接抛异常，UI 只能走错误分支。
2. **会话切换与自动放行并发**：切到 `full_access` 后会触发自动放行，用户若点击旧授权卡片，会命中“审批已被系统处理”的并发窗口，旧协议会把该正常并发场景当异常。
3. **结果态语义不完整**：UI 仅有“审批成功”文案，缺少“已由系统处理”的结果态，导致用户感知为失败。

## 12. 修复方案与结论（已落地）

### 12.1 协议收口

将审批结果改为结构化幂等协议（PC + Mobile 同步）：

```ts
type ApproveToolResult =
  | { status: 'approved'; remember: 'once' | 'always' }
  | { status: 'already_processed'; reason: 'missing' | 'expired' | 'processing' };
```

要求：

1. `missing/expired/processing` 统一返回 `already_processed`，禁止抛错。
2. 仅“真实异常”（如外部路径目标缺失）才走错误链路。
3. Renderer/Mobile 对 `already_processed` 写入工具审批结果态，不弹失败 toast。

### 12.2 交互收口

1. 审批卡片点击后始终进入结果态（`approval-responded`）。
2. `reason='already_processed'` 时显示 `approvalAlreadyHandled`（系统已处理），不再误显示失败。
3. 与 `full_access` 自动放行并发时，用户可见行为稳定为“已处理”。

### 12.3 回归测试补齐

1. PC `approval-store`：新增 `missing` / `processing` 幂等回归。
2. PC `use-chat-pane-controller`：新增 `already_processed` 不 toast 且写结果态回归。
3. PC `tool-part`：新增 `already_processed` 文案分支回归。
4. Mobile `approval-store`：新增 `approved` / `missing` / `processing` 回归。

### 12.4 本轮结论

1. “切到 `full_access` 后再点旧授权卡片”不再触发 `Approval request not found or expired.`。
2. 授权卡片可稳定进入结果态，并明确区分“手动授权成功”与“系统已处理”。
3. PC/Mobile 审批语义一致，消除跨端行为漂移。
