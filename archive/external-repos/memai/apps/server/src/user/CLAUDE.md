# User Module

> Warning: When this folder structure changes, you MUST update this document

## Position

User profile and account management. Handles user data operations separate from authentication.

## Responsibilities

**Does:**
- User profile retrieval and updates
- User settings management
- Account data operations

**Does NOT:**
- Authentication (handled by auth/)
- Admin user management (handled by admin/)
- Subscription management (handled by subscription/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `user.controller.ts` | Controller | User endpoints |
| `user.service.ts` | Service | User operations |
| `user.module.ts` | Module | NestJS module definition |
| `dto/user.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## API Endpoints

```
Console API - SessionGuard:
  GET   /api/user/me           # Get current user profile
  PATCH /api/user/me           # Update profile
  PATCH /api/user/me/password  # Change password
```

## Dependencies

```
user/
├── depends on → auth/ (session context)
├── depends on → prisma/ (user data)
└── depended by ← admin/ (user management)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
