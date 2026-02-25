# Console

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Anyhunt Dev 用户控制台，用于管理 API Key、查看用量、测试抓取能力与配置 Webhook。基于 React + Vite。

## 最近更新

- Extract/Map/Search/Crawl/Scrape Playground B-4~B-6 修复完成：统一复用 `resolveActiveApiKeySelection`（active-key only），新增共享页面壳层 `PlaygroundPageShell`（Map/Search/Extract 接入），并完成模块级 `lint/typecheck/test:unit`
- Extract Playground B-3 修复完成：`ExtractPlaygroundPage` 拆分为容器 + 请求区组件 + 结果区组件，并通过 `lint/typecheck/test:unit`
- Scrape Playground B-2 修复完成：`ScrapeResult` 拆分为容器 + cards + tabs + view-model，移除默认 Tab 链式三元并通过 `lint/typecheck/test:unit`
- Scrape Playground B-1 修复完成：`ScrapeForm` 从单文件 519 行拆分为容器 + mapper + sections，折叠状态改为对象化管理，提升可维护性并通过 `lint/typecheck/test:unit`
- 组件状态渲染规范落地：`create-api-key-dialog`、`webhook-api-key-card`、`WebhooksPage` 等按“状态片段化 + `renderByState/switch`”重构，移除状态渲染型三元表达式
- Webhooks 组件可读性优化：`webhook-list-card` 将四种页面状态（loading/no-key/empty/ready）拆分为独立 UI 片段，并通过中间方法统一渲染，移除链式三元
- Webhooks/Settings/API Keys 组件优化：`WebhooksPage` 拆分为 key/list 子组件并改为判别式 dialog 状态；修复 Webhook API Key 失效选中漏洞（仅允许 active key）；`settings`、`api-keys create dialog`、`webhooks create/edit dialog` 统一迁移到 `react-hook-form + zod/v3`；新增 `webhooks/utils.test.ts` 回归测试并通过 `typecheck/test:unit`
- Build：Docker 依赖安装显式追加 `--filter @moryflow/types... --filter @moryflow/typescript-config...`，修复 `packages/types` 容器构建缺少 tsconfig 基座包导致的 `TS6053`
- Build：Docker 构建补齐根 `tsconfig.agents.json` 复制，修复 `packages/api` 容器构建时 `TS5083`（缺少 `tsconfig.agents.json`）报错
- Auth Store：修复 `onRehydrateStorage` 回调中的 `set` 作用域问题，改为通过 `useAuthStore.setState` 回填状态，避免 rehydrate 异常
- API Client：`api-key-client` 的错误分支补齐返回路径（控制流闭合），并统一 body 类型到 `ApiClientRequestOptions['body']`
- Memox：删除接口改用 `client.delete(...)`（不再调用不存在的 `request` 方法）
- Build：Docker 构建补齐 `packages/types -> packages/sync -> packages/api` 预构建链路，修复 `@moryflow/api/client` 解析失败
- Auth Store rehydrate 改为通过 store methods/setter 清理过期 token，确保清理结果持久化回 localStorage
- Console Auth 切换为 Token-first：`/login` 本地表单直连 `POST /api/v1/auth/sign-in/email`，本地持久化 `access+refresh`
- `stores/auth.ts` 引入 refresh mutex 与 body refresh（`POST /api/v1/auth/refresh` 传 `refreshToken`），移除 Cookie 会话依赖
- Agent Browser Playground 聊天 transport 改为官方 `DefaultChatTransport`，删除自定义 SSE parser 与 `eventsource-parser` 依赖
- Streamdown 升级至 v2.2：Agent Browser Playground 流式输出启用逐词动画（仅最后一条 assistant 文本段；样式由 `@moryflow/ui/styles` 注入）
- Console 移除 assistant-ui 直连依赖与 adapter，滚动交互继续在 `@moryflow/ui` 内复刻
- Console 统一将 ArrowLeft/ArrowRight 替换为 ChevronLeft/ChevronRight（无中轴）
- Agent Browser Playground 下拉箭头改为 ChevronDown（无中轴）
- 控制台图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- API client 对非 JSON 响应抛出 `UNEXPECTED_RESPONSE`，避免静默失败
- 补齐 API client 非 JSON 响应回归测试，新增 `test:unit` 脚本
- Memox Playground 表单修复 FormField 上下文错误，并补齐回归测试
- 测试环境补齐 ResizeObserver/matchMedia mock，避免 UI 组件报错
- Playground/管理页统一改为 API Key 直连公网 API（Bearer）
- API Key 列表返回明文 key，前端统一脱敏展示与复制
- Session 路由统一改为 `/api/v1/app/*`（API Keys/User/Payment）
- Agent Browser Playground 消息列表回归经典 chat（Viewport Following）：发送仅保证“用户消息 + AI loading”在底部可见（一次 smooth），不再发送贴顶
- Agent Browser Playground loading 图标与 AI 文案起始对齐，模拟消息气泡

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

- Auth 使用 access JWT + refresh rotation（`/api/v1/auth/*`，不带版本号）
- 登录通过 `POST /api/v1/auth/sign-in/email` 直接获取 `accessToken + refreshToken`
- refresh 仅通过 body `refreshToken` 调用 `POST /api/v1/auth/refresh`，并启用 refresh rotation
- access/refresh 与过期时间持久化到 localStorage（Zustand persist）
- 启动优先复用本地 access；仅在 access 过期或临近过期时刷新
- `401 token_expired` 只允许刷新一次并重试原请求
- `/login` 为控制台本地登录页，支持 `next` 回跳（禁止回跳 `/login`）
- Docker 构建依赖 `packages/types`、`packages/ui`、`packages/embed`、`packages/embed-react`
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- Session 相关 API 统一走 `/api/v1/app/*`；公网能力走 `/api/v1/*`
- 生产环境默认请求 `https://server.anyhunt.app`（可用 `VITE_API_URL` 覆盖）
- Playground/管理页默认选中第一把 active API Key
- Agent Playground：统一 `POST /api/v1/agent`（默认 SSE，`stream=false` 返回 JSON）
- Agent Playground 入参使用 `output`（`text`/`json_schema`），不再发送旧的 `schema` 字段；模型/Provider 由 API Key 策略决定（不允许请求侧选择）
- 本地开发默认走 Vite proxy（`VITE_API_URL` 留空）
- Zustand 管理登录状态，React Query 管理数据
- UI 风格：Moryflow 圆角 + 柔和层级
- 组件统一从 `/ui` 导入
- 图标统一 Lucide（`lucide-react`），直接组件调用
- 全局样式仅引入 `/ui/styles`，`@source` 只扫描本应用源码
- `src/components/ui` 允许多导出，`eslint.config.js` 已关闭 `react-refresh/only-export-components`
- Vite 需 `resolve.dedupe` React 依赖，避免生产环境 hooks 异常
- `@moryflow/ui/ai/*` 通过 Vite/tsconfig alias 指向 `packages/ui/src/ai`，确保构建可解析
- 使用 TailwindCSS 4 + shadcn/ui 组件库
- 状态管理使用 Zustand
- 数据获取使用 TanStack Query
- 路由使用 TanStack Router
- 表单使用 react-hook-form + zod

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
- Agent Browser 页面与 Playground 组件补齐 Header/PROTOCOL 规范
- Agent Browser 从 Fetchx Playground 独立为模块导航
- Agent Browser 拆分为 Overview/Browser/Agent/Network/Diagnostics/Storage/Profile/Streaming/CDP 多页面
- Agent Browser Playground 补齐 ActionBatch/Headers/Diagnostics/Profile/Streaming 表单与预览
- Agent Browser Agent 页面调整为纯聊天视图（消息列表 + 输入），API Key 自动选择并补充无 Key 引导
- Agent Browser Agent SSE 改为 `ai` 的 `UIMessageChunk` 单协议（`start/finish` + `text-*` + `tool-*`），transport 透传，避免双状态机
- Agent Browser 在 tool 边界结束当前文本段，形成多个 `text` part，与 tool part 按顺序交错展示
- Agent Browser Agent 页面消息列表与输入框切换为 `@moryflow/ui/ai/*` 组件，统一布局/Tool/Reasoning 渲染
- Agent Browser Agent 输入提交失败时保留文本并交由上层提示
- Fetchx Playground 路由调整为 `/fetchx/*` 结构
- Console Agent Browser 聊天流切换为官方 transport 协议栈（`ai`），不再维护本地 SSE 解析器
- Memox/Graph 表单使用 zod input/output 区分，修复 RHF resolver 类型冲突
- Graph 可视化回调统一为 NodeObject 入参，避免强类型不匹配
- Memox threshold 数字输入显式归一，避免 unknown value 类型报错
- Console API client 切换 raw JSON + RFC7807 错误体解析，auth store 同步收敛错误处理
- NavUser 增加 name/email fallback，避免用户信息未就绪导致 split 崩溃

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

| File                               | Description                         |
| ---------------------------------- | ----------------------------------- |
| `lib/api-base.ts`                  | API base URL resolver               |
| `lib/api-client.ts`                | HTTP client with access/refresh     |
| `lib/api-paths.ts`                 | Centralized API endpoint constants  |
| `stores/auth.ts`                   | Zustand auth state (access/refresh) |
| `components/layout/MainLayout.tsx` | App shell with sidebar              |
| `components/layout/AppSidebar.tsx` | Navigation sidebar                  |

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
// App 管理 API（Session 认证）
export const CONSOLE_API = {
  API_KEYS: '/api/v1/app/api-keys',
} as const;

// Webhook API（API Key 认证）
export const WEBHOOK_API = {
  WEBHOOKS: '/api/v1/webhooks',
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
├── lucide-react - Icon library
├── @tanstack/react-query - Data fetching
├── zustand - Auth state
├── react-router-dom - Routing
├── zod - Validation
└── sonner - Toast notifications
```

## Key Exports

This is a standalone app, no exports to other packages.
