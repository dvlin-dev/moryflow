# Quota

> This folder structure changes require updating this document.

## Overview

Quota management system for tracking and limiting API usage. Handles daily free credits (FREE), monthly subscription quotas, and pay-as-you-go credits.

## Responsibilities

- Track user quota consumption
- Deduct quota before API operations
- Refund quota on operation failure
- Handle monthly quota reset
- Track daily free credits (UTC day)
- Manage pay-as-you-go credits

## Constraints

- Deduction order: Daily (FREE) → Monthly → Pay-as-you-go
- Pre-deduct on request, refund on failure
- Cache hits don't consume quota
- Thread-safe operations via Redis
- Refund requires unique referenceId (DB unique) to ensure idempotency
- Non-daily refund: update failure will re-check existing refund by referenceId to return DuplicateRefundError
- Repository deduct methods can return null; tests should guard before access
- 集成测试依赖 ApiKeyModule，测试模块需引入 VectorPrismaModule 并提供 VECTOR_DATABASE_URL
- 集成测试需清理 daily credits Redis key（`credits:daily_used:*`），避免用例间污染

## File Structure

| File                       | Type       | Description                                   |
| -------------------------- | ---------- | --------------------------------------------- |
| `quota.service.ts`         | Service    | Core quota operations (deduct, refund, check) |
| `quota.controller.ts`      | Controller | Public API for quota status                   |
| `quota.repository.ts`      | Repository | Database operations                           |
| `quota.module.ts`          | Module     | NestJS module definition                      |
| `quota.constants.ts`       | Constants  | Tier limits, reset schedules                  |
| `quota.errors.ts`          | Errors     | QuotaExceededError, etc.                      |
| `quota.types.ts`           | Types      | QuotaStatus, DeductResult types               |
| `dto/quota-status.dto.ts`  | DTO        | Response schemas                              |
| `daily-credits.service.ts` | Service    | Daily credits ledger (Redis + Lua)            |
| `daily-credits.utils.ts`   | Utils      | UTC day helpers                               |

## Quota Flow

```
API Request
    ↓
Check Quota → Insufficient? → Return QUOTA_EXCEEDED
    ↓
Deduct Quota (daily → monthly → payg)
    ↓
Execute Operation
    ↓
Success? → Done
    ↓
Failure? → Refund Quota
```

## Tier Limits

| Tier  | Daily Credits | Monthly Quota | Concurrency |
| ----- | ------------- | ------------- | ----------- |
| FREE  | 100           | 0             | 2           |
| BASIC | 0             | 5,000         | 5           |
| PRO   | 0             | 20,000        | 10          |
| TEAM  | 0             | 60,000        | 20          |

## Common Modification Scenarios

| Scenario           | Files to Modify                      | Notes                     |
| ------------------ | ------------------------------------ | ------------------------- |
| Change tier limits | `quota.constants.ts`                 | Update TIER_MONTHLY_QUOTA |
| Add new quota type | `quota.types.ts`, `quota.service.ts` | Extend DeductResult       |
| Add quota endpoint | `quota.controller.ts`, `dto/`        | Add DTO schema            |
| Change reset logic | `quota.service.ts`                   | Monthly reset calculation |

## Key Methods

```typescript
// Check if user has quota
await quotaService.hasQuota(userId, amount);

// Deduct quota (throws on insufficient)
const result = await quotaService.deductOrThrow(userId, amount, reason);

// Refund on failure (referenceId must be unique)
for (const item of result.breakdown) {
  await quotaService.refund({
    userId,
    referenceId: `refund:${item.transactionId}`, // 幂等性 key
    deductTransactionId: item.transactionId, // DAILY 用于定位 UTC 天
    source: item.source,
    amount: item.amount,
  });
}

// Get current status
const status = await quotaService.getStatus(userId);

// Purchase credits (orderId required)
await quotaService.addPurchased({ userId, amount: 100, orderId: 'order_123' });
```

## Dependencies

```
quota/
├── prisma/ - Database access
├── redis/ - Distributed locking
└── config/ - Pricing tier config
```

## Key Exports

```typescript
export { QuotaModule } from './quota.module';
export { QuotaService } from './quota.service';
export { QuotaExceededError } from './quota.errors';
export type { QuotaStatus, DeductResult } from './quota.types';
```
