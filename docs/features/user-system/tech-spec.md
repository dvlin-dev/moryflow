---
title: 用户系统（统一）- 技术方案（可直接落地）
date: 2026-01-06
scope: aiget.dev
status: active
dependencies:
  better-auth: ^1.4.5
  prisma: ^7.1.0
  '@prisma/client': ^7.1.0
  zod: ^4.1.13
  nestjs: ^11.0.1
  nestjs-zod: ^5.0.1
  resend: ^6.6.0
  ioredis: ^5.8.2
  bullmq: ^5.66.0
---

<!--
[INPUT]: 多产品 Monorepo；子域名架构（*.aiget.dev）；Web + Electron + React Native；Better Auth；共享 Postgres（schema 隔离）
[OUTPUT]: 一份"照着做就能搭建出来"的用户系统技术方案（DB/接口/服务端/客户端/部署）
[POS]: 统一用户系统的落地文档（详细版），供后续实现与改造的单一事实来源

[PROTOCOL]: 本文件变更若影响平台架构约束，需同步更新 `docs/architecture/unified-identity-platform.md` 与 `docs/features/user-system/overview.md`。
-->

# 用户系统（统一）技术方案

---

## ⚠️ 实现规范（必读）

> **本项目作为全新项目开发，不考虑任何历史兼容。**

### 核心原则

1. **零历史兼容**
   - 不兼容旧代码、旧数据结构、旧 API
   - 不写迁移脚本、适配层、兼容 shim
   - 发现设计问题直接按最佳实践重构，不在旧基础上打补丁
   - 可以**参考**现有代码的优秀写法，但**不继承**其技术债

2. **最佳实践优先**
   - 使用最新稳定版本的依赖（见 frontmatter 中的 dependencies）
   - 遵循官方推荐的项目结构和编码规范
   - 不确定时先查官方文档，再联网搜索最新实践

3. **模块化 + 单一职责**
   - 每个模块只做一件事
   - 模块间通过明确的接口通信，不越界访问
   - 公共逻辑抽到 packages/，不在 apps/ 之间复制

4. **错误边界清晰**
   - 每层有明确的错误处理策略
   - 使用自定义 Error 类（见 `*.errors.ts`）
   - 用户可见的错误信息使用英文

5. **类型安全**
   - 所有 API 请求/响应必须有 Zod schema
   - 类型从 schema 推断（`z.infer<>`），禁止重复定义 interface
   - 禁止 `any`，必要时用 `unknown` + 类型守卫

### 参考资料（可借鉴写法，不继承设计）

- `archive/external-repos/moryflow/apps/server/` - NestJS 模块结构、Zod DTO 写法
- `archive/external-repos/moryflow/apps/admin/` - React 组件结构、shadcn/ui 用法

---

## 0. 目标目录结构（实现完成后）

完成本方案后，项目的认证相关目录结构如下：

```
Aiget/
├── packages/
│   │
│   ├── identity-db/                      # 【新增】统一身份数据库
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # identity schema（User/Session/Account/Verification/UserProfile）
│   │   │   └── migrations/               # identity 专属迁移
│   │   ├── src/
│   │   │   ├── index.ts                  # 导出 IdentityPrismaClient
│   │   │   └── client.ts                 # Prisma Client 实例化
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-server/                      # 【新增】服务端认证核心（Better Auth + Facade）
│   │   ├── src/
│   │   │   ├── index.ts                  # 导出 createBetterAuth, AuthFacadeController
│   │   │   ├── better-auth.ts            # 统一 Better Auth 配置（跨子域 cookie、JWT 插件、emailOTP）
│   │   │   ├── facade/
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth-facade.controller.ts   # Facade 路由（/api/v1/auth/*）
│   │   │   │   ├── auth-facade.service.ts      # Facade 业务逻辑
│   │   │   │   └── dto/
│   │   │   │       ├── index.ts
│   │   │   │       └── auth-facade.schema.ts   # Zod schemas（register/login/refresh 等）
│   │   │   ├── guards/
│   │   │   │   ├── index.ts
│   │   │   │   ├── session.guard.ts      # Better Auth session 校验（控制台用）
│   │   │   │   └── jwt.guard.ts          # Access Token JWT 校验（API 用）
│   │   │   ├── decorators/
│   │   │   │   ├── index.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── client-type.decorator.ts    # 提取 X-Client-Type
│   │   │   └── constants.ts              # AUTH_COOKIE_NAME, TOKEN_TTL 等
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── auth/                             # 【已存在，改造】客户端认证
│       ├── src/
│       │   ├── index.ts                  # 导出 createAuthClient, AuthProvider
│       │   ├── client.ts                 # Better Auth 客户端配置
│       │   ├── hooks/                    # 【新增】React hooks
│       │   │   ├── index.ts
│       │   │   ├── useAuth.ts            # 认证状态 hook
│       │   │   └── useSession.ts         # 会话管理 hook
│       │   ├── native/                   # 【新增】Native 端专用
│       │   │   ├── index.ts
│       │   │   ├── storage.ts            # Secure Storage 抽象
│       │   │   └── client.ts             # Native 认证客户端
│       │   └── types.ts                  # 共享类型定义
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   │
│   ├── admin/                            # 【新增】统一管理后台前端（admin.aiget.dev）
│   │   ├── src/
│   │   │   ├── main.tsx                  # 应用入口
│   │   │   ├── App.tsx                   # 根组件 + 路由
│   │   │   ├── components/               # UI 组件（shadcn/ui）
│   │   │   ├── features/                 # 功能模块
│   │   │   │   ├── auth/                 # 认证（Better Auth session）
│   │   │   │   ├── users/                # 用户管理
│   │   │   │   ├── subscriptions/        # 订阅管理
│   │   │   │   ├── orders/               # 订单管理
│   │   │   │   ├── credits/              # 积分管理
│   │   │   │   ├── dashboard/            # 仪表盘
│   │   │   │   └── admin-logs/           # 管理日志
│   │   │   ├── pages/                    # 页面组件
│   │   │   ├── stores/                   # Zustand 状态
│   │   │   ├── lib/                      # 工具库
│   │   │   └── types/                    # 类型定义
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── admin-server/                     # 【新增】统一管理后台后端
│   │   ├── src/
│   │   │   ├── main.ts                   # NestJS 启动
│   │   │   ├── app.module.ts
│   │   │   ├── auth/                     # 认证（引用 @aiget/auth-server）
│   │   │   ├── users/                    # 用户管理 API
│   │   │   ├── subscriptions/            # 订阅管理 API
│   │   │   ├── orders/                   # 订单管理 API
│   │   │   ├── credits/                  # 积分管理 API
│   │   │   ├── stats/                    # 统计 API（跨 schema 只读）
│   │   │   ├── logs/                     # 管理日志 API
│   │   │   ├── common/guards/            # AdminGuard（检查 isAdmin）
│   │   │   └── prisma/                   # 多 schema 数据库客户端
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── moryflow/
│   │   └── server/
│   │       └── src/
│   │           └── auth/                 # 【改造】使用 packages/auth-server
│   │               ├── auth.module.ts    # 注册 AuthFacadeController + Better Auth handler
│   │               ├── auth.controller.ts        # Better Auth 原生路由（/api/auth/*）
│   │               └── index.ts
│   │
│   ├── fetchx/
│   │   └── server/
│   │       └── src/
│   │           └── auth/                 # 【改造】同 moryflow
│   │               ├── auth.module.ts
│   │               ├── auth.controller.ts
│   │               └── index.ts
│   │
│   └── memox/
│       └── server/
│           └── src/
│               └── auth/                 # 【改造】同 moryflow
│                   ├── auth.module.ts
│                   ├── auth.controller.ts
│                   └── index.ts
│
└── deploy/
    └── infra/
        └── postgres/
            └── init-schemas.sql          # 【新增】创建 identity + 各产品 schema
```

### 关键文件说明

| 路径                      | 类型 | 说明                                                                      |
| ------------------------- | ---- | ------------------------------------------------------------------------- |
| `packages/identity-db/`   | 新增 | 统一身份数据库包，所有产品共享的 User/Session 表                          |
| `packages/auth-server/`   | 新增 | 服务端认证核心，包含 Better Auth 配置 + Facade Controller                 |
| `packages/auth/`          | 改造 | 客户端认证，添加 React hooks 和 Native 支持                               |
| `apps/admin/`             | 新增 | 统一管理后台前端，基于 `archive/external-repos/moryflow/apps/admin/` 改造 |
| `apps/admin-server/`      | 新增 | 统一管理后台后端，独立 NestJS 服务                                        |
| `apps/*/server/src/auth/` | 改造 | 各产品只保留模块注册，复用 `packages/auth-server`                         |

### 数据库 Schema 隔离

```
PostgreSQL Database: aiget
├── identity schema        # 统一身份表（packages/identity-db 管理）
│   ├── user               # Better Auth 核心表
│   ├── session            # Better Auth 核心表
│   ├── account            # Better Auth 核心表
│   ├── verification       # Better Auth 核心表
│   ├── jwks               # JWT 插件必需（存储公钥/私钥）
│   └── user_profile       # 自定义扩展表
│
├── moryflow schema        # Moryflow 业务表
├── fetchx schema          # Fetchx 业务表
└── memox schema           # Memox 业务表
```

---

本方案目标是：在 **`*.aiget.dev` 子域名架构**下，让所有产品（`moryflow` / `fetchx` / `memox` / 未来更多）复用 **同一套用户数据** 与 **同一套认证/会话**，并同时满足：

- Web：refresh token 放 `HttpOnly Cookie (Domain=.aiget.dev)`；access token 仅放内存
- Electron / React Native：refresh token 放 Secure Storage；access token 放内存
- Token：`accessTokenTtl=6h`；`refreshTokenTtl=90d`；refresh rotation=ON
- 注册必须走邮箱验证码（OTP）；同时支持 Google 登录

相关架构背景与已拍板约束见：

- `docs/architecture/subdomain-uip-architecture.md`
- `docs/architecture/unified-identity-platform.md`
- `docs/architecture/uip/auth-and-tokens.md`

本仓库已存在的 Better Auth 基线实现（可复用/改造）：

- `apps/fetchx/server/src/auth/better-auth.ts`
- `apps/memox/server/src/auth/better-auth.ts`
- `apps/moryflow/server/src/auth/better-auth.ts`

> **API 路径规范**：`{product}.aiget.dev/api/v1/...`（各服务使用 `app.setGlobalPrefix('api')`）

---

## 1. 最终形态（你要搭建出来的“东西”）

### 1.1 统一的入口

对每个产品域名都提供同一套认证 API：

- Better Auth 原生路由（底层）：`https://{product}.aiget.dev/api/auth/*`
- 统一用户系统 Facade（上层，推荐给业务方调用）：`https://{product}.aiget.dev/api/v1/auth/*`

为什么要有 Facade：

- Better Auth 的 `/api/auth/*` 默认会把 **session token**（等价 refresh token）放在响应体里；Web 端如果直接调用，JS 能拿到 refresh token，不符合最佳实践。
- Facade 可以做到：Web 端只用 cookie；Native 才返回 refresh token。
- Facade 还负责 refresh rotation、返回 access token、抹平 Web/Native 差异。

### 1.2 Token 模型（定稿）

- **Refresh Token**：使用 Better Auth 的 `session_token`（cookie 名为 `better-auth.session_token`）
  - TTL：90 天（由 Better Auth `session.expiresIn` 控制）
  - 轮换：由我们在 Facade 的 `POST /api/v1/auth/refresh` 实现（旋转 session token）
- **Access Token**：JWT（TTL 6h）
  - 用 Better Auth 的 `jwt` 插件生成（避免自研 JWT 细节）
  - 获取方式：`GET /api/auth/token` 或由 Facade 包装后返回给客户端

### 1.3 登录方式（定稿）

- Email + Password：注册必须 OTP 验证邮箱
- Google OAuth：
  - Web：redirect flow（Better Auth `/sign-in/social` 返回 url）
  - Native：idToken flow（把 Google 的 idToken 直接 POST 给 `/sign-in/social`，无需打开浏览器）

---

## 2. 数据与数据库（共享 Postgres + schema 隔离）

### 2.1 为什么必须拆 schema

你现在各产品的 Prisma schema 都包含 `User/Session/Account/Verification`，如果接到同一个 Postgres 且都落在 `public`，会发生表名冲突。

目标是：

- `identity` schema：只放统一用户系统表（Better Auth 核心表 + 你自定义的 Profile 等）
- `{product}` schema：各产品自己的业务表

### 2.2 最简单且可落地的 DB 连接方案（推荐）

不强依赖 Prisma multi-schema（避免踩坑），直接用 **两个 Prisma Client**：

- `IDENTITY_DATABASE_URL`：同一个 Postgres / 同一个 DB，但 `?schema=identity`
- `DATABASE_URL`：同一个 Postgres / 同一个 DB，但 `?schema={product}`

这样每个产品 Server 都可以：

- 用 `IdentityPrismaClient` 给 Better Auth 做 adapter（用户/会话）
- 用 `ProductPrismaClient` 处理产品业务表（抓取、记忆、工作流等）

注意：

- **不做跨 schema 外键**（userId 只保存字符串），降低耦合与迁移复杂度。
- 真正需要“强一致”时靠业务层做校验（例如在写入业务表前先确保 userId 存在于 identity）。

### 2.3 identity schema 必备表

#### Better Auth 核心表（必须）

- `User`：用户主体
  - `email` 唯一，`deletedAt` 软删除
  - `tier`：当前订阅等级（冗余快照，订阅变更时同步更新）
  - `creditBalance`：当前积分余额（冗余快照，积分变动时同步更新）
  - `isAdmin`：管理员标识
- `Session`：会话（`token` 唯一；用于 refresh）
- `Account`：账号绑定（`providerId + accountId` 唯一；credential / google 等）
- `Verification`：验证码/验证数据（邮箱 OTP 需要）
- `Jwks`：JWT 公钥/私钥存储（jwt 插件需要）

#### 统一业务表（新建）

- `UserProfile`：用户扩展信息（昵称/头像/语言/时区）
- `Subscription`：订阅记录（tier、status、周期、支付商）
- `Order`：订单记录（订阅付款 / 积分加油包）
- `CreditTransaction`：积分变动流水（订阅赠送 / 购买 / 奖励 / 消费）
- `AdminLog`：管理操作日志（审计追踪）

#### Prisma 配置文件（Prisma 7 新写法）

```typescript
// packages/identity-db/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('IDENTITY_DATABASE_URL'),
  },
});
```

#### 完整 Prisma Schema（参考）

```prisma
// packages/identity-db/prisma/schema.prisma

generator client {
  provider   = "prisma-client"
  output     = "../generated/prisma"
  outputType = "commonjs"
}

datasource db {
  provider = "postgresql"
  // url 从 prisma.config.ts 读取，不在这里写
}

// ==================== Enums ====================

/// 订阅等级（与 CLAUDE.md 定义一致）
enum SubscriptionTier {
  FREE
  STARTER
  PRO
  MAX
}

/// 订阅状态
enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PAST_DUE
}

/// 订单状态
enum OrderStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

/// 订单类型
enum OrderType {
  SUBSCRIPTION   // 订阅付款
  CREDIT_BOOST   // 积分加油包
}

/// 积分类型
enum CreditType {
  SUBSCRIPTION   // 订阅赠送
  PURCHASED      // 购买的
  BONUS          // 奖励/补偿
  CONSUMPTION    // 消费（负数）
}

/// 管理日志级别
enum AdminLogLevel {
  INFO
  WARN
  ERROR
}

// ==================== Better Auth 核心表 ====================

model User {
  id            String           @id @default(cuid())
  email         String           @unique
  emailVerified Boolean          @default(false)
  name          String?
  image         String?
  tier          SubscriptionTier @default(FREE)  // 当前订阅等级（冗余快照，订阅变更时同步）
  creditBalance Int              @default(0)     // 当前积分余额（冗余快照，积分变动时同步）
  isAdmin       Boolean          @default(false)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  deletedAt     DateTime?

  sessions      Session[]
  accounts      Account[]
  profile       UserProfile?
  subscriptions Subscription[]
  orders        Order[]
  credits       CreditTransaction[]

  @@index([tier])
  @@index([createdAt])
  @@map("user")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@index([expiresAt])
  @@map("verification")
}

model Jwks {
  id         String    @id @default(cuid())
  publicKey  String
  privateKey String
  createdAt  DateTime  @default(now())
  expiresAt  DateTime?

  @@map("jwks")
}

// ==================== 统一业务表 ====================

model UserProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  nickname  String?
  avatar    String?
  bio       String?
  locale    String   @default("en")
  timezone  String   @default("UTC")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profile")
}

model Subscription {
  id                  String             @id @default(cuid())
  userId              String
  tier                SubscriptionTier
  status              SubscriptionStatus @default(ACTIVE)
  provider            String             @default("creem") // creem / stripe / etc
  providerSubscriptionId String?         @unique
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  canceledAt          DateTime?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([userId])
  @@index([status])
  @@map("subscription")
}

model Order {
  id              String      @id @default(cuid())
  userId          String
  subscriptionId  String?
  type            OrderType
  status          OrderStatus @default(PENDING)
  amount          Int         // 金额（分）
  currency        String      @default("USD")
  provider        String      @default("creem")
  providerOrderId String?     @unique
  metadata        Json?       // 额外信息（如积分数量）
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("order")
}

model CreditTransaction {
  id        String     @id @default(cuid())
  userId    String
  type      CreditType
  amount    Int        // 正数=增加，负数=消费
  balance   Int        // 变动后余额
  reason    String?    // 变动原因
  metadata  Json?      // 额外信息（如关联的 API 调用 ID）
  createdAt DateTime   @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("credit_transaction")
}

model AdminLog {
  id            String        @id @default(cuid())
  adminId       String        // 操作者 ID
  adminEmail    String        // 操作者邮箱
  targetUserId  String?       // 目标用户 ID（可选）
  targetUserEmail String?     // 目标用户邮箱（可选）
  action        String        // 操作类型（如 SET_TIER, GRANT_CREDITS）
  level         AdminLogLevel @default(INFO)
  details       Json?         // 操作详情
  ip            String?
  userAgent     String?
  createdAt     DateTime      @default(now())

  @@index([adminId, createdAt])
  @@index([targetUserId, createdAt])
  @@map("admin_log")
}
```

参考：`apps/moryflow/server/prisma/schema.prisma` 中的部分模型可借鉴。

---

## 3. Better Auth 配置（统一版本）

### 3.1 关键配置点（你必须按这个配）

你需要在“统一的 createBetterAuth”里完成这些约束：

1. 允许跨子域 cookie（`.aiget.dev`）

- 使用 Better Auth 的 `advanced.crossSubDomainCookies`
- domain 固定为 `.aiget.dev`

2. Session TTL = 90d

- `session.expiresIn = 60 * 60 * 24 * 90`

3. Access JWT TTL = 6h

- 使用 Better Auth `jwt` 插件：
  - `jwt({ jwt: { expirationTime: '6h' } })`

4. 注册邮箱 OTP（验证码）而不是验证链接

- 使用 `emailOTP` 插件：
  - `sendVerificationOnSignUp: true`
  - `overrideDefaultEmailVerification: true`
  - `sendVerificationOTP: ({ email, otp, type }) => sendEmail(email, otp, type)`

5. Google Provider

- `socialProviders: { google: { clientId, clientSecret, redirectURI? } }`

### 3.2 统一 createBetterAuth 的落点建议

为了让所有产品共享同一份实现，建议抽到一个共享包（避免在三个服务里复制）：

- 新增：`packages/auth-server/`（服务端专用，不是前端 client）
  - 导出：`createBetterAuth(identityPrisma, sendOTP)`
  - 导出：`AuthFacadeController`（见第 4 节）

现有的 `packages/auth/` 当前是客户端占位（见 `packages/auth/src/index.ts`），建议后续：

- `packages/auth/` 专注前端 client（`createAuthClient` + 类型）
- `packages/auth-server/` 专注服务端（Better Auth 实例 + Facade）

---

## 4. 统一 Auth Facade（强烈推荐实现）

### 4.1 为什么要 Facade（再次强调）

Better Auth 的 `/api/auth/*` 设计同时服务 Web 与非 Web，会在 JSON 响应里返回 `token`（session token）。

- Web：refresh token **必须**只在 `HttpOnly Cookie`，不应出现在 JS 可读的 JSON
- Native：refresh token **必须**能拿到并存 Secure Storage

Facade 就是为了解决这个差异。

### 4.2 客户端类型约定（必须）

所有 Facade 路由要求客户端带 `X-Client-Type`：

- `web`：浏览器（SPA/SSR）
- `native`：Electron / React Native（都按 native 处理）

如果没带，默认按 `web` 处理（更安全）。

### 4.3 Facade 路由清单（第一阶段必须实现）

统一路径（每个产品域名一致）：

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email-otp`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google/start`（web）
- `POST /api/v1/auth/google/token`（native：idToken）
- `POST /api/v1/auth/refresh`（refresh rotation + 返回 access）
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### 4.4 关键行为（务必对齐）

#### register（Email+Password，必须验证码）

1. 调 Better Auth 创建用户（但不自动登录）：

- `POST /api/auth/sign-up/email`
- 请求体：`{ name, email, password }`

2. Better Auth `emailOTP` hook 自动发送 OTP（无需你手写发信逻辑，只要实现 `sendVerificationOTP`）

3. Facade 返回：

- `web`：只返回 `{ user, next: 'VERIFY_EMAIL_OTP' }`
- `native`：同上（不返回 refresh）

#### verify-email-otp

1. 调 Better Auth：

- `POST /api/auth/email-otp/verify-email`
- 请求体：`{ email, otp }`

2. 若配置了 `emailVerification.autoSignInAfterVerification = true`：

- Better Auth 会创建 session，并在 Web 写入 `better-auth.session_token` cookie
- 返回体会带 `token`（session token）

3. Facade 处理返回：

- `web`：丢弃返回体里的 `token`，再调用 `GET /api/auth/token` 拿到 access JWT，最终返回 `{ accessToken, user }`
- `native`：保留 refresh token（session token），并返回 `{ accessToken, refreshToken, user }`

#### login（Email+Password）

1. 调 Better Auth：

- `POST /api/auth/sign-in/email`
- 请求体：`{ email, password }`

2. 若 `requireEmailVerification=true` 且邮箱未验证：

- Better Auth 会返回 403（EMAIL_NOT_VERIFIED），并可触发 OTP 发送（取决于 emailOTP 配置）
- Facade 统一返回：`{ code: 'EMAIL_NOT_VERIFIED', next: 'VERIFY_EMAIL_OTP' }`

3. 登录成功：

- Better Auth 写 cookie + 返回 session token
- Facade 按客户端类型处理 refresh token，并返回 access token

#### google/start（Web）

1. 调 Better Auth：

- `POST /api/auth/sign-in/social`
- 请求体：`{ provider: 'google', callbackURL, disableRedirect: true }`
- 返回：`{ url, redirect: false }`

2. Facade 直接把 url 返回给前端，前端 `window.location.href = url`

#### google/token（Native，idToken）

1. Native 通过 Google SDK 获取 `idToken`
2. 调 Better Auth：

- `POST /api/auth/sign-in/social`
- 请求体：`{ provider: 'google', idToken: { token: <idToken> } }`
- 返回：`{ redirect: false, token: <sessionToken>, user }`

3. Facade 返回 `{ accessToken, refreshToken, user }`

#### refresh（必须 rotation）

目标：refresh token 一旦使用就轮换（旧的立即失效）。

推荐实现策略（不依赖 Better Auth 内部 API）：

1. 读取 refresh token

- `web`：从 cookie 读 `better-auth.session_token`
- `native`：从 `Authorization: Bearer <refreshToken>` 读（这里只接受 refresh token，不接受 access token）

2. 用 identity Prisma 查找 `Session`（`token` 唯一）

- 不存在/过期 → 401

3. rotation：

- 生成新 token（随机串）
- `UPDATE session SET token=newToken, expiresAt=now+90d, updatedAt=now WHERE id=session.id AND token=oldToken`
- 更新成功后：
  - `web`：覆盖写 cookie（`Domain=.aiget.dev`）
  - `native`：返回新的 refreshToken

4. 调 `GET /api/auth/token` 拿新的 access JWT（或用 Better Auth jwt 插件的内部方法生成）

最终返回：

- `web`：`{ accessToken }`
- `native`：`{ accessToken, refreshToken }`

#### logout

1. 读取 refresh token（同 refresh）
2. 删除 session（或标记失效）
3. `web`：清空 cookie

#### me

- 只接受 access token（JWT）：`Authorization: Bearer <accessToken>`
- 返回统一用户信息（至少 `id/email/name/emailVerified`）

---

## 5. 落地步骤（分阶段执行）

> 本节是"换个 AI 也能照做"的执行清单。

### 阶段划分

| 阶段        | 目标                 | 产出                                            |
| ----------- | -------------------- | ----------------------------------------------- |
| **Phase 1** | 搭建统一用户系统核心 | `packages/identity-db` + `packages/auth-server` |
| **Phase 2** | 搭建统一管理后台     | `apps/admin/`（生产级管理后台，验证用户系统）   |
| **Phase 3** | 业务接入             | 各产品 Server 改造 + 前端接入                   |

---

## Phase 1：搭建统一用户系统核心

### Step 1.0：确定"统一 secret"

以下密钥在所有产品服务必须一致（否则跨子域免登录会失败）：

- `BETTER_AUTH_SECRET`
- JWT 插件生成 key（如果使用本地 JWKS/自动生成，则需要共享同一套 JWKS 存储；见 Step 1.3）

### Step 1.1：建 identity schema 与 Prisma Client

1. Postgres 创建 schema：

- `identity`（本阶段只需要这一个）

2. 创建 `packages/identity-db/` 包：

```
packages/identity-db/
├── prisma/
│   └── schema.prisma    # identity schema（User/Session/Account/Verification/Jwks/UserProfile）
├── src/
│   ├── index.ts         # 导出 IdentityPrismaClient
│   └── client.ts        # Prisma Client 实例化
├── package.json
└── tsconfig.json
```

3. 生成 client：`pnpm --filter @aiget/identity-db prisma:generate`

### Step 1.2：创建 auth-server 包

创建 `packages/auth-server/` 包：

```
packages/auth-server/
├── src/
│   ├── index.ts                  # 导出 createBetterAuth, AuthFacadeController
│   ├── better-auth.ts            # 统一 Better Auth 配置
│   ├── facade/
│   │   ├── index.ts
│   │   ├── auth-facade.controller.ts
│   │   ├── auth-facade.service.ts
│   │   └── dto/
│   │       └── auth-facade.schema.ts
│   ├── guards/
│   │   ├── session.guard.ts
│   │   └── jwt.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── client-type.decorator.ts
│   └── constants.ts
├── package.json
└── tsconfig.json
```

Better Auth 配置要点：

- 用 `prismaAdapter(identityPrisma, { provider: 'postgresql' })`
- `advanced.crossSubDomainCookies.enabled=true`
- `advanced.crossSubDomainCookies.domain='.aiget.dev'`
- `trustedOrigins`：配置所有允许的子域名（**必须**，否则跨域请求会被拒绝）
- `session.expiresIn=60*60*24*90`
- 开启 `emailAndPassword` + `emailOTP` + `jwt` + `bearer`
- 配好 `socialProviders.google`

### Step 1.3：配置 JWT 插件

在 Better Auth plugins 中加入：

- `jwt({ jwt: { expirationTime: '6h', issuer: 'https://aiget.dev', audience: 'https://aiget.dev' } })`

**JWT 插件需要的数据库表**（必须添加到 identity schema）：

```prisma
model Jwks {
  id         String    @id @default(cuid())
  publicKey  String
  privateKey String
  createdAt  DateTime  @default(now())
  expiresAt  DateTime?

  @@map("jwks")
}
```

说明：

- 如果你不配置 `jwks.remoteUrl`，jwt 插件会在 DB 内创建/轮换 key
- 私钥默认使用 AES256 GCM 加密存储
- 可选配置 key rotation：`jwks.rotationInterval`（秒）

### Step 1.4：实现 Facade Controller

在 `packages/auth-server/src/facade/` 中实现：

- 把 `/api/v1/auth/*` 路由映射到 Better Auth 的 `/api/auth/*`（内部调用）
- 严格按 `X-Client-Type` 处理 token 回传策略
- 实现 refresh rotation（直连 identity session 表）

---

## Phase 2：搭建统一管理后台（admin.aiget.dev）

管理后台是验证用户系统的**生产级**方式，而非临时测试服务。完成后可以：

- 直接管理所有产品的用户、订阅、积分
- 作为运营人员的日常工作台
- 验证 Better Auth + Facade 全流程

### 现有代码分析

**源码位置**：`archive/external-repos/moryflow/apps/admin/`

**技术栈（可直接复用）**：

| 技术             | 版本        | 说明                         |
| ---------------- | ----------- | ---------------------------- |
| React            | ^19.2.0     | UI 框架                      |
| Vite             | ^7.2.4      | 构建工具                     |
| TailwindCSS      | ^4.1.17     | 样式系统                     |
| shadcn/ui        | Radix-based | 组件库（已有 56 个 UI 组件） |
| TanStack Query   | ^5.90.12    | 数据获取                     |
| react-router-dom | ^7.10.1     | 路由                         |
| Zustand          | ^5.0.2      | 状态管理                     |
| react-hook-form  | ^7.62.0     | 表单处理                     |
| Zod              | ^4.1.13     | 数据校验                     |
| sonner           | ^2.0.7      | Toast 通知                   |

**现有功能模块（features/）**：

| 模块                     | 是否保留 | 改造说明                                      |
| ------------------------ | -------- | --------------------------------------------- |
| `auth/`                  | ✅ 保留  | 改造：接入统一用户系统（Better Auth Session） |
| `users/`                 | ✅ 保留  | 改造：调整为统一 identity 用户管理            |
| `dashboard/`             | ✅ 保留  | 改造：调整统计接口为统一平台数据              |
| `payment/orders/`        | ✅ 保留  | 直接复用                                      |
| `payment/subscriptions/` | ✅ 保留  | 直接复用                                      |
| `payment/licenses/`      | ❌ 删除  | Aiget 不使用 License 模式                     |
| `admin-logs/`            | ✅ 保留  | 直接复用                                      |
| `storage/`               | ❌ 删除  | Moryflow 专属，改为各产品独立页面             |
| `alerts/`                | ⏸️ 暂缓  | 可选功能，后续按需添加                        |
| `providers/`             | ❌ 删除  | Moryflow AI 专属                              |
| `models/`                | ❌ 删除  | Moryflow AI 专属                              |
| `chat/`                  | ❌ 删除  | Moryflow AI 测试专属                          |
| `image-generation/`      | ❌ 删除  | Moryflow AI 测试专属                          |
| `sites/`                 | ❌ 删除  | Moryflow 发布站专属                           |
| `agent-traces/`          | ❌ 删除  | Moryflow Agent 专属                           |

**现有页面（pages/）**：

| 页面                    | 是否保留 | 说明           |
| ----------------------- | -------- | -------------- |
| `LoginPage.tsx`         | ✅ 保留  | 改造认证方式   |
| `DashboardPage.tsx`     | ✅ 保留  | 改造统计数据源 |
| `UsersPage.tsx`         | ✅ 保留  | 统一用户列表   |
| `UserDetailPage.tsx`    | ✅ 保留  | 统一用户详情   |
| `LogsPage.tsx`          | ✅ 保留  | 管理日志       |
| `SubscriptionsPage.tsx` | ✅ 保留  | 订阅管理       |
| `OrdersPage.tsx`        | ✅ 保留  | 订单管理       |
| 其他 Moryflow 专属页面  | ❌ 删除  | 不属于统一平台 |

### Step 2.1：基于现有代码改造的策略

**改造原则**：

1. **复用 UI 组件和布局**：`components/ui/`（56 个 shadcn 组件）+ `components/layout/`
2. **复用通用 hooks**：`usePagination` 等
3. **复用工具函数**：`lib/format.ts`、`lib/utils.ts`
4. **重写认证模块**：改用 Better Auth Session（而非 Bearer Token）
5. **重写 API 层**：指向 Phase 1 创建的 `packages/auth-server`

**关键改造点**：

| 文件                    | 改造内容                                         |
| ----------------------- | ------------------------------------------------ |
| `stores/auth.ts`        | 改为基于 Better Auth session，不再手动管理 token |
| `lib/api-client.ts`     | 改为 `credentials: 'include'`，依赖 cookie 认证  |
| `lib/api-paths.ts`      | 更新为 Aiget 统一 API 路径                       |
| `features/auth/`        | 改用 Better Auth 登录（session-based）           |
| `features/users/api.ts` | 指向 `@aiget/identity-db` 用户数据               |
| `types/api.ts`          | 更新类型定义，对齐统一用户系统                   |

### Step 2.2：新项目目录结构

```
apps/admin/                           # 统一管理后台
├── src/
│   ├── main.tsx                      # 应用入口
│   ├── App.tsx                       # 根组件 + 路由配置
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 组件（从旧项目复制）
│   │   ├── layout/                   # 布局组件（侧边栏、头部）
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── shared/                   # 业务共享组件
│   │       ├── PageHeader.tsx
│   │       ├── TierBadge.tsx
│   │       ├── SimplePagination.tsx
│   │       └── TableSkeleton.tsx
│   │
│   ├── features/                     # 功能模块
│   │   ├── auth/                     # 【重写】管理员认证
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx     # Better Auth session 登录
│   │   │   └── hooks/
│   │   │       └── useAdminSession.ts
│   │   │
│   │   ├── users/                    # 【改造】统一用户管理
│   │   │   ├── index.ts
│   │   │   ├── api.ts                # 指向 identity 用户 API
│   │   │   ├── hooks.ts
│   │   │   └── components/
│   │   │       ├── UserTable.tsx
│   │   │       ├── UserDetailCard.tsx
│   │   │       ├── SetTierDialog.tsx
│   │   │       └── GrantCreditsDialog.tsx
│   │   │
│   │   ├── subscriptions/            # 【复用】订阅管理
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── components/
│   │   │
│   │   ├── orders/                   # 【复用】订单管理
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── components/
│   │   │
│   │   ├── credits/                  # 【新增】积分管理
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── components/
│   │   │       ├── CreditHistoryTable.tsx
│   │   │       └── CreditBoostDialog.tsx
│   │   │
│   │   ├── dashboard/                # 【改造】统一仪表盘
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   └── components/
│   │   │       ├── StatsCard.tsx
│   │   │       ├── HealthCard.tsx
│   │   │       └── TierDistribution.tsx
│   │   │
│   │   └── admin-logs/               # 【复用】管理日志
│   │       ├── index.ts
│   │       ├── api.ts
│   │       ├── hooks.ts
│   │       └── components/
│   │
│   ├── pages/                        # 页面组件
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── UserDetailPage.tsx
│   │   ├── SubscriptionsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── CreditsPage.tsx           # 【新增】
│   │   └── LogsPage.tsx
│   │
│   ├── hooks/                        # 全局 hooks
│   │   ├── usePagination.ts
│   │   └── useDebounce.ts
│   │
│   ├── stores/                       # Zustand 状态
│   │   └── auth.ts                   # 【重写】基于 Better Auth session
│   │
│   ├── lib/                          # 工具库
│   │   ├── api-client.ts             # 【重写】使用 cookie 认证
│   │   ├── api-paths.ts              # 【重写】Aiget 统一路径
│   │   ├── format.ts                 # 复用
│   │   └── utils.ts                  # 复用（cn 函数等）
│   │
│   ├── types/                        # 类型定义
│   │   └── api.ts                    # 【重写】统一用户系统类型
│   │
│   └── constants/                    # 常量
│       └── tier.ts                   # 订阅等级常量
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

**React 组件结构参考**（按需使用，不必 1:1 复刻）：

```
ComponentName/
├── index.ts              # 导出
├── ComponentName.tsx     # 主组件
├── components/           # 子组件 [可选]
└── hooks/                # 组件专属 Hooks [可选]
```

### Step 2.3：认证改造详解

**旧方案（Bearer Token）**：

```typescript
// 旧：stores/auth.ts
interface AuthState {
  user: AuthUser | null;
  token: string | null; // ← Bearer Token
  isAuthenticated: boolean;
  setAuth: (user, token) => void;
  logout: () => void;
}

// 旧：lib/api-client.ts
if (token) {
  headers['Authorization'] = `Bearer ${token}`; // ← 手动带 token
}
```

**新方案（Better Auth Session）**：

```typescript
// 新：stores/auth.ts
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>; // ← 调用 /api/v1/auth/me 检查 session
  logout: () => Promise<void>;
}

// 新：lib/api-client.ts
const response = await fetch(url, {
  ...options,
  credentials: 'include', // ← 自动携带 cookie
});
```

**登录流程改造**：

```typescript
// 旧：LoginForm.tsx
const data = await apiClient.post<LoginResponse>(ADMIN_API.LOGIN, { email, password });
setAuth(data.user, data.token); // ← 保存 token

// 新：LoginForm.tsx
const data = await apiClient.post<LoginResponse>(
  '/api/v1/auth/login',
  {
    email,
    password,
  },
  { headers: { 'X-Client-Type': 'web' } }
);
// Cookie 已自动写入，只需更新 user 状态
setUser(data.user);
```

### Step 2.4：API 路径对照

| 功能     | 旧路径                             | 新路径                         | 说明               |
| -------- | ---------------------------------- | ------------------------------ | ------------------ |
| 登录     | `/api/admin/login`                 | `/api/v1/auth/login`           | 统一认证 Facade    |
| 登出     | `/api/admin/logout`                | `/api/v1/auth/logout`          | 统一认证 Facade    |
| 当前用户 | `/api/admin/me`                    | `/api/v1/auth/me`              | 统一认证 Facade    |
| 系统统计 | `/api/admin/stats`                 | `/api/admin/stats`             | 保持不变           |
| 用户列表 | `/api/admin/users`                 | `/api/admin/users`             | 查 identity schema |
| 用户详情 | `/api/admin/users/:id`             | `/api/admin/users/:id`         | 查 identity schema |
| 设置等级 | `/api/admin/users/:id/tier`        | `/api/admin/users/:id/tier`    | 更新 identity      |
| 发放积分 | `/api/admin/users/:id/credits`     | `/api/admin/users/:id/credits` | 更新 identity      |
| 订阅列表 | `/api/admin/payment/subscriptions` | `/api/admin/subscriptions`     | 保持逻辑           |
| 订单列表 | `/api/admin/payment/orders`        | `/api/admin/orders`            | 保持逻辑           |
| 管理日志 | `/api/admin/logs`                  | `/api/admin/logs`              | 保持不变           |

### Step 2.5：后端 Admin Server

创建独立的 `apps/admin-server/` 作为管理后台的后端服务：

```
apps/admin-server/                    # 【新增】统一管理后台后端
├── src/
│   ├── main.ts                       # NestJS 启动
│   ├── app.module.ts                 # 根模块
│   │
│   ├── auth/                         # 认证模块
│   │   ├── auth.module.ts            # 引用 @aiget/auth-server
│   │   └── auth.controller.ts        # 挂载 Better Auth + Facade
│   │
│   ├── users/                        # 用户管理
│   │   ├── users.module.ts
│   │   ├── users.controller.ts       # /api/admin/users/*
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── subscriptions/                # 订阅管理
│   │   ├── subscriptions.module.ts
│   │   ├── subscriptions.controller.ts
│   │   └── subscriptions.service.ts
│   │
│   ├── orders/                       # 订单管理
│   │   └── ...
│   │
│   ├── credits/                      # 积分管理
│   │   └── ...
│   │
│   ├── stats/                        # 统计（跨 schema 只读）
│   │   ├── stats.module.ts
│   │   ├── stats.controller.ts       # /api/admin/stats
│   │   └── stats.service.ts          # 跨 schema 统计查询
│   │
│   ├── logs/                         # 管理日志
│   │   └── ...
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   └── admin.guard.ts        # 管理员权限校验（检查 user.isAdmin）
│   │   └── decorators/
│   │
│   └── prisma/                       # 数据库客户端
│       ├── identity.prisma.ts        # identity schema（读写）
│       └── products.prisma.ts        # 各产品 schema（只读，用于统计）
│
├── prisma/
│   └── schema.prisma                 # 可选：admin 专属表（如 AdminLog）
│
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

**NestJS 模块结构参考**（按需使用，不必 1:1 复刻）：

```
module-name/
├── dto/
│   ├── index.ts                    # DTO 导出
│   └── module-name.schema.ts       # Zod schemas + 推断类型 + DTO 类
├── module-name.module.ts           # NestJS 模块定义
├── module-name.controller.ts       # API 控制器
├── module-name.service.ts          # 业务逻辑
├── module-name.constants.ts        # 常量、枚举、配置 [可选]
├── module-name.errors.ts           # 自定义 HttpException 错误 [可选]
└── index.ts                        # 公共导出
```

**数据库访问策略**：

| Schema     | 访问权限 | 用途                                      |
| ---------- | -------- | ----------------------------------------- |
| `identity` | 读写     | 用户、订阅、订单、积分管理                |
| `moryflow` | 只读     | Dashboard 统计（workflow/note/site 数量） |
| `fetchx`   | 只读     | Dashboard 统计（scrape/crawl 数量）       |
| `memox`    | 只读     | Dashboard 统计（memory/entity 数量）      |

**管理员权限校验**：

使用现有的 `User.isAdmin` 字段：

```typescript
// common/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;  // 从 Better Auth session 获取

    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

// 使用示例
@Controller('api/admin/users')
@UseGuards(SessionGuard, AdminGuard)  // 先验证 session，再验证 admin
export class UsersController { ... }
```

**跨 Schema 统计查询示例**：

```typescript
// stats/stats.service.ts
async getDashboardStats(): Promise<DashboardStats> {
  // 方案 1：多 Client 查询
  const [userCount, workflowCount, scrapeCount, memoryCount] = await Promise.all([
    this.identityPrisma.user.count(),
    this.moryflowPrisma.workflow.count(),
    this.fetchxPrisma.scrapeJob.count(),
    this.memoxPrisma.memory.count(),
  ]);

  // 方案 2：Raw SQL 跨 schema（性能更好）
  const stats = await this.identityPrisma.$queryRaw<DashboardStats[]>`
    SELECT
      (SELECT COUNT(*) FROM identity.user) as user_count,
      (SELECT COUNT(*) FROM moryflow.workflow) as workflow_count,
      (SELECT COUNT(*) FROM fetchx.scrape_job) as scrape_count,
      (SELECT COUNT(*) FROM memox.memory) as memory_count
  `;

  return stats[0];
}
```

**部署说明**：

- 域名：`admin.aiget.dev`
- 端口：独立端口（如 3010）
- 环境变量：
  - `IDENTITY_DATABASE_URL`（identity schema）
  - `MORYFLOW_DATABASE_URL`（moryflow schema，只读）
  - `FETCHX_DATABASE_URL`（fetchx schema，只读）
  - `MEMOX_DATABASE_URL`（memox schema，只读）

### Step 2.6：验收标准

- [ ] 管理员可通过 Better Auth session 登录（cookie-based）
- [ ] 登录后访问 `admin.aiget.dev` 任意页面均保持登录状态
- [ ] 用户列表显示 identity schema 中的所有用户
- [ ] 可以修改用户等级（FREE/STARTER/PRO/MAX）
- [ ] 可以发放积分（subscription/purchased）
- [ ] 可以查看订阅和订单记录
- [ ] 可以查看管理操作日志
- [ ] 仪表盘显示跨产品统计数据

---

## Phase 3：业务接入（验证通过后执行）

### Step 3.1：改造各产品 Server

参考现有实现：`apps/fetchx/server/src/auth/auth.controller.ts`

改造内容：

1. 删除各产品自己的 Better Auth 配置
2. 引用 `@aiget/auth-server` 和 `@aiget/identity-db`
3. 挂载 Better Auth handler（`/api/auth/*`）
4. 挂载 Facade Controller（`/api/v1/auth/*`）

要改造的产品：

- [ ] `apps/moryflow/server/`
- [ ] `apps/fetchx/server/`
- [ ] `apps/memox/server/`

### Step 3.2：迁移各产品数据库 schema

为各产品创建独立的业务 schema：

- `moryflow` schema
- `fetchx` schema
- `memox` schema

并更新各产品的 `DATABASE_URL` 指向各自 schema。

### Step 3.3：前端接入（Web 端）

**当前项目的 Web 前端**：

| 应用                 | 路径     | 说明                            |
| -------------------- | -------- | ------------------------------- |
| `apps/console/`      | **待建** | 统一用户控制台（主要 Web 前端） |
| `apps/fetchx/www/`   | 已存在   | Fetchx 落地页（TanStack Start） |
| `apps/memox/www/`    | 已存在   | Memox 落地页（TanStack Start）  |
| `apps/moryflow/www/` | **待建** | Moryflow 落地页                 |

> 注意：Moryflow 核心产品是 `pc/`（Electron）和 `mobile/`（React Native），属于 Native 端，见 Step 3.4。

**Web 端约束**：

- refresh 由 cookie 承担（`credentials: 'include'`）
- access token 存内存（不要存 localStorage）

**启动流程**：

1. App 初始化时调用 `POST /api/v1/auth/refresh`（Web 不带 Authorization，浏览器自动带 cookie）
2. 拿到 `{ accessToken }` 存内存
3. 后续 API 请求带：`Authorization: Bearer <accessToken>`

**登录流程（Email+Password）**：

1. `POST /api/v1/auth/login`（`X-Client-Type: web`）
2. 成功返回 `{ accessToken, user }`（refresh cookie 已写入）

**注册流程（Email+Password）**：

1. `POST /api/v1/auth/register`（返回 next=VERIFY_EMAIL_OTP）
2. 用户输入 OTP → `POST /api/v1/auth/verify-email-otp`
3. 成功返回 `{ accessToken, user }`

**Google 登录**：

1. `POST /api/v1/auth/google/start` 获取 url
2. 跳转 url，完成 OAuth callback 后由前端再次调用 `POST /api/v1/auth/refresh` 获取 access

### Step 3.4：前端接入（Electron / React Native）

**当前项目的 Native 前端**：

| 应用                    | 路径   | 说明                                   |
| ----------------------- | ------ | -------------------------------------- |
| `apps/moryflow/pc/`     | 已存在 | Moryflow 桌面端（Electron）            |
| `apps/moryflow/mobile/` | 已存在 | Moryflow 移动端（React Native / Expo） |

**Native 端约束**：

- refresh token 必须写 Secure Storage（Electron: `safeStorage`，RN: `expo-secure-store`）
- access token 只放内存

**启动流程**：

1. Secure Storage 取 `refreshToken`
2. `POST /api/v1/auth/refresh`（`Authorization: Bearer <refreshToken>`，`X-Client-Type: native`）
3. 收到 `{ accessToken, refreshToken? }`
4. 如果有新 refreshToken，覆盖写 Secure Storage

---

## 6. 环境变量清单（必须）

每个产品 server 都需要（且部分必须全产品一致）：

- `BETTER_AUTH_SECRET`（全产品一致；>=32 chars）
- `BETTER_AUTH_URL`（各产品不同）：例如 `https://moryflow.aiget.dev/api/auth`
- `TRUSTED_ORIGINS`（逗号分隔）：例如 `https://moryflow.aiget.dev,http://localhost:5173`
- `ALLOWED_ORIGINS`（Nest CORS；与上类似）
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- 邮件发送（以你当前实现为准，参考 `apps/*/server/src/email`）：
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
- 数据库：
  - `IDENTITY_DATABASE_URL`（指向 `?schema=identity`）
  - `DATABASE_URL`（指向 `?schema={product}`）

---

## 7. 验收清单（你做完必须全部过）

1. Web：

- 在 `moryflow.aiget.dev` 登录后，访问 `fetchx.aiget.dev` 再调用 `POST /api/v1/auth/refresh` 能直接拿到 access（无需再次登录）

2. Native：

- 登录后把 refresh token 存 Secure Storage，重启 app 仍可 `refresh` 成功
- refresh rotation 正常：旧 refresh token 立刻失效

3. 安全：

- Web 页面 JS 永远拿不到 refresh token（不在 localStorage、不在响应 JSON、不在可读 cookie）

---

## 8. 参考链接（已验证 2026-01-06）

### Better Auth 官方文档

| 功能             | 链接                                                           | 说明                      |
| ---------------- | -------------------------------------------------------------- | ------------------------- |
| Email & Password | https://www.better-auth.com/docs/authentication/email-password | 注册/登录/密码重置        |
| Email OTP 插件   | https://www.better-auth.com/docs/plugins/email-otp             | OTP 验证码登录/验证       |
| JWT 插件         | https://www.better-auth.com/docs/plugins/jwt                   | Access Token 生成         |
| Google OAuth     | https://www.better-auth.com/docs/authentication/google         | Google 登录（含 idToken） |
| Session 管理     | https://www.better-auth.com/docs/concepts/session-management   | Session TTL/刷新/缓存     |
| Cookies          | https://www.better-auth.com/docs/concepts/cookies              | 跨子域 Cookie 配置        |

### 关键配置速查

```typescript
// packages/auth-server/src/better-auth.ts 示例配置
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { emailOTP } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export const createBetterAuth = (identityPrisma: PrismaClient) =>
  betterAuth({
    database: prismaAdapter(identityPrisma, { provider: 'postgresql' }),

    // 跨子域 Cookie（官方文档：/docs/concepts/cookies）
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: '.aiget.dev',
      },
    },

    // 信任的子域名（必须配置，否则跨域请求会被拒绝）
    trustedOrigins: [
      'https://moryflow.aiget.dev',
      'https://fetchx.aiget.dev',
      'https://memox.aiget.dev',
      'https://console.aiget.dev',
      'https://admin.aiget.dev',
    ],

    // Session TTL = 90 天（官方文档：/docs/concepts/session-management）
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 days in seconds
      updateAge: 60 * 60 * 24, // 每天刷新一次过期时间
    },

    // Email + Password（官方文档：/docs/authentication/email-password）
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    // Google OAuth（官方文档：/docs/authentication/google）
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },

    // 插件
    plugins: [
      // Email OTP（官方文档：/docs/plugins/email-otp）
      emailOTP({
        otpLength: 6,
        expiresIn: 300, // 5 分钟
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        async sendVerificationOTP({ email, otp, type }) {
          // type: 'sign-in' | 'email-verification' | 'forget-password'
          await sendEmail(email, otp, type);
        },
      }),

      // JWT（官方文档：/docs/plugins/jwt）
      jwt({
        jwt: {
          expirationTime: '6h',
          issuer: 'https://aiget.dev',
          audience: 'https://aiget.dev',
        },
      }),
    ],
  });
```
