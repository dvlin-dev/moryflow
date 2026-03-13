# /apps/moryflow/server/src/auth

> Moryflow 认证模块（Better Auth + access/refresh + JWKS）

## 入口

- `/api/v1/auth/sign-up/email/start|verify-otp|complete`：邮箱注册三段式入口（`auth-signup.controller.ts`，OTP 通过后才创建真实 credential 账号）
- `/api/v1/auth/*`：Better Auth handler（`auth.controller.ts`，登录/验证码验证成功时改写为 Token-first 响应）
- `/api/v1/auth/refresh`：刷新 access + 轮换 refresh
- `/api/v1/auth/logout` / `/api/v1/auth/sign-out`：撤销 refresh token（幂等）

## 关键文件

- `better-auth.ts`：Better Auth 配置（email/password、email OTP、jwt/jwks + expo 插件），并导出含 `signJWT/verifyJWT` 的 Auth 类型
- `auth-signup.controller.ts`：credential 邮箱注册三段式入口（start / verify-otp / complete）
- `auth-signup.service.ts`：pending signup 状态机、OTP 校验、真实账号最终创建
- `auth-provisioning.service.ts`：真实账号创建后的订阅初始化与管理员邮箱提权
- `auth.tokens.service.ts`：access/refresh 签发与校验
- `auth-social.controller.ts`：Google bridge callback + exchange 协议入口
- `auth-social.service.ts`：交换码生成/原子消费/deep link 组装
- `auth-social.constants.ts`：OAuth bridge 配置常量（TTL、scheme、cache-control）
- `auth-google-provider.ts`：Google provider 配置读取（Better Auth 与 start/check 预检共享事实源）
- `auth.tokens.controller.ts`：refresh/logout/sign-out 入口
- `auth.guard.ts`：校验 access JWT，注入 `CurrentUserDto`
- `auth.config.ts` / `auth.constants.ts`：配置与常量
- `auth-request-context.ts`：browser auth 与 device token-first auth 的路径/头部上下文事实源
- `auth.handler.utils.ts`：Express ↔ Better Auth handler 适配
- `dto/auth-token.dto.ts`：refresh/logout DTO
- `dto/auth-social.dto.ts`：google exchange DTO
- `auth.config.spec.ts`：Auth 限流配置默认值与 env 覆盖回归测试
- `auth.rate-limit.spec.ts`：Auth 限流行为回归（`/sign-in/email` 第 21 次请求返回 429）

## 规则

- access token 仅用于业务接口（6h，JWT）
- refresh token 必须轮换，存库仅 hash
- credential 邮箱注册必须采用 `PendingEmailSignup` 三段式：OTP 验证通过前禁止创建真实 `User/Account`
- `/api/v1/auth/sign-up/email` 旧直建号入口已下线，禁止绕过 `start|verify-otp|complete`
- `sign-in/email` 与 `email-otp/verify-email` 成功后必须直接返回 `accessToken + refreshToken`
- `refresh/logout/sign-out` 仅接受 body `refreshToken`，不再读取 Cookie，不再依赖 session fallback
- Desktop / mobile / CLI 的 token-first auth（`sign-in/email`、`email-otp/verify-email`、`sign-up/email/complete`、`social/google/exchange`、`refresh/logout/sign-out`）必须使用 `X-App-Platform` 标识设备上下文，不得伪造 `Origin/Referer`
- Better Auth browser/session 路由继续依赖真实浏览器 `Origin` + `trustedOrigins`；禁止把 device token-first 请求和 browser auth 请求混用同一套头部语义
- `AuthSignupController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/sign-up/email/*` 被兜底 handler 拦截
- `AuthTokensController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/*` 被兜底 handler 拦截
- `AuthSocialController` 必须先于 `AuthController` 注册，避免 `/api/v1/auth/social/*` 被兜底 handler 拦截
- `AuthController` 必须使用 `@All('*path')` 作为兜底路由，避免 `@All('*')` 在不同路由层实现下出现匹配边界差异
- exchange code 必须短 TTL 且一次性消费（原子 `GET+DEL`/Lua），禁止重放
- 内部服务可通过 `AuthTokensService` 签发 access JWT（例如后台任务或内部 API 调用）
- Expo 插件需显式声明 `BetterAuthPlugin` 类型，避免 `no-unsafe-call`

## 依赖

- Better Auth 生态依赖版本必须同代对齐：`better-auth` / `@better-auth/expo` / `@better-auth/prisma-adapter`
- Prisma（User/Account/Session/RefreshToken/Jwks/Subscription/PendingEmailSignup）
- Redis secondary storage（rateLimit/session）
- EmailService（OTP 发送）

## 测试

- `__tests__/auth-signup.controller.spec.ts`
- `__tests__/auth.controller.spec.ts`
- `__tests__/auth.social.controller.spec.ts`
- `__tests__/auth.social.service.spec.ts`
- `__tests__/auth.module.spec.ts`
- `__tests__/auth.guard.spec.ts`
- `__tests__/auth.tokens.service.spec.ts`
- `__tests__/auth.tokens.controller.spec.ts`
- `auth-signup.service.spec.ts`
- `auth-request-context.spec.ts`
- `better-auth.spec.ts`
- `test/auth-jwks.e2e-spec.ts`（JWKS 可验签 access token）
