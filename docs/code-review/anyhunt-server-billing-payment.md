---
title: Anyhunt Server Billing & Payment Code Review
date: 2026-01-25
scope: apps/anyhunt/server (payment, billing)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/payment, apps/anyhunt/server/src/billing, prisma/main/schema.prisma
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：Billing & Payment）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Billing & Payment Code Review

## 范围

- Payment：`apps/anyhunt/server/src/payment/`
- Billing：`apps/anyhunt/server/src/billing/`
- 数据模型：`apps/anyhunt/server/prisma/main/schema.prisma`（Subscription/PaymentOrder/QuotaTransaction）

主要入口：

- Webhook：`POST /webhooks/creem`（VERSION_NEUTRAL）
- Console：`GET /api/v1/payment/subscription`、`GET /api/v1/payment/quota`

## 结论摘要

- 高风险问题（P0）：已修复
- 中风险问题（P1）：已修复
- 低风险/规范问题（P2）：已修复

## 发现（按严重程度排序）

- [P0] Webhook 重放/重复调用无幂等防护，可能反复重置月度用量或重复加购配额。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment.service.ts`
  - `handleSubscriptionActivated` 每次都将 `monthlyUsed` 重置为 0；若同一周期 webhook 重放，会“清零用量”。
  - `handleQuotaPurchase` 对 `creemOrderId` 只依赖唯一约束，重复回调会抛错或重复加购（未提前查重/返回幂等结果）。

- [P0] 未知 Creem 产品 ID 默认映射为 BASIC，可能误授付费权益。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment-webhook.controller.ts`
  - `PRODUCT_TO_TIER` 查不到时默认 BASIC，应改为严格白名单并拒绝/忽略未知产品。

- [P0] Webhook 事件未做事件级去重或时间窗校验，存在回放风险。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment-webhook.controller.ts`
  - 当前仅验签，不记录 event id；Creem 重试或回放无法抵御。

- [P1] 订阅周期边界使用 `new Date()` 与 30 天兜底，可能与 Creem 周期不一致。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment-webhook.controller.ts`
  - 未使用 `current_period_start_date`；`DEFAULT_SUBSCRIPTION_PERIOD_MS` 对年付/非月度不准确。

- [P1] 支付订单未写入币种，也未校验价格/币种与产品配置一致。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment.service.ts`
  - `PaymentOrder.currency` 使用默认值，未使用 webhook 的 `order.currency`；金额/币种未校验可能导致错账。

- [P1] 订阅取消/过期使用 `update`，若订阅缺失或事件乱序会导致 webhook 500。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment.service.ts`
  - 建议改为 `upsert` 或捕获不存在的情况并直接返回成功。

- [P2] `GET /payment/subscription` 在无订阅时默认返回 `status: ACTIVE`，与实际数据一致性不明确。✅ 已修复  
  `apps/anyhunt/server/src/payment/payment.controller.ts`
  - 建议确保注册时一定创建订阅，或返回明确的 “FREE/EXPIRED” 语义。

- [P2] Billing 规则覆盖仅通过 env JSON，缺少校验日志与可观测性。✅ 已修复  
  `apps/anyhunt/server/src/billing/billing.rules.ts`
  - 建议在解析失败时记录 warning，便于定位线上计费异常。

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/payment/__tests__/payment.service.spec.ts`
  - `apps/anyhunt/server/src/billing/__tests__/billing.service.spec.ts`
  - `apps/anyhunt/server/src/billing/__tests__/billing.rules.spec.ts`
  - `apps/anyhunt/server/src/billing/__tests__/billing.decorators.spec.ts`
- 新增：
  - `apps/anyhunt/server/src/payment/__tests__/payment-webhook.controller.spec.ts`
  - `apps/anyhunt/server/src/payment/__tests__/payment.service.spec.ts`（幂等/周期重置/订单币种）

## 修复建议（按优先级）

1. **引入 webhook 事件幂等与回放防护**：落库保存 `eventId`（或 `creemOrderId` + eventType + period），重复事件直接返回 200。
2. **严格产品 ID 白名单**：未知 `productId` 直接拒绝/忽略，不默认授予 BASIC。
3. **订阅周期重置需基于 period 变化**：仅当 `current_period_start/end` 变化时才重置 `monthlyUsed`。
4. **订单幂等**：`handleQuotaPurchase` 先查 `creemOrderId`，存在则返回成功（不重复加购）。
5. **写入并校验币种/金额**：保存 `order.currency`，同时校验金额与配置一致。
6. **乱序/缺失记录容错**：取消/过期改为 upsert 或捕获 not found 并返回成功。
7. **补充 webhook controller 测试**：覆盖签名、rawBody、未知产品、重复事件、乱序事件。
8. **计费覆盖日志**：解析覆盖失败时打 warning，便于线上排障。

## 状态

- 已修复并补充单测（已跑 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit`）
