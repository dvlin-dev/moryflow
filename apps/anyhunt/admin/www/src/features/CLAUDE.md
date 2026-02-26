# Admin Features

> ⚠️ 本目录结构变更时，必须同步更新此文档。

## 概览

管理后台的功能模块集合，按监控/运营领域拆分，并通过 React Query 轮询刷新。

## 最近更新

- Users Feature：`UserCreditsSheet` 多状态区域（用户摘要/充值记录）统一改为状态片段化 `render...ByState + switch`，移除链式三元
- Logs Feature：补齐查询错误态文案、筛选时间统一 ISO UTC 转换、`errorOnly` 请求参数显式映射为 `'true'`
- Logs Feature：新增统一请求日志能力（requests/overview/users/ip）
- Admin Features 图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- LLM Feature：新增 presets API + model capabilities/reasoning/tiers 支持
- Feature types 与 API 返回结构改为 raw JSON + RFC7807（移除 success/data 包装）
- LLM Feature：capabilities/Reasoning 解析工具补齐格式化与校验规则

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

| 功能              | 说明                        | API 入口                       |
| ----------------- | --------------------------- | ------------------------------ |
| `dashboard/`      | 系统概览                    | `/api/v1/admin/dashboard`      |
| `users/`          | 用户管理（含 Credits 充值） | `/api/v1/admin/users`          |
| `subscriptions/`  | 订阅管理                    | `/api/v1/admin/subscriptions`  |
| `orders/`         | 订单管理                    | `/api/v1/admin/orders`         |
| `jobs/`           | 任务监控                    | `/api/v1/admin/jobs`           |
| `queues/`         | 队列监控                    | `/api/v1/admin/queues`         |
| `browser/`        | 浏览器池状态                | `/api/v1/admin/browser`        |
| `logs/`           | 请求日志与行为分析          | `/api/v1/admin/logs/*`         |
| `llm/`            | LLM Providers/Models 配置   | `/api/v1/admin/llm/*`          |
| `digest-topics/`  | Digest 话题管理             | `/api/v1/admin/digest/topics`  |
| `digest-reports/` | Digest 举报管理             | `/api/v1/admin/digest/reports` |
| `digest-welcome/` | Welcome 配置                | `/api/v1/admin/digest/welcome` |

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
- 图标统一 Lucide（`lucide-react`），直接组件调用
