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

## 11. 线上反馈问题与修复结论（2026-03-03，已完成）

### 11.1 问题现象（用户回报）

1. 用户在会话内点击 `Enable Full access` 后，对话继续执行，但后续仍出现新的工具授权卡片。
2. 点击该卡片授权时主进程报错：`Approval request not found or expired.`（`chat:approve-tool`）。
3. 重新启动应用后，同类授权点击可恢复正常。

### 11.2 已确认根因（事实链路）

1. 主进程在 `full_access` 下会自动放行同会话可自动批准的 Vault 内 `ask` 审批；审批 entry 被回收后，手动点击同一 `approvalId` 会命中过期保护分支。
2. 流式通道会先发出 `tool-approval-request` chunk；在自动放行与 UI 卡片状态收敛之间存在短窗口，用户可点击到已回收的审批项，触发过期报错。
3. 该问题属于审批竞态与 UI 同步窗口，不是旧构建未生效（运行代码与当前分支一致）。

### 11.3 已实施修复（代码收口）

1. 主进程审批注册收口：`registerApprovalRequest` 在可即时自动放行场景（`full_access + Vault ask`）返回 `null`，并由调用方跳过 `tool-approval-request` chunk，避免渲染过期审批卡。
2. 流式发射收口：`chat-request` 在 `approvalId === null` 时不发授权请求 chunk，保证 UI 不再接收到可点击但已回收的审批项。
3. 审批协议收口：`chat:approve-tool` 改为结构化幂等返回（`approved | already_processed`），过期/重复点击不再依赖异常文案分支。
4. 渲染层收口：PC 端 `use-chat-pane-controller` 按 `already_processed` 做静默收敛（卡片进入结果态，不弹失败 toast），并显示 `Already handled by system` 结果文案，避免误导为“本次手动授权成功”。
5. Mobile 同步：`mobile/lib/chat/approval-store` 与 `ChatScreen` 对齐同一幂等语义，重复/过期审批点击同样软收敛。
6. 审计保持不变：权限决策日志与模式切换日志链路保持原有落盘，不影响审计可追溯性。

### 11.4 验收结果（本次增量）

1. `full_access` 场景下自动放行审批不再生成新的可点击授权卡（主进程直接跳过审批请求 chunk）。
2. 极端竞态下点击旧卡不会再向用户暴露 `Approval request not found or expired` 失败提示，UI 可正确收敛。
3. 回归测试已补齐并通过：
   - `apps/moryflow/pc/src/main/chat/approval-store.test.ts`
   - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-controller.approval.test.tsx`
   - `apps/moryflow/mobile/lib/chat/__tests__/approval-store.spec.ts`
4. 执行 `pnpm --filter @moryflow/pc test:unit -- --run src/main/chat/approval-store.test.ts src/renderer/components/chat-pane/hooks/use-chat-pane-controller.approval.test.tsx src/renderer/components/chat-pane/components/message/tool-part.test.tsx` 后通过（脚本触发全量 unit，结果：`92` files、`320` tests passed）。
5. 执行 `pnpm --filter @moryflow/mobile test:unit -- --run lib/chat/__tests__/approval-store.spec.ts` 后通过（`10` files、`32` tests passed）。
