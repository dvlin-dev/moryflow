# /apps/moryflow/server/src/auth

> Moryflow 认证模块（Better Auth + access/refresh + JWKS）

## 最近更新

- Auth 限流改造：`BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS` / `BETTER_AUTH_RATE_LIMIT_MAX` 改为可选配置并提供默认值（`60s/20`）；通过 `customRules` 覆盖 `/sign-in/**`、`/sign-up/**`、`/change-password/**`、`/change-email/**`、`/email-otp/**`、`/forget-password/**`，避免 Better Auth 默认 `10s/3` 误伤
- 回归测试补齐：`auth.controller.spec.ts` 新增 `/api/v1/auth/email-otp/verify-email` token-first 响应覆盖
- Auth handler 路由匹配统一为 `@All('*path')`，避免通配符匹配差异；并在 handler 内将外部 `/api/v1/auth/*` 映射到 Better Auth 内部 `/api/auth/*`

## 入口

- `/api/v1/auth/*`：Better Auth handler（`auth.controller.ts`，登录/验证码验证成功时改写为 Token-first 响应）
- `/api/v1/auth/refresh`：刷新 access + 轮换 refresh
- `/api/v1/auth/logout` / `/api/v1/auth/sign-out`：撤销 refresh token（幂等）

## 关键文件

- `better-auth.ts`：Better Auth 配置（email/password、email OTP、jwt/jwks + expo 插件），并导出含 `signJWT/verifyJWT` 的 Auth 类型
- `auth.tokens.service.ts`：access/refresh 签发与校验
- `auth.tokens.controller.ts`：refresh/logout/sign-out 入口
- `auth.guard.ts`：校验 access JWT，注入 `CurrentUserDto`
- `auth.config.ts` / `auth.constants.ts`：配置与常量
- `auth.handler.utils.ts`：Express ↔ Better Auth handler 适配
- `dto/auth-token.dto.ts`：refresh/logout DTO
- `auth.config.spec.ts`：Auth 限流配置默认值与 env 覆盖回归测试
- `auth.rate-limit.spec.ts`：Auth 限流行为回归（`/sign-in/email` 第 21 次请求返回 429）

## 规则

- access token 仅用于业务接口（6h，JWT）
- refresh token 必须轮换，存库仅 hash
- `sign-in/email` 与 `email-otp/verify-email` 成功后必须直接返回 `accessToken + refreshToken`
- `refresh/logout/sign-out` 仅接受 body `refreshToken`，不再读取 Cookie，不再依赖 session fallback
- `AuthTokensController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/*` 被兜底 handler 拦截
- `AuthController` 必须使用 `@All('*path')` 作为兜底路由，避免 `@All('*')` 在不同路由层实现下出现匹配边界差异
- 内部服务可通过 `AuthTokensService` 签发 access JWT（Vectorize Worker 使用 JWKS 验签）
- Expo 插件需显式声明 `BetterAuthPlugin` 类型，避免 `no-unsafe-call`

## 依赖

- Prisma（User/Account/Session/RefreshToken/Jwks/Subscription）
- Redis secondary storage（rateLimit/session）
- EmailService（OTP 发送）

## 测试

- `__tests__/auth.controller.spec.ts`
- `__tests__/auth.guard.spec.ts`
- `__tests__/auth.tokens.service.spec.ts`
- `__tests__/auth.tokens.controller.spec.ts`
- `test/auth-jwks.e2e-spec.ts`（JWKS 可验签 access token）
