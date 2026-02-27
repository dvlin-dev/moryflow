# Admin Features

> ⚠️ 本目录结构变更时，必须同步更新此文档。

## 概览

管理后台的功能模块集合，按监控/运营领域拆分，并通过 React Query 轮询刷新。

## 最近更新

- LLM Feature 合同化（2026-02-27）：`forms/model-form.ts` 改为 `thinking level` 驱动，删除 `KNOWN_REASONING_EFFORTS` 作为主事实源；`toLlmReasoningConfig` 集中完成 `level -> reasoning` 映射并保留 `rawConfig` 透传。
- Props 收敛专项：`digest-topics`（`AllTopicsListContent/FeaturedTopicsListContent`）、`queues`（`QueueJobsPanel`）、`users`（`GrantConfirmDialog`）完成 `viewModel + actions` 对象化收敛；调用页同步去胶水 props，保持多状态片段化 `switch` 分发
- 模块 C 收敛：`digest-topics/digest-reports/digest-welcome` 完成组件化拆分与状态片段化。新增 `digest-topics/constants.ts + list-states.ts + components/*`、`digest-reports/constants.ts + list-states.ts + forms/resolveReportForm.ts + components/*`，`DigestWelcomePage` 抽离 `useDigestWelcomePageController`，`WelcomeConfigCard` 抽离 `WelcomeActionEditorSection` 并统一 action 编辑逻辑；补齐 `digest-topics/list-states.test.ts`、`digest-reports/forms/resolveReportForm.test.ts`、`digest-welcome/welcome-card-states.test.ts`
- 模块 B 收敛：`jobs/queues/logs/browser/llm` 完成组件化拆分与状态片段化。新增 `jobs/components/*`（`JobsListContent`/`JobsTable`/`JobTimingBreakdown`/`JobJsonDisplay`）、`queues/constants.ts + components/*`、`logs/useRequestLogsFilters + components/*`、`browser/formatters.ts`、`llm/forms/* + useLlmPageController.ts`，并统一导出到各 feature `index.ts`
- Users Feature：`UserCreditsSheet` 拆分为容器 + `user-credits-sheet/*` 子组件（`UserSummaryCard`/`GrantCreditsFormCard`/`CreditGrantsCard`/`GrantConfirmDialog` + `schemas/types`），并复用共享 `list-state` 片段
- Users/Subscriptions/Orders：新增 `usePagedSearchQuery` 统一 `search/keyDown/page/filter` 编排，页面容器只保留查询与 mutation 编排
- Dashboard/Orders：新增 `formatters.ts` 作为展示格式化统一入口；Orders 新增 `constants.ts`/`formatters.ts` 收敛 badge/label/金额格式化
- Subscriptions Feature：`SubscriptionsPage` 拆分为容器 + `SubscriptionsListContent` + `SubscriptionsTable` + `SubscriptionEditDialog`，编辑表单迁移到 `RHF + zod/v3` 并新增 `schemas.ts`/`constants.ts`
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
