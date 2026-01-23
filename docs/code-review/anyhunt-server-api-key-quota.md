---
title: Anyhunt Server API Key & Quota Code Review
date: 2026-01-25
scope: apps/anyhunt/server (api-key/quota)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/api-key, apps/anyhunt/server/src/quota, apps/anyhunt/server/prisma/main/schema.prisma, docs/architecture/auth/quota-and-api-keys.md
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：API Key & Quota）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server API Key & Quota Code Review

## 范围

- API Key：`apps/anyhunt/server/src/api-key/`
- Quota：`apps/anyhunt/server/src/quota/`
- 数据模型：`apps/anyhunt/server/prisma/main/schema.prisma`（ApiKey/Quota/QuotaTransaction/Subscription）
- 关联架构文档：`docs/architecture/auth/quota-and-api-keys.md`

主要入口：

- 控制台 API Key 管理：`/api/v1/console/api-keys/*`（Session）
- 公共配额查询：`/api/v1/quota`（ApiKeyGuard）

## 结论摘要

- 高风险问题（P0）：3 个
- 中风险问题（P1）：4 个
- 低风险/规范问题（P2）：4 个

## 发现（按严重程度排序）

- [P0] 套餐 tier 计算忽略订阅状态，过期/取消用户仍按付费 tier 计量 → `apps/anyhunt/server/src/quota/quota.repository.ts` 仅读取 `subscription.tier`，`apps/anyhunt/server/src/api-key/api-key.service.ts` 构造的 `subscriptionTier` 也不校验 `status`。应统一“有效订阅”判断（仅 ACTIVE 为付费，其余降级 FREE）。
- [P0] 配额扣减缺少 DB 级边界约束 → `quota.repository.ts` 中 `deductMonthlyInTransaction`/`deductPurchasedInTransaction` 未检查上限或下限，`monthlyUsed` 可能超过 `monthlyLimit`，`purchasedQuota` 可能为负；并发下会出现超扣。需要在事务内做条件更新或行级锁并校验。
- [P0] 退款幂等性非原子 → `quota.service.ts` 中 `hasRefundForReference` 与 `refundInTransaction` 分离，`QuotaTransaction` 无唯一约束；并发重复请求可能双重退款。建议使用唯一索引（`userId + type + reason`）或专用 Refund 记录表，并在事务内保证幂等。

- [P1] 购买配额缺少 order 级幂等 → `quota.service.ts`/`quota.repository.ts` 仅把 `orderId` 写入 `reason`，无唯一约束；支付回调重试会导致重复增额。应在支付模块或配额层做幂等校验。
- [P1] Daily（Redis）与 Monthly/Purchased（DB）非原子扣减 → `quota.service.ts` 先消耗 daily，后扣 DB；DB 失败时不会补偿 daily，可能出现“扣了但没记账”。需要补偿或改为统一事务/补偿机制。
- [P1] Quota API DTO 与真实返回不一致 → `quota.controller.ts` 返回包含 `daily` 的结构且未包 `success/data`，而 `dto/quota-status.dto.ts` 未包含 daily 且未被使用，导致文档/类型漂移。
- [P1] 扣减参数允许非正数 → `quota.service.ts` 的 `deduct` 未验证 `amount > 0`，负数可能绕过检查并返回成功。

- [P2] 死代码与未使用错误类 → `api-key.errors.ts` 未被引用；已删除并更新文档。
- [P2] 文档漂移 → `apps/anyhunt/server/src/api-key/CLAUDE.md` 中的 revoke/rotation 与 “one key per scope per user” 未实现；`quota/CLAUDE.md` 将 `quota.controller.ts` 描述为 console API，但实际是 public API。
- [P2] 文档头部约定不一致 → `docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md` 仍使用 `X-API-Key`，与实际 `Authorization: Bearer` 不一致。
- [P2] 重置事务说明与实现不一致 → `quota.repository.ts` 注释写“仅在 previousUsed > 0 时创建重置记录”，但代码始终创建 RESET 记录。

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/api-key/__tests__/api-key.service.spec.ts`
  - `apps/anyhunt/server/src/quota/__tests__/quota.service.spec.ts`
  - `apps/anyhunt/server/src/quota/__tests__/quota.repository.spec.ts`
  - `apps/anyhunt/server/src/quota/__tests__/quota.service.integration.spec.ts`
- 缺失：
  - 并发扣减导致 `monthlyUsed` 超限/`purchasedQuota` 负数的竞态测试
  - Refund 幂等性（并发或重复请求）的集成测试
  - orderId 幂等（支付重试）覆盖
  - `QuotaController` 的 API 响应结构与 DTO 对齐测试
  - ApiKeyGuard header 解析与错误分支测试

## 修复计划与进度

- 状态：**修复完成**（2026-01-25）
- 覆盖项：
  1. 统一“有效订阅 tier”计算（ACTIVE 才算付费；其余降级 FREE），并在 ApiKey/Quota/RateLimit 等调用点统一。
  2. 事务内边界校验：扣减使用条件更新，避免超扣/负数。
  3. 幂等性与一致性：refund 引入唯一约束与 daily 退款幂等；purchase 引入 orderId 唯一约束。
  4. API DTO 对齐：`QuotaController` 返回与 `QuotaStatusResponseDto` 一致。

## 修复对照表（逐条问题 → 变更）

- [P0] 套餐 tier 计算忽略订阅状态 → 已统一为仅 ACTIVE 视为付费 tier；入口已覆盖 ApiKey/Quota/RateLimit
  - `apps/anyhunt/server/src/common/utils/subscription-tier.ts`
  - `apps/anyhunt/server/src/api-key/api-key.service.ts`
  - `apps/anyhunt/server/src/quota/quota.repository.ts`
  - `apps/anyhunt/server/src/digest/services/rate-limit.service.ts`
- [P0] 扣减缺少 DB 边界约束 → 条件更新避免超扣/负数
  - `apps/anyhunt/server/src/quota/quota.repository.ts`
- [P0] 退款幂等性非原子 → 退款唯一约束 + daily 退款幂等 + 捕获重复
  - `apps/anyhunt/server/prisma/main/schema.prisma`
  - `apps/anyhunt/server/prisma/main/migrations/20260125150000_add_quota_transaction_idempotency/migration.sql`
  - `apps/anyhunt/server/src/quota/daily-credits.service.ts`
  - `apps/anyhunt/server/src/quota/quota.service.ts`

- [P1] 购买配额缺少 order 幂等 → `orderId` 必填 + 唯一约束 + 重复报错
  - `apps/anyhunt/server/src/quota/quota.types.ts`
  - `apps/anyhunt/server/src/quota/quota.service.ts`
  - `apps/anyhunt/server/prisma/main/schema.prisma`
- [P1] daily 与 DB 扣减非原子 → DB 扣减失败时回滚 daily
  - `apps/anyhunt/server/src/quota/quota.service.ts`
- [P1] Quota DTO 与返回不一致 → DTO 对齐实际返回结构并启用
  - `apps/anyhunt/server/src/quota/dto/quota-status.dto.ts`
  - `apps/anyhunt/server/src/quota/quota.controller.ts`
- [P1] 扣减参数允许非正数 → 统一正整数校验
  - `apps/anyhunt/server/src/quota/quota.service.ts`

- [P2] 死代码与未使用错误类 → 删除未使用的 ApiKey errors
  - `apps/anyhunt/server/src/api-key/api-key.errors.ts`
  - `apps/anyhunt/server/src/api-key/CLAUDE.md`
- [P2] 文档漂移 → CLAUDE 与实际行为对齐
  - `apps/anyhunt/server/src/api-key/CLAUDE.md`
  - `apps/anyhunt/server/src/quota/CLAUDE.md`
- [P2] 文档头部约定不一致 → X-API-Key → Authorization Bearer
  - `docs/products/anyhunt-dev/features/unified-auth-and-digest-architecture.md`
- [P2] 重置事务说明与实现不一致 → 仅 previousUsed > 0 才写 RESET
  - `apps/anyhunt/server/src/quota/quota.repository.ts`

## 修复记录

- 2026-01-25：落地有效订阅 tier 计算、扣减边界与退款幂等、购买幂等、Quota DTO 对齐与文档同步
