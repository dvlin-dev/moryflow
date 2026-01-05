# Admin Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Admin operations for platform management. Provides administrative controls over users, subscriptions, and orders.

## Responsibilities

**Does:**
- User listing and management (toggle admin, delete)
- Subscription oversight
- Order management
- Dashboard metrics
- Admin authentication

**Does NOT:**
- Regular user operations (handled by user/)
- Payment processing (handled by payment/)
- Quota enforcement (handled by quota/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `admin.service.ts` | Service | Admin operations |
| `admin.module.ts` | Module | NestJS module definition |
| `admin-auth.controller.ts` | Controller | Admin login/logout |
| `admin-users.controller.ts` | Controller | User management |
| `admin-subscriptions.controller.ts` | Controller | Subscription view |
| `admin-orders.controller.ts` | Controller | Order management |
| `admin-dashboard.controller.ts` | Controller | Dashboard metrics |
| `dto/admin.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## API Endpoints

All require SessionGuard + AdminGuard:
```
POST   /api/admin/login               # Admin login
POST   /api/admin/logout              # Admin logout
GET    /api/admin/users               # List users
GET    /api/admin/users/:id           # Get user detail
PATCH  /api/admin/users/:id           # Update user
DELETE /api/admin/users/:id           # Delete user
GET    /api/admin/subscriptions       # List subscriptions
GET    /api/admin/orders              # List orders
GET    /api/admin/dashboard           # Dashboard stats
```

## Dependencies

```
admin/
├── depends on → auth/ (admin guard)
├── depends on → user/ (user data)
├── depends on → subscription/ (subscription data)
├── depends on → prisma/ (all data)
└── depended by ← apps/admin (frontend)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
