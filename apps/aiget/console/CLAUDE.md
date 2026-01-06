# Console

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Aiget Dev 用户控制台，用于管理 API Key、查看用量、测试抓取能力与配置 Webhook。基于 React + Vite。

## 职责

- 用量与额度概览
- API Key 管理（创建/删除/查看）
- 抓取/截图测试（Playground）
- Webhook 配置
- 账户设置

## 约束

- 使用 SessionGuard 认证（基于 Cookie）
- API 调用统一走 `/api/v1/*`
- Zustand 管理登录状态，React Query 管理数据
- UI 风格：直角组件 + 橙色强调

## 目录结构

| 目录          | 说明                             |
| ------------- | -------------------------------- |
| `pages/`      | 页面级路由组件                   |
| `features/`   | 功能模块（hooks/API/components） |
| `components/` | 通用布局与 UI 组件               |
| `lib/`        | 工具库、API 客户端               |
| `stores/`     | Zustand 状态                     |
| `constants/`  | 常量                             |
| `styles/`     | 全局样式                         |

## 功能列表

| 功能                | 路径                | 说明           |
| ------------------- | ------------------- | -------------- |
| `api-keys/`         | `/api-keys`         | API Key 管理   |
| `playground/`       | `/playground`       | 抓取/截图测试  |
| `screenshots/`      | `/screenshots`      | 截图历史       |
| `webhooks/`         | `/webhooks`         | Webhook 配置   |
| `settings/`         | `/settings`         | 账户设置       |
| `embed-playground/` | `/embed-playground` | Embed 脚本测试 |
| `auth/`             | `/login`            | 登录表单       |

## Feature Module Structure

```
feature-name/
├── api.ts           # API calls (React Query mutations)
├── types.ts         # Feature-specific types
├── hooks.ts         # Custom hooks (React Query queries)
├── components/      # Feature components
└── index.ts         # Exports
```

## Key Files

| File                               | Description                                |
| ---------------------------------- | ------------------------------------------ |
| `lib/api-client.ts`                | HTTP client with auth, response unwrapping |
| `lib/api-paths.ts`                 | Centralized API endpoint constants         |
| `stores/auth.store.ts`             | Zustand auth state                         |
| `components/layout/MainLayout.tsx` | App shell with sidebar                     |
| `components/layout/AppSidebar.tsx` | Navigation sidebar                         |

## Common Modification Scenarios

| Scenario            | Files to Modify          | Notes                         |
| ------------------- | ------------------------ | ----------------------------- |
| Add new page        | `pages/`, routing config | Create page + route           |
| Add new feature     | `features/*/`            | Create api, hooks, components |
| Add API endpoint    | `lib/api-paths.ts`       | Add to CONSOLE_API object     |
| Change layout       | `components/layout/`     | MainLayout, Sidebar           |
| Add form validation | `lib/validations/`       | Zod schemas                   |

## Routing

```tsx
// React Router v6 with protected routes
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/api-keys" element={<ApiKeysPage />} />
  ...
</Route>
```

## API Patterns

```typescript
// lib/api-paths.ts
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
  ...
} as const

// features/api-keys/api.ts
export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data) => apiClient.post(CONSOLE_API.API_KEYS, data)
  })
}
```

## Dependencies

```
console/
├── @aiget/ui - UI components
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
├── zod - Validation
└── sonner - Toast notifications
```

## Key Exports

This is a standalone app, no exports to other packages.
