---
title: Anyhunt Admin Code Review
date: 2026-02-26
scope: apps/anyhunt/admin/www
status: in_progress
---

<!--
[INPUT]: apps/anyhunt/admin/www（模块 A：dashboard/users/subscriptions/orders）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt Admin）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Admin Code Review

## 范围

- 项目：`apps/anyhunt/admin/www`
- 本轮模块：`dashboard / users / subscriptions / orders`
- 页面入口：
  - `src/pages/DashboardPage.tsx`
  - `src/pages/UsersPage.tsx`
  - `src/pages/SubscriptionsPage.tsx`
  - `src/pages/OrdersPage.tsx`
- 特性目录：
  - `src/features/dashboard/*`
  - `src/features/users/*`
  - `src/features/subscriptions/*`
  - `src/features/orders/*`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

## 结论摘要（模块 A：A-1 已完成）

- `S1`（必须改）：4 项（其中 1 项已在 A-1 修复）
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：2 项
- 当前状态：已完成 A-1（多状态 UI 片段化），待继续 A-2~A-6

## 发现（按严重度排序）

- [S1] `SubscriptionsPage` 单文件超阈值且职责混杂（列表编排 + 过滤 + 编辑弹窗 + 更新提交）
  - 证据：
    - 文件行数 `333`（阈值：>300 必须拆分）
    - 页面层同时承载 query/filter/search、table 渲染、edit dialog 表单与 mutation 保存
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:48`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:138`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:278`

- [S1] `UserCreditsSheet` 超阈值且“用户详情 + 授权表单 + 历史记录 + 确认弹窗”耦合在单组件
  - 证据：
    - 文件行数 `312`（阈值：>300 必须拆分）
    - 同组件内混合了两个查询状态分支、RHF 表单提交、确认弹窗与 mutation 流程
  - 定位：
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:66`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:126`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:229`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:281`

- [S1][已修复] 多状态 UI 使用链式三元，未落实“状态片段化 + renderContentByState/switch”
  - 证据：
    - `isLoading ? ... : !data?.items.length ? ... : ...` 在 3 个页面重复出现
    - `UserCreditsSheet` 的 user/grants 两段均为 loading/error/empty/ready 链式三元
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:129`
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:135`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:187`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:193`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:155`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:161`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:145`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:234`

- [S1] `SubscriptionsPage` 编辑表单未采用 `react-hook-form + zod/v3`
  - 证据：
    - 编辑字段由 `useState` 维护，表单校验未集中在 schema
    - 与仓库“前端表单强制规范”不一致
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:55`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:56`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:289`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:305`

- [S2] Users/Subscriptions/Orders 的查询编排逻辑重复（search/keyDown/page/filter）
  - 证据：
    - 三页都在页面层重复维护 query/searchInput 与同构 handler
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:55`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:61`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:43`

- [S2] 对话框状态模型分散，多个布尔开关与选中实体并存
  - 证据：
    - Users：`deleteDialogOpen + selectedUser + creditsSheetOpen + creditsUserId`
    - Subscriptions：`editDialogOpen + selectedSubscription + editTier + editStatus`
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:46`
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:49`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:51`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:57`

- [S2] 徽标样式映射函数在多个页面重复实现，存在行为漂移风险
  - 证据：
    - tier/status/type badge variant 分别在页面内本地 `switch` 维护
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:94`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:112`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:124`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:73`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:87`

- [S3] 展示格式化工具仍在页面内内联，缺少统一 view-model 入口
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DashboardPage.tsx:17`
    - `apps/anyhunt/admin/www/src/pages/DashboardPage.tsx:21`
    - `apps/anyhunt/admin/www/src/pages/DashboardPage.tsx:25`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:98`

- [S3] loading/empty UI 片段重复，尚未抽离共享状态片段组件
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:129`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:187`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:155`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:234`

## 分步修复计划（模块 A）

1. A-1：先把 `UsersPage` / `SubscriptionsPage` / `OrdersPage` / `UserCreditsSheet` 的多状态渲染统一为“状态枚举 + `renderContentByState()` + `switch`”。
2. A-2：拆分 `SubscriptionsPage` 为容器层 + 列表区 + 编辑对话框，并将编辑表单迁移到 `RHF + zod/v3`。
3. A-3：拆分 `UserCreditsSheet` 为 `UserSummaryCard`、`GrantCreditsFormCard`、`CreditGrantsTableCard`、`GrantConfirmDialog`，收敛副作用与状态边界。
4. A-4：抽离 Users/Subscriptions/Orders 的列表查询编排（search/filter/pagination）为可复用 hooks 或 methods，减少页面内重复。
5. A-5：抽离 badge/status 映射与 list-state 片段，统一页面行为并降低后续漂移。
6. A-6：模块 A 回归校验（按 L1 执行）。

## A-1 执行结果

- 动作：`UsersPage`、`SubscriptionsPage`、`OrdersPage`、`UserCreditsSheet` 全部改为“状态枚举 + renderByState + switch”。
- 结果：
  - 移除模块 A 变更区内的链式三元多状态渲染。
  - 页面/组件语义保持不变，仅做状态分发结构收敛。
- 影响文件：
  - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx`
  - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx`
- 待办：
  - A-2：`SubscriptionsPage` 拆分 + 编辑表单迁移 RHF + zod/v3。

### 建议验证命令（模块 A）

```bash
pnpm --filter @anyhunt/admin lint
pnpm --filter @anyhunt/admin typecheck
pnpm --filter @anyhunt/admin test:unit
```

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | dashboard/users/subscriptions/orders | 预扫描（不改代码） | done | n/a | 2026-02-26 | 输出 `S1x4 / S2x3 / S3x2`，待你确认后进入 A-1 |
| A-1 | dashboard/users/subscriptions/orders | 多状态 UI 片段化重构（禁止链式三元） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `UsersPage`/`SubscriptionsPage`/`OrdersPage`/`UserCreditsSheet` 均改为 `render...ByState + switch`，并将状态计算改为显式 `if` 分支 |
