# /apps/moryflow/server/src/auth

> Moryflow 认证模块（Better Auth + access/refresh + JWKS）

## 入口

- `/api/auth/*`：Better Auth handler（`auth.controller.ts`）
- `/api/auth/refresh`：刷新 access + 轮换 refresh
- `/api/auth/logout` / `/api/auth/sign-out`：撤销 refresh + session

## 关键文件

- `better-auth.ts`：Better Auth 配置（email/password、email OTP、jwt/jwks）
- `auth.tokens.service.ts`：access/refresh 签发与校验
- `auth.tokens.controller.ts`：refresh/logout/sign-out 入口
- `auth.guard.ts`：校验 access JWT，注入 `CurrentUserDto`
- `auth.config.ts` / `auth.constants.ts`：配置与常量
- `auth.handler.utils.ts`：Express ↔ Better Auth handler 适配
- `dto/auth-token.dto.ts`：refresh/logout DTO

## 规则

- access token 仅用于业务接口（6h，JWT）
- refresh token 必须轮换，存库仅 hash
- Web：HttpOnly Cookie；Device：body refresh + `X-App-Platform`
- Web 必须校验 `Origin`（`TRUSTED_ORIGINS`）
- `AuthTokensController` 必须先于 `AuthController` 注册，避免 `/api/auth/*` 被兜底 handler 拦截
- 内部服务可通过 `AuthTokensService` 签发 access JWT（Vectorize Worker 使用 JWKS 验签）

## 依赖

- Prisma（User/Account/Session/RefreshToken/Jwks/Subscription）
- Redis secondary storage（rateLimit/session）
- EmailService（OTP 发送）

## 测试

- `__tests__/auth.guard.spec.ts`
- `__tests__/auth.tokens.service.spec.ts`
- `__tests__/auth.tokens.controller.spec.ts`
- `test/auth-jwks.e2e-spec.ts`（JWKS 可验签 access token）
