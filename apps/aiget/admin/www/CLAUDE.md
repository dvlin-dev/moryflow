# Admin

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Aiget Dev 管理后台，用于系统监控与运营管理，需管理员权限。基于 React + Vite。

## 职责

- 系统仪表盘与关键指标
- 用户管理
- 订单与订阅跟踪
- 任务监控（crawl、batch-scrape）
- 队列状态监控
- 浏览器池管理

## 约束

- 仅管理员可访问（Auth Facade + isAdmin）
- Auth 统一使用 `@aiget/auth-client`（`/api/v1/auth/*`）
- Web：access token 仅内存；refresh token 由 HttpOnly Cookie 承载
- API 路径统一走 `/api/v1/admin/*`；生产环境默认请求 `https://aiget.dev`（可用 `VITE_API_URL` 覆盖）
- 本地开发默认走 Vite proxy（`VITE_API_URL` 留空），401 时触发 refresh 重试一次
- 监控页面需要定时刷新
- UI 风格：直角组件 + 橙色强调

## 目录结构

| 目录          | 说明                             |
| ------------- | -------------------------------- |
| `pages/`      | 页面级路由组件                   |
| `features/`   | 功能模块（hooks/API/components） |
| `components/` | 通用布局组件                     |
| `lib/`        | 工具库、API 客户端               |
| `stores/`     | Zustand 状态                     |

## 功能列表

| 功能             | 路径             | 说明                       |
| ---------------- | ---------------- | -------------------------- |
| `dashboard/`     | `/`              | 系统概览与统计             |
| `users/`         | `/users`         | 用户管理                   |
| `subscriptions/` | `/subscriptions` | Subscription list          |
| `orders/`        | `/orders`        | Order history              |
| `jobs/`          | `/jobs`          | Crawl/batch job monitoring |
| `queues/`        | `/queues`        | BullMQ queue status        |
| `browser/`       | `/browser`       | Browser pool instances     |

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

| File                               | Description                     |
| ---------------------------------- | ------------------------------- |
| `lib/api-client.ts`                | HTTP client with auth + refresh |
| `lib/api-paths.ts`                 | Admin API endpoint constants    |
| `lib/auth-client.ts`               | Auth SDK instance               |
| `lib/auth-utils.ts`                | Auth user mapping helpers       |
| `lib/job-utils.tsx`                | Job status rendering utilities  |
| `stores/auth.ts`                   | Admin auth state                |
| `components/layout/MainLayout.tsx` | Admin shell layout              |

## Pages

| Page                | Description                  |
| ------------------- | ---------------------------- |
| `DashboardPage`     | System metrics and overview  |
| `UsersPage`         | User list with search/filter |
| `SubscriptionsPage` | Active subscriptions         |
| `OrdersPage`        | Order history and details    |
| `JobsPage`          | Running/completed jobs       |
| `JobDetailPage`     | Individual job details       |
| `QueuesPage`        | Queue health and metrics     |
| `BrowserPage`       | Browser instance status      |
| `ErrorsPage`        | System error logs            |
| `LoginPage`         | Admin login                  |

## Common Modification Scenarios

| Scenario               | Files to Modify       | Notes                  |
| ---------------------- | --------------------- | ---------------------- |
| Add admin page         | `pages/`, routing     | Create page + route    |
| Add monitoring feature | `features/*/`         | api, hooks, components |
| Add bulk action        | `features/*/api.ts`   | Add mutation           |
| Add real-time refresh  | `features/*/hooks.ts` | refetchInterval option |

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
├── @aiget/auth-client - Auth SDK
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
└── recharts - Dashboard charts
```

## Key Exports

This is a standalone app, no exports to other packages.
