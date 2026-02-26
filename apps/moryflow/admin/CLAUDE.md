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

- PR #99 review follow-up：`useSyncChatModels` 增加空数据 loading/error 保护，避免初始化阶段清空本地模型偏好（`admin.chat.preferredModel`）
- PR #99 review follow-up：`confirmSiteAction` 改为仅成功后关窗；`SiteActionConfirmDialog` 捕获异步失败并展示错误信息，避免未处理 Promise 拒绝
- 追加修复：`@moryflow/admin build` 阻塞收口：`src/lib/query-string.ts` 改为泛型参数签名，`ModelFormDialog` 的 `reasoningEnabled` 显式布尔收敛；`package.json` 增加 `prebuild` 自动构建 `@moryflow/model-registry-data`
- 追加修复：`pnpm --filter @moryflow/admin lint/typecheck/test:unit/build` 全通过（包含 prebuild 自动同步模型注册包）
- 追加修复：`chat/sites/image-generation` 完成 `store + methods + 子组件就地取数` 一次性重构，核心页面收敛为装配层，移除多层 props drilling
- 追加修复：`ChatPane` 流式请求编排下沉到 `features/chat/methods.ts`，`ConversationSection/ChatFooter/ModelSelector` 统一 selector 取数
- 追加修复：`SitesPage` 筛选/分页/操作状态迁移到 `features/sites/store.ts`，`SitesFilterBar/SitesTable/SiteActionConfirmDialog` 改为就地取数
- 追加修复：`ImageGenerator` 状态迁移到 `features/image-generation/store.ts`，`ImageGeneratorForm/Result` 改为 methods 驱动
- 追加修复：新增 `chat/sites/image-generation` 三组 `methods.test.ts` 回归测试，`@moryflow/admin test:unit` 通过（35 files / 156 tests）
- 项目复盘：`ToolAnalyticsPage` 拆分为装配层（160 行），`ToolStatsTable` 状态渲染统一为 `ViewState + switch`，并抽离 `tool-analytics/metrics` 聚合逻辑与回归测试
- 项目复盘：`AgentTraceStoragePage` 拆分为装配层（110 行），新增 `agent-trace-storage/*` 组件与 `resolveStorageStatsViewState`，补齐显式失败态
- 项目复盘：`PaymentTestPage` 拆分产品卡片/配置区/说明区（235 行），移除链式三元并新增 `payment-test/cycle` 回归测试
- 项目复盘：新增 `tool-analytics` / `agent-trace-storage` / `payment-test` 三组测试；`@moryflow/admin test:unit` 通过（32 files / 147 tests）
- 模块 D：`SitesPage`/`SiteDetailPage`/`ImageGenerator` 完成拆分减责并统一状态片段化，主容器分别收敛至 151/177/180 行（移除多状态链式三元）
- 模块 D：`sites` 新增 `view-state.ts`、`query-paths.ts` 并接入页面与 API；`SiteDetailPage` 补齐 `loading/error/not-found/ready` 显式分支
- 模块 D：`image-generation` 新增 `view-state.ts`，结果区拆分 `ImageGeneratorResult` 并统一 `renderContentByState + switch`
- 模块 D：`shared/data-table` 骨架屏实现统一复用 `TableSkeleton`，移除局部重复逻辑
- 模块 D：补齐 `sites view-state` / `sites query-paths` / `image-generation view-state` 回归测试；`@moryflow/admin test:unit` 通过（29 files / 134 tests）
- 模块 C：`trace-table` / `failed-tool-table` / `trace-detail-sheet` / `LogsPage` 多状态渲染统一为 `ViewState + renderByState/switch`，核心链路移除链式三元
- 模块 C：`LogsPage` 拆分 `LogCategoryBadge` / `LogLevelBadge` / `LogDetailDialog` 并引入 `resolveActivityLogsListViewState`（文件收敛到 268 行）
- 模块 C：`AlertRuleDialog` 默认值与 DTO 映射抽离到 `alert-rule-form.ts`，移除硬编码邮箱默认值并补齐邮箱格式校验（文件收敛到 253 行）
- 模块 C：`alerts` / `agent-traces` API 查询字符串构建统一复用 `src/lib/query-string.ts#buildQuerySuffix`
- 模块 C：`ChatPane` 引入 `messagesRef + stream-parser` 收敛流式编排，修复请求消息闭包态组装风险；新增 `stream-parser` 回归测试
- 模块 C：补齐 `agent-traces` / `admin-logs` / `alerts` / `lib/query-string` 单测，`@moryflow/admin test:unit` 通过（26 files / 117 tests）
- 模块 B：`ModelFormDialog` 拆分为容器 + 搜索片段 + 基础字段片段 + Reasoning 片段（容器降至 157 行），消除单文件职责混杂
- 模块 B：`SubscriptionsPage` / `OrdersPage` / `ProvidersPage` / `ModelsPage` 列表区统一改为 `ViewState + renderByState/switch`，并补齐显式 `error` 状态片段（移除链式三元）
- 模块 B：`models/orders/subscriptions/storage` 查询参数构造统一收敛到 query builder（`URLSearchParams`），并新增对应回归测试
- 模块 B：`ProviderFormDialog` 默认值工厂化（`getProviderFormDefaultValues`），统一初始化与重置逻辑
- Users 模块 A：`UsersPage` 拆分为 `UsersFilterBar` + `UsersTable`，列表区改为 `UsersTableViewState + renderRowsByState/switch`，移除链式三元
- Users 模块 A：修复 `SetTierDialog` 切换目标用户时的等级残留（受控值 + `currentTier` 变化重置 + 关闭对话框清理 `selectedUser`）
- Users 模块 A：`usersApi` 查询参数构造抽离到 `query-paths.ts`（`URLSearchParams`），并新增 `set-tier-dialog` / `api-paths` 回归测试
- Dashboard：将 `getPaidUsers` 从 `DashboardPage.tsx` 拆分到 `src/pages/dashboard-metrics.ts`，避免页面文件导出非组件触发 `react-refresh/only-export-components` lint 失败
- Build：Docker 依赖安装显式追加 `--filter @moryflow/typescript-config...`，确保 `packages/types` 容器构建能解析 `@moryflow/typescript-config/base.json`
- Build：Docker 构建补齐根 `tsconfig.agents.json` 与 `.npmrc`，并固定 pnpm `9.12.2`，修复 `packages/api` 在容器内 `TS5083`（缺少 `tsconfig.agents.json`）链路失败
- Auth Store：修复 `onRehydrateStorage` 回调中 `set` 作用域问题，改为通过 `useAuthStore.setState` 回填状态，避免 rehydrate 期间运行时异常
- API Client：请求 body 类型与 `ApiClientRequestOptions['body']` 对齐，消除 Auth 重构后的类型回归
- Build：Docker 构建补齐 `packages/types -> packages/sync -> packages/api` 预构建链路，并补齐根 `tsconfig.base.json` 复制避免 `TS5083`
- Auth Store rehydrate 改为通过 store methods/setter 清理过期 token，确保清理结果持久化回 localStorage
- 管理后台下拉/折叠箭头改为 ChevronDown（无中轴）
- 管理后台图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- Docker 构建补齐 @moryflow/types 与 typescript-config 依赖，避免 build 缺失
- Admin API client 对非 JSON 响应抛出 `UNEXPECTED_RESPONSE`，并统一 ProblemDetails 类型来源
- 补齐 API client 非 JSON 回归测试，新增 `test:unit`

## 约束

- 使用 TailwindCSS 4 + shadcn/ui 组件库
- 状态管理使用 Zustand
- 数据获取使用 TanStack Query
- 路由使用 React Router
- 表单使用 react-hook-form + zod
- 图标统一使用 Lucide（`lucide-react`，直接组件调用），禁止 `@hugeicons/*` / `@tabler/icons-react`

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
- `src/components/ui` 与 `src/components/shared` 允许多导出，`eslint.config.js` 已关闭 `react-refresh/only-export-components`
- `src/features/` 与 `src/pages/` 避免在 `useEffect` 中设置派生状态，优先使用派生值
- 表单内监听字段值优先使用 `useWatch`，避免 `form.watch()` 带来的编译器警告
- 复杂弹窗表单通过 `key` 触发重挂载，替代 effect 内的状态重置
- Auth 改为 access 内存 + refresh（/api/v1/auth/refresh），移除 localStorage token
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
