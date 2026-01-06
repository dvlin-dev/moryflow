# Admin Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

平台管理相关操作，提供用户、订阅、订单与仪表盘的管理接口。

## 职责

**包含：**

- 用户列表与管理（管理员开关、删除）
- 订阅管理
- 订单管理
- 仪表盘指标
- 管理员认证

**不包含：**

- 普通用户功能（由 user/ 负责）
- 支付处理（由 payment/ 负责）
- 配额控制（由 quota/ 负责）

## 成员清单

| 文件                                | 类型       | 说明              |
| ----------------------------------- | ---------- | ----------------- |
| `admin.service.ts`                  | Service    | 管理端业务逻辑    |
| `admin.module.ts`                   | Module     | NestJS 模块定义   |
| `admin-auth.controller.ts`          | Controller | 管理员登录/登出   |
| `admin-users.controller.ts`         | Controller | 用户管理          |
| `admin-subscriptions.controller.ts` | Controller | 订阅管理          |
| `admin-orders.controller.ts`        | Controller | 订单管理          |
| `admin-dashboard.controller.ts`     | Controller | 仪表盘指标        |
| `dto/admin.schema.ts`               | Schema     | Zod schemas + DTO |
| `dto/index.ts`                      | Export     | DTO 导出          |
| `index.ts`                          | Export     | 模块导出          |

## API 端点

均需 SessionGuard + AdminGuard：

```
POST   /api/admin/login               # 管理员登录
POST   /api/admin/logout              # 管理员登出
GET    /api/admin/users               # 用户列表
GET    /api/admin/users/:id           # 用户详情
PATCH  /api/admin/users/:id           # 更新用户
DELETE /api/admin/users/:id           # 删除用户
GET    /api/admin/subscriptions       # 订阅列表
GET    /api/admin/orders              # 订单列表
GET    /api/admin/dashboard           # 仪表盘指标
```

## 依赖关系

```
admin/
├── 依赖 → auth/（管理员鉴权）
├── 依赖 → user/（用户数据）
├── 依赖 → subscription/（订阅数据）
├── 依赖 → prisma/（数据库）
└── 被依赖 ← apps/aiget/admin/www（前端）
```

---

_见 [apps/aiget/memox/server/CLAUDE.md](../CLAUDE.md) 获取服务端约定_
