# /apps/moryflow/server/src/auth

> Moryflow 认证模块（Better Auth + access/refresh + JWKS）

## 最近更新

- Better Auth 错误类型依赖显式化（2026-03-05）：`@moryflow/server` 新增 `better-call@^1.3.2` 显式依赖，匹配 `better-auth.ts` 的 `APIError` 运行时导入，避免依赖 transitive hoist。
- Better Auth 1.5 lint 兼容修复（2026-03-05）：`better-auth.ts` 的 `APIError` 改为从 `better-call` 导入，确保 `@typescript-eslint/only-throw-error` 识别为合法 Error 对象；`auth-social.controller.ts` 的 `googleStartCheck` 改为同步函数，消除 `require-await` 噪音并保持行为不变。
- Better Auth Prisma adapter 缺包根因治理（2026-03-05）：`@moryflow/server` 显式声明 `better-auth@^1.5.3`、`@better-auth/expo@^1.5.3`、`@better-auth/prisma-adapter@^1.5.3`，避免 deploy/runtime 解析到分包适配器时缺失 `@better-auth/prisma-adapter`；Docker 构建阶段新增 `scripts/assert-better-auth-prisma-adapter.mjs` 做公共导出级 fail-fast 校验（`@better-auth/prisma-adapter` 与 `better-auth/adapters/prisma` 的 resolve + import）。
- Google OAuth 启动可观测性修复（2026-03-04）：`auth-social.controller.ts` 新增 `GET /api/v1/auth/social/google/start/check`（204 预检端点），仅做 provider 配置与 callbackURL 组装校验，不调用 Better Auth `sign-in/social`（避免额外消耗 `/sign-in/**` 限流）；配置缺失时立即返回 503，避免 PC 端仅靠 deep link 超时（120s）暴露错误。`auth.social.controller.spec.ts` 新增成功/失败回归用例。
- Google OAuth start 安全加固（2026-03-04）：`auth-social.controller.ts` 的 callbackURL 统一基于 `getAuthBaseUrl()` 生成（不再取 `req.protocol + host`）；`google/start` 到 Better Auth 的内部转发改为白名单请求头（cookie/user-agent/accept-language/x-forwarded-\*）并关闭原请求头全量复制，避免 `content-length/transfer-encoding/connection` 冲突与回调地址污染风险；`auth.social.controller.spec.ts` 补充对应回归断言。
- Google OAuth `state_mismatch` 根因修复（2026-03-04）：`auth-social.controller.ts` 新增 `GET /api/v1/auth/social/google/start`，在系统浏览器上下文内调用 Better Auth `sign-in/social` 并透传 `Set-Cookie` 后 302 到 Google；`auth.handler.utils.ts` 新增 `appendAuthSetCookies` 与 `buildAuthRequest` headers 覆盖能力，统一 cookie 透传链路；`auth.social.controller.spec.ts` 补充 start 路由回归测试。
- Google OAuth deep link scheme 规范化（2026-03-03）：`auth-social.constants.ts` 的 `getMoryflowDeepLinkScheme()` 改为 `trim().toLowerCase()`，与 PC 主进程协议注册规则一致，避免 `MORYFLOW_DEEP_LINK_SCHEME` 大小写配置漂移导致回流失败；`auth.social.service.spec.ts` 新增回归测试。
- Google OAuth bridge + Token-first 交换落地（2026-03-03）：新增 `auth-social.controller.ts` / `auth-social.service.ts` / `auth-social.constants.ts` / `dto/auth-social.dto.ts`，支持 `GET /api/v1/auth/social/google/bridge-callback`（基于 Better Auth session 生成一次性交换码并 302 到 deep link）与 `POST /api/v1/auth/social/google/exchange`（Redis Lua 原子消费 code，签发 access/refresh）；`AuthModule` 控制器顺序调整为 `AuthTokensController -> AuthSocialController -> AuthController`，避免兜底路由抢占。
- Better Auth 路径语义收口（2026-03-03）：`better-auth.ts` 显式 `basePath='/api/v1/auth'` 并支持 Google provider（由 `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` 启用）；`AuthController` 移除 `/api/v1/auth -> /api/auth` 映射补丁，统一透传原始路径。
- Auth 限流改造：`BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS` / `BETTER_AUTH_RATE_LIMIT_MAX` 改为可选配置并提供默认值（`60s/20`）；通过 `customRules` 覆盖 `/sign-in/**`、`/sign-up/**`、`/change-password/**`、`/change-email/**`、`/email-otp/**`、`/forget-password/**`，避免 Better Auth 默认 `10s/3` 误伤
- 回归测试补齐：`auth.controller.spec.ts` 新增 `/api/v1/auth/email-otp/verify-email` token-first 响应覆盖
- Auth handler 路由匹配统一为 `@All('*path')`，避免通配符匹配差异；兜底 handler 统一透传 `req.originalUrl`，不再做 `/api/v1/auth -> /api/auth` 映射补丁

## 入口

- `/api/v1/auth/*`：Better Auth handler（`auth.controller.ts`，登录/验证码验证成功时改写为 Token-first 响应）
- `/api/v1/auth/refresh`：刷新 access + 轮换 refresh
- `/api/v1/auth/logout` / `/api/v1/auth/sign-out`：撤销 refresh token（幂等）

## 关键文件

- `better-auth.ts`：Better Auth 配置（email/password、email OTP、jwt/jwks + expo 插件），并导出含 `signJWT/verifyJWT` 的 Auth 类型
- `auth.tokens.service.ts`：access/refresh 签发与校验
- `auth-social.controller.ts`：Google bridge callback + exchange 协议入口
- `auth-social.service.ts`：交换码生成/原子消费/deep link 组装
- `auth-social.constants.ts`：OAuth bridge 配置常量（TTL、scheme、cache-control）
- `auth-google-provider.ts`：Google provider 配置读取（Better Auth 与 start/check 预检共享事实源）
- `auth.tokens.controller.ts`：refresh/logout/sign-out 入口
- `auth.guard.ts`：校验 access JWT，注入 `CurrentUserDto`
- `auth.config.ts` / `auth.constants.ts`：配置与常量
- `auth.handler.utils.ts`：Express ↔ Better Auth handler 适配
- `dto/auth-token.dto.ts`：refresh/logout DTO
- `dto/auth-social.dto.ts`：google exchange DTO
- `auth.config.spec.ts`：Auth 限流配置默认值与 env 覆盖回归测试
- `auth.rate-limit.spec.ts`：Auth 限流行为回归（`/sign-in/email` 第 21 次请求返回 429）

## 规则

- access token 仅用于业务接口（6h，JWT）
- refresh token 必须轮换，存库仅 hash
- `sign-in/email` 与 `email-otp/verify-email` 成功后必须直接返回 `accessToken + refreshToken`
- `refresh/logout/sign-out` 仅接受 body `refreshToken`，不再读取 Cookie，不再依赖 session fallback
- `AuthTokensController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/*` 被兜底 handler 拦截
- `AuthSocialController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/social/*` 被兜底 handler 拦截
- `AuthController` 必须使用 `@All('*path')` 作为兜底路由，避免 `@All('*')` 在不同路由层实现下出现匹配边界差异
- exchange code 必须短 TTL 且一次性消费（原子 `GET+DEL`/Lua），禁止重放
- 内部服务可通过 `AuthTokensService` 签发 access JWT（当前由 Memox cutover 的 `LegacyVectorSearchClient` 复用）
- Expo 插件需显式声明 `BetterAuthPlugin` 类型，避免 `no-unsafe-call`

## 依赖

- Better Auth 生态依赖版本必须同代对齐：`better-auth` / `@better-auth/expo` / `@better-auth/prisma-adapter`
- Prisma（User/Account/Session/RefreshToken/Jwks/Subscription）
- Redis secondary storage（rateLimit/session）
- EmailService（OTP 发送）

## 测试

- `__tests__/auth.controller.spec.ts`
- `__tests__/auth.social.controller.spec.ts`
- `__tests__/auth.social.service.spec.ts`
- `__tests__/auth.module.spec.ts`
- `__tests__/auth.guard.spec.ts`
- `__tests__/auth.tokens.service.spec.ts`
- `__tests__/auth.tokens.controller.spec.ts`
- `better-auth.spec.ts`
- `test/auth-jwks.e2e-spec.ts`（JWKS 可验签 access token）
