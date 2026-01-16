# Webhook

> This folder structure changes require updating this document.

## Overview

Webhook notification system for sending event notifications to user-configured endpoints. Supports crawl and batch-scrape completion events.

## Responsibilities

- Webhook endpoint CRUD (create, update, delete)
- Secret key generation and rotation
- Event delivery with retry logic
- Signature verification for security

## Constraints

- Console endpoints use SessionGuard
- Webhook secrets regenerated on request
- Retry with exponential backoff on failure
- Events: crawl.completed, batch-scrape.completed

## File Structure

| File                        | Type       | Description                  |
| --------------------------- | ---------- | ---------------------------- |
| `webhook.service.ts`        | Service    | Webhook CRUD and delivery    |
| `webhook.controller.ts`     | Controller | Console management endpoints |
| `webhook.module.ts`         | Module     | NestJS module definition     |
| `webhook.constants.ts`      | Constants  | Event types, retry config    |
| `webhook.errors.ts`         | Errors     | Custom exceptions            |
| `dto/create-webhook.dto.ts` | DTO        | Create request schema        |
| `dto/update-webhook.dto.ts` | DTO        | Update request schema        |

## Webhook Flow

```
Event Triggered (crawl completed)
    ↓
Find user webhooks → Filter by event type
    ↓
For each webhook:
    Sign payload → POST to endpoint → Log result
    ↓
On failure: Retry with backoff (max 3 attempts)
```

## Event Types

| Event                    | Trigger            | Payload                    |
| ------------------------ | ------------------ | -------------------------- |
| `crawl.completed`        | Crawl job finished | Job ID, status, page count |
| `batch-scrape.completed` | Batch job finished | Job ID, status, URL count  |

## Signature Verification

```typescript
// Webhook payload signature (HMAC-SHA256)
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Header: X-Webhook-Signature: sha256=<signature>
```

## Common Modification Scenarios

| Scenario           | Files to Modify                          | Notes                   |
| ------------------ | ---------------------------------------- | ----------------------- |
| Add event type     | `webhook.constants.ts`, trigger location | Add to EVENT_TYPES enum |
| Change retry logic | `webhook.service.ts`                     | Update retry config     |
| Add webhook field  | `dto/`, `webhook.service.ts`             | Extend schema           |

## Delivery Integration

```typescript
// In crawler.processor.ts or batch-scrape.processor.ts
await this.webhookService.deliver(userId, 'crawl.completed', {
  jobId,
  status: 'completed',
  pageCount: results.length,
});
```

## Dependencies

```
webhook/
├── prisma/ - Webhook storage
├── redis/ - Delivery queue (optional)
├── common/services/webhook - Shared delivery utility
└── auth/ - Session validation
```

## Key Exports

```typescript
export { WebhookModule } from './webhook.module';
export { WebhookService } from './webhook.service';
```
