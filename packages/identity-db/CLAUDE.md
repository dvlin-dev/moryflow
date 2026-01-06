# Identity DB

> 统一身份数据库包 - 提供 Prisma schema 和 client

## 定位

Aiget 统一身份平台的数据层，所有产品共享的用户、会话、订阅、积分数据。

## 职责

- 定义 identity schema 的数据模型
- 提供 Prisma 7 生成的 PrismaClient 和类型
- 导出所有模型类型和枚举

## 约束

- 仅包含 identity schema 相关表
- 不包含业务逻辑，纯数据层
- 所有产品服务共享同一个 identity schema

## 成员清单

| 文件                   | 类型   | 说明                        |
| ---------------------- | ------ | --------------------------- |
| `prisma/schema.prisma` | Schema | Prisma 数据模型定义         |
| `prisma.config.ts`     | Config | Prisma 7 配置文件           |
| `generated/prisma/`    | 生成   | Prisma 生成的 client 和类型 |

## 数据模型

### Better Auth 核心表

| 表             | 说明                  |
| -------------- | --------------------- |
| `user`         | 用户主体              |
| `session`      | 会话（refresh token） |
| `account`      | 账号绑定（OAuth）     |
| `verification` | 验证码/验证数据       |
| `jwks`         | JWT 公钥/私钥存储     |

### 统一业务表

| 表                   | 说明         |
| -------------------- | ------------ |
| `user_profile`       | 用户扩展信息 |
| `subscription`       | 订阅记录     |
| `order`              | 订单记录     |
| `credit_transaction` | 积分变动流水 |
| `admin_log`          | 管理操作日志 |

## 使用方式

```typescript
import { PrismaClient, type User } from '@aiget/identity-db';

// 创建实例（消费方负责单例管理）
const prisma = new PrismaClient();

// 查询用户
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// 创建订阅
const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    tier: 'PRO',
    currentPeriodStart: new Date(),
    currentPeriodEnd: addMonths(new Date(), 1),
  },
});
```

## 环境变量

```bash
# identity schema 数据库连接（必须带 ?schema=identity）
IDENTITY_DATABASE_URL=postgresql://user:pass@localhost:5432/aiget?schema=identity
```

## 命令

```bash
# 生成 Prisma Client
pnpm --filter @aiget/identity-db prisma:generate

# 推送 schema 到数据库（开发用）
pnpm --filter @aiget/identity-db prisma:push

# 创建迁移
pnpm --filter @aiget/identity-db prisma:migrate

# 打开 Prisma Studio
pnpm --filter @aiget/identity-db prisma:studio
```
