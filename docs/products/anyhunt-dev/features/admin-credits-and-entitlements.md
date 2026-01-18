---
title: 管理后台：手动充值 Credits（已落地）
date: 2026-01-18
scope: anyhunt-dev
status: implemented
---

# 目标（已对齐）

给内部员工/测试用提供一套“可控、可审计、低误操作”的管理后台能力：

1. 给任意用户**手动充值 Credits**（仅增不减；当前等价于 `Quota.purchasedQuota`）。
2. 所有操作必须可追溯（谁在什么时候对谁做了什么、为何做、变更前后是多少）。

# 概念与现状对齐

## “Credits”在当前代码里的对应

- 当前系统里“按量积分”实质是 `Quota.purchasedQuota`（永不过期的可用额度）。
- “月度权益”当前由 `Subscription.tier` 决定，并映射到 `Quota.monthlyLimit`、并发/频率限制等（本期不在 Admin UI 中提供修改入口）。

> 如果你希望“积分=货币余额（可用于支付）”或“积分=不同业务的多钱包”，需要单独建模；本方案默认沿用现有 `Quota` 语义。

# 产品与交互设计（Admin UI）

## 入口与信息架构

优先把能力挂在 `Users`（用户管理）里，降低学习成本：

- `Users` 列表每行新增 `Adjust` 操作（或进入 `User Detail Drawer`）。
- 用户详情（侧边 Sheet）里提供 `Credits` 卡片：
  - 当前 purchased credits（只读）
  - 充值表单（Add only）
  - Recent grants（只读）

## 页面结构（示意）

```
Users
└─ [User Detail Drawer]
   ├─ Profile: email / id / createdAt / isAdmin
   └─ Credits
       ├─ Current purchased credits (read-only): purchasedQuota
       ├─ Adjustment:
       │   - Mode: Add (only)
       │   - Amount: integer
       │   - Reason: textarea (required)
       └─ Recent grants (read-only): latest N transactions
```

## 防误操作约束（强制）

- 所有写操作必须二次确认（Confirm Dialog），并显示“变更前/变更后”。
- 所有写操作必须填写 `reason`（必填）。
- 默认只允许 `Add`（不提供扣减/清零/批量）。

# 服务端设计（API + SRP）

## 1) Admin Users: 写操作拆成独立“动作接口”

避免把“权益/积分”塞进 `PATCH /admin/users/:id` 这种通用更新里（SRP + 可审计）。

### Credits 充值

- `POST /api/v1/admin/users/:id/credits/grant`
  - body:
    - `amount: number`（正整数）
    - `reason: string`（必填）
  - response:
    - `purchasedQuotaBefore/After`
    - `quotaTransactionId`（或 `auditLogId`）

### Credits 充值记录

- `GET /api/v1/admin/users/:id/credits/grants?limit=20`

## 2) 业务逻辑的职责拆分（推荐）

- `AdminUserCreditsService`
  - 只负责 credits 变更：校验、事务、落交易记录、落审计记录。
- Controller 层只做：鉴权、DTO 校验、调用 service、返回 DTO。

# 数据模型与审计（DB）

## 方案（已落地）：新增 AdminAuditLog + 扩展 QuotaTransaction

1. 新增 `AdminAuditLog`（统一审计表）
   - `id`
   - `actorUserId`（谁操作）
   - `targetUserId`（对谁操作）
   - `action`（字符串，如 `CREDITS_GRANT`）
   - `reason`（必填）
   - `metadata`（Json：before/after、关联 transactionId、客户端信息）
   - `createdAt`
2. 扩展 `QuotaTransaction`
   - 增加 `actorUserId?`、`type` 增加 `ADMIN_GRANT`

好处：

- 未来所有 Admin 写操作都能统一写审计日志（不仅是 credits/tier）。
- 发生争议时可追责、可回放。

# 一致性与边界条件

1. 用户可能没有 `quota`/`subscription` 记录：admin 操作前应 `ensureExists`。
2. 操作的幂等性：
   - credits 调整可生成 `idempotencyKey`（可选，防止重复点击）。

# 测试策略（最低要求）

- 单元测试（Vitest）
  - credits：事务一致性、审计落库、quota 自动补齐
- E2E（可选）
  - admin 登录后对用户执行一次充值，然后用户侧余额变化可见

# 已确认的产品约束（落地标准）

1. UI 命名：`Credits`
2. 不做金额换算展示
3. 不做 tier/status 调整（本期不实现权益开关）
4. 不做扣减/清零/批量
