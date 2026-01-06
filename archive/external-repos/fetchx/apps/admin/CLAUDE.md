# Admin

> This folder structure changes require updating this document.

## Overview

Internal admin dashboard for system monitoring and management. Requires admin role authentication. Built with React + Vite.

## Responsibilities

- System dashboard with metrics
- User management
- Order and subscription tracking
- Job monitoring (crawl, batch-scrape)
- Queue status monitoring
- Browser pool management

## Constraints

- Admin-only access (SessionGuard + AdminGuard)
- All API calls via `/api/v1/admin/*` endpoints
- Real-time data refresh for monitoring pages
- UI style: rounded-none, orange accent

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `pages/` | Route page components |
| `features/` | Feature modules with hooks, API, components |
| `components/` | Shared layout components |
| `lib/` | Utilities, API client |
| `stores/` | Zustand state stores |

## Features

| Feature | Path | Description |
|---------|------|-------------|
| `dashboard/` | `/` | System overview and stats |
| `users/` | `/users` | User management |
| `subscriptions/` | `/subscriptions` | Subscription list |
| `orders/` | `/orders` | Order history |
| `jobs/` | `/jobs` | Crawl/batch job monitoring |
| `queues/` | `/queues` | BullMQ queue status |
| `browser/` | `/browser` | Browser pool instances |

## Feature Module Structure

```
feature-name/
├── api.ts           # API calls
├── types.ts         # Feature types
├── hooks.ts         # React Query hooks
├── components/      # Feature components
└── index.ts         # Exports
```

## Key Files

| File | Description |
|------|-------------|
| `lib/api-client.ts` | HTTP client with admin auth |
| `lib/api-paths.ts` | Admin API endpoint constants |
| `lib/job-utils.tsx` | Job status rendering utilities |
| `stores/auth.store.ts` | Admin auth state |
| `components/layout/MainLayout.tsx` | Admin shell layout |

## Pages

| Page | Description |
|------|-------------|
| `DashboardPage` | System metrics and overview |
| `UsersPage` | User list with search/filter |
| `SubscriptionsPage` | Active subscriptions |
| `OrdersPage` | Order history and details |
| `JobsPage` | Running/completed jobs |
| `JobDetailPage` | Individual job details |
| `QueuesPage` | Queue health and metrics |
| `BrowserPage` | Browser instance status |
| `ErrorsPage` | System error logs |
| `LoginPage` | Admin login |

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add admin page | `pages/`, routing | Create page + route |
| Add monitoring feature | `features/*/` | api, hooks, components |
| Add bulk action | `features/*/api.ts` | Add mutation |
| Add real-time refresh | `features/*/hooks.ts` | refetchInterval option |

## API Patterns

```typescript
// lib/api-paths.ts
export const ADMIN_API = {
  USERS: '/api/v1/admin/users',
  JOBS: '/api/v1/admin/jobs',
  QUEUES: '/api/v1/admin/queues',
  ...
} as const

// features/jobs/hooks.ts
export function useJobs() {
  return useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: () => apiClient.get(ADMIN_API.JOBS),
    refetchInterval: 5000  // Real-time refresh
  })
}
```

## Dependencies

```
admin/
├── @aiget/ui - UI components
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
└── recharts - Dashboard charts
```

## Key Exports

This is a standalone app, no exports to other packages.
