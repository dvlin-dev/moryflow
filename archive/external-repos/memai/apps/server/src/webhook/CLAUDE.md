# Webhook Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Webhook notification system. Manages webhook endpoints and delivers event notifications to external systems.

## Responsibilities

**Does:**
- Webhook endpoint CRUD
- Event delivery to registered webhooks
- Delivery retry logic
- Delivery log management
- Secret generation for signature verification

**Does NOT:**
- Event generation (triggered by memory/, entity/)
- Queue management directly (uses queue/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `webhook.controller.ts` | Controller | Webhook management endpoints |
| `webhook.service.ts` | Service | Webhook business logic |
| `webhook.module.ts` | Module | NestJS module definition |
| `webhook.constants.ts` | Constants | Event types, config |
| `dto/webhook.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Webhook Events

| Event | Trigger |
|-------|---------|
| `memory.created` | New memory created |
| `memory.updated` | Memory updated |
| `memory.deleted` | Memory deleted |
| `entity.created` | New entity extracted |
| `relation.created` | New relation created |

## Dependencies

```
webhook/
├── depends on → queue/ (delivery jobs)
├── depends on → prisma/ (webhook storage)
├── depended by ← memory/ (event trigger)
├── depended by ← entity/ (event trigger)
└── depended by ← relation/ (event trigger)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
