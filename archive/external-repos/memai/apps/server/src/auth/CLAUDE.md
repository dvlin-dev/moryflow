# Auth Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Authentication module using Better Auth. Handles user sessions, login/signup, and provides guards for route protection.

## Responsibilities

**Does:**
- Better Auth integration and configuration
- Session management (create, validate, destroy)
- User registration and login
- Session guard for console/admin routes
- Admin role verification
- Auth decorators (@Session, @CurrentUser)

**Does NOT:**
- API key authentication (handled by api-key/)
- Rate limiting (handled by common/guards/)
- User profile management (handled by user/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `auth.controller.ts` | Controller | Auth endpoints (login, signup, logout) |
| `auth.service.ts` | Service | Auth business logic |
| `auth.module.ts` | Module | NestJS module definition |
| `auth.guard.ts` | Guard | SessionGuard for console routes |
| `admin.guard.ts` | Guard | AdminGuard for admin-only routes |
| `better-auth.ts` | Config | Better Auth instance setup |
| `email-validator.ts` | Utility | Email format validation |
| `decorators.ts` | Decorators | @Session, @CurrentUser |
| `index.ts` | Export | Public module exports |

## Guards Usage

```typescript
// Console routes - any authenticated user
@UseGuards(SessionGuard)
@Controller('console')
export class ConsoleController { ... }

// Admin routes - authenticated + admin role
@UseGuards(SessionGuard, AdminGuard)
@Controller('admin')
export class AdminController { ... }
```

## Decorators

```typescript
// Get current session
@Session() session: SessionData

// Get current user
@CurrentUser() user: User
```

## API Endpoints

```
POST /api/auth/sign-in/email    # Email login
POST /api/auth/sign-up/email    # Email registration
POST /api/auth/sign-out         # Logout
GET  /api/auth/get-session      # Get current session
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add auth provider | `better-auth.ts` | Configure in Better Auth |
| Add auth decorator | `decorators.ts` | Create parameter decorator |
| Modify session data | `auth.service.ts` | Update session structure |
| Add role check | `admin.guard.ts` | Extend guard logic |

## Dependencies

```
auth/
├── depends on → prisma/ (user data)
├── depends on → email/ (verification emails)
├── depended by ← api-key/ (user context)
├── depended by ← user/ (user operations)
├── depended by ← admin/ (admin operations)
└── depended by ← all console controllers
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
