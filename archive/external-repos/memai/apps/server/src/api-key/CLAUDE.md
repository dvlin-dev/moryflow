# API Key Module

> Warning: When this folder structure changes, you MUST update this document

## Position

API key management for the Memai platform. Handles key generation, validation, and provides guards for public API authentication.

## Responsibilities

**Does:**
- API key generation with secure random tokens
- Key validation and lookup
- API key guard for public endpoints
- Key hash storage (SHA256, plaintext never stored)
- Key prefix handling (`mm_` prefix)
- Key expiration management

**Does NOT:**
- Session authentication (handled by auth/)
- Quota enforcement (handled by quota/)
- Rate limiting (handled by common/guards/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `api-key.controller.ts` | Controller | Key management endpoints |
| `api-key.service.ts` | Service | Key generation/validation logic |
| `api-key.guard.ts` | Guard | ApiKeyGuard for public API |
| `api-key.decorators.ts` | Decorators | @ApiKeyContext decorator |
| `api-key.module.ts` | Module | NestJS module definition |
| `api-key.constants.ts` | Constants | Key prefix, config values |
| `dto/api-key.schema.ts` | Schema | Zod schemas + DTO classes |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public module exports |

## Guard Usage

```typescript
// Public API routes - API key required
@UseGuards(ApiKeyGuard)
@Controller({ path: 'memories', version: '1' })
export class MemoryController { ... }
```

## Key Format

```
mm_<32-char-random-string>
│  └── 32 character secure random token
└── Prefix identifying Memai keys
```

## Security

- **Storage**: Only SHA256 hash stored in database
- **Display**: Full key shown only once at creation
- **Prefix**: Visible `mm_...` prefix for identification
- **Expiration**: Optional expiration date support

## API Endpoints

```
Console API - SessionGuard:
  GET    /api/console/api-keys      # List user's keys
  GET    /api/console/api-keys/:id  # Get key detail
  POST   /api/console/api-keys      # Create new key
  PATCH  /api/console/api-keys/:id  # Update key (name, active)
  DELETE /api/console/api-keys/:id  # Delete key
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Change key format | `api-key.service.ts`, `api-key.constants.ts` | Update generation logic |
| Add key permission | `dto/api-key.schema.ts`, `api-key.service.ts` | Add to schema + service |
| Modify validation | `api-key.guard.ts` | Update guard logic |

## Dependencies

```
api-key/
├── depends on → prisma/ (key storage)
├── depends on → auth/ (user context)
├── depended by ← memory/ (key isolation)
├── depended by ← entity/ (key isolation)
├── depended by ← relation/ (key isolation)
└── depended by ← all public API controllers
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
