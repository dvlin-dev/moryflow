# Admin

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 后台管理系统，基于 Vite + React 构建的 Web 管理端。

## 职责

- 用户管理（查看、禁用、积分调整）
- 支付管理（订单、订阅、许可证、折扣）
- AI 模型管理（供应商、模型配置）
- 存储管理（文件上传配额）
- 管理日志审计
- 数据仪表盘

## 近期变更

- Admin API client 对非 JSON 响应抛出 `UNEXPECTED_RESPONSE`，并统一 ProblemDetails 类型来源
- 补齐 API client 非 JSON 回归测试，新增 `test:unit`

## 约束

- 使用 TailwindCSS 4 + shadcn/ui 组件库
- 状态管理使用 Zustand
- 数据获取使用 TanStack Query
- 路由使用 React Router
- 表单使用 react-hook-form + zod
- 图标统一使用 Hugeicons（`@hugeicons/react` + `@hugeicons/core-free-icons`），禁止 `lucide-react` / `@tabler/icons-react`

## 测试

- 单元测试：`pnpm test:unit`

## 技术栈

| 技术            | 用途     |
| --------------- | -------- |
| Vite            | 构建工具 |
| React 19        | UI 框架  |
| TailwindCSS 4   | 样式系统 |
| shadcn/ui       | 组件库   |
| TanStack Query  | 数据获取 |
| React Router    | 路由     |
| Zustand         | 状态管理 |
| react-hook-form | 表单处理 |

## 成员清单

| 文件/目录         | 类型 | 说明                   |
| ----------------- | ---- | ---------------------- |
| `src/main.tsx`    | 入口 | 应用启动入口           |
| `src/App.tsx`     | 组件 | 根组件，配置 Provider  |
| `src/pages/`      | 目录 | 页面组件               |
| `src/features/`   | 目录 | 功能模块（按业务划分） |
| `src/components/` | 目录 | 通用组件               |
| `src/hooks/`      | 目录 | 自定义 Hooks           |
| `src/stores/`     | 目录 | Zustand 状态管理       |
| `src/lib/`        | 目录 | 工具库                 |
| `src/types/`      | 目录 | 类型定义               |
| `src/constants/`  | 目录 | 常量                   |

### 功能模块（features/）

| 模块          | 说明                                 |
| ------------- | ------------------------------------ |
| `auth/`       | 认证（登录表单）                     |
| `users/`      | 用户管理                             |
| `payment/`    | 支付管理（订单、订阅、许可证、折扣） |
| `providers/`  | AI 供应商管理                        |
| `models/`     | AI 模型管理                          |
| `storage/`    | 存储管理                             |
| `dashboard/`  | 数据仪表盘                           |
| `chat/`       | AI 聊天测试                          |
| `admin-logs/` | 管理操作日志                         |

### 通用组件（components/）

| 目录      | 说明                       |
| --------- | -------------------------- |
| `ui/`     | shadcn/ui 基础组件         |
| `layout/` | 布局组件（侧边栏、头部等） |
| `shared/` | 业务共享组件               |

## 常见修改场景

| 场景         | 涉及文件                    | 注意事项            |
| ------------ | --------------------------- | ------------------- |
| 新增页面     | `src/pages/`, `src/App.tsx` | 添加路由配置        |
| 新增功能模块 | `src/features/xxx/`         | 遵循现有模块结构    |
| 新增 UI 组件 | `src/components/ui/`        | 使用 shadcn/ui 规范 |
| 修改支付功能 | `src/features/payment/`     | 注意子模块划分      |
| 修改用户管理 | `src/features/users/`       | 注意权限校验        |

## 近期变更

- API client 切换 raw JSON + RFC7807 错误体解析（移除 success/data 包装）
- Dashboard：同步文件数卡片改用 `FileSyncIcon`，修复 Hugeicons 导出缺失导致的构建错误
- `src/components/ui` 与 `src/components/shared` 允许多导出，`eslint.config.js` 已关闭 `react-refresh/only-export-components`
- `src/features/` 与 `src/pages/` 避免在 `useEffect` 中设置派生状态，优先使用派生值
- 表单内监听字段值优先使用 `useWatch`，避免 `form.watch()` 带来的编译器警告
- 复杂弹窗表单通过 `key` 触发重挂载，替代 effect 内的状态重置
- Auth 改为 access 内存 + refresh（/api/auth/refresh），移除 localStorage token
- 管理后台仅允许管理员登录（非管理员会被拒绝）
- React Query 客户端统一在入口初始化，避免重复 Provider
- Spinner 只接收样式类与尺寸参数，避免误传 icon

## 依赖关系

```
apps/moryflow/admin/
├── 调用 → apps/moryflow/server（Admin API）
└── 样式 → TailwindCSS + shadcn/ui
```

## 模块结构规范

每个功能模块（features/xxx/）应遵循以下结构：

```
features/xxx/
├── index.ts        # 模块导出
├── api.ts          # API 请求
├── const.ts        # 常量与类型
├── hooks.ts        # 自定义 Hooks
└── components/     # 模块组件
    └── index.ts    # 组件导出
```
