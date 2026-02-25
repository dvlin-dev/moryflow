# Auth

> 本目录结构变更需同步更新本文件。

## 模块概览

Auth 模块基于 Better Auth，负责账号登录/注册、会话基础能力与 access/refresh token 策略落地。

## 最近更新

- Auth 升级为 Token-first：`sign-in/email` 与 `email-otp/verify-email` 成功后直接返回 `accessToken + refreshToken`
- `POST /api/v1/auth/refresh` / `POST /api/v1/auth/logout` / `POST /api/v1/auth/sign-out` 统一仅接受 Body `refreshToken`，移除 Cookie/Session fallback
- Auth refresh/logout 接口改为 raw JSON 响应，错误统一为 RFC7807
- 注册流程不再自动创建默认 API Key（由 Console 手动创建）
- 新增 OptionalAuthGuard：public 路由可选解析 access token（记录登录用户）
- 回归测试补齐：`auth.controller.spec.ts` 新增 `/api/v1/auth/email-otp/verify-email` token-first 响应覆盖

## 职责范围

- 邮箱+密码、邮箱 OTP 登录/注册（Better Auth）
- Google/Apple OAuth（Better Auth）
- accessToken（JWT）签发与校验
- refreshToken 签发/轮换/注销
- 管理员权限校验（RequireAdmin）

## 关键约束

- Auth 路由固定为 `/api/v1/auth/*`（`version: '1'`）
- 业务接口只接受 `Authorization: Bearer <accessToken>`
- 登录成功（`sign-in/email`、`email-otp/verify-email`）必须直接下发业务 `accessToken + refreshToken`
- refresh/logout/sign-out 只从请求体读取 `refreshToken`，不再读取 Cookie，不再依赖 Better Auth session
- refreshToken 必须每次 refresh 轮换（rotation on）
- `POST /api/v1/auth/logout` 与 `POST /api/v1/auth/sign-out` 均只撤销业务 refresh token（幂等）
- 生产环境必须设置 `BETTER_AUTH_URL` 与 `TRUSTED_ORIGINS`
- Better Auth 限流默认 `60s / 120 requests`，可通过 `BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS`、`BETTER_AUTH_RATE_LIMIT_MAX` 覆盖
- 生产环境启用 `useSecureCookies` 与跨子域 Cookie（`.anyhunt.app`）
- 管理员权限通过 `ADMIN_EMAILS` 邮箱白名单授予（注册后自动标记 `isAdmin`）
- 已有账号命中 `ADMIN_EMAILS` 时，在 refresh/access 校验阶段补写 `isAdmin=true`
- access token 中的 `subscriptionTier` 基于有效订阅（仅 ACTIVE 计入付费 tier）
- 邮箱 OTP 验证成功后自动创建 session（`autoSignInAfterVerification=true`）
- 注册流程不自动生成 API Key（由 Console 管理接口创建）

## 测试覆盖

- JWKS 集成测试：`auth.jwks.integration.spec.ts`（校验 JWKS 可验签 access token）

## 文件结构

| 文件                        | 类型       | 说明                                       |
| --------------------------- | ---------- | ------------------------------------------ |
| `auth.service.ts`           | Service    | Better Auth 实例与会话查询                 |
| `auth.tokens.service.ts`    | Service    | access/refresh token 签发与校验            |
| `auth.controller.ts`        | Controller | Better Auth handler + 登录响应 Token 化    |
| `auth.tokens.controller.ts` | Controller | refresh/logout/sign-out 接口               |
| `auth.guard.ts`             | Guard      | Access Token 鉴权                          |
| `optional-auth.guard.ts`    | Guard      | Public 路由可选鉴权                        |
| `admin.guard.ts`            | Guard      | Admin 权限校验                             |
| `better-auth.ts`            | Config     | Better Auth 配置                           |
| `auth.constants.ts`         | Constants  | Token/Cookie 常量                          |
| `auth.config.ts`            | Config     | baseURL/trustedOrigins/JWT 配置            |
| `auth.handler.utils.ts`     | Utils      | Better Auth handler 适配                   |
| `auth.tokens.utils.ts`      | Utils      | （待清理）历史 Cookie/Origin/Platform 辅助 |
| `dto/`                      | DTO        | refresh/logout 请求校验                    |

## 鉴权流程

### Access Token（业务接口）

```
Request -> AuthGuard -> verify access token -> attach user -> controller
```

### 登录/验证码验证成功

```
POST /api/v1/auth/sign-in/email 或 /api/v1/auth/email-otp/verify-email
  -> Better Auth 校验账号
  -> issue accessToken + refreshToken
  -> return token pair + user
```

### Refresh Token（统一）

```
POST /api/v1/auth/refresh
  -> Body refreshToken
  -> rotate refreshToken
  -> return accessToken + refreshToken
```

### Logout / Sign-out（统一）

```
POST /api/v1/auth/logout 或 /api/v1/auth/sign-out
  -> Body refreshToken
  -> revoke refresh token
```

## 控制器示例

```typescript
@Controller({ path: 'admin/users', version: '1' })
@RequireAdmin()
export class AdminUsersController {
  // Access Token + AdminGuard
}
```

## 依赖关系

```
auth/
├── better-auth - 认证框架
├── prisma - 用户与 token 存储
└── redis - rate limit / secondary storage
```

## 关键导出

```typescript
export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export { AuthTokensService } from './auth.tokens.service';
export { AuthGuard } from './auth.guard';
export { OptionalAuthGuard } from './optional-auth.guard';
export { AdminGuard } from './admin.guard';
export { CurrentUser } from './decorators';
```
