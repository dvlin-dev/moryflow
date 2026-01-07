# Admin

> This folder structure changes require updating this document.

## Overview

Admin dashboard backend APIs for system monitoring and management. Requires admin role authentication.

## Responsibilities

- Dashboard statistics and metrics
- User management (list, search, actions)
- Subscription and order tracking
- Job monitoring (crawl, batch-scrape)
- Queue status and operations
- Browser pool management
- Scheduled task management

## Constraints

- All endpoints require SessionGuard + RequireAdmin
- All controllers use version: '1' (`/api/v1/admin/*`)
- Real-time data for monitoring endpoints
- No public API access

## File Structure

| File                               | Type    | Description               |
| ---------------------------------- | ------- | ------------------------- |
| `admin.service.ts`                 | Service | Core admin business logic |
| `admin-jobs.service.ts`            | Service | Job monitoring and status |
| `admin-queue.service.ts`           | Service | Queue operations          |
| `admin-scheduled-tasks.service.ts` | Service | Scheduled task management |
| `admin.module.ts`                  | Module  | NestJS module definition  |
| `dto.ts`                           | DTO     | Unified admin DTOs        |

### Controllers

| File                                | Endpoint               | Description          |
| ----------------------------------- | ---------------------- | -------------------- |
| `admin-auth.controller.ts`          | `/admin/auth`          | Admin authentication |
| `admin-dashboard.controller.ts`     | `/admin/dashboard`     | Dashboard stats      |
| `admin-users.controller.ts`         | `/admin/users`         | User management      |
| `admin-subscriptions.controller.ts` | `/admin/subscriptions` | Subscription list    |
| `admin-orders.controller.ts`        | `/admin/orders`        | Order history        |
| `admin-jobs.controller.ts`          | `/admin/jobs`          | Job monitoring       |
| `admin-queue.controller.ts`         | `/admin/queues`        | Queue status         |
| `admin-browser.controller.ts`       | `/admin/browser`       | Browser pool         |

## Common Modification Scenarios

| Scenario             | Files to Modify                                       | Notes                      |
| -------------------- | ----------------------------------------------------- | -------------------------- |
| Add admin endpoint   | Create new controller                                 | Use RequireAdmin decorator |
| Add dashboard metric | `admin.service.ts`, `admin-dashboard.controller.ts`   |                            |
| Add user action      | `admin-users.controller.ts`, `admin.service.ts`       |                            |
| Add queue operation  | `admin-queue.service.ts`, `admin-queue.controller.ts` |                            |

## Authorization Pattern

```typescript
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(SessionGuard)
@RequireAdmin()
export class AdminUsersController {
  // All methods require admin role
}
```

## Dependencies

```
admin/
├── prisma/ - Database queries
├── queue/ - BullMQ queue access
├── browser/ - Browser pool status
├── auth/ - Session validation
└── quota/ - User quota info
```

## Key Exports

```typescript
export { AdminModule } from './admin.module';
export { AdminService } from './admin.service';
```
