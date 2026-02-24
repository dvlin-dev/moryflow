# Admin

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Anyhunt Dev 管理后台，用于系统监控与运营管理，需管理员权限。基于 React + Vite。

## 最近更新

- Logs：筛选时间统一转 ISO UTC（带时区），补齐查询失败错误态展示，避免“请求失败显示为空数据”
- 新增 Unified Logs 模块：`/logs/requests`、`/logs/users`、`/logs/ip`（请求明细、用户分析、IP 监控）
- LLM Model 弹窗修复 Raw config 标签使用 Label，避免 useFormField 上下文报错
- 管理后台下拉/折叠箭头改为 ChevronDown（无中轴）
- 管理后台图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- Admin API client 切换 raw JSON + RFC7807 错误体解析（移除 success/data 包装）
- Admin API client 对非 JSON 响应抛出 `UNEXPECTED_RESPONSE`
- 补齐 API client 非 JSON 回归测试，新增 `test:unit`
- LLM 配置对齐 Moryflow：Provider presets + Model 价格/等级/上下文/能力/Reasoning
- LLM Provider/Model 弹窗扩展能力字段（raw config、tiers、token limits）
- LLM Model 弹窗修复 reasoning raw config 状态初始化与格式化
- LLM Model 弹窗补齐 raw config JSON object 校验
- Session 路由统一改为 `/api/v1/app/user/me`

## 职责

- 系统仪表盘与关键指标
- 用户管理
- 内部测试：手动充值 Credits
- 订单与订阅跟踪
- 任务监控（crawl、batch-scrape）
- 队列状态监控
- 浏览器池管理
- 统一请求日志（行为分析 / 错误排查 / IP 监控）

## 约束

- 仅管理员可访问
- Auth 使用 access JWT + refresh rotation（`/api/auth/*`，不带版本号）
- refresh 通过 HttpOnly Cookie 承载，access 仅内存保存（Zustand）
- 登录与启动时先 `POST /api/auth/refresh` 获取 access，再通过 `/api/v1/app/user/me` 同步用户档案（含 isAdmin）
- `401 token_expired` 只允许刷新一次并重试原请求
- Docker 构建依赖 `packages/types`、`packages/ui`、`packages/tiptap`（Welcome Markdown Editor）
- TipTap 统一从 `@anyhunt/tiptap` 根入口导入；样式仅引入 `@anyhunt/tiptap/styles/notion-editor.scss`（禁止深路径导入）
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- API 路径统一走 `/api/v1/admin/*`；生产环境默认请求 `https://server.anyhunt.app`（可用 `VITE_API_URL` 覆盖）
- 本地开发默认走 Vite proxy（`VITE_API_URL` 留空）
- 监控页面需要定时刷新
- 列表分页统一使用 `page/limit`（不使用 `cursor/nextCursor`），UI 统一使用 `/ui` 的 `SimplePagination`
- UI 风格：Moryflow 圆角 + 柔和层级
- 组件统一从 `/ui` 导入
- 图标统一 Lucide（`lucide-react`），直接组件调用
- 图标名称必须来自 Lucide 实际导出（避免不存在的 Icon 名称）
- 全局样式仅引入 `/ui/styles`，`@source` 只扫描本应用源码
- 时间展示统一使用 `/ui/lib` 的 `formatRelativeTime`

## 环境变量

- `VITE_API_URL`：后端 API 地址（生产必填）
- 示例文件：`.env.example`

## 测试

- E2E：`pnpm test:e2e`（Playwright，启动本地 Vite dev server）
- 单元测试：`pnpm test:unit`

## 目录结构

| 目录          | 说明                             |
| ------------- | -------------------------------- |
| `pages/`      | 页面级路由组件                   |
| `features/`   | 功能模块（hooks/API/components） |
| `components/` | 通用布局组件                     |
| `lib/`        | 工具库、API 客户端               |
| `stores/`     | Zustand 状态                     |

## 功能列表

| 功能              | 路径              | 说明                       |
| ----------------- | ----------------- | -------------------------- |
| `dashboard/`      | `/`               | 系统概览与统计             |
| `users/`          | `/users`          | 用户管理                   |
| `subscriptions/`  | `/subscriptions`  | Subscription list          |
| `orders/`         | `/orders`         | Order history              |
| `jobs/`           | `/jobs`           | Crawl/batch job monitoring |
| `queues/`         | `/queues`         | BullMQ queue status        |
| `browser/`        | `/browser`        | Browser pool instances     |
| `logs/requests`   | `/logs/requests`  | Unified request logs       |
| `logs/users`      | `/logs/users`     | User behavior from logs    |
| `logs/ip`         | `/logs/ip`        | IP monitoring from logs    |
| `digest-topics/`  | `/digest/topics`  | Digest Topics 精选管理     |
| `digest-reports/` | `/digest/reports` | Digest 举报管理            |
| `digest-welcome/` | `/digest/welcome` | Digest Welcome 配置与页面  |
| `llm/`            | `/llm`            | LLM Providers/Models 配置  |

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

| File                               | Description                       |
| ---------------------------------- | --------------------------------- |
| `lib/api-base.ts`                  | API base URL resolver             |
| `lib/api-client.ts`                | HTTP client with access/refresh   |
| `lib/api-paths.ts`                 | Admin/user API endpoint constants |
| `lib/job-utils.tsx`                | Job status rendering utilities    |
| `stores/auth.ts`                   | Admin auth state (Zustand)        |
| `components/layout/MainLayout.tsx` | Admin shell layout                |

## Pages

| Page                | Description                        |
| ------------------- | ---------------------------------- |
| `DashboardPage`     | System metrics and overview        |
| `UsersPage`         | User list with search/filter       |
| `SubscriptionsPage` | Active subscriptions               |
| `OrdersPage`        | Order history and details          |
| `JobsPage`          | Running/completed jobs             |
| `JobDetailPage`     | Individual job details             |
| `QueuesPage`        | Queue health and metrics           |
| `BrowserPage`       | Browser instance status            |
| `ErrorsPage`        | System error logs                  |
| `LogsRequestsPage`  | Unified request log list           |
| `LogsUsersPage`     | User behavior analysis from logs   |
| `LogsIpPage`        | IP monitoring from request logs    |
| `DigestTopicsPage`  | Digest Topics featured management  |
| `DigestReportsPage` | Digest report moderation           |
| `DigestWelcomePage` | Digest welcome configuration       |
| `LlmPage`           | LLM providers/models configuration |
| `LoginPage`         | Admin login                        |

## Common Modification Scenarios

| Scenario               | Files to Modify       | Notes                    |
| ---------------------- | --------------------- | ------------------------ |
| Add admin page         | `pages/`, routing     | Create page + route      |
| Add monitoring feature | `features/*/`         | api, hooks, components   |
| Add bulk action        | `features/*/api.ts`   | Add mutation             |
| Adjust LLM config UX   | `pages/llm/`          | Dialog copy + validation |
| Add real-time refresh  | `features/*/hooks.ts` | refetchInterval option   |

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
├── /ui - UI components
├── lucide-react - Icon library
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
└── recharts - Dashboard charts
```

## Key Exports

This is a standalone app, no exports to other packages.
