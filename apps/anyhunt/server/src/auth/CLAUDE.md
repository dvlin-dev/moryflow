# Auth

> This folder structure changes require updating this document.

## Overview

Authentication module using Better Auth. Handles user sessions, login/logout, and authorization for console endpoints.

## Responsibilities

- User authentication (email/password + email OTP + Google/Apple OAuth)
- Session management
- Admin authorization
- Email validation for registration
- Console endpoint protection

## Constraints

- Uses Better Auth library
- Sessions stored in database
- Admin check via user role
- Email validation required for signup
- Auth routes are VERSION_NEUTRAL and routed via `/api/auth/*` catch-all

## File Structure

| File                 | Type       | Description                      |
| -------------------- | ---------- | -------------------------------- |
| `auth.service.ts`    | Service    | Session validation, user context |
| `auth.controller.ts` | Controller | Login, logout, session endpoints |
| `auth.guard.ts`      | Guard      | Session authentication guard     |
| `admin.guard.ts`     | Guard      | Admin role authorization         |
| `auth.module.ts`     | Module     | NestJS module definition         |
| `better-auth.ts`     | Config     | Better Auth configuration        |
| `decorators.ts`      | Decorators | @CurrentUser decorator           |
| `email-validator.ts` | Validator  | Email format validation          |

## Auth Flow

### API Key Authentication (Public API)

```
Request → ApiKeyGuard → Validate key → Attach user context
```

### Session Authentication (Console)

```
Request → SessionGuard → Validate session → Attach user context
```

### Admin Authorization

```
Request → SessionGuard → AdminGuard → Check user.role === 'admin'
```

## Guards Usage

```typescript
// Console endpoints (logged-in users)
@UseGuards(SessionGuard)
export class ConsoleController {}

// Admin-only endpoints
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {}

// Public API endpoints
@UseGuards(ApiKeyGuard)
export class ApiController {}
```

## Common Modification Scenarios

| Scenario               | Files to Modify               | Notes                 |
| ---------------------- | ----------------------------- | --------------------- |
| Update OAuth config    | `better-auth.ts`              | Google/Apple settings |
| Add permission check   | `admin.guard.ts` or new guard | Role-based access     |
| Add session metadata   | `auth.service.ts`             | Extend session data   |
| Add email verification | `auth.controller.ts`          | Verification flow     |

## Key Methods

```typescript
// Get current session
const session = await authService.getSession(request);

// Validate session
const user = await authService.validateSession(sessionToken);

// Check admin status
const isAdmin = authService.isAdmin(user);
```

## Usage in Controllers

```typescript
@Controller({ path: 'console/profile', version: '1' })
@UseGuards(SessionGuard)
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

## Dependencies

```
auth/
├── better-auth - Auth library
├── prisma/ - Session storage
└── email/ - Email verification
```

## Key Exports

```typescript
export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export { SessionGuard } from './auth.guard';
export { AdminGuard } from './admin.guard';
export { CurrentUser } from './decorators';
```
