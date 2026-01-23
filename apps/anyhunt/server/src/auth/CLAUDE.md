# Auth

> 本目录结构变更需同步更新本文件。

## 模块概览

Auth 模块基于 Better Auth，负责账号登录/注册、会话基础能力与 access/refresh token 策略落地。

## 职责范围

- 邮箱+密码、邮箱 OTP 登录/注册（Better Auth）
- Google/Apple OAuth（Better Auth）
- accessToken（JWT）签发与校验
- refreshToken 签发/轮换/注销
- 管理员权限校验（RequireAdmin）

## 关键约束

- Auth 路由固定为 `/api/auth/*`（VERSION_NEUTRAL）
- 业务接口只接受 `Authorization: Bearer <accessToken>`
- refreshToken 只在 `/api/auth/refresh` 使用：
  - Web：HttpOnly Cookie
  - Mobile/Electron/CLI：请求体（需 `X-App-Platform`）
- `X-App-Platform` 存在时跳过 Origin 校验（避免 Electron/RN `Origin: null` 误判）
- Origin 校验仅用于 Web 请求，Device 以 `X-App-Platform` 分流
- refreshToken 必须每次 refresh 轮换（rotation on）
- `POST /api/auth/logout` 与 `POST /api/auth/sign-out` 必须同时失效 refresh 与 session
- 生产环境必须设置 `BETTER_AUTH_URL` 与 `TRUSTED_ORIGINS`
- 生产环境启用 `useSecureCookies` 与跨子域 Cookie（`.anyhunt.app`）
- 管理员权限通过 `ADMIN_EMAILS` 邮箱白名单授予（注册后自动标记 `isAdmin`）
- 已有账号命中 `ADMIN_EMAILS` 时，在会话获取阶段补写 `isAdmin=true`
- access token 中的 `subscriptionTier` 基于有效订阅（仅 ACTIVE 计入付费 tier）

## 测试覆盖

- JWKS 集成测试：`auth.jwks.integration.spec.ts`（校验 JWKS 可验签 access token）

## 文件结构

| 文件                        | 类型       | 说明                            |
| --------------------------- | ---------- | ------------------------------- |
| `auth.service.ts`           | Service    | Better Auth 实例与会话查询      |
| `auth.tokens.service.ts`    | Service    | access/refresh token 签发与校验 |
| `auth.controller.ts`        | Controller | Better Auth handler 透传        |
| `auth.tokens.controller.ts` | Controller | refresh/logout/sign-out 接口    |
| `auth.guard.ts`             | Guard      | Access Token 鉴权               |
| `admin.guard.ts`            | Guard      | Admin 权限校验                  |
| `better-auth.ts`            | Config     | Better Auth 配置                |
| `auth.constants.ts`         | Constants  | Token/Cookie 常量               |
| `auth.config.ts`            | Config     | baseURL/trustedOrigins/JWT 配置 |
| `auth.handler.utils.ts`     | Utils      | Better Auth handler 适配        |
| `auth.tokens.utils.ts`      | Utils      | Cookie/Origin/Platform 辅助     |
| `dto/`                      | DTO        | refresh/logout 请求校验         |

## 鉴权流程

### Access Token（业务接口）

```
Request -> AuthGuard -> verify access token -> attach user -> controller
```

### Refresh Token（Web）

```
POST /api/auth/refresh
  -> Cookie refreshToken + Origin 校验
  -> rotate refreshToken
  -> return accessToken + set refresh cookie
```

### Logout / Sign-out（Web）

```
POST /api/auth/logout 或 /api/auth/sign-out
  -> revoke refresh token
  -> revoke Better Auth session
  -> clear refresh/session cookies
```

### Refresh Token（Device）

```
POST /api/auth/refresh
  -> Body refreshToken + X-App-Platform（跳过 Origin 校验）
  -> rotate refreshToken
  -> return accessToken + refreshToken
```

### Logout / Sign-out（Device）

```
POST /api/auth/logout 或 /api/auth/sign-out
  -> Body refreshToken + X-App-Platform（跳过 Origin 校验）
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
export { AdminGuard } from './admin.guard';
export { CurrentUser } from './decorators';
```
