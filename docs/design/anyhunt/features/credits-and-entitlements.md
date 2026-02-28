---
title: Anyhunt Credits 与权益规范（合并版）
date: 2026-02-28
scope: apps/anyhunt/server, apps/anyhunt/admin/www, apps/anyhunt/www
status: active
---

<!--
[INPUT]: Credits 分层约束、FREE 每日额度、Admin 手动充值与审计需求
[OUTPUT]: Anyhunt Credits/Entitlements 单一事实源（产品口径 + 服务边界 + 审计与测试）
[POS]: Anyhunt Features / Credits 与权益

[PROTOCOL]: 本文件变更需同步 `docs/design/anyhunt/features/index.md`、`docs/design/anyhunt/core/quota-and-api-keys.md` 与 `docs/index.md`。
-->

# Credits 与权益统一规范

本文是 Anyhunt Credits 与权益体系的单一事实源，合并了原“每日赠送 credits”与“Admin 充值审计”两类文档。

## 1. 目标与范围

1. 给 FREE 用户提供稳定且可解释的每日额度。
2. 保持用户可见口径简单：免费额度、月度权益、购买/赠送额度三层。
3. 给 Admin 提供可追溯、低误操作的充值能力。
4. 保证扣费、退费、审计、查询在同一套模型下闭环。

不在本期范围：

- 多钱包体系（业务钱包拆分）
- Admin 扣减/清零/批量调账
- tier/status 的后台直接改写

## 2. Credits 分层与扣费顺序

### 2.1 三层额度（固定）

- `daily`：每日免费额度（FREE 默认 `100/天`，UTC 当日有效，不累积）
- `monthly`：订阅月度权益额度（`Quota.monthlyLimit - Quota.monthlyUsed`）
- `purchased`：购买/管理员赠送额度（`Quota.purchasedQuota`，长期有效）

### 2.2 扣费顺序（固定）

```text
daily -> monthly -> purchased
```

理由：先消耗会过期额度，减少用户权益浪费。

### 2.3 FREE 口径（固定）

- `FREE.monthlyQuota = 0`
- `FREE.dailyCredits = 100`

即 FREE 用户不再使用“100/月”口径，统一为“100/天”。

## 3. Daily Credits 实现规范

### 3.1 Redis 账本

- Key：`credits:daily_used:{userId}:{YYYY-MM-DD}`（UTC 日期）
- Value：当日已使用额度（整数）
- TTL：7 天（用于历史 key 清理，不依赖 TTL 实现重置）

### 3.2 并发与一致性

- 扣减必须原子化（Lua 脚本优先），禁止“先读后写”导致超扣。
- 原子脚本最少返回：`consumed`、`usedAfter`、`remainingAfter`。

### 3.3 退费约束

- 扣费接口返回 `breakdown`（daily/monthly/purchased 各自消耗）。
- 异步任务失败后，按 `breakdown` 原路退回，避免桶间错位。

## 4. Admin 充值与审计

### 4.1 产品约束（固定）

- UI 命名统一为 `Credits`。
- 仅允许 `Add`（充值），不提供扣减、清零、批量。
- 所有写操作必须：
  - 二次确认（显示 before/after）
  - 强制填写 `reason`

### 4.2 API 约束

- 充值：`POST /api/v1/admin/users/:id/credits/grant`
  - body：`amount`（正整数）、`reason`（必填）
  - response：`purchasedQuotaBefore`、`purchasedQuotaAfter`、`quotaTransactionId`（或 `auditLogId`）
- 查询充值记录：`GET /api/v1/admin/users/:id/credits/grants?limit=20`

### 4.3 服务职责分层

- `AdminUserCreditsService`
  - 校验、事务、quota ensure、交易落库、审计落库
- Controller
  - 只负责鉴权、DTO 校验、返回格式

禁止把 credits 写操作塞入通用 `PATCH /admin/users/:id`。

## 5. 数据模型与审计

### 5.1 审计模型

- `AdminAuditLog`
  - `actorUserId`、`targetUserId`
  - `action`（如 `CREDITS_GRANT`）
  - `reason`
  - `metadata`（before/after、关联 transactionId、客户端信息）
  - `createdAt`

### 5.2 交易模型

- `QuotaTransaction`
  - 增加 `actorUserId?`
  - `type` 扩展 `ADMIN_GRANT`

### 5.3 边界条件

- 目标用户缺少 `quota/subscription` 时，先 `ensureExists` 再调账。
- 可选 `idempotencyKey` 防止重复点击导致重复充值。

## 6. 对外输出与前端口径

### 6.1 App / API Key 读取口径

以下接口应统一输出 daily 字段：

- `GET /api/v1/app/user/me`
- `GET /api/v1/quota`

至少包含：

- `dailyLimit`
- `dailyUsed`
- `dailyRemaining`
- `dailyResetsAt`（下一个 UTC 午夜 ISO 时间）

### 6.2 Admin 视图口径

- Admin 充值只影响 `purchased`。
- 如需展示 daily 使用，仅读 Redis，不新增持久化账本。

## 7. 测试与验收

### 7.1 最低测试门槛

- 单元测试：
  - 扣费顺序（daily -> monthly -> purchased）
  - 异步失败退费按 `breakdown` 回滚
  - Admin 充值事务一致性 + 审计落库
  - quota 自动补齐（ensureExists）

- E2E（建议）：
  - Admin 充值后用户侧余额变化可见
  - FREE 用户跨天额度重置符合 UTC 规则

### 7.2 实施状态

已完成：

1. FREE 默认口径切换到 `100/天`
2. `QuotaSource` 覆盖 `DAILY`
3. 扣费返回 `breakdown` 并用于失败退费
4. `app/user/me` 与 `quota` 输出 daily 字段
5. Admin 充值与审计链路落地（仅增不减）

## 8. 代码索引

- Daily 账本：`apps/anyhunt/server/src/quota/daily-credits.service.ts`
- 扣费编排：`apps/anyhunt/server/src/quota/quota.service.ts`
- Admin credits：`apps/anyhunt/server/src/admin/users/*`
- Admin 前端：`apps/anyhunt/admin/www/src/*credits*`
