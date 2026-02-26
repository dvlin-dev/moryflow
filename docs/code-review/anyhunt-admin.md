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

## 结论摘要（模块 A：A-6 已完成）

- `S1`（必须改）：4 项（4 项已修复）
- `S2`（建议本轮改）：3 项（3 项已修复）
- `S3`（可延后）：2 项（2 项已修复）
- 当前状态：模块 A（`dashboard/users/subscriptions/orders`）已完成，待你确认后进入模块 B 预扫描

## 发现（按严重度排序）

- [S1][已修复] `SubscriptionsPage` 单文件超阈值且职责混杂（列表编排 + 过滤 + 编辑弹窗 + 更新提交）
  - 证据：
    - 页面文件由 `333` 行降到 `181` 行（阈值已收敛）
    - 列表区与编辑弹窗拆分到独立组件：`SubscriptionsListContent`、`SubscriptionsTable`、`SubscriptionEditDialog`
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:54`
    - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionsListContent.tsx:1`
    - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionsTable.tsx:1`
    - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionEditDialog.tsx:1`

- [S1][已修复] `UserCreditsSheet` 超阈值且“用户详情 + 授权表单 + 历史记录 + 确认弹窗”耦合在单组件
  - 证据：
    - 文件行数由 `312` 降到 `194`
    - 拆分为 `UserSummaryCard`、`GrantCreditsFormCard`、`CreditGrantsCard`、`GrantConfirmDialog`
    - 状态解析改为 `resolveUserSummaryState/resolveCreditGrantsState`，容器层仅做查询与副作用编排
  - 定位：
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:33`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:73`
    - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/UserSummaryCard.tsx:1`
    - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/GrantCreditsFormCard.tsx:1`
    - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/CreditGrantsCard.tsx:1`
    - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/GrantConfirmDialog.tsx:1`

- [S1][已修复] 多状态 UI 使用链式三元，未落实“状态片段化 + renderContentByState/switch”
  - 证据：
    - 列表页与 `UserCreditsSheet` 均改为“状态枚举 + `switch`”
    - 页面列表态由 `UsersListContent` / `SubscriptionsListContent` / `OrdersListContent` 统一下沉
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:22`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:39`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:32`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:33`
    - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx:53`

- [S1][已修复] `SubscriptionsPage` 编辑表单未采用 `react-hook-form + zod/v3`
  - 证据：
    - 编辑弹窗已迁移为 `RHF + zod/v3`，并抽离 `subscriptionEditFormSchema`
    - 页面层不再维护 `editTier/editStatus`，只保留选中实体与弹窗开关
  - 定位：
    - `apps/anyhunt/admin/www/src/features/subscriptions/schemas.ts:1`
    - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionEditDialog.tsx:54`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:93`

- [S2][已修复] Users/Subscriptions/Orders 的查询编排逻辑重复（search/keyDown/page/filter）
  - 证据：
    - 新增 `usePagedSearchQuery` 统一 query/search/page/filter 编排
    - `Users/Subscriptions/Orders` 三页均已接入
  - 定位：
    - `apps/anyhunt/admin/www/src/lib/usePagedSearchQuery.ts:33`
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:41`
    - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx:60`
    - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx:48`

- [S2][已修复] 对话框状态模型分散，多个布尔开关与选中实体并存
  - 证据：
    - Users 收敛为 `deleteTargetUser` 与 `creditsTargetUserId` 单一源，`open` 全部由实体是否存在推导
    - 删除弹窗与 Credits Sheet 的 UI 实现下沉到独立组件
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:38`
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:132`
    - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx:140`
    - `apps/anyhunt/admin/www/src/features/users/components/UserDeleteDialog.tsx:19`

- [S2][已修复] 徽标样式映射函数在多个页面重复实现，存在行为漂移风险
  - 证据：
    - 新增 `subscription-badges`、`orders/constants`、`users/constants` 统一映射与选项常量
  - 定位：
    - `apps/anyhunt/admin/www/src/lib/subscription-badges.ts:7`
    - `apps/anyhunt/admin/www/src/features/users/constants.ts:7`
    - `apps/anyhunt/admin/www/src/features/subscriptions/constants.ts:8`
    - `apps/anyhunt/admin/www/src/features/orders/constants.ts:12`

- [S3][已修复] 展示格式化工具仍在页面内内联，缺少统一 view-model 入口
  - 定位：
    - `apps/anyhunt/admin/www/src/features/dashboard/formatters.ts:7`
    - `apps/anyhunt/admin/www/src/pages/DashboardPage.tsx:6`
    - `apps/anyhunt/admin/www/src/features/orders/formatters.ts:7`
    - `apps/anyhunt/admin/www/src/features/orders/components/OrdersTable.tsx:16`

- [S3][已修复] loading/empty UI 片段重复，尚未抽离共享状态片段组件
  - 定位：
    - `apps/anyhunt/admin/www/src/components/list-state/ListLoadingRows.tsx:9`
    - `apps/anyhunt/admin/www/src/components/list-state/ListEmptyState.tsx:7`
    - `apps/anyhunt/admin/www/src/features/users/components/UsersListContent.tsx:7`
    - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionsListContent.tsx:7`
    - `apps/anyhunt/admin/www/src/features/orders/components/OrdersListContent.tsx:7`
    - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/CreditGrantsCard.tsx:7`

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

## A-2 执行结果

- 动作：完成 `SubscriptionsPage` 容器化拆分，并将编辑弹窗迁移到 `RHF + zod/v3`。
- 结果：
  - `SubscriptionsPage` 只保留 query/filter/selection/mutation 编排。
  - 列表状态分发与表格渲染下沉到 `SubscriptionsListContent`/`SubscriptionsTable`。
  - 编辑弹窗迁移到 `SubscriptionEditDialog`，校验 schema 下沉到 `schemas.ts`。
  - 新增 `constants.ts` 统一 tier/status 选项与 badge 映射，消除页面内重复映射。
- 影响文件：
  - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx`
  - `apps/anyhunt/admin/www/src/features/subscriptions/constants.ts`
  - `apps/anyhunt/admin/www/src/features/subscriptions/schemas.ts`
  - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionsListContent.tsx`
  - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionsTable.tsx`
  - `apps/anyhunt/admin/www/src/features/subscriptions/components/SubscriptionEditDialog.tsx`
  - `apps/anyhunt/admin/www/src/features/subscriptions/components/index.ts`
  - `apps/anyhunt/admin/www/src/features/subscriptions/index.ts`
- 备注：
  - 后续 A-3~A-6 已在同轮完成（见下方执行结果与进度记录）。

## A-3 执行结果

- 动作：拆分 `UserCreditsSheet`，将用户摘要、充值表单、记录列表与确认弹窗拆分为独立子组件。
- 结果：
  - `UserCreditsSheet` 由 `312` 行收敛到 `194` 行，容器层仅保留查询与 mutation 编排。
  - 新增 `user-credits-sheet/` 子目录，表单 schema/types 独立维护。
  - `CreditGrantsCard` 接入共享 list-state 片段，loading/empty 渲染一致性提升。
- 影响文件：
  - `apps/anyhunt/admin/www/src/features/users/components/UserCreditsSheet.tsx`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/index.ts`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/types.ts`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/schemas.ts`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/UserSummaryCard.tsx`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/GrantCreditsFormCard.tsx`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/CreditGrantsCard.tsx`
  - `apps/anyhunt/admin/www/src/features/users/components/user-credits-sheet/GrantConfirmDialog.tsx`

## A-4 执行结果

- 动作：抽离列表查询编排逻辑，统一 `search/keyDown/page/filter`。
- 结果：
  - 新增 `usePagedSearchQuery`，统一列表 query/search/filter/pagination 行为。
  - `UsersPage`、`SubscriptionsPage`、`OrdersPage` 全部接入，移除页面内同构 handler 重复。
- 影响文件：
  - `apps/anyhunt/admin/www/src/lib/usePagedSearchQuery.ts`
  - `apps/anyhunt/admin/www/src/pages/UsersPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/SubscriptionsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/OrdersPage.tsx`

## A-5 执行结果

- 动作：抽离 badge/status 映射与 list-state 片段，并补齐展示格式化工具统一入口。
- 结果：
  - 新增 `subscription-badges`，Users/Subscriptions 共享 tier/status badge 映射。
  - 新增 `orders/constants`、`orders/formatters` 与 `dashboard/formatters`，去除页面内格式化重复。
  - 新增共享 `ListLoadingRows`、`ListEmptyState`，并接入 Users/Subscriptions/Orders/credit grants 列表态渲染。
- 影响文件：
  - `apps/anyhunt/admin/www/src/lib/subscription-badges.ts`
  - `apps/anyhunt/admin/www/src/features/users/constants.ts`
  - `apps/anyhunt/admin/www/src/features/subscriptions/constants.ts`
  - `apps/anyhunt/admin/www/src/features/orders/constants.ts`
  - `apps/anyhunt/admin/www/src/features/orders/formatters.ts`
  - `apps/anyhunt/admin/www/src/features/dashboard/formatters.ts`
  - `apps/anyhunt/admin/www/src/components/list-state/ListLoadingRows.tsx`
  - `apps/anyhunt/admin/www/src/components/list-state/ListEmptyState.tsx`

## A-6 执行结果

- 动作：模块 A 回归校验（L1）。
- 结果：
  - `pnpm --filter @anyhunt/admin lint`：pass
  - `pnpm --filter @anyhunt/admin typecheck`：pass
  - `pnpm --filter @anyhunt/admin test:unit`：pass
- 结论：
  - 模块 A（`dashboard/users/subscriptions/orders`）本轮计划项 A-1~A-6 全部完成，可进入模块 B 预扫描。

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
| A-2 | dashboard/users/subscriptions/orders | `SubscriptionsPage` 容器拆分 + 编辑弹窗迁移 RHF + zod/v3 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 页面收敛为容器层；新增 `subscriptions` 子组件与 schema/constants；S1（Subscriptions 结构与表单规范）修复完成 |
| A-3 | dashboard/users/subscriptions/orders | `UserCreditsSheet` 组件拆分（容器 + 子组件 + schema/types） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `UserCreditsSheet` 由 312 行收敛至 194 行，查询/表单/确认弹窗职责分离 |
| A-4 | dashboard/users/subscriptions/orders | 列表查询编排统一（`usePagedSearchQuery`） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `Users/Subscriptions/Orders` 三页统一 `search/keyDown/page/filter` 行为 |
| A-5 | dashboard/users/subscriptions/orders | 映射与状态片段统一（badge + list-state + formatters） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 `subscription-badges`、`orders/constants+formatters`、`dashboard/formatters`、`list-state` 复用 |
| A-6 | dashboard/users/subscriptions/orders | 模块 A 回归校验与收口 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | A-1~A-6 全部完成，模块 A 可视为 closed |
