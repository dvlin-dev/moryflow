# Payment Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Payment processing using Creem.io. Handles subscription purchases, quota top-ups, and payment webhooks.

## Responsibilities

**Does:**
- Subscription checkout session creation
- Quota purchase processing
- Payment webhook handling (Creem callbacks)
- Order record management

**Does NOT:**
- Subscription tier logic (handled by subscription/)
- Quota balance management (handled by quota/)
- User management (handled by user/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `payment.controller.ts` | Controller | Payment endpoints |
| `payment-webhook.controller.ts` | Controller | Creem webhook handler |
| `payment.service.ts` | Service | Payment processing logic |
| `payment.module.ts` | Module | NestJS module definition |
| `payment.constants.ts` | Constants | Creem config, pricing |
| `dto/payment.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Payment Flow

```
1. User initiates subscription/quota purchase
2. Create Creem checkout session
3. Redirect user to Creem payment page
4. Receive webhook on payment completion
5. Update subscription/quota accordingly
```

## Dependencies

```
payment/
├── depends on → subscription/ (tier updates)
├── depends on → quota/ (quota credits)
├── depends on → prisma/ (order records)
└── depends on → user/ (user context)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
