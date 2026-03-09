---
title: Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client）
date: 2026-02-24
scope: apps/anyhunt/*, apps/moryflow/*, packages/api/*
status: completed
---

<!--
[INPUT]: 当前多端存在 Auth 与非 Auth 请求封装分散（store/context 直调 fetch、多套 client 并存；服务端出站请求也缺乏统一边界）
[OUTPUT]: 全量请求统一清单 + 分层重构方案 + 可执行步骤计划（零兼容）
[POS]: 全仓运行时请求统一工程化计划（Zustand + Methods + 函数式 API Client）

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Auth 与全量请求统一改造计划（Zustand + Methods + Functional API Client）

## 0. 冻结摘要（合并去重补充）

- 根因治理优先：禁止补丁式修复，先收敛事实源与协议边界。
- Store-first：共享业务状态统一 `Zustand Store + Methods + Functional API Client`。
- 共享业务状态禁止新增 React Context（Theme/i18n 等非业务上下文除外）。
- selector 禁止返回对象/数组字面量；`useSync*Store` 写入前必须先做 `shouldSync` 判断。
- 鉴权模式显式声明：`public | bearer | apiKey`。

## 1. 目标与约束

- 目标：统一为 `Zustand Store + 抽离方法（methods）` + 函数式 `apiClient`，去掉 Auth Context 顶层透传，并收敛所有运行时请求入口（不仅 Auth，包含服务端出站 HTTP 与实时通道）。
- 原则：最佳实践、模块化、单一职责、简单可读、无历史兼容。
- 非目标：不做旧接口/旧调用链兼容，不保留过渡层。
- 扫描口径：仅统计运行时网络请求；不统计测试代码、不统计 `code-example` 这类字符串模板、不把 Cloudflare Worker `fetch(request, env)` 入口签名当作“出站请求”。

## 2. 盘点结果（2026-02-24 全量扫描）

说明：本章以“transport-level 请求发起点”作为盘点粒度（即真正调用 `fetch/WebSocket` 的文件），不逐条枚举所有上层业务函数调用点。

## 2.1 应用覆盖矩阵（哪些应用纳入“全请求统一”）

| 应用                      | 角色                            | 是否纳入本次改造 | 结论                                                 |
| ------------------------- | ------------------------------- | ---------------- | ---------------------------------------------------- |
| `apps/anyhunt/server`     | 后端（入站 API + 出站 HTTP）    | 是               | 出站请求需统一到函数式 server HTTP client            |
| `apps/moryflow/server`    | 后端（入站 API + 出站 HTTP）    | 是               | 出站请求需统一到函数式 server HTTP client            |
| `apps/anyhunt/console`    | Web 消费方                      | 是               | store+请求混写，需拆分                               |
| `apps/anyhunt/admin/www`  | Web 消费方                      | 是               | store+请求混写，需拆分                               |
| `apps/anyhunt/www`        | Web 消费方                      | 是               | Context 透传 + session 请求编排混写，需拆分          |
| `apps/moryflow/admin`     | Web 消费方                      | 是               | store+请求混写，需拆分                               |
| `apps/moryflow/pc`        | Desktop 消费方                  | 是               | Context 透传 + session 请求编排混写，需拆分          |
| `apps/moryflow/mobile`    | Mobile 消费方                   | 是               | Membership Context 链 + session 请求编排混写，需拆分 |
| `apps/moryflow/vectorize` | 认证消费方（JWKS 验签）         | 跟随验证         | 保持 `/api/v1/auth/jwks` 契约不变即可                |
| `apps/moryflow/www`       | Web 消费方（下载清单请求）      | 是               | 非 Auth 请求需统一到函数式客户端                     |
| `apps/moryflow/docs`      | Docs Web 消费方（下载清单请求） | 是               | 非 Auth 请求需统一到函数式客户端                     |

确认本轮不纳入“全请求统一”的范围：

- `apps/anyhunt/docs`
- `apps/moryflow/site-template`
- `apps/moryflow/publish-worker`

## 2.2 Store 与请求混写（必须改造）

1. `apps/anyhunt/console/src/stores/auth.ts`
2. `apps/anyhunt/admin/www/src/stores/auth.ts`
3. `apps/moryflow/admin/src/stores/auth.ts`

当前问题（共同）：

- Zustand store 内直接 `fetch`（`sign-in`/`refresh`/`logout`/`me`）。
- 状态管理与请求协议耦合，难复用、难测试、难做策略统一。

## 2.3 状态模块与请求混写（非 Store，同样必须拆）

1. `apps/anyhunt/www/src/lib/auth-session.ts`
2. `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`
3. `apps/moryflow/mobile/lib/server/auth-session.ts`

当前问题（共同）：

- 同时负责 token 存储与网络请求，职责不单一。
- 刷新策略与状态更新分散，调用方难以统一。

## 2.4 Context + Hook 透传（与目标风格冲突）

Provider/Context 定义点：

1. `apps/anyhunt/www/src/lib/auth-context.tsx`
2. `apps/moryflow/pc/src/renderer/lib/server/context.tsx`
3. `apps/moryflow/mobile/lib/server/context.tsx`
4. `apps/moryflow/mobile/lib/contexts/auth.context.tsx`（兼容层）

Anyhunt WWW 消费点（`useAuth`）：

1. `apps/anyhunt/www/src/routes/login.tsx`
2. `apps/anyhunt/www/src/routes/register.tsx`
3. `apps/anyhunt/www/src/components/layout/Header.tsx`
4. `apps/anyhunt/www/src/components/reader/AccountSettingsDialog.tsx`
5. `apps/anyhunt/www/src/components/reader/side-panel/SidePanelHeader.tsx`
6. `apps/anyhunt/www/src/components/reader/side-panel/SidePanelUserMenu.tsx`
7. `apps/anyhunt/www/src/components/reader/SidePanel.tsx`
8. `apps/anyhunt/www/src/components/reader/UserMenu.tsx`
9. `apps/anyhunt/www/src/features/explore/ExploreCreateDialog.tsx`
10. `apps/anyhunt/www/src/features/explore/ExploreTopicsPane.tsx`
11. `apps/anyhunt/www/src/features/inbox/InboxPane.tsx`
12. `apps/anyhunt/www/src/features/subscriptions/SubscriptionsPane.tsx`

Moryflow PC 消费点（`useAuth`）：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`
2. `apps/moryflow/pc/src/renderer/components/chat-pane/index.tsx`
3. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx`
4. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/credit-packs-dialog.tsx`
5. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel.tsx`
6. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/subscription-dialog.tsx`
7. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/user-profile.tsx`
8. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`
9. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/membership-details.tsx`
10. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/provider-list.tsx`
11. `apps/moryflow/pc/src/renderer/workspace/components/sidebar/components/sidebar-tools.tsx`
12. `apps/moryflow/pc/src/renderer/workspace/hooks/use-require-login-for-site-publish.ts`

Moryflow Mobile 消费点（`useAuth/useMembership/useMembershipAuth`）：

1. `apps/moryflow/mobile/app/_layout.tsx`
2. `apps/moryflow/mobile/app/(settings)/index.tsx`
3. `apps/moryflow/mobile/app/(settings)/change-password.tsx`
4. `apps/moryflow/mobile/app/(settings)/delete-account.tsx`
5. `apps/moryflow/mobile/components/auth/sign-in-form.tsx`
6. `apps/moryflow/mobile/components/auth/sign-up-form.tsx`
7. `apps/moryflow/mobile/components/auth/verify-email-form.tsx`

## 2.5 Auth 请求调用点全量清单（运行时代码）

### A. 直接发起 Auth HTTP 请求（`fetch`）

1. `apps/anyhunt/www/src/lib/token-auth-api.ts`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/email-otp/verify-email`）
2. `apps/anyhunt/www/src/lib/auth-session.ts`（`/api/v1/auth/refresh`、`/api/v1/auth/logout`）
3. `apps/anyhunt/www/src/lib/auth-context.tsx`（`/api/v1/app/user/me`）
4. `apps/anyhunt/console/src/stores/auth.ts`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/refresh`、`/api/v1/auth/logout`、`/api/v1/app/user/me`）
5. `apps/anyhunt/admin/www/src/stores/auth.ts`（同上）
6. `apps/moryflow/admin/src/stores/auth.ts`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/refresh`、`/api/v1/auth/logout`、`/api/v1/admin/me`）
7. `apps/moryflow/pc/src/renderer/lib/server/auth-api.ts`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/email-otp/verify-email`）
8. `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`（`/api/v1/auth/refresh`、`/api/v1/auth/logout`）
9. `apps/moryflow/mobile/lib/server/auth-api.ts`（`/api/v1/auth/sign-in/email`、`/api/v1/auth/email-otp/verify-email`）
10. `apps/moryflow/mobile/lib/server/auth-session.ts`（`/api/v1/auth/refresh`、`/api/v1/auth/logout`）

### B. Better Auth Client 请求入口（同属 Auth 请求）

1. `apps/anyhunt/www/src/lib/auth-client.ts`
2. `apps/anyhunt/www/src/components/auth/register-form.tsx`
3. `apps/anyhunt/www/src/components/auth/forgot-password-form.tsx`
4. `apps/moryflow/pc/src/renderer/lib/server/client.ts`
5. `apps/moryflow/pc/src/renderer/lib/server/auth-api.ts`
6. `apps/moryflow/mobile/lib/server/auth-client.ts`
7. `apps/moryflow/mobile/lib/server/auth-api.ts`

### C. 间接触发 Auth 请求（刷新/续期链路）

1. `apps/anyhunt/www/src/lib/api-client.ts`
2. `apps/anyhunt/www/src/lib/auth-context.tsx`
3. `apps/anyhunt/console/src/lib/api-client.ts`
4. `apps/anyhunt/admin/www/src/lib/api-client.ts`
5. `apps/moryflow/admin/src/lib/api-client.ts`
6. `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx`
7. `apps/moryflow/pc/src/renderer/lib/server/api.ts`
8. `apps/moryflow/pc/src/renderer/lib/server/context.tsx`
9. `apps/moryflow/mobile/lib/server/api.ts`
10. `apps/moryflow/mobile/lib/server/context.tsx`
11. `apps/moryflow/mobile/lib/cloud-sync/api-client.ts`
12. `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts`
13. `apps/moryflow/mobile/lib/utils/speech-helper.ts`

### D. 业务触发入口层（调用 Auth 方法/Store Action）

1. `apps/anyhunt/console/src/App.tsx`（`bootstrap`）
2. `apps/anyhunt/console/src/pages/LoginPage.tsx`（`signIn`）
3. `apps/anyhunt/console/src/components/layout/nav-user.tsx`（`logout`）
4. `apps/anyhunt/admin/www/src/App.tsx`（`bootstrap`）
5. `apps/anyhunt/admin/www/src/pages/LoginPage.tsx`（`signIn`）
6. `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx`（`logout`）
7. `apps/anyhunt/www/src/components/auth/login-form.tsx`（`signInWithEmail`）
8. `apps/anyhunt/www/src/components/auth/register-form.tsx`（`verifyEmailOtpAndCreateSession`）
9. `apps/moryflow/admin/src/App.tsx`（`bootstrap`）
10. `apps/moryflow/admin/src/features/auth/components/login-form.tsx`（`signIn`）
11. `apps/moryflow/admin/src/components/layout/nav-user.tsx`（`logout`）
12. `apps/moryflow/pc/src/renderer/theme/index.ts`（`bootstrap`）
13. `apps/moryflow/pc/src/renderer/workspace/hooks/use-navigation.ts`（`bootstrap`）
14. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/login-panel.tsx`（`login/signUp/refresh`）
15. `apps/moryflow/pc/src/renderer/components/auth/otp-form.tsx`（`verifyEmailOTP/sendVerificationOTP`）
16. `apps/moryflow/mobile/components/auth/sign-in-form.tsx`（`login`）
17. `apps/moryflow/mobile/components/auth/sign-up-form.tsx`（`register`）
18. `apps/moryflow/mobile/components/auth/verify-email-form.tsx`（`verifyEmailOTP/sendVerificationOTP/refresh`）
19. `apps/moryflow/mobile/app/(settings)/delete-account.tsx`（`logout`）

### E. 服务侧 Auth 消费点（跟随验证）

1. `apps/moryflow/vectorize/src/middleware/auth.ts`（`/api/v1/auth/jwks`）

## 2.6 非 Auth 请求调用点全量清单（运行时代码）

Anyhunt：

1. `apps/anyhunt/console/src/features/playground-shared/api-key-client.ts`（API Key 模式调用）
2. `apps/anyhunt/www/src/lib/api.ts`（public demo API）
3. `apps/anyhunt/www/src/lib/digest-api.ts`（digest public API）
4. `apps/anyhunt/www/src/features/welcome/welcome.api.ts`（welcome public API）

Moryflow Admin：

1. `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx`（流式 chat completion）

Moryflow PC（renderer）：

1. `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/speech-helper.ts`（语音转录上传）

Moryflow PC（main）：

1. `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`
2. `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts`（预签名 URL 上传/下载）
3. `apps/moryflow/pc/src/main/site-publish/api.ts`
4. `apps/moryflow/pc/src/main/ollama-service/client.ts`
5. `apps/moryflow/pc/src/main/agent-runtime/tracing-setup.ts`

Moryflow Mobile：

1. `apps/moryflow/mobile/lib/cloud-sync/api-client.ts`
2. `apps/moryflow/mobile/lib/utils/speech-helper.ts`

Moryflow WWW / Docs：

1. `apps/moryflow/www/src/hooks/useDownload.ts`
2. `apps/moryflow/docs/src/components/download-buttons.tsx`

## 2.7 服务端出站 HTTP 请求调用点（运行时代码）

Anyhunt Server：

1. `apps/anyhunt/server/src/common/utils/ssrf-fetch.ts`（SSRF 受控抓取）
2. `apps/anyhunt/server/src/common/services/webhook.service.ts`（通用 webhook 发送）
3. `apps/anyhunt/server/src/digest/processors/webhook-delivery.processor.ts`（Digest webhook 投递）
4. `apps/anyhunt/server/src/demo/demo.service.ts`（公开 demo 代理调用）
5. `apps/anyhunt/server/src/search/search.service.ts`（搜索聚合调用）
6. `apps/anyhunt/server/src/browser/cdp/cdp-connector.service.ts`（Browserbase/browser-use/CDP 会话）
7. `apps/anyhunt/server/src/oembed/providers/base.provider.ts`（oEmbed provider 拉取）

Moryflow Server：

1. `apps/moryflow/server/src/vectorize/vectorize.client.ts`（Vectorize 服务调用）

说明：

- `apps/anyhunt/server/src/oembed/oembed.service.ts` 与 `oembed.controller.ts` 命中的 `fetch` 是方法名，不是 HTTP API `fetch()`；已从“出站请求”清单排除。
- `apps/moryflow/publish-worker/src/index.ts` 的 `fetch(request, env)` 是 Worker 入站处理器签名，不是出站请求调用。

## 2.8 非 HTTP 实时请求调用点（运行时代码）

Anyhunt Console：

1. `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-stream.ts`（`new WebSocket(streamToken.wsUrl)`）

说明：

- WebSocket 不纳入 `apiClient`（HTTP）实现，但必须纳入统一“方法层”编排，不允许在页面组件散落直连。

## 2.9 覆盖审计结果（自动比对）

审计命令（2026-02-24）：

- `rg -n "\\bfetch\\(" apps/anyhunt apps/moryflow ...` 与本文档路径清单做差集比对。
- `rg -n "new\\s+WebSocket\\(" apps/anyhunt apps/moryflow ...` 校验实时通道覆盖。

结果：

- 运行时 `fetch` 清单仅剩 2 个“非真实遗漏”：
  1. `apps/anyhunt/console/src/features/playground-shared/components/code-example.tsx`（示例代码字符串）
  2. `apps/anyhunt/server/src/oembed/oembed.controller.ts`（`fetch` 为方法名）
- `WebSocket` 运行时调用点共 1 个，已纳入 `2.8` 清单。

## 3. 重构目标架构（函数式统一版）

## 3.1 Auth 分层（保持）

每个应用的 auth 统一拆成 3 层：

1. `auth-store.ts`：只放状态与纯 setter，不发请求。
2. `auth-api.ts`：只放 HTTP/BETTER_AUTH 请求，不改 UI 状态。
3. `auth-methods.ts`：编排方法（`bootstrap/login/register/verify/refresh/logout/loadMe`），唯一可以同时访问 store 与 api。

## 3.2 API Client 统一风格（新增硬约束）

统一采用“函数式 `apiClient` + Promise 业务函数”：

```ts
// lib/api/client.ts
export const apiClient = createApiClient({ baseUrl, getAccessToken, onUnauthorized });

// features/jobs/api.ts
export async function getJob(id: string): Promise<JobDetail> {
  return apiClient.get<JobDetail>(`${ADMIN_API.JOBS}/${id}`);
}
```

强制约束（零兼容）：

1. 禁止使用 Class 风格 `ApiClient`。
2. 禁止使用 `createServerApiClient` 风格工厂 + `serverApi.user.xxx` 分组调用。
3. 禁止在组件/store/context 直接 `fetch`。
4. 业务 API 默认落在 `features/*/api.ts`；跨切面模块（如 auth/cloud-sync）可放 `lib/<domain>/api.ts`，但都必须导出 `Promise` 业务函数。
5. `apiClient` 仅负责 HTTP 与错误解析；auth 刷新编排统一走 `auth-methods`。

## 3.3 统一客户端职责边界

两层工厂，避免 auth 逻辑污染传输层：

1. `createApiTransport`（纯传输层，无 auth 语义）
   - 只做 URL/query/body/header/timeout/response 解析。
   - 统一处理 `application/problem+json`、`x-request-id`、非 JSON 响应保护。
   - 不直接依赖 store，不直接处理 refresh。
2. `createApiClient`（认证适配层，函数式）
   - 基于 transport 注入 `getAccessToken`、`onUnauthorized`（401 最多重试一次）。
   - 不包含业务 endpoint，不包含 UI 状态。
3. `auth-methods`
   - 提供 `getAccessToken/ensureAccessToken/refreshAccessToken/logout`。
   - 决定网络失败是否保留会话、何时清理 token。
4. `features/*/api.ts` 或 `lib/<domain>/api.ts`
   - 只包含业务语义函数，不包含 refresh/token 细节。

## 3.4 客户端能力契约（必须支持）

- 请求能力：
  - `get/post/put/patch/del`
  - `raw`（返回 `Response`）
  - `blob`
  - `stream`（SSE/ReadableStream，调用方可拿 `Response.body`）
- body 能力：
  - JSON body
  - FormData（禁止强制覆盖 `Content-Type`）
  - `Uint8Array/ArrayBuffer`（上传场景）
- 统一行为：
  - 支持 `query` 参数编码
  - 支持 `timeout` + `AbortController`
  - 401 最多一次重试
  - RFC7807 错误解析 + `requestId` 透传

## 3.5 鉴权模式规范（必须）

客户端必须显式声明鉴权模式，禁止隐式判断：

```ts
type AuthMode = 'public' | 'bearer' | 'apiKey';
```

- `public`：
  - 不注入 Authorization。
  - 禁止触发 refresh。
- `bearer`：
  - 通过 `getAccessToken` 注入 `Authorization: Bearer ...`。
  - 401 可触发一次 `onUnauthorized` 重试。
- `apiKey`：
  - 通过 `getApiKey` 注入 `Authorization: Bearer <apiKey>`。
  - 禁止触发 refresh。

## 3.6 服务端出站请求规范（必须）

- 所有服务端出站 HTTP 请求统一通过 `createServerHttpClient`（函数式）发起，禁止在业务 service 中直写 `fetch`。
- SSRF 场景必须通过单一受控入口（保留 `ssrf-fetch` 语义），并纳入统一客户端的 URL 校验策略。
- 统一错误模型：
  - 上游返回 RFC7807：原样透传 `status/code/requestId/detail`。
  - 非 RFC7807：包装为统一 `ExternalServiceError`，保留 `upstreamStatus` 与 `requestId`。
- 统一超时/重试：
  - 默认超时 + AbortController。
  - 禁止隐式无限重试；重试策略由调用方显式声明（例如 webhook 可重试，鉴权链路不可重试）。

## 3.7 实时通道请求规范（必须）

- WebSocket/SSE 统一走 `features/*/realtime.ts` 或 `lib/<domain>/realtime.ts` 的函数式入口。
- 页面/组件层禁止直接 `new WebSocket(...)`；必须通过方法层触发连接、重连、关闭。
- 与鉴权相关的实时连接，token 获取统一走 `auth-methods.getAccessToken()`，不绕过 store/methods。

## 4. 模块改造清单

## 4.1 Anyhunt Console/Admin（必须改）

改造对象：

- `apps/anyhunt/console/src/stores/auth.ts`
- `apps/anyhunt/admin/www/src/stores/auth.ts`
- `apps/anyhunt/console/src/lib/api-client.ts`
- `apps/anyhunt/admin/www/src/lib/api-client.ts`
- `apps/anyhunt/console/src/features/playground-shared/api-key-client.ts`
- `apps/anyhunt/console/src/features/agent-browser-playground/hooks/use-browser-stream.ts`
- `apps/anyhunt/console/src/features/**/api.ts`
- `apps/anyhunt/admin/www/src/features/**/api.ts`

改造方式：

- 拆出 `lib/auth/auth-api.ts`（请求）。
- 拆出 `lib/auth/auth-methods.ts`（编排）。
- store 仅保留 token/user 状态和 setter。
- `lib/api/client.ts` 改为函数式 `apiClient`，调用 `auth-methods.ensureAccessToken/handle401`，不直接碰 store 业务逻辑。
- 业务调用统一沉淀到 `features/*/api.ts`，导出 `Promise` 函数。
- API Key 调用链（Playground）统一复用函数式客户端的 `apiKey` 模式，不再保留单独实现。
- Browser Playground 的 WebSocket 连接迁移到 `features/agent-browser-playground/realtime.ts` 函数式入口，由方法层编排连接生命周期。

## 4.2 Moryflow Admin（必须改）

改造对象：

- `apps/moryflow/admin/src/stores/auth.ts`
- `apps/moryflow/admin/src/lib/api-client.ts`
- `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx`
- `apps/moryflow/admin/src/features/**/api.ts`

改造方式：

- 与 Console/Admin 同构：store 纯状态，methods 负责请求编排。
- `lib/api/client.ts` 改为函数式 `apiClient`。
- `chat-pane` 的流式请求改为通过业务 API 函数发起，401 重试收敛到客户端层。

## 4.3 Anyhunt WWW（必须改）

改造对象：

- `apps/anyhunt/www/src/lib/auth-context.tsx`（删除）
- `apps/anyhunt/www/src/routes/__root.tsx`（移除 `AuthProvider`）
- `apps/anyhunt/www/src/components/layout/Header.tsx`
- `apps/anyhunt/www/src/components/reader/AccountSettingsDialog.tsx`
- `apps/anyhunt/www/src/components/reader/side-panel/SidePanelHeader.tsx`
- `apps/anyhunt/www/src/components/reader/side-panel/SidePanelUserMenu.tsx`
- `apps/anyhunt/www/src/components/reader/SidePanel.tsx`
- `apps/anyhunt/www/src/components/reader/UserMenu.tsx`
- `apps/anyhunt/www/src/features/explore/ExploreCreateDialog.tsx`
- `apps/anyhunt/www/src/features/explore/ExploreTopicsPane.tsx`
- `apps/anyhunt/www/src/features/inbox/InboxPane.tsx`
- `apps/anyhunt/www/src/features/subscriptions/SubscriptionsPane.tsx`
- `apps/anyhunt/www/src/routes/login.tsx`
- `apps/anyhunt/www/src/routes/register.tsx`
- `apps/anyhunt/www/src/lib/auth-session.ts`（拆分为 store+api+methods）
- `apps/anyhunt/www/src/lib/api-client.ts`
- `apps/anyhunt/www/src/features/**/api.ts`
- `apps/anyhunt/www/src/lib/digest-api.ts`
- `apps/anyhunt/www/src/lib/api.ts`

改造方式：

- 新增 `src/lib/auth/auth-api.ts` + `src/lib/auth/auth-methods.ts`。
- `auth-session.ts` 仅保留会话状态工具（或并入 store），网络调用移入 `auth-api.ts`。
- 用 `authStore` + `auth-methods` 替代 Context 透传。
- 启动初始化改为显式 `initAuth()`（路由根/启动入口调用一次）。
- `api-client` 改为函数式 `apiClient`。
- public/demo/digest 请求统一复用函数式客户端（public 模式），不再散落手写 fetch 错误处理。

## 4.4 Moryflow PC（必须改）

改造对象：

- `apps/moryflow/pc/src/renderer/lib/server/context.tsx`（删除）
- `apps/moryflow/pc/src/renderer/lib/server/index.ts`（移除 `AuthProvider/useAuth` 导出）
- `apps/moryflow/pc/src/renderer/lib/server/auth-session.ts`（拆分职责）
- `apps/moryflow/pc/src/renderer/lib/server/api.ts`（统一走 methods）
- `apps/moryflow/pc/src/renderer/lib/server/auth-api.ts`
- `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/speech-helper.ts`
- `apps/moryflow/pc/src/main/cloud-sync/api/client.ts`
- `apps/moryflow/pc/src/main/cloud-sync/sync-engine/executor.ts`
- `apps/moryflow/pc/src/main/cloud-sync/user-info.ts`
- `apps/moryflow/pc/src/main/site-publish/api.ts`
- `apps/moryflow/pc/src/main/ollama-service/client.ts`
- `apps/moryflow/pc/src/main/agent-runtime/tracing-setup.ts`
- 现有 `useAuth` 调用方（settings/chat/workspace）全部替换为 store + methods

改造方式：

- 保留 `auth-api.ts` 语义，但内部请求改为函数式 `apiClient`。
- 将 `auth-session.ts` 的网络编排迁入 `auth-methods.ts`。
- 组件从 `useAuth()` 改为：
  - 读：`useAuthStore(selector)`
  - 写：`authMethods.login()/logout()/refresh()...`
- 删除 `serverApi.user.xxx` 调用风格，统一为 `export async function xxx(): Promise<...>`。

## 4.5 Moryflow Mobile（必须改）

改造对象：

- `apps/moryflow/mobile/lib/server/context.tsx`（删除）
- `apps/moryflow/mobile/lib/contexts/auth.context.tsx`（删除）
- `app/_layout.tsx`（移除 Auth Provider 链）
- `apps/moryflow/mobile/lib/server/auth-session.ts`（拆分职责）
- `apps/moryflow/mobile/lib/server/api.ts`（统一走 methods）
- `apps/moryflow/mobile/lib/cloud-sync/api-client.ts`（通过 methods 获取/续期 token）
- `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts`（通过 methods 获取/续期 token）
- `apps/moryflow/mobile/lib/utils/speech-helper.ts`（通过 methods 获取/续期 token）
- `apps/moryflow/mobile/lib/server/auth-api.ts`
- 现有 `useMembership/useMembershipAuth/useAuth` 调用点全部替换

改造方式：

- 新增 `lib/server/auth-methods.ts`，统一登录/注册/验证码/刷新/登出/加载用户。
- 页面和组件直接调用 methods，状态统一从 zustand 读取。
- Cloud Sync / Speech 统一接入函数式 `apiClient`，保留 `raw/blob` 能力但不直接写 fetch。
- 删除 `serverApi.user.xxx` 调用风格，统一为业务 Promise 函数导出。

## 4.6 Moryflow WWW / Docs（必须改，非 Auth）

改造对象：

- `apps/moryflow/www/src/hooks/useDownload.ts`
- `apps/moryflow/docs/src/components/download-buttons.tsx`

改造方式：

- 统一使用 `public` 模式函数式 `apiClient` 拉取 `manifest.json`。
- 统一错误处理与超时策略，不在组件/Hook 内直写 fetch。

## 4.7 服务侧跟随项（不改协议，仅验证）

跟随验证对象：

- `apps/moryflow/vectorize/src/middleware/auth.ts`

验证点：

- 仍从 `server.moryflow.com/api/v1/auth/jwks` 拉取公钥。
- access JWT claim 与算法不变（不增加额外兼容分支）。

## 4.8 Anyhunt Server（必须改，出站请求统一）

改造对象：

- `apps/anyhunt/server/src/common/utils/ssrf-fetch.ts`
- `apps/anyhunt/server/src/common/services/webhook.service.ts`
- `apps/anyhunt/server/src/digest/processors/webhook-delivery.processor.ts`
- `apps/anyhunt/server/src/demo/demo.service.ts`
- `apps/anyhunt/server/src/search/search.service.ts`
- `apps/anyhunt/server/src/browser/cdp/cdp-connector.service.ts`
- `apps/anyhunt/server/src/oembed/providers/base.provider.ts`

改造方式：

- 新增 `apps/anyhunt/server/src/common/http/server-http-client.ts`（函数式）作为统一出站入口。
- 业务模块仅保留 endpoint、query/body、重试策略声明；不直接处理底层 fetch/timeout/error parsing。
- `ssrf-fetch` 保留为安全策略模块，但底层请求执行与错误模型接入统一客户端。

## 4.9 Moryflow Server（必须改，出站请求统一）

改造对象：

- `apps/moryflow/server/src/vectorize/vectorize.client.ts`

改造方式：

- 新增 `apps/moryflow/server/src/common/http/server-http-client.ts`（函数式）。
- `vectorize.client` 仅保留业务语义函数（health/check/query），底层网络能力交给统一客户端。

## 5. 改造边界（必须改 / 跟随改 / 不改）

必须改：

1. `apps/anyhunt/console`
2. `apps/anyhunt/admin/www`
3. `apps/anyhunt/www`
4. `apps/moryflow/admin`
5. `apps/moryflow/pc`
6. `apps/moryflow/mobile`
7. `apps/moryflow/www`
8. `apps/moryflow/docs`
9. `apps/anyhunt/server`
10. `apps/moryflow/server`

跟随改（随上面模块迁移导入路径或调用方式）：

1. `apps/moryflow/mobile/lib/agent-runtime/membership-bridge.ts`
2. `apps/moryflow/mobile/lib/agent-runtime/mobile-adapter.ts`
3. `apps/moryflow/pc/src/renderer/lib/server/index.ts`
4. `apps/moryflow/pc/src/renderer/lib/server/api.ts`
5. `apps/moryflow/mobile/lib/server/index.ts`
6. `packages/api/src/client/*`（函数式客户端工厂升级为跨端统一入口）

本轮不改：

1. `apps/anyhunt/docs`
2. `apps/moryflow/site-template`
3. `apps/moryflow/publish-worker`

## 6. 必删清单（零兼容）

1. 所有 Auth Context Provider（`AuthProvider`、`MembershipProvider`、兼容 `auth.context.tsx`）。
2. 所有仅为 Context 服务的 `useAuth/useMembership/useMembershipAuth` 封装。
3. store 内直接请求 Auth endpoint 的实现。
4. `auth-session.ts` 中“状态 + 网络”混写实现（保留纯状态工具或并入 store）。
5. 组件内散落的 refresh 重试分支（统一进 methods）。
6. `createServerApiClient` 与 `serverApi.user.xxx` 调用风格。
7. 各应用 Class 风格 `ApiClient`（`new ApiClient(...)`）。
8. 运行时代码中的直写 `fetch`（除统一客户端实现与样例字符串外）。
9. 服务端业务 service 里的直写 `fetch`（必须迁入统一 server HTTP client）。
10. 页面/组件层直接 `new WebSocket(...)`（必须迁入 realtime 方法层）。

## 7. 测试与验收标准

必须补齐：

- Store 单测：仅验证状态变更（无网络 mock 依赖）。
- API 单测：请求与错误解析。
- Methods 单测：登录/刷新/401/网络失败/回退 token/登出编排。
- 关键 UI 回归：登录、注册验证码、401 自动续期、网络抖动不误登出。

验收标准：

- `auth-store.ts` 中无 `fetch` / `authClient` 调用。
- `Auth Context` / `Membership Context` 文件删除完成，调用方全部切换。
- 所有 Auth 请求入口可在 `auth-api.ts` 一处定位。
- 所有业务认证动作可在 `auth-methods.ts` 中一处定位。
- `api-client`、`cloud-sync`、`speech-helper` 不再直接调用 `refreshAccessToken`。
- 所有业务 API 文件均为 `export async function ...(): Promise<...>` 风格。
- 所有服务端出站 HTTP 请求可在各自 `common/http/server-http-client.ts` 统一定位，业务模块无直写 `fetch`。
- 所有 WebSocket 连接可在 `realtime.ts` + 方法层统一定位，页面/组件层无直写 `new WebSocket(...)`。
- 运行时代码路径（`apps/**/src/**`、`apps/moryflow/pc/src/main/**`、`apps/moryflow/mobile/lib/**`、`packages/**/src/**`）不再出现：
  - `class ApiClient`
  - `createServerApiClient`
  - `serverApi.user.`
  - 业务层直写 `fetch(`
  - 页面/组件层直写 `new WebSocket(`

自动验收命令（每步完成后执行）：

```bash
# 1) 旧客户端范式清理
rg -n "class\\s+ApiClient|createServerApiClient|serverApi\\.user\\." \
  apps packages --glob '!**/*.test.*' --glob '!**/*.spec.*'

# 2) 运行时代码直写 fetch 清理（允许样例字符串与统一客户端实现）
rg -n "\\bfetch\\(" apps packages \
  --glob '!**/*.test.*' --glob '!**/*.spec.*' \
  --glob '!**/tests/**' --glob '!**/*.md'

# 3) 服务端业务层直写 fetch 清理（允许统一 http client 与 worker handler 签名）
rg -n "\\bfetch\\(" apps/anyhunt/server apps/moryflow/server \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

# 4) 页面/组件层直写 WebSocket 清理（实时链路统一到 realtime 方法层）
rg -n "new\\s+WebSocket\\(" apps/anyhunt apps/moryflow \
  --glob '*.{ts,tsx,js,mjs,cjs}' \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'
```

## 8. 当前实现收口

1. `packages/api` 已冻结为统一 transport/client 入口；前端业务侧统一使用函数式 `api.ts` 与 `auth-api/auth-methods` 分层。
2. Anyhunt Console/Admin/WWW 与 Moryflow Admin/PC/Mobile 已完成 store 去请求化；共享业务状态统一落在 `Zustand Store + Methods + Functional API Client`。
3. 服务端出站 HTTP 已统一收口到各自 `common/http/server-http-client.ts`；业务 service 不再直写 `fetch`。
4. 实时链路已收敛到 `realtime.ts` + methods 编排；页面与组件层不再直接创建 `WebSocket`。
5. 本文保留的是完成后的结构基线；逐步实施记录已删除，后续变更只需核对本文约束与第 7 章自动验收命令。

## 9. 当前验证基线

1. 运行时代码路径不再保留 `class ApiClient`、`createServerApiClient`、`serverApi.user.*` 这类旧范式。
2. 前端页面/组件层不再直写 `fetch` 或 `new WebSocket(...)`；请求与实时入口都可从统一目录定位。
3. 新增或重构请求链路时，按第 7 章扫描命令与受影响包 `typecheck/test` 复核即可，不再在正文追加步骤日志。
