# Quota Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Quota management for the Memai platform. Handles quota checking, deduction, and enforcement based on subscription tiers.

## Responsibilities

**Does:**
- Quota balance checking
- Pre-deduction on API requests
- Refund on request failure
- Subscription quota vs pay-as-you-go quota priority
- Quota guard for API endpoints

**Does NOT:**
- Subscription management (handled by subscription/)
- Payment processing (handled by payment/)
- Usage statistics (handled by usage/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `quota.controller.ts` | Controller | Quota check endpoints |
| `quota.service.ts` | Service | Quota deduction logic |
| `quota.guard.ts` | Guard | QuotaGuard for enforcement |
| `quota.module.ts` | Module | NestJS module definition |
| `quota.constants.ts` | Constants | Quota tiers, limits |
| `index.ts` | Export | Public module exports |

## Deduction Logic

```
Request Flow:
1. Check available quota (subscription + pay-as-you-go)
2. Pre-deduct quota before processing
3. On success: keep deduction
4. On failure: refund deducted amount

Priority:
1. Monthly subscription quota (FREE, HOBBY tiers)
2. Pay-as-you-go quota (purchased credits)
```

## Quota Tiers

| Tier | Monthly Quota | Rate Limit |
|------|---------------|------------|
| FREE | 1,000 | 10 req/min |
| HOBBY | 50,000 | 60 req/min |
| ENTERPRISE | Unlimited | Custom |

## Guard Usage

```typescript
// Enforce quota on memory operations
@UseGuards(ApiKeyGuard, QuotaGuard)
@Post()
async createMemory() { ... }
```

## API Endpoints

```
Public API (v1):
  GET /v1/quota          # Get current quota status
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Change quota limits | `quota.constants.ts` | Update tier definitions |
| Modify deduction logic | `quota.service.ts` | Update deduct/refund |
| Add quota type | `quota.constants.ts`, `quota.service.ts` | Add to both |

## Dependencies

```
quota/
├── depends on → subscription/ (tier limits)
├── depends on → prisma/ (quota records)
├── depended by ← memory/ (usage tracking)
├── depended by ← entity/ (usage tracking)
└── depended by ← relation/ (usage tracking)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
