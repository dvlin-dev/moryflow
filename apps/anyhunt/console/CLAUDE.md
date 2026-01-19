# Console

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Anyhunt Dev 用户控制台，用于管理 API Key、查看用量、测试抓取能力与配置 Webhook。基于 React + Vite。

## 职责

- 用量与额度概览
- API Key 管理（创建/删除/查看）
- Fetchx 抓取/截图测试（Playground）
- Agent Browser 闭环测试（独立模块）
- Memox 记忆管理（Memories/Entities/Graph）
- 文档入口（外链：`https://docs.anyhunt.app`）
- Webhook 配置
- 账户设置

## 约束

- Auth 使用 Better Auth 官方客户端（`/api/auth/*`，不带版本号）
- 认证通过 HttpOnly Cookie 承载，无需前端存储 token
- 登录与启动时通过 `/api/v1/user/me` 同步用户档案
- Docker 构建依赖 `packages/types`、`packages/ui`、`packages/embed`、`packages/embed-react`
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- API 路径统一走 `/api/v1/*`；生产环境默认请求 `https://server.anyhunt.app`（可用 `VITE_API_URL` 覆盖）
- 本地开发默认走 Vite proxy（`VITE_API_URL` 留空）
- Zustand 管理登录状态，React Query 管理数据
- UI 风格：Moryflow 圆角 + 柔和层级
- 组件统一从 `/ui` 导入
- 图标统一 Hugeicons（`@hugeicons/react` + `@hugeicons/core-free-icons`）
- 全局样式仅引入 `/ui/styles`，`@source` 只扫描本应用源码
- `src/components/ui` 允许多导出，`eslint.config.js` 已关闭 `react-refresh/only-export-components`
- Vite 需 `resolve.dedupe` React 依赖，避免生产环境 hooks 异常
- `@anyhunt/ui/ai/*` 通过 Vite/tsconfig alias 指向 `packages/ui/src/ai`，确保构建可解析
- 使用 TailwindCSS 4 + shadcn/ui 组件库
- 状态管理使用 Zustand
- 数据获取使用 TanStack Query
- 路由使用 TanStack Router
- 表单使用 react-hook-form + zod

## 环境变量

- `VITE_API_URL`：后端 API 地址（生产必填）
- `VITE_AUTH_URL`：Auth 服务地址（生产必填）
- 示例文件：`.env.example`

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

| 功能                        | 路径               | 说明                 |
| --------------------------- | ------------------ | -------------------- |
| `api-keys/`                 | `/api-keys`        | API Key 管理         |
| `scrape-playground/`        | `/fetchx/scrape`   | 单页抓取测试         |
| `crawl-playground/`         | `/fetchx/crawl`    | 多页爬取测试         |
| `map-playground/`           | `/fetchx/map`      | URL 发现测试         |
| `extract-playground/`       | `/fetchx/extract`  | AI 数据提取测试      |
| `search-playground/`        | `/fetchx/search`   | 网页搜索测试         |
| `embed-playground/`         | `/fetchx/embed`    | Embed 脚本测试       |
| `agent-browser-playground/` | `/agent-browser/*` | Agent + Browser 测试 |
| `memox/`                    | `/memox/*`         | Memox 记忆管理       |
| `webhooks/`                 | `/webhooks`        | Webhook 配置         |
| `settings/`                 | `/settings`        | 账户设置             |
| `auth/`                     | `/login`           | 登录表单             |

## 近期变更

- Agent Browser Playground 页面新增错误边界与分区组件，提升稳定性
- Agent Browser 从 Fetchx Playground 独立为模块导航
- Agent Browser 拆分为 Overview/Browser/Agent/Network/Storage/CDP 多页面
- Fetchx Playground 路由调整为 `/fetchx/*` 结构
- Console 构建统一使用 eventsource-parser v3 API，避免 SSE 解析类型不一致

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

| File                               | Description                        |
| ---------------------------------- | ---------------------------------- |
| `lib/api-client.ts`                | HTTP client with cookie auth       |
| `lib/api-paths.ts`                 | Centralized API endpoint constants |
| `lib/auth-client.ts`               | Better Auth client instance        |
| `stores/auth.ts`                   | Zustand auth state                 |
| `components/layout/MainLayout.tsx` | App shell with sidebar             |
| `components/layout/AppSidebar.tsx` | Navigation sidebar                 |

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
// Console 管理 API（Session 认证）
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
} as const;

// Fetchx 核心 API（API Key 认证）
export const FETCHX_API = {
  SCRAPE: '/api/v1/scrape',
  CRAWL: '/api/v1/crawl',
  MAP: '/api/v1/map',
  EXTRACT: '/api/v1/extract',
  SEARCH: '/api/v1/search',
} as const;

// features/api-keys/api.ts - Session 认证
export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data) => apiClient.post(CONSOLE_API.API_KEYS, data),
  });
}

// features/scrape-playground/api.ts - API Key 认证
export function useScrape(apiKey: string) {
  return useMutation({
    mutationFn: (request) => {
      const client = new ApiKeyClient({ apiKey });
      return client.post(FETCHX_API.SCRAPE, request);
    },
  });
}
```

## Dependencies

```
console/
├── /ui - UI components
├── @hugeicons/core-free-icons - Icon library
├── better-auth - Official Better Auth client
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
├── zod - Validation
└── sonner - Toast notifications
```

## Key Exports

This is a standalone app, no exports to other packages.
