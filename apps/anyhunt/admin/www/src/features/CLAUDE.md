# Admin Features

> ⚠️ 本目录结构变更时，必须同步更新此文档。

## 概览

管理后台的功能模块集合，按监控/运营领域拆分，并通过 React Query 轮询刷新。

## 模块结构

```
feature-name/
├── api.ts           # React Query mutations
├── hooks.ts         # React Query queries（支持 refetchInterval）
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── index.ts         # Exports
```

## 功能清单

| 功能              | 说明            | API 入口                       |
| ----------------- | --------------- | ------------------------------ |
| `dashboard/`      | 系统概览        | `/api/v1/admin/dashboard`      |
| `users/`          | 用户管理        | `/api/v1/admin/users`          |
| `subscriptions/`  | 订阅管理        | `/api/v1/admin/subscriptions`  |
| `orders/`         | 订单管理        | `/api/v1/admin/orders`         |
| `jobs/`           | 任务监控        | `/api/v1/admin/jobs`           |
| `queues/`         | 队列监控        | `/api/v1/admin/queues`         |
| `browser/`        | 浏览器池状态    | `/api/v1/admin/browser`        |
| `digest-topics/`  | Digest 话题管理 | `/api/v1/admin/digest/topics`  |
| `digest-reports/` | Digest 举报管理 | `/api/v1/admin/digest/reports` |
| `digest-welcome/` | Welcome 配置    | `/api/v1/admin/digest/welcome` |

## 轮询刷新示例

```typescript
export function useJobs() {
  return useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: () => apiClient.get(ADMIN_API.JOBS),
    refetchInterval: 5000,
  });
}
```

## 依赖

- `@tanstack/react-query` - 数据请求与轮询
- `/ui` - UI 组件
- `../lib/api-client` - HTTP 客户端
- `../lib/api-paths` - API 常量
- 图标统一 Hugeicons（`@hugeicons/react` + `@hugeicons/core-free-icons`）
