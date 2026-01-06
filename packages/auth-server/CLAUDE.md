# Auth Server

> 服务端认证核心 - Better Auth 配置 + Facade Controller

## 定位

Aiget 统一身份平台的服务端认证核心，为所有产品提供统一的认证实现。

## 职责

- 提供统一的 Better Auth 配置（跨子域 cookie、JWT、emailOTP）
- 提供 Facade Controller 抹平 Web/Native 差异
- 提供 SessionGuard 和 JwtGuard 用于请求验证
- 提供 CurrentUser 和 ClientType 装饰器

## 约束

- 所有产品服务必须使用此包的 createBetterAuth 创建 auth 实例
- Web 端 refresh token 只能存 HttpOnly Cookie
- Native 端 refresh token 返回响应体，由客户端存 Secure Storage

## 成员清单

| 文件                                       | 类型       | 说明                           |
| ------------------------------------------ | ---------- | ------------------------------ |
| `src/index.ts`                             | 入口       | 导出所有公共 API               |
| `src/better-auth.ts`                       | 配置       | 统一 Better Auth 配置          |
| `src/constants.ts`                         | 常量       | 认证相关常量                   |
| `src/facade/auth-facade.controller.ts`     | Controller | Facade 路由（/api/v1/auth/\*） |
| `src/facade/auth-facade.service.ts`        | Service    | Facade 业务逻辑                |
| `src/guards/session.guard.ts`              | Guard      | Session 验证                   |
| `src/guards/jwt.guard.ts`                  | Guard      | JWT Access Token 验证          |
| `src/decorators/current-user.decorator.ts` | Decorator  | 提取当前用户                   |
| `src/decorators/client-type.decorator.ts`  | Decorator  | 提取客户端类型                 |
| `src/dto/auth-facade.schema.ts`            | DTO        | Zod schemas 和类型             |

## API 路由

| 方法 | 路径                            | 说明                |
| ---- | ------------------------------- | ------------------- |
| POST | `/api/v1/auth/register`         | 注册                |
| POST | `/api/v1/auth/verify-email-otp` | 验证邮箱 OTP        |
| POST | `/api/v1/auth/login`            | 登录                |
| POST | `/api/v1/auth/google/start`     | Google OAuth 启动   |
| POST | `/api/v1/auth/google/token`     | Google idToken 登录 |
| POST | `/api/v1/auth/refresh`          | 刷新 Token          |
| POST | `/api/v1/auth/logout`           | 登出                |
| GET  | `/api/v1/auth/me`               | 当前用户信息        |

## 使用方式

### 1. 创建 Better Auth 实例

```typescript
import { createBetterAuth } from '@aiget/auth-server';
import { identityPrisma } from '@aiget/identity-db';

const auth = createBetterAuth(
  identityPrisma,
  async (email, otp, type) => {
    // 发送验证码邮件
    await sendEmail(email, otp, type);
  },
  {
    baseURL: 'https://moryflow.aiget.dev/api/auth',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  }
);
```

### 2. 注册 Facade 到 NestJS

```typescript
import { Module } from '@nestjs/common';
import {
  AuthFacadeController,
  AuthFacadeService,
  AUTH_INSTANCE,
  IDENTITY_PRISMA,
} from '@aiget/auth-server';
import { identityPrisma } from '@aiget/identity-db';

@Module({
  controllers: [AuthFacadeController],
  providers: [
    AuthFacadeService,
    {
      provide: AUTH_INSTANCE,
      useValue: auth, // 上面创建的 auth 实例
    },
    {
      provide: IDENTITY_PRISMA,
      useValue: identityPrisma,
    },
  ],
})
export class AuthModule {}
```

### 3. 使用 Guards

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard, CurrentUser, type RequestUser } from '@aiget/auth-server';

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(SessionGuard)
  async getMe(@CurrentUser() user: RequestUser) {
    return user;
  }
}
```

## 环境变量

```bash
# Better Auth 密钥（>=32 字符，所有产品必须一致）
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters

# Better Auth URL（各产品不同）
BETTER_AUTH_URL=https://moryflow.aiget.dev/api/auth

# 信任的来源（逗号分隔）
TRUSTED_ORIGINS=https://moryflow.aiget.dev,https://console.aiget.dev

# Google OAuth（可选）
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

## Token 策略

| Token 类型    | 存储位置（Web） | 存储位置（Native） | TTL    |
| ------------- | --------------- | ------------------ | ------ |
| Refresh Token | HttpOnly Cookie | Secure Storage     | 90 天  |
| Access Token  | 内存            | 内存               | 6 小时 |

## X-Client-Type Header

所有 Facade 路由要求客户端带 `X-Client-Type`:

- `web`: 浏览器（SPA/SSR）
- `native`: Electron / React Native

如果没带，默认按 `web` 处理（更安全）。
