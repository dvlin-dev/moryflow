# Webhook

> This folder structure changes require updating this document.

## Overview

Webhook notification system for sending event notifications to user-configured endpoints. Supports screenshot completion/failure events.

## 最近更新

- Webhook 错误响应统一为 RFC7807（移除 success/data 包装）
- WebhookModule 显式导入 ApiKeyModule，避免 ApiKeyGuard 依赖缺失导致启动失败

## Responsibilities

- Webhook endpoint CRUD (create, update, delete)
- Secret key generation and rotation
- Event delivery with retry logic
- Signature verification for security

## Constraints

- Public endpoints use ApiKeyGuard
- Webhook secrets regenerated on request
- Retry with exponential backoff on failure
- Events: screenshot.completed, screenshot.failed
- Webhook URL must pass SSRF validation (async DNS via UrlValidator)

## File Structure

| File                        | Type       | Description               |
| --------------------------- | ---------- | ------------------------- |
| `webhook.service.ts`        | Service    | Webhook CRUD and delivery |
| `webhook.controller.ts`     | Controller | Public API endpoints      |
| `webhook.module.ts`         | Module     | NestJS module definition  |
| `webhook.constants.ts`      | Constants  | Event types, retry config |
| `webhook.errors.ts`         | Errors     | Custom exceptions         |
| `dto/create-webhook.dto.ts` | DTO        | Create request schema     |
| `dto/update-webhook.dto.ts` | DTO        | Update request schema     |

## Webhook Flow

```
Event Triggered (screenshot completed)
    ↓
Find user webhooks → Filter by event type
    ↓
For each webhook:
    Sign payload → POST to endpoint → Log result
    ↓
On failure: Retry with backoff (max 3 attempts)
```

## Event Types

| Event                  | Trigger                 | Payload                        |
| ---------------------- | ----------------------- | ------------------------------ |
| `screenshot.completed` | Screenshot job finished | Job ID, status, screenshot URL |
| `screenshot.failed`    | Screenshot job failed   | Job ID, error details          |

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
// In screenshot.processor.ts
await this.webhookService.deliver(userId, 'screenshot.completed', {
  jobId,
  status: 'completed',
  screenshotUrl,
});
```

## Dependencies

```
webhook/
├── prisma/ - Webhook storage
├── redis/ - Delivery queue (optional)
├── common/services/webhook - Shared delivery utility
└── api-key/ - Public API auth
```

## Key Exports

```typescript
export { WebhookModule } from './webhook.module';
export { WebhookService } from './webhook.service';
```
