# Admin

> 本目录结构变更需同步更新本文件。

## 模块概览

Admin 模块提供运营管理后台接口（统计、用户、订单、队列、浏览器池等），只允许管理员访问。

> 注意：Digest 的 Admin API 不在本模块实现。所有 `/api/v1/admin/digest/*` 路由由 `src/digest/controllers/digest-admin.controller.ts` 负责，避免重复注册导致路由冲突。

## 职责范围

- Dashboard 统计
- 用户管理（查询/操作）
- 订阅与订单查询
- 队列与任务状态
- 浏览器池管理
- 定时任务与内部运维操作

## 关键约束

- 所有接口必须走 `AuthGuard` + `RequireAdmin`
- 路由统一 `version: '1'`（`/api/v1/admin/*`）
- 无公共接口（禁止 `@Public()`）
- 不提供独立 Admin 登录入口，统一走 `/api/auth/*`

## 文件结构

| 文件                               | 类型    | 说明                |
| ---------------------------------- | ------- | ------------------- |
| `admin.service.ts`                 | Service | 管理后台核心逻辑    |
| `admin-jobs.service.ts`            | Service | 任务与作业统计      |
| `admin-queue.service.ts`           | Service | 队列操作            |
| `admin-scheduled-tasks.service.ts` | Service | 定时任务管理        |
| `admin-user-credits.service.ts`    | Service | 管理员配额/积分操作 |
| `admin.module.ts`                  | Module  | 模块定义            |
| `dto.ts`                           | DTO     | 管理后台 DTO        |

### Controllers

| 文件                                | Endpoint                 | 说明      |
| ----------------------------------- | ------------------------ | --------- |
| `admin-dashboard.controller.ts`     | `/admin/dashboard`       | Dashboard |
| `admin-users.controller.ts`         | `/admin/users`           | 用户管理  |
| `admin-user-credits.controller.ts`  | `/admin/users/*/credits` | 充值/扣减 |
| `admin-subscriptions.controller.ts` | `/admin/subscriptions`   | 订阅查询  |
| `admin-orders.controller.ts`        | `/admin/orders`          | 订单查询  |
| `admin-jobs.controller.ts`          | `/admin/jobs`            | 作业监控  |
| `admin-queue.controller.ts`         | `/admin/queues`          | 队列管理  |
| `admin-browser.controller.ts`       | `/admin/browser`         | 浏览器池  |

## 授权示例

```typescript
@Controller({ path: 'admin/users', version: '1' })
@RequireAdmin()
export class AdminUsersController {
  // 所有方法都要求管理员权限
}
```

## 依赖关系

```
admin/
├── prisma/ - 数据查询
├── queue/ - BullMQ 队列
├── browser/ - 浏览器池状态
└── auth/ - Access Token + AdminGuard
```

## 关键导出

```typescript
export { AdminModule } from './admin.module';
export { AdminService } from './admin.service';
```
