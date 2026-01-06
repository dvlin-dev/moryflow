# Admin Features

> This folder structure changes require updating this document.

## Overview

Feature modules for the admin dashboard. Each feature handles a specific monitoring or management area with real-time data refresh.

## Feature Module Pattern

Same structure as console features:

```
feature-name/
├── api.ts           # React Query mutations
├── hooks.ts         # React Query queries (with refetchInterval)
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── index.ts         # Barrel exports
```

## Features

| Feature          | Description                | API Endpoint                  |
| ---------------- | -------------------------- | ----------------------------- |
| `dashboard/`     | System metrics overview    | `/api/v1/admin/dashboard`     |
| `users/`         | User management            | `/api/v1/admin/users`         |
| `subscriptions/` | Active subscriptions       | `/api/v1/admin/subscriptions` |
| `orders/`        | Order history              | `/api/v1/admin/orders`        |
| `jobs/`          | Crawl/batch job monitoring | `/api/v1/admin/jobs`          |
| `queues/`        | BullMQ queue status        | `/api/v1/admin/queues`        |
| `browser/`       | Browser pool management    | `/api/v1/admin/browser`       |

## Key Features

### dashboard/

- System-wide metrics and counts
- Recent activity feed
- Quick stats cards

### jobs/

- Job list with filtering
- Job detail view
- Real-time status updates
- Cancel/retry actions

### queues/

- Queue health metrics
- Job counts by status
- Pause/resume queue actions
- Clear completed jobs

### browser/

- Browser instance status
- Pool utilization
- Instance lifecycle management

## Real-time Refresh Pattern

```typescript
// hooks.ts - Admin features use refetchInterval for live updates
export function useJobs() {
  return useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: () => apiClient.get(ADMIN_API.JOBS),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useQueues() {
  return useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => apiClient.get(ADMIN_API.QUEUES),
    refetchInterval: 3000, // More frequent for queue status
  });
}
```

## Common Modification Scenarios

| Scenario            | Files to Modify           | Notes                  |
| ------------------- | ------------------------- | ---------------------- |
| Add admin feature   | Create new directory      | Follow module pattern  |
| Add bulk action     | `api.ts`, `components/`   | Add mutation + button  |
| Change refresh rate | `hooks.ts`                | Adjust refetchInterval |
| Add filter          | `hooks.ts`, `components/` | Query params + UI      |

## UI Patterns

### Status Rendering

```typescript
// Use lib/job-utils.tsx for consistent status display
import { getJobStatusBadge } from '@/lib/job-utils'

<StatusBadge variant={getJobStatusBadge(job.status)}>
  {job.status}
</StatusBadge>
```

### Data Tables

All list views use DataTable from @aiget/ui with:

- Sorting
- Pagination
- Row actions

## Dependencies

All features use:

- `@tanstack/react-query` - Data fetching with polling
- `@aiget/ui` - UI components
- `../lib/api-client` - HTTP client
- `../lib/api-paths` - Endpoint constants
- `../lib/job-utils` - Status rendering utilities
