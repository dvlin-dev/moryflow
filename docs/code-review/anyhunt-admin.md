---
title: Anyhunt Admin Code Review
date: 2026-02-26
scope: apps/anyhunt/admin/www
status: done
---

<!--
[INPUT]: apps/anyhunt/admin/www（模块 A：dashboard/users/subscriptions/orders；模块 B：jobs/queues/logs/browser/llm；模块 C：digest-*）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt Admin）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Admin Code Review

## 范围

- 项目：`apps/anyhunt/admin/www`
- 本轮模块：
  - 模块 A：`dashboard / users / subscriptions / orders`（已完成）
  - 模块 B：`jobs / queues / logs / browser / llm`（已完成）
  - 模块 C：`digest-* 系列`（已完成）
  - 模块 D：`shared components / stores / 页面装配`（已完成）
- 页面入口：
  - `src/pages/DashboardPage.tsx`
  - `src/pages/UsersPage.tsx`
  - `src/pages/SubscriptionsPage.tsx`
  - `src/pages/OrdersPage.tsx`
  - `src/pages/DigestTopicsPage.tsx`
  - `src/pages/DigestReportsPage.tsx`
  - `src/pages/DigestWelcomePage.tsx`
- 特性目录：
  - `src/features/dashboard/*`
  - `src/features/users/*`
  - `src/features/subscriptions/*`
  - `src/features/orders/*`
  - `src/features/digest-topics/*`
  - `src/features/digest-reports/*`
  - `src/features/digest-welcome*/*`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

## 结论摘要（项目复盘：已完成）

- 模块 A/B/C/D 已全部完成并回写台账。
- 质量门禁通过：`pnpm --filter @anyhunt/admin lint`、`typecheck`、`test:unit`、`build`。
- 项目当前状态：`done`（专项完成，进入后续维护阶段）。
- 复盘残留：生产构建存在 chunk 体积告警（`index` 与 `DigestWelcomePage`），不阻断发布，建议后续做手工分包优化。

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

## 模块 B 预扫描范围（仅扫描，不改代码）

- 模块：`jobs / queues / logs / browser / llm`
- 页面入口：
  - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/BrowserPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/logs/LogsUsersPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/llm/LlmProviderDialog.tsx`
  - `apps/anyhunt/admin/www/src/pages/llm/LlmModelDialog.tsx`
- 特性目录：
  - `apps/anyhunt/admin/www/src/features/jobs/*`
  - `apps/anyhunt/admin/www/src/features/queues/*`
  - `apps/anyhunt/admin/www/src/features/logs/*`
  - `apps/anyhunt/admin/www/src/features/browser/*`
  - `apps/anyhunt/admin/www/src/features/llm/*`

## 结论摘要（模块 B：B-7 已完成）

- `S1`（必须改）：7 项
- `S2`（建议本轮改）：4 项
- `S3`（可延后）：3 项
- 当前状态：B-1~B-7 全部完成并通过模块级回归

## 模块 B 发现（按严重度排序）

- [S1] `LlmModelDialog` 单文件体量过大且职责耦合（schema/defaults/submit mapper/form rendering）
  - 证据：单文件 `623` 行（>300 阈值），同时承担 schema、raw-config 解析、create/update payload 组装与完整 UI。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelDialog.tsx:68`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelDialog.tsx:120`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelDialog.tsx:199`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelDialog.tsx:284`

- [S1] `QueuesPage` 超阈值且业务编排/展示/确认文案混杂
  - 证据：单文件 `382` 行；页面同时内嵌 `QueueCard/QueueJobList`、操作 `switch`、确认弹窗文案分支。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:77`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:125`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:178`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:195`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:364`

- [S1] `JobDetailPage` 超阈值且页面内塞入重型子组件
  - 证据：单文件 `319` 行；`TimingBreakdown` 与 `JsonDisplay` 作为通用展示组件内嵌在页面，且页面承载大量 card 区块装配。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:28`
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:75`
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:119`

- [S1] `LogsRequestsPage` 超阈值且过滤器/query mapper/概览/列表渲染耦合
  - 证据：单文件 `307` 行；同文件包含 filter state、query 组装、overview 查询与列表分页渲染。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:48`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:69`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:106`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:141`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:213`

- [S1] 多状态 UI 仍存在链式三元，违反“状态片段化 + renderByState/switch”
  - 证据：`loading/error/empty/ready` 在 Jobs/Logs 多页面使用链式三元渲染。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx:154`
    - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx:160`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:213`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:219`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsUsersPage.tsx:71`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsUsersPage.tsx:77`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:79`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:85`

- [S1] `LlmPage` 容器层过重，查询/弹窗状态/确认动作闭包耦合
  - 证据：单文件 `338` 行；页面同时维护 7 个 mutation、多弹窗状态、删除确认回调与 toast 分支。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx:49`
    - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx:89`
    - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx:102`
    - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx:242`
    - `apps/anyhunt/admin/www/src/pages/LlmPage.tsx:296`

- [S1] `LlmProviderDialog` 超阈值且 create/update 映射与 UI 混排
  - 证据：单文件 `317` 行；同文件包含 preset 补全逻辑、create/update 输入映射与整表单渲染。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/llm/LlmProviderDialog.tsx:77`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmProviderDialog.tsx:133`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmProviderDialog.tsx:179`

- [S2] 查询编排在 Jobs/Logs 场景重复（`query/search/filter/page`）
  - 证据：`JobsPage` 和 `LogsRequestsPage` 均在页面层维护 query+handlers；`LogsUsers/LogsIp` 也重复 `submitted` 触发模式。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx:46`
    - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx:53`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:48`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsRequestsPage.tsx:69`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsUsersPage.tsx:33`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:29`

- [S2] Logs 页面重复表格区块与错误率 badge 映射
  - 证据：`LogsIpPage` 两个 Top IP 卡片结构几乎同构，`errorRate >= 0.2` badge 判定重复于 `LogsUsersPage`。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:73`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:120`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsIpPage.tsx:108`
    - `apps/anyhunt/admin/www/src/pages/logs/LogsUsersPage.tsx:103`

- [S2] 队列操作确认逻辑分散，`action` 映射重复维护
  - 证据：`handleConfirmAction` 和确认文案区块按 action 重复分支，后续新增动作易漏改。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:195`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:364`

- [S2] LLM 卡片组件存在重复“loading/error/table/empty”模板
  - 证据：`LlmModelsCard` 与 `LlmProvidersCard` 状态骨架、error banner、empty row 模式高度重复。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelsCard.tsx:55`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmModelsCard.tsx:62`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmProvidersCard.tsx:55`
    - `apps/anyhunt/admin/www/src/pages/llm/LlmProvidersCard.tsx:62`

- [S3] 展示格式化函数分散在页面本地
  - 证据：`formatDate`/`formatTime`/`formatMemory` 等页面级私有函数，缺少 feature 统一 formatter 入口。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:22`
    - `apps/anyhunt/admin/www/src/pages/BrowserPage.tsx:10`
    - `apps/anyhunt/admin/www/src/pages/BrowserPage.tsx:16`

- [S3] 页面级硬编码枚举与文案映射未沉淀到 feature constants
  - 证据：`STATUS_OPTIONS`、`QUEUE_LABELS`、`STATUS_TABS` 全在页面内维护。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobsPage.tsx:36`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:58`
    - `apps/anyhunt/admin/www/src/pages/QueuesPage.tsx:65`

- [S3] 详情页公共展示片段可复用但仍内联
  - 证据：`JsonDisplay`/`TimingBreakdown` 为可复用片段，当前仅内联于 `JobDetailPage`。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:28`
    - `apps/anyhunt/admin/www/src/pages/JobDetailPage.tsx:75`

## 模块 B 分步修复计划（已完成）

1. B-1：统一 Jobs/Logs 多状态渲染为“状态枚举 + `render...ByState/switch`”，消除链式三元。
2. B-2：拆分 `QueuesPage`（容器层 + `QueueSummaryCards` + `QueueJobsPanel` + `QueueActionConfirmDialog`）。
3. B-3：拆分 `JobDetailPage`（`TimingBreakdownCard`、`JsonDisplayCard`、`JobMetaCards`）。
4. B-4：拆分 `LogsRequestsPage`，并抽离 Logs 查询编排 hook（filters/query/page）。
5. B-5：抽离 Logs 共享片段（Top IP 表格、error-rate badge、loading/empty/error 片段）。
6. B-6：拆分 `LlmPage` 与两大 Dialog（`LlmProviderDialog`/`LlmModelDialog`），把 form schema/default mapper/submit mapper 下沉到 `features/llm`。
7. B-7：模块 B 回归校验（L1）。

## 模块 B 执行结果（B-1~B-7）

- B-1：Jobs/Logs 多状态渲染统一为状态枚举 + `switch`，移除链式三元渲染。
- B-2：`QueuesPage` 拆分为容器 + `features/queues/components/*`，确认动作文案下沉到 `features/queues/constants.ts`。
- B-3：恢复并重构 `JobDetailPage`，复用 `JobTimingBreakdown`、`JobJsonDisplay` 与 `formatJobDateTime`。
- B-4：`LogsRequestsPage` 拆分并抽离查询编排 hook（`useRequestLogsFilters`）。
- B-5：Logs 共享片段抽离（`LogErrorRateBadge`、`TopIpTableCard`、`RequestLogsListContent`、`RequestLogsTable`）。
- B-6：`LlmPage` 改为容器装配层，新增 `useLlmPageController`；Dialog schema/default mapper/submit mapper 下沉到 `features/llm/forms/*`。
- B-7：模块 B 回归通过：`pnpm --filter @anyhunt/admin lint`、`typecheck`、`test:unit` 全部 pass。

### 建议验证命令（模块 B）

```bash
pnpm --filter @anyhunt/admin lint
pnpm --filter @anyhunt/admin typecheck
pnpm --filter @anyhunt/admin test:unit
```

### 建议验证命令（模块 A）

```bash
pnpm --filter @anyhunt/admin lint
pnpm --filter @anyhunt/admin typecheck
pnpm --filter @anyhunt/admin test:unit
```

## 模块 C 预扫描范围（仅扫描，不改代码）

- 模块：`digest-topics / digest-reports / digest-welcome`
- 页面入口：
  - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx`
  - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx`
  - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx`
  - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomePagesCard.tsx`
  - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomePageEditorCard.tsx`
- 特性目录：
  - `apps/anyhunt/admin/www/src/features/digest-topics/*`
  - `apps/anyhunt/admin/www/src/features/digest-reports/*`
  - `apps/anyhunt/admin/www/src/features/digest-welcome*/*`

## 结论摘要（模块 C：C-6 已完成）

- `S1`（必须改）：5 项
- `S2`（建议本轮改）：4 项
- `S3`（可延后）：2 项
- 当前状态：C-1~C-6 已完成（重构 + 回归 + 台账回写）

## 模块 C 发现（按严重度排序）

- [S1] `DigestTopicsPage` 单文件超阈值且承担容器+列表渲染+Featured 编排多职责
  - 证据：单文件 `482` 行；页面内同时维护 query/search/filter handlers 与 `AllTopicsTab`/`FeaturedTopicsTab` 重型渲染片段。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:72`
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:197`
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:364`

- [S1] `DigestReportsPage` 超阈值且“列表查询 + 解决弹窗 + RHF 表单渲染”耦合在单页
  - 证据：单文件 `381` 行；`resolveFormSchema`、列表状态渲染、`Dialog` 表单均在同文件。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:78`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:86`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:277`

- [S1] `DigestWelcomePage` 容器层过重，集中编排 5 个 mutation 与全部业务 handler
  - 证据：单文件 `307` 行；页面内维护 config/page 两套 draft、locale 同步、create/update/delete/reorder/save 全部动作。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:37`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:141`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:157`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:174`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:192`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:206`

- [S1] 模块 C 多状态 UI 仍大量使用链式三元，违反“状态片段化 + renderByState/switch”
  - 证据：`loading/error/empty/ready` 在 Topics/Reports/Welcome 组件均以链式三元呈现。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:257`
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:259`
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:379`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:177`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:183`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:78`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomePagesCard.tsx:42`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomePageEditorCard.tsx:81`

- [S1] `WelcomeConfigCard` 超阈值且 Primary/Secondary Action 编辑块高度重复
  - 证据：单文件 `308` 行；两段 Action 配置结构几乎同构，后续变更易产生漂移。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:52`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:117`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:188`

- [S2] locale 草稿补齐逻辑在容器与子组件重复，存在行为分叉风险
  - 证据：`DigestWelcomePage` 与 `WelcomePageEditorCard` 各自实现 `applyLocale`。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:104`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomePageEditorCard.tsx:62`

- [S2] `DigestReportsPage` 解决弹窗 form 区块过长，条件字段渲染与提交映射未分层
  - 证据：`form.watch('status')` 条件区块与 `DialogFooter` 提交区直接混排在页面。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:321`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:360`

- [S2] 模块 C 缺少针对核心交互的回归测试覆盖（topics/reports/welcome）
  - 证据：核心页面已有大量状态与 mutation handler，但未见对应组件测试入口。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:72`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:86`
    - `apps/anyhunt/admin/www/src/pages/DigestWelcomePage.tsx:37`

- [S2] `WelcomeConfigCard` Action locale 与字段写入逻辑过长，事件处理重复创建对象
  - 证据：primary/secondary label 更新与 `labelByLocale` 合并逻辑重复。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:166`
    - `apps/anyhunt/admin/www/src/pages/digest-welcome/WelcomeConfigCard.tsx:235`

- [S3] 页面级常量与文案映射仍在页面内定义，未沉淀到 feature constants
  - 证据：`VISIBILITY_OPTIONS`/`STATUS_OPTIONS`/`statusConfig` 等定义在页面顶部。
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:48`
    - `apps/anyhunt/admin/www/src/pages/DigestReportsPage.tsx:72`

- [S3] `WWW_URL` 与查看链接行为在页面内硬编码，后续环境切换成本高
  - 定位：
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:52`
    - `apps/anyhunt/admin/www/src/pages/DigestTopicsPage.tsx:439`

## 模块 C 分步修复计划（已完成）

1. C-1：先统一模块 C 多状态渲染为“状态片段 + `renderContentByState/switch`”，消除链式三元。
2. C-2：拆分 `DigestTopicsPage`（容器 + `AllTopicsListContent` + `FeaturedTopicsListContent` + constants/formatters）。
3. C-3：拆分 `DigestReportsPage`（容器 + 列表状态组件 + `ResolveReportDialog` + form schema/mappers）。
4. C-4：拆分 `DigestWelcomePage` 为 controller hook（query/draft/mutations）+ 页面装配层。
5. C-5：重构 `WelcomeConfigCard` 为可复用 `WelcomeActionEditorSection`，消除 Primary/Secondary 重复块，并收敛 locale 写入逻辑。
6. C-6：模块 C 回归校验（L1）：`lint` + `typecheck` + `test:unit`，并补充至少 1 组 digest 回归测试（建议覆盖 reports resolve dialog 或 welcome locale 行为）。

### 建议验证命令（模块 C）

```bash
pnpm --filter @anyhunt/admin lint
pnpm --filter @anyhunt/admin typecheck
pnpm --filter @anyhunt/admin test:unit
```

## 模块 C 执行结果（C-1~C-6）

- C-1（多状态 UI 收敛）：
  - `DigestTopics`、`DigestReports`、`WelcomeConfigCard`、`WelcomePagesCard`、`WelcomePageEditorCard` 全部改为“状态片段 + `switch`”渲染。
  - 新增状态解析器：`features/digest-topics/list-states.ts`、`features/digest-reports/list-states.ts`、`pages/digest-welcome/welcome-card-states.ts`。
- C-2（Topics 拆分）：
  - `DigestTopicsPage` 收敛为容器层（`482 -> 168` 行）。
  - 新增 `features/digest-topics/constants.ts`、`components/AllTopicsListContent.tsx`、`AllTopicsTable.tsx`、`FeaturedTopicsListContent.tsx`、`FeaturedTopicsTable.tsx`。
  - `WWW_URL` 从页面内联下沉到 `DIGEST_TOPIC_PUBLIC_BASE_URL` 常量。
- C-3（Reports 拆分）：
  - `DigestReportsPage` 收敛为容器层（`381 -> 145` 行）。
  - 新增 `features/digest-reports/constants.ts`、`forms/resolveReportForm.ts`、`components/DigestReportsListContent.tsx`、`DigestReportsTable.tsx`、`ResolveReportDialog.tsx`。
  - 报告解决表单 schema/defaults/submit mapper 下沉，页面仅保留 query + selection + mutation 编排。
- C-4（Welcome 容器抽离）：
  - `DigestWelcomePage` 改为装配页（`307 -> 96` 行）。
  - 新增 `pages/digest-welcome/useDigestWelcomePageController.ts`，承载 config/pages query、draft、locale 同步、create/update/delete/reorder/save 行为编排。
- C-5（WelcomeConfigCard 去重）：
  - 新增 `WelcomeActionEditorSection.tsx`，消除 Primary/Secondary Action 编辑块重复。
  - `WelcomePageEditorCard` 移除本地 `applyLocale`，统一复用 controller 提供的 locale 应用逻辑，消除容器/子组件双实现。
- C-6（回归与测试）：
  - 新增回归测试：
    - `features/digest-topics/list-states.test.ts`
    - `features/digest-reports/forms/resolveReportForm.test.ts`
    - `pages/digest-welcome/welcome-card-states.test.ts`
  - 校验通过：`pnpm --filter @anyhunt/admin lint`、`typecheck`、`test:unit`（8 files / 20 tests）。

## 模块 D 预扫描范围（仅扫描，不改代码）

- 模块：`shared components / stores / 页面装配`
- 页面装配入口：
  - `apps/anyhunt/admin/www/src/App.tsx`
  - `apps/anyhunt/admin/www/src/main.tsx`
- Shared Components：
  - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx`
  - `apps/anyhunt/admin/www/src/components/list-state/*`
  - `apps/anyhunt/admin/www/src/components/markdown/NotionMarkdownEditor.tsx`
- Stores / Auth 编排：
  - `apps/anyhunt/admin/www/src/stores/auth.ts`
  - `apps/anyhunt/admin/www/src/lib/auth/auth-methods.ts`

## 结论摘要（模块 D：D-6 已完成）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：3 项
- `S3`（可延后）：2 项
- 当前状态：`D-1~D-6` 已完成（重构 + 回归 + 台账回写）

## 模块 D 发现（按严重度排序）

- [S1] 路由与侧边栏导航双份维护，页面装配不存在单一来源，新增路由时容易出现“可访问但不可导航/可导航但 404”
  - 证据：`App.tsx` 与 `main-layout.tsx` 分别维护一套路径清单，模块边界不一致。
  - 定位：
    - `apps/anyhunt/admin/www/src/App.tsx:89`
    - `apps/anyhunt/admin/www/src/App.tsx:123`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:37`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:85`

- [S1] 应用路由缺少 `*` 兜底，非法路径进入时会落入空白页，缺乏明确反馈
  - 证据：顶层与子路由均未声明 `path="*"`，不存在 NotFound/redirect fallback。
  - 定位：
    - `apps/anyhunt/admin/www/src/App.tsx:78`
    - `apps/anyhunt/admin/www/src/App.tsx:131`

- [S1] `MainLayout` 同时承担导航配置、折叠状态、响应式侧栏与 Header 操作，shared shell 单文件职责过载
  - 证据：单文件 `254` 行，包含 nav schema + 渲染 + 交互状态机 + 用户操作入口。
  - 定位：
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:37`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:99`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:154`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:226`

- [S2] `ProtectedRoute` 订阅整个 auth store，任何 auth 字段变更都会触发路由守卫重渲染
  - 证据：`useAuthStore()` 无 selector，渲染订阅粒度过粗。
  - 定位：
    - `apps/anyhunt/admin/www/src/App.tsx:45`

- [S2] `App.tsx` 同步导入全部页面，首屏打包体积与路由切换分包能力受限
  - 证据：路由页均在文件顶部静态 import，未做 route-level lazy。
  - 定位：
    - `apps/anyhunt/admin/www/src/App.tsx:15`
    - `apps/anyhunt/admin/www/src/App.tsx:31`

- [S2] Auth 编排复杂但缺少对应回归测试，refresh/bootstrap 失败路径存在回归盲区
  - 证据：`auth-methods.ts` 涵盖 refresh/bootstrap/signIn/logout 多分支；现有测试仅覆盖 `stores/auth.ts` rehydrate。
  - 定位：
    - `apps/anyhunt/admin/www/src/lib/auth/auth-methods.ts:28`
    - `apps/anyhunt/admin/www/src/lib/auth/auth-methods.ts:73`
    - `apps/anyhunt/admin/www/src/stores/auth.test.ts:7`

- [S3] Header 与侧栏图标按钮未补齐 `type="button"` / `aria-label`，可访问性与可预测交互不足
  - 定位：
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:148`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:230`

- [S3] `openGroups` 同步逻辑每次路由变化都会克隆对象并触发 setState，存在可避免的重渲染
  - 定位：
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:114`
    - `apps/anyhunt/admin/www/src/components/layout/main-layout.tsx:121`

## 模块 D 分步修复计划（已完成）

1. D-1：抽离统一路由清单（路径 + 标题 + nav 分组元数据），消除 `App.tsx` 与 `main-layout.tsx` 双份定义。
2. D-2：重组页面装配层（`AppProviders` / `AppRouter` / `AuthGuard`），补齐 `path="*"` fallback 与 unauthorized/not-found 路由。
3. D-3：拆分 `MainLayout`（`AdminSidebar` / `AdminHeader` / `LayoutShell`），把 sidebar state 与 nav 渲染职责解耦。
4. D-4：收敛 store 订阅粒度（selector 化）并优化 `openGroups` 更新条件，避免无效重渲染。
5. D-5：补齐模块 D 回归测试（AuthGuard 分支 + 路由 fallback + auth-methods 关键分支）。
6. D-6：模块 D 验证与台账收口（L1：`lint` + `typecheck` + `test:unit`）。

### 建议验证命令（模块 D）

```bash
pnpm --filter @anyhunt/admin lint
pnpm --filter @anyhunt/admin typecheck
pnpm --filter @anyhunt/admin test:unit
```

## 模块 D 执行结果（D-1~D-6）

- D-1（路由/导航单源）：
  - 新增 `src/app/admin-routes.tsx`，集中维护 protected routes 与 sidebar nav 分组。
  - `AppRouter` 与 `AdminSidebar` 统一消费同一份配置，消除双份路径定义。
- D-2（页面装配收敛 + fallback）：
  - `App.tsx` 收敛为入口壳；新增 `AppProviders`（React Query + Toaster）与 `AppRouter`（Router + Suspense + bootstrap）。
  - 新增 `AuthGuard`，并在受保护路由补齐 `path="*"` NotFound fallback。
- D-3（MainLayout 拆分）：
  - `main-layout.tsx` 改为壳层装配，新增 `admin-sidebar.tsx` 与 `admin-header.tsx`。
  - 导航渲染、header 行为、壳层状态职责分离。
- D-4（订阅粒度与重渲染优化）：
  - `AuthGuard` 改为 selector 订阅（`isBootstrapped/isAuthenticated/isAdmin`）。
  - `openGroups` 路由同步改为“无变化返回 prev”，避免无效 `setState`。
  - Header/Sidebar 图标按钮补齐 `type="button"` 与 `aria-label`。
- D-5（回归测试补齐）：
  - 新增 `src/app/AppRouter.test.tsx`：覆盖 unauthenticated redirect、non-admin redirect、unknown route fallback。
  - 新增 `src/lib/auth/auth-methods.test.ts`：覆盖 `ensureAccessToken`、`refreshAccessToken`、`bootstrapAuth`、`signIn`、`logout` 关键分支。
- D-6（模块校验）：
  - 校验通过：`pnpm --filter @anyhunt/admin lint`、`typecheck`、`test:unit`（10 files / 28 tests）。

## 项目复盘（整项目一致性）

- 复盘范围：
  - 页面装配与路由：`src/App.tsx`、`src/app/*`、`src/components/layout/*`
  - stores/methods：`src/stores/auth.ts`、`src/lib/auth/auth-methods.ts`
  - 模块回归：A/B/C/D 变更区
- 复盘结论：
  - 多状态 UI 规范复查通过：未发现 `loading/error/empty/ready` 链式三元残留。
  - 构建门禁补跑并通过：`pnpm --filter @anyhunt/admin build`。
  - 复盘期间修复一组既存构建类型问题（不属于 D 模块新引入）：
    - `Badge variant` 映射函数改为字面量联合类型（`subscription-badges.ts`、`orders/constants.ts`）。
    - `subscriptions` 表单选项改为 `as const` 元组，修复 `z.enum` 类型不匹配。
    - `BrowserPage` 改为 early-return 显式收窄 `status`，消除 `undefined` 传参风险。
  - 残留风险（S3）：构建产物存在大 chunk 告警（`DigestWelcomePage`、`index`），建议下一阶段按路由/功能做 manual chunks。

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
| B-0 | jobs/queues/logs/browser/llm | 预扫描（不改代码） | done | n/a | 2026-02-26 | 输出 `S1x7 / S2x4 / S3x3`，已给出 B-1~B-7 修复计划，待确认后执行 |
| B-1 | jobs/queues/logs/browser/llm | Jobs/Logs 多状态渲染收敛（状态枚举 + `switch`） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | Jobs 与 Logs 页面消除链式三元多状态渲染 |
| B-2 | jobs/queues/logs/browser/llm | `QueuesPage` 拆分（容器 + 组件 + 确认文案常量） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 队列卡片、任务面板、确认弹窗拆分到 `features/queues/components` |
| B-3 | jobs/queues/logs/browser/llm | `JobDetailPage` 重构与片段复用 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 页面恢复可编译并下沉 JSON/耗时展示片段 |
| B-4 | jobs/queues/logs/browser/llm | `LogsRequestsPage` 拆分 + 查询编排 hook 抽离 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 `useRequestLogsFilters` 与 Requests 列表状态组件 |
| B-5 | jobs/queues/logs/browser/llm | Logs 共享片段抽离（IP 表格 / 错误率 badge / 状态片段） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `LogsUsers`/`LogsIp` 复用 `LogErrorRateBadge` 与 `TopIpTableCard` |
| B-6 | jobs/queues/logs/browser/llm | LLM 容器与 Dialog 表单逻辑下沉 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 `useLlmPageController` 与 `features/llm/forms/*` |
| B-7 | jobs/queues/logs/browser/llm | 模块 B 回归校验与收口 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 模块 B 全量修复完成，可进入模块 C |
| C-0 | digest-* | 预扫描（不改代码） | done | n/a | 2026-02-26 | 输出 `S1x5 / S2x4 / S3x2` 与 C-1~C-6 计划 |
| C-1 | digest-* | 多状态 UI 片段化重构（禁止链式三元） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | Topics/Reports/Welcome 三组多状态区域统一改为状态解析 + `switch` |
| C-2 | digest-* | `DigestTopicsPage` 容器拆分 + constants/components 下沉 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 页面 482 行降至 168 行，新增 topics 常量、列表状态组件、表格组件 |
| C-3 | digest-* | `DigestReportsPage` 容器拆分 + Resolve Dialog 表单域下沉 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 页面 381 行降至 145 行，新增 reports constants/forms/components |
| C-4 | digest-* | `DigestWelcomePage` 抽 controller hook + 页面装配收敛 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 页面 307 行降至 96 行，query/draft/mutation 编排下沉到 `useDigestWelcomePageController` |
| C-5 | digest-* | `WelcomeConfigCard` 去重重构 + locale 逻辑单源化 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 `WelcomeActionEditorSection`；移除 editor 本地 `applyLocale`，复用 controller |
| C-6 | digest-* | 模块 C 回归校验与测试补齐 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 3 组回归测试，模块 C 全量修复完成，可进入模块 D |
| D-0 | shared components/stores/page assembly | 预扫描（不改代码） | done | n/a | 2026-02-26 | 输出 `S1x3 / S2x3 / S3x2` 与 D-1~D-6 计划，待确认后执行 |
| D-1 | shared components/stores/page assembly | 路由/导航单源化（`admin-routes.tsx`） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 统一 `AppRouter` 与 `MainLayout` 路由/导航定义，消除双份维护 |
| D-2 | shared components/stores/page assembly | 页面装配层拆分（`AppProviders`/`AppRouter`/`AuthGuard`）+ fallback | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `App.tsx` 收敛为入口，补齐 `path=\"*\"` NotFound fallback |
| D-3 | shared components/stores/page assembly | `MainLayout` 拆分（`admin-sidebar`/`admin-header`） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 主布局降职责，导航渲染与头部行为独立 |
| D-4 | shared components/stores/page assembly | 订阅粒度与重渲染优化 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | `AuthGuard` selector 化；`openGroups` 无变化短路；按钮补齐 a11y 属性 |
| D-5 | shared components/stores/page assembly | 模块 D 回归测试补齐 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 新增 `AppRouter.test.tsx` 与 `auth-methods.test.ts` |
| D-6 | shared components/stores/page assembly | 模块 D 收口校验 | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit`（pass） | 2026-02-26 | 10 files / 28 tests 通过，模块 D closed |
| R-1 | all | 项目复盘（整项目一致性 + 构建门禁） | done | `pnpm --filter @anyhunt/admin lint` + `typecheck` + `test:unit` + `build`（pass） | 2026-02-26 | 完成全项目复盘并修复既存构建类型问题；保留 chunk 体积告警为后续优化项 |
