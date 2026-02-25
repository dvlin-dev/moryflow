---
title: 'API Client 统一封装方案（Anyhunt + Moryflow）'
date: 2026-01-26
scope: api-client
status: draft
---

# API Client 统一封装方案（Anyhunt + Moryflow）

## 背景

Anyhunt 与 Moryflow 的前端（Web/PC/React Native）目前存在多套 fetch 封装与分散的 API 调用入口，导致：

- 行为不一致：错误结构、401 刷新策略、JSON 解包逻辑分散。
- 重复代码多：console/admin/www/admin/pc/mobile 都有“相似但不同”的 client。
- 调试成本高：请求失败时缺少统一的错误类型与上下文。
- 对平台差异缺少统一抽象：Web cookie/Device refresh/secure storage 各自实现。

## 现状梳理（调用点清单）

### Anyhunt

- `apps/anyhunt/www/src/lib/api-client.ts`：带 refresh 的 client（Bearer + cookie）。
- `apps/anyhunt/www/src/lib/auth-session.ts`：refresh/access token 内存态调度。
- `apps/anyhunt/www/src/lib/api.ts`：Demo API，直接 fetch + 手写错误处理。
- `apps/anyhunt/www/src/lib/digest-api.ts`：Digest public API，直接 fetch + 手写错误处理。
- `apps/anyhunt/www/src/features/*/api.ts`：使用 `apiClient` 的业务层。
- `apps/anyhunt/console/src/lib/api-client.ts`：Console client（Bearer + refresh）。
- `apps/anyhunt/console/src/stores/auth.ts`：refresh + 认证态。
- `apps/anyhunt/admin/www/src/lib/api-client.ts`：Admin client（Bearer + refresh）。
- `apps/anyhunt/admin/www/src/stores/auth.ts`：refresh + 认证态。

### Moryflow

- `apps/moryflow/admin/src/lib/api-client.ts`：Admin client（Bearer + refresh）。
- `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx`：直接 fetch（stream / retry）。
- `apps/moryflow/mobile/lib/cloud-sync/api-client.ts`：移动端 Cloud Sync client（timeout + refresh）。
- `apps/moryflow/mobile/lib/server/auth-session.ts`：移动端 refresh/session。
- `apps/moryflow/pc/src/renderer/lib/server/api.ts`：使用 `@moryflow/api` 的 client factory。
- `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`：桌面端 refresh/session。
- `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`：主进程 Cloud Sync client。
- `packages/api/src/client/create-client.ts`：Moryflow Server API client factory（含 plugin）。

## 目标

- 统一 fetch 行为（错误结构、401 刷新、JSON 解包、超时/取消）。
- 明确跨平台差异：Web cookie / Device refresh / RN 安全存储 / Electron IPC。
- 将“请求封装”和“业务 API”分层，避免业务代码直接 fetch。
- 兼容流式响应与文件下载（返回 Response/Blob）。
- 以 SRP 为核心，易于测试与替换。

## 非目标

- 不引入 axios（继续基于 fetch）。
- 不做历史兼容（旧封装与重复代码在迁移后直接删除）。
- 不在 client 内引入缓存策略（缓存交给 React Query / SWR 层）。

## 统一响应规范（最终决策）

**目标**：两条业务线统一为“标准 HTTP + raw JSON 成功体 + RFC7807 错误体”。

### 成功响应（raw JSON）

- 直接返回资源 JSON（不包 `success`/`data`）。
- 列表用 `{ items, page, limit, total, totalPages }` 等业务自然结构。
- 通过 HTTP 状态码表达语义（200/201/204）。

### 错误响应（RFC7807）

- `Content-Type: application/problem+json`
- 错误体建议字段：

```json
{
  "type": "https://anyhunt.app/errors/UNAUTHORIZED",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing access token",
  "code": "UNAUTHORIZED",
  "requestId": "..."
}
```

**设计理由**（架构视角）：

- 让 HTTP 状态码表达成功/失败，客户端解析更直接。
- 与流式/文件下载天然兼容（无需跳过封装）。
- 更符合 OpenAPI/REST 工具链的默认期待。
- 非 JSON/空 body 时采用 fallback，避免解析失败导致二次异常。

### requestId 约定

- 后端为每个请求生成 `X-Request-Id` 响应头（或沿用上游网关传入值）。
- RFC7807 错误体中同步写入 `requestId` 字段，便于前端/日志对齐。

### 422/400 校验错误示例

建议在 `detail` 外补充结构化字段，便于表单级别映射：

```json
{
  "type": "https://anyhunt.app/errors/VALIDATION_ERROR",
  "title": "Validation error",
  "status": 422,
  "detail": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "...",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password is too short" }
  ]
}
```

**为什么是数组？**

- 表单可能同时存在多个字段错误（例如 email + password），数组能一次返回完整错误集合。
- 前端更容易做字段级映射与批量渲染（按 field 分组）。

**前端展示建议**

- 表单：将 `errors` 转成 `{ [field]: message }`，直接喂给表单组件的错误状态。
- 通用提示：若无法映射字段，按顺序拼接成列表或 toast 展示。

## 统一方案（分层架构）

### 1) 核心 HTTP 客户端（packages/http-client）

**职责**：只处理“HTTP 请求 + 解析 + 统一错误”。不关心业务路径、不直接依赖任何产品。

**核心能力**

- `baseUrl` + `defaultHeaders` + `credentials`
- `timeoutMs`（AbortController）
- `responseType`：`json` | `text` | `blob` | `raw`
- `requestId`（用于排查）
- `plugins`（onRequest/onResponse/onError）
- `HttpError`（status/code/message/details/url）

**建议接口**

```ts
createHttpClient({
  baseUrl,
  defaultHeaders,
  credentials,
  timeoutMs,
  plugins,
});

client.request<T>({
  path,
  method,
  query,
  body,
  headers,
  responseType,
});
```

### 2) 响应解析策略（统一 raw + RFC7807）

两条业务线统一为 raw JSON + RFC7807 错误体，**不再使用** `success/data/error` 封装。

客户端只需：

```ts
if (!response.ok) throw ProblemError;
return response.json();
```

如需兼容流式/文件，显式选择 `responseType: 'raw' | 'blob'` 即可。

不做过渡适配：历史 envelope 直接删除，客户端不再保留兼容逻辑。

设计一个 `responseParser`，由产品适配层提供（只处理 raw JSON → 业务结构）：

```ts
parseResponse<T>(response, json): T;
```

这样 “HTTP client 只负责网络/异常”，而 “产品适配层只做必要的结构转换”。

### 3) Auth 插件（token + refresh）

**统一语义**

- `tokenProvider.getToken(): string | null | Promise<string | null>`
- `refreshToken(): Promise<boolean>`（single-flight）
- `onUnauthorized(): void`（清理/跳转）

**策略**

- 401 只允许刷新重试一次
- refresh 不成功 → 清空本地认证态 + 触发 logout
- 请求前可检查 access token 即将过期并提前 refresh

### 4) 平台存储与认证适配（Web/PC/RN）

- **Web**：
  - access token：Zustand + persist（localStorage）
  - refresh token：HttpOnly cookie
  - API client：`credentials: 'include'`

- **React Native（Expo）**：
  - access token：Zustand + persist（expo-secure-store）
  - refresh token：SecureStore（不放入 store）
  - API client：header `X-App-Platform`

- **PC（Electron）**：
  - access token：Renderer Zustand + persist（IPC 到主进程安全存储）
  - refresh token：主进程安全存储（keytar）
  - API client：Renderer 只读 token，刷新通过 IPC 触发

### 5) 业务 API 层（apps/_/features/_/api.ts）

- 只暴露“业务语义”的函数，不暴露底层 fetch。
- 统一依赖 `apiClient`/`httpClient`。
- 所有 API 调用必须集中到该层，组件不直接 fetch。

### 6) React Query 使用层（Web/PC/RN 统一策略）

**职责**：管理服务端状态（缓存、去重、重试、失效），不直接处理鉴权与 refresh。queryFn 永远调用业务 API 层（不直接 fetch）。

**统一规范**

- `QueryClient` 全局唯一（应用入口注入）。
- queryFn 只依赖 `features/*/api.ts`，禁止在组件内手写 fetch。
- `retry`、`staleTime`、`gcTime` 基于业务类型统一设置。
- 401 的处理在 client/auth 层完成，React Query 只负责 UI 状态。
- streaming/下载任务不纳入 React Query。

**Web（Anyhunt www / Console / Admin）**

```tsx
// src/app/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

```tsx
// src/app/root.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';

export function AppRoot() {
  return <QueryClientProvider client={queryClient}>{/* routes */}</QueryClientProvider>;
}
```

```ts
// src/features/digest/queries.ts
import { useQuery } from '@tanstack/react-query';
import { getInboxStats } from './api';

export const useInboxStats = () =>
  useQuery({
    queryKey: ['digest', 'inbox', 'stats'],
    queryFn: getInboxStats,
    staleTime: 1000 * 10,
  });
```

**PC（Electron renderer）**

- QueryClient 放在 renderer 入口，复用 Web 的 hooks 与 queryKey。
- 与主进程通信/IPC 不放在 queryFn 内，仍通过业务 API 封装。

```tsx
// renderer/app/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Mobile（React Native / Expo）**

- 使用 React Query + NetInfo 绑定离线状态。
- 缓存策略保守，避免离线误判刷新风暴。

```tsx
// app/query-client.ts
import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? true);
  })
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});
```

### 7) Streaming / File / Long-poll

- **Streaming**：`responseType: 'raw'`，上层自行处理 `ReadableStream`。
- **File**：`responseType: 'blob'`。
- **Long-poll**：由业务层自行控制 AbortController。

## 复用策略（按业务线收敛）

### Moryflow（必须跨端复用）

- **复用目标**：PC + Mobile + Web Admin 共享一套 client 与 query 基建。
- **建议路径**：
  - 以 `packages/api` 为“语义层”入口，抽出 request 实现到 `packages/http-client`。
  - PC/Mobile/Admin 的业务 API 只依赖语义层，避免重复封装。
  - queryKey 与 hooks 由 `packages/moryflow-query`（或 app 内共享目录）统一管理。

### Anyhunt（必须跨端复用）

- **复用目标**：www + console + admin 共享同一 Anyhunt client + query 规范。
- **建议路径**：
  - 新增 `packages/anyhunt-api`（或在 apps/anyhunt 下集中路径常量与 client）。
  - www/console/admin 的 `features/*/api.ts` 保持一致风格与错误结构。
  - queryKey 与 hooks 统一到 `apps/anyhunt/shared/queries` 或独立包。

### Anyhunt 与 Moryflow 是否复用

- **结论**：只复用 **core transport 层**（`packages/http-client`）与通用工具；业务层不强行复用。
- **原因**：
  - 认证策略（域名、refresh 方式）与业务生命周期差异明显。
  - 强行共享业务层会增加耦合与迁移成本。

## 推荐包结构

```
packages/
  http-client/               # 通用 fetch 封装（core）
    src/
      client.ts
      errors.ts
      plugins/
        auth.ts              # token + refresh
        problem.ts           # RFC7807 解析
        logger.ts

  anyhunt-api/               # Anyhunt API 语义层（paths + client config）
    src/
      paths.ts               # /api/v1/... 常量
      client.ts              # createAnyhuntClient
      types.ts

  moryflow-api/              # Moryflow API 语义层（可基于 packages/api 迁移）
    src/
      client.ts              # createMoryflowClient
      types.ts
```

> Moryflow 已有 `packages/api`，建议在迁移时先复用 `packages/http-client`，逐步把 `packages/api` 的 request 实现收敛到 core。

## 关键规则（落地约束）

- 业务层禁止直接 fetch（特殊场景必须封装成 `api.ts` 并标注原因）。
- 所有 401 必须走统一 refresh 单航道（single-flight）。
- 所有响应错误必须映射为统一 `HttpError`/`ApiError`。
- 错误体必须符合 RFC7807（`application/problem+json`）。
- Web/Device 的 refresh token 永不进入 Zustand store。
- 不做旧封装兼容：迁移完成后删除重复实现。

## 测试建议

- 单元测试（core）
  - JSON/非 JSON 响应
  - 401 → refresh → retry
  - timeout → AbortError
  - RFC7807 解析与非 JSON fallback

- 业务层测试
  - raw JSON 解析
  - RFC7807 错误映射

## 一次性执行计划（全量切换）

1. **服务端统一错误体**
   - Anyhunt/Moryflow 统一使用 RFC7807 错误响应结构。
   - 统一 `HttpException` 过滤器输出 `application/problem+json`。
2. **移除 envelope**
   - Anyhunt Server 移除全局 `ResponseInterceptor` 包裹逻辑。
   - Moryflow Server 保持 raw JSON（无需新增包装）。
3. **客户端统一解析**
   - Anyhunt/Moryflow 前端 client 全部改为 raw JSON 解析。
   - 统一错误类型（ProblemError）与状态码映射。
4. **业务 API 层改造**
   - 所有 `features/*/api.ts` 改为不解包 `data`。
   - 清理 `success` 判断与多余的 envelope 类型定义。
5. **React Query 层同步**
   - queryFn 直接使用新的业务 API。
   - 统一 QueryClient 默认配置（staleTime/retry）。
6. **对外文档与示例更新**
   - Anyhunt Docs 示例移除 `success/data`。
   - 错误处理示例改为 RFC7807。
7. **测试与验收**
   - 单元测试：error body/401 refresh/streaming。
   - 端到端：核心页面首屏与错误提示。

## 风险与注意事项

- 需要全量替换 `success/data` 依赖，否则会导致解析失败。
- Electron 主进程 token 存储需要 IPC 边界与安全审计。
- Streaming 请求不能被强制 JSON 解析，需显式 `responseType: 'raw'`。

## 参考

- `docs/architecture/auth/access-token-storage-plan.md`（token 存储与 refresh 规则）
- `packages/api/src/client/create-client.ts`（已有 client 工厂）
