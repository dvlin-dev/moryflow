# Payment

> This folder structure changes require updating this document.

## Overview

Payment processing integration with Creem. Handles subscriptions, tier upgrades, and pay-as-you-go quota purchases.

## Responsibilities

- Subscription management (create, upgrade, cancel)
- Pay-as-you-go quota purchases
- Creem webhook handling
- Order tracking
- Tier-based quota allocation

## Constraints

- Uses Creem as payment provider
- Webhook endpoint must be VERSION_NEUTRAL for Creem callbacks
- Console endpoints use SessionGuard
- Quota updates must be atomic

## File Structure

| File | Type | Description |
|------|------|-------------|
| `payment.service.ts` | Service | Payment logic, Creem API integration |
| `payment.controller.ts` | Controller | Console endpoints for subscriptions |
| `payment-webhook.controller.ts` | Controller | Creem webhook handler |
| `payment.module.ts` | Module | NestJS module definition |
| `payment.constants.ts` | Constants | Tier configs, prices |
| `payment.types.ts` | Types | Creem API types |
| `dto/payment.dto.ts` | DTO | Request/response schemas |

## Payment Flow

### Subscription
```
User selects tier → Create Creem checkout → Redirect to payment
    ↓
Creem webhook (payment.success) → Update user tier → Allocate quota
```

### Pay-as-you-go
```
User purchases quota → Create Creem checkout → Redirect to payment
    ↓
Creem webhook (payment.success) → Add quota to user balance
```

## Tier Configuration

| Tier | Monthly | Quota | Defined in |
|------|---------|-------|------------|
| FREE | $0 | 100 | `payment.constants.ts` |
| BASIC | $9 | 5,000 | |
| PRO | $29 | 20,000 | |
| TEAM | $79 | 60,000 | |

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add tier | `payment.constants.ts`, `payment.service.ts` | Update Creem products |
| Change price | `payment.constants.ts` | Sync with Creem dashboard |
| Add payment method | `payment.service.ts` | Extend Creem integration |
| Handle new webhook | `payment-webhook.controller.ts` | Add event handler |

## Webhook Handling

```typescript
@Controller({ path: 'webhooks/creem', version: VERSION_NEUTRAL })
export class PaymentWebhookController {
  @Post()
  async handleWebhook(@Body() payload: CreemWebhookPayload) {
    // Verify signature, process event
  }
}
```

## Dependencies

```
payment/
├── prisma/ - Order and subscription storage
├── quota/ - Quota allocation after payment
├── user/ - User tier updates
└── email/ - Payment confirmation emails
```

## Key Exports

```typescript
export { PaymentModule } from './payment.module'
export { PaymentService } from './payment.service'
```
