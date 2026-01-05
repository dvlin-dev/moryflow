# Quota

> This folder structure changes require updating this document.

## Overview

Quota management system for tracking and limiting API usage. Handles monthly subscription quotas and pay-as-you-go credits.

## Responsibilities

- Track user quota consumption
- Deduct quota before API operations
- Refund quota on operation failure
- Handle monthly quota reset
- Manage pay-as-you-go credits

## Constraints

- Deduction order: Monthly quota first, then pay-as-you-go
- Pre-deduct on request, refund on failure
- Cache hits don't consume quota
- Thread-safe operations via Redis

## File Structure

| File | Type | Description |
|------|------|-------------|
| `quota.service.ts` | Service | Core quota operations (deduct, refund, check) |
| `quota.controller.ts` | Controller | Console API for quota status |
| `quota.repository.ts` | Repository | Database operations |
| `quota.module.ts` | Module | NestJS module definition |
| `quota.constants.ts` | Constants | Tier limits, reset schedules |
| `quota.errors.ts` | Errors | QuotaExceededError, etc. |
| `quota.types.ts` | Types | QuotaStatus, DeductResult types |
| `dto/quota-status.dto.ts` | DTO | Response schemas |

## Quota Flow

```
API Request
    ↓
Check Quota → Insufficient? → Return QUOTA_EXCEEDED
    ↓
Deduct Quota (monthly first, then payg)
    ↓
Execute Operation
    ↓
Success? → Done
    ↓
Failure? → Refund Quota
```

## Tier Limits

| Tier | Monthly Quota | Concurrency |
|------|---------------|-------------|
| FREE | 100 | 2 |
| BASIC | 5,000 | 5 |
| PRO | 20,000 | 10 |
| TEAM | 60,000 | 20 |

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Change tier limits | `quota.constants.ts` | Update TIER_MONTHLY_QUOTA |
| Add new quota type | `quota.types.ts`, `quota.service.ts` | Extend DeductResult |
| Add quota endpoint | `quota.controller.ts`, `dto/` | Add DTO schema |
| Change reset logic | `quota.service.ts` | Monthly reset calculation |

## Key Methods

```typescript
// Check if user has quota
await quotaService.hasQuota(userId, amount)

// Deduct quota (returns DeductResult)
const result = await quotaService.deduct(userId, amount, reason)

// Refund on failure
await quotaService.refund(userId, deductResult)

// Get current status
const status = await quotaService.getStatus(userId)
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
export { QuotaModule } from './quota.module'
export { QuotaService } from './quota.service'
export { QuotaExceededError } from './quota.errors'
export type { QuotaStatus, DeductResult } from './quota.types'
```
