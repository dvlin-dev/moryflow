# /apps/moryflow/server/src/auth

> Moryflow 认证模块（Better Auth + access/refresh + JWKS）

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
- 内部服务可通过 `AuthTokensService` 签发 access JWT（例如后台任务或内部 API 调用）
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
