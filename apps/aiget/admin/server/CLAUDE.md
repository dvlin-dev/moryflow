# Admin Server

> 统一管理后台后端 - NestJS 服务

## 定位

Aiget 统一管理后台的后端服务，为 admin.aiget.dev 提供 API 支持。

## 职责

- 提供管理员认证（Access Token / JWT）
- 提供用户管理 API（查询、设置等级、发放积分）
- 提供订阅、订单、积分管理 API
- 提供统计和管理日志 API

## 约束

- 所有 API 需要管理员权限（JwtGuard + AdminGuard）
- 只读访问 identity schema 数据
- 写操作需记录到 AdminLog

## 成员清单

| 目录/文件                          | 类型   | 说明                     |
| ---------------------------------- | ------ | ------------------------ |
| `src/main.ts`                      | 入口   | NestJS 启动              |
| `src/app.module.ts`                | Module | 根模块                   |
| `src/auth/`                        | Module | 认证（引用 auth-server） |
| `src/users/`                       | Module | 用户管理                 |
| `src/subscriptions/`               | Module | 订阅管理                 |
| `src/orders/`                      | Module | 订单管理                 |
| `src/credits/`                     | Module | 积分管理                 |
| `src/stats/`                       | Module | 统计                     |
| `src/logs/`                        | Module | 管理日志                 |
| `src/common/guards/admin.guard.ts` | Guard  | 管理员权限校验           |
| `src/prisma/`                      | Module | 数据库客户端             |

## API 路由

### 认证（来自 @aiget/auth-server）

| 方法 | 路径                  | 说明         |
| ---- | --------------------- | ------------ |
| POST | `/api/v1/auth/login`  | 登录         |
| POST | `/api/v1/auth/logout` | 登出         |
| GET  | `/api/v1/auth/me`     | 当前用户信息 |

### 用户管理

| 方法   | 路径                           | 说明       |
| ------ | ------------------------------ | ---------- |
| GET    | `/api/admin/users`             | 用户列表   |
| GET    | `/api/admin/users/:id`         | 用户详情   |
| POST   | `/api/admin/users/:id/tier`    | 设置等级   |
| POST   | `/api/admin/users/:id/credits` | 发放积分   |
| DELETE | `/api/admin/users/:id`         | 软删除用户 |
| POST   | `/api/admin/users/:id/restore` | 恢复用户   |

### 订阅管理

| 方法 | 路径                           | 说明     |
| ---- | ------------------------------ | -------- |
| GET  | `/api/admin/subscriptions`     | 订阅列表 |
| GET  | `/api/admin/subscriptions/:id` | 订阅详情 |

### 订单管理

| 方法 | 路径                    | 说明     |
| ---- | ----------------------- | -------- |
| GET  | `/api/admin/orders`     | 订单列表 |
| GET  | `/api/admin/orders/:id` | 订单详情 |

### 积分管理

| 方法 | 路径                 | 说明         |
| ---- | -------------------- | ------------ |
| GET  | `/api/admin/credits` | 积分流水列表 |

### 统计

| 方法 | 路径               | 说明     |
| ---- | ------------------ | -------- |
| GET  | `/api/admin/stats` | 统计数据 |

### 管理日志

| 方法 | 路径              | 说明         |
| ---- | ----------------- | ------------ |
| GET  | `/api/admin/logs` | 管理日志列表 |

## 环境变量

```bash
# 服务端口
PORT=3001

# Better Auth 密钥（与所有产品一致）
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters

# Better Auth URL
BETTER_AUTH_URL=http://localhost:3001/api/auth

# Identity 数据库连接
IDENTITY_DATABASE_URL=postgresql://user:pass@localhost:5432/aiget?schema=identity
```

## 命令

```bash
# 开发
pnpm --filter @aiget/admin-server start:dev

# 构建
pnpm --filter @aiget/admin-server build

# 生产运行
pnpm --filter @aiget/admin-server start:prod

# 类型检查
pnpm --filter @aiget/admin-server typecheck

# 运行测试
pnpm --filter @aiget/admin-server test

# 运行测试（带覆盖率）
pnpm --filter @aiget/admin-server test:cov

# 监听模式
pnpm --filter @aiget/admin-server test:watch
```

## 测试

### 单元测试

使用 Vitest + @nestjs/testing 进行单元测试。

测试文件位置：`src/**/__tests__/*.spec.ts`

| 测试文件                                                | 说明            |
| ------------------------------------------------------- | --------------- |
| `users/__tests__/users.service.spec.ts`                 | 用户服务测试    |
| `subscriptions/__tests__/subscriptions.service.spec.ts` | 订阅服务测试    |
| `orders/__tests__/orders.service.spec.ts`               | 订单服务测试    |
| `credits/__tests__/credits.service.spec.ts`             | 积分服务测试    |
| `stats/__tests__/stats.service.spec.ts`                 | 统计服务测试    |
| `logs/__tests__/logs.service.spec.ts`                   | 日志服务测试    |
| `common/guards/__tests__/admin.guard.spec.ts`           | AdminGuard 测试 |

### 测试辅助工具

| 文件                               | 说明          |
| ---------------------------------- | ------------- |
| `test/setup.ts`                    | 测试全局配置  |
| `test/helpers/mock.factory.ts`     | Mock 工厂函数 |
| `test/helpers/test-app.factory.ts` | 测试应用工厂  |
| `test/fixtures/seed.ts`            | 测试数据种子  |

### 测试数据库

集成测试使用 Docker Compose 启动的测试数据库：

```bash
# 启动测试环境
./deploy/infra/test-env.sh start

# 停止测试环境
./deploy/infra/test-env.sh stop

# 清理测试数据
./deploy/infra/test-env.sh clean
```

测试数据库连接：

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`

## 认证流程

1. 管理员通过 `/api/v1/auth/login` 登录
2. 服务端写入 refresh cookie（Web），并返回 `accessToken`（JWT）
3. 前端把 `accessToken` 存内存，并在后续请求带 `Authorization: Bearer <accessToken>`
4. access 过期时，前端调用 `/api/v1/auth/refresh`（浏览器自动带 refresh cookie）换新 access（refresh rotation 开启）
5. JwtGuard 校验 access token，AdminGuard 检查 `user.isAdmin === true`
