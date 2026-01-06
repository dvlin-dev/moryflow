# Admin

> 统一管理后台前端 - React 单页应用

## 定位

Aiget 统一管理后台的前端，访问 admin.aiget.dev 提供管理界面。

## 职责

- 管理员登录认证
- 用户管理（查看、设置等级、发放积分）
- 订阅管理（查看订阅列表和详情）
- 订单管理（查看订单列表和详情）
- 积分管理（查看积分流水）
- 管理日志审计
- 数据仪表盘

## 约束

- 使用 TailwindCSS 4 + shadcn/ui 组件库
- 状态管理使用 Zustand
- 数据获取使用 TanStack Query
- 路由使用 react-router-dom
- 需要管理员权限（isAdmin === true）

## 技术栈

| 技术             | 用途     |
| ---------------- | -------- |
| Vite             | 构建工具 |
| React 19         | UI 框架  |
| TailwindCSS 4    | 样式系统 |
| shadcn/ui        | 组件库   |
| TanStack Query   | 数据获取 |
| react-router-dom | 路由     |
| Zustand          | 状态管理 |
| react-hook-form  | 表单处理 |

## 成员清单

| 文件/目录         | 类型 | 说明                         |
| ----------------- | ---- | ---------------------------- |
| `src/main.tsx`    | 入口 | 应用启动入口                 |
| `src/App.tsx`     | 组件 | 根组件，配置 Provider 和路由 |
| `src/pages/`      | 目录 | 页面组件                     |
| `src/features/`   | 目录 | 功能模块（按业务划分）       |
| `src/components/` | 目录 | 通用组件                     |
| `src/hooks/`      | 目录 | 自定义 Hooks                 |
| `src/stores/`     | 目录 | Zustand 状态管理             |
| `src/lib/`        | 目录 | 工具库                       |
| `src/types/`      | 目录 | 类型定义                     |

## 页面路由

| 路径             | 页面              | 说明     |
| ---------------- | ----------------- | -------- |
| `/login`         | LoginPage         | 登录页   |
| `/`              | DashboardPage     | 仪表盘   |
| `/users`         | UsersPage         | 用户列表 |
| `/users/:id`     | UserDetailPage    | 用户详情 |
| `/subscriptions` | SubscriptionsPage | 订阅列表 |
| `/orders`        | OrdersPage        | 订单列表 |
| `/credits`       | CreditsPage       | 积分流水 |
| `/logs`          | LogsPage          | 管理日志 |

## 环境变量

```bash
# API 代理目标（开发模式）
API_TARGET=http://localhost:3001
```

## 命令

```bash
# 开发
pnpm --filter @aiget/admin dev

# 构建
pnpm --filter @aiget/admin build

# 类型检查
pnpm --filter @aiget/admin typecheck

# 单元测试
pnpm --filter @aiget/admin test

# E2E 测试（Playwright）
pnpm --filter @aiget/admin test:e2e

# E2E 测试（UI 模式）
pnpm --filter @aiget/admin test:e2e:ui

# E2E 测试（调试模式）
pnpm --filter @aiget/admin test:e2e:debug
```

## 测试

### 单元测试

使用 Vitest + Testing Library 测试组件和 hooks。

测试文件位置：`src/**/__tests__/*.spec.ts`

### E2E 测试

使用 Playwright 进行端到端测试。

测试文件位置：`e2e/*.spec.ts`

| 测试文件                 | 说明             |
| ------------------------ | ---------------- |
| `e2e/auth.spec.ts`       | 认证流程测试     |
| `e2e/navigation.spec.ts` | 导航功能测试     |
| `e2e/dashboard.spec.ts`  | 仪表盘页面测试   |
| `e2e/users.spec.ts`      | 用户管理页面测试 |

## API 调用

前端通过 Vite 代理调用后端 API：

- 开发模式：`/api/*` 代理到 `http://localhost:3001`
- 生产模式：Nginx 反向代理到 admin-server

认证流程：

1. 管理员通过 `/api/v1/auth/login` 登录
2. Cookie 自动存储在浏览器
3. 后续请求自动携带 Cookie（credentials: 'include'）
4. 需要验证 `isAdmin === true`
