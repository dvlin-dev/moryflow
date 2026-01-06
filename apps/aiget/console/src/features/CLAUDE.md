# Console Features

> ⚠️ 本目录结构变更时，必须同步更新此文档。

## 概览

控制台功能模块集合，每个功能模块自包含 API、hooks、类型与组件。

## 模块结构

```
feature-name/
├── api.ts           # React Query mutations
├── hooks.ts         # React Query queries
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── index.ts         # Exports
```

## 功能清单

| 功能                | 说明          | API 入口                      |
| ------------------- | ------------- | ----------------------------- |
| `api-keys/`         | API Key 管理  | `/api/v1/console/api-keys`    |
| `auth/`             | 登录表单      | `/api/v1/auth/*`（Auth SDK）  |
| `playground/`       | 抓取/截图测试 | `/api/v1/console/*`           |
| `screenshots/`      | 截图历史      | `/api/v1/console/screenshots` |
| `settings/`         | 账户设置      | `/api/v1/console/*`           |
| `webhooks/`         | Webhook 管理  | `/api/v1/console/webhooks`    |
| `embed-playground/` | Embed 测试    | Demo-only                     |

## 常用模式

### API Mutation

```typescript
export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data) => apiClient.post(CONSOLE_API.API_KEYS, data),
  });
}
```

### Query Hook

```typescript
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.get(CONSOLE_API.API_KEYS),
  });
}
```

## 依赖

- `@tanstack/react-query` - 数据请求
- `@aiget/ui` - UI 组件
- `../lib/api-client` - HTTP 客户端
- `../lib/api-paths` - API 常量
- `@aiget/auth-client` - Auth SDK
