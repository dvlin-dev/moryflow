---
title: Moryflow Admin Code Review
date: 2026-02-26
scope: apps/moryflow/admin
status: done
---

<!--
  [INPUT]: apps/moryflow/admin（模块 A/B/C/D：auth/dashboard/users + payment/providers/models/storage + chat/agent-traces/alerts/admin-logs + sites/image-generation/shared）组件与状态流实现
[OUTPUT]: 预扫描问题清单（S1/S2/S3）+ 分步修复计划 + 进度台账
[POS]: Phase 3 / P6 模块审查记录（Moryflow Admin）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Admin Code Review

## 范围

- 项目：`apps/moryflow/admin`
- 当前项目模块：`auth / dashboard / users / payment / providers / models / storage / chat / agent-traces / alerts / admin-logs / sites / image-generation / shared`
- 模块 A 页面入口：
  - `src/pages/LoginPage.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/pages/UsersPage.tsx`
  - `src/pages/UserDetailPage.tsx`
- 模块 A 特性目录：
  - `src/features/auth`
  - `src/features/dashboard`
  - `src/features/users`
- 审查基线：`docs/guides/frontend/component-design-quality-index.md`

### 模块 B 预扫描范围（Step 16）

- 本轮模块：`payment / providers / models / storage`
- 页面入口：
  - `apps/moryflow/admin/src/pages/SubscriptionsPage.tsx`
  - `apps/moryflow/admin/src/pages/OrdersPage.tsx`
  - `apps/moryflow/admin/src/pages/ProvidersPage.tsx`
  - `apps/moryflow/admin/src/pages/ModelsPage.tsx`
  - `apps/moryflow/admin/src/pages/StoragePage.tsx`
- 特性目录：
  - `apps/moryflow/admin/src/features/payment`
  - `apps/moryflow/admin/src/features/providers`
  - `apps/moryflow/admin/src/features/models`
  - `apps/moryflow/admin/src/features/storage`

### 模块 C 预扫描范围（Step 18）

- 本轮模块：`chat / agent-traces / alerts / admin-logs`
- 页面入口：
  - `apps/moryflow/admin/src/pages/ChatPage.tsx`
  - `apps/moryflow/admin/src/pages/AgentTracesPage.tsx`
  - `apps/moryflow/admin/src/pages/AgentTracesFailedPage.tsx`
  - `apps/moryflow/admin/src/pages/AlertsPage.tsx`
  - `apps/moryflow/admin/src/pages/LogsPage.tsx`
- 特性目录：
  - `apps/moryflow/admin/src/features/chat`
  - `apps/moryflow/admin/src/features/agent-traces`
  - `apps/moryflow/admin/src/features/alerts`
  - `apps/moryflow/admin/src/features/admin-logs`

### 模块 D 预扫描范围（Step 20）

- 本轮模块：`sites / image-generation / shared`
- 页面入口：
  - `apps/moryflow/admin/src/pages/SitesPage.tsx`
  - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx`
  - `apps/moryflow/admin/src/pages/ImageGenerationTestPage.tsx`
- 特性目录：
  - `apps/moryflow/admin/src/features/sites`
  - `apps/moryflow/admin/src/features/image-generation`
  - `apps/moryflow/admin/src/components/shared`

## 结论摘要（模块 A：修复完成）

- `S1`（必须改）：1 项（已修复）
- `S2`（建议本轮改）：2 项（已修复）
- `S3`（可延后）：1 项（已修复）
- 当前状态：模块 A 已完成修复并通过模块级校验

## 结论摘要（模块 B：修复完成）

- `S1`（必须改）：2 项（已修复）
- `S2`（建议本轮改）：3 项（已修复）
- `S3`（可延后）：1 项（已修复）
- 当前状态：模块 B 已完成修复并通过模块级校验

## 结论摘要（模块 C：修复完成）

- `S1`（必须改）：3 项（已修复）
- `S2`（建议本轮改）：2 项（已修复）
- `S3`（可延后）：2 项（已修复）
- 当前状态：模块 C 已完成修复并通过模块级校验

## 结论摘要（模块 D：修复完成）

- `S1`（必须改）：3 项（已修复）
- `S2`（建议本轮改）：2 项（已修复）
- `S3`（可延后）：2 项（已修复）
- 当前状态：模块 D 已完成修复并通过模块级校验

## 结论摘要（项目复盘：完成）

- `S2`（复盘遗留）：3 项（已修复）
- `S3`（复盘遗留）：1 项（已修复）
- 当前状态：项目复盘收口完成，`apps/moryflow/admin` 进入“可收尾”状态

## 发现（按严重度排序）

- [S1][已修复] `SetTierDialog` 在切换目标用户时可能保留旧等级，存在误提交风险
  - 证据：
    - `SetTierDialog` 增加 `currentTier/open` 变化时 `form.reset`，确保切换目标用户后表单值同步
    - `Select` 改为受控 `value`，移除 `defaultValue` 残留态
    - `UsersPage` 在对话框关闭时清理 `selectedUser`，避免 stale props 持续挂载
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:61`
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:66`
    - `apps/moryflow/admin/src/features/users/components/set-tier-dialog.tsx:87`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:52`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:114`
  - 风险：
    - 管理员在未二次确认时可能把用户等级错误写回，属于业务操作错误风险

- [S2][已修复] `UsersPage` 列表区使用链式三元渲染多状态，违反“状态片段化 + switch”规范
  - 证据：
    - 列表区状态收敛为 `UsersTableViewState`，通过 `renderRowsByState + switch` 分发
    - 新增 `error` 显式状态，页面状态边界更清晰
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:30`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:90`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:150`
  - 风险：
    - 状态扩展（如 error/no-filter-result）时可读性快速恶化，漏分支概率升高

- [S2][已修复] `UsersPage` 同文件承载筛选编排、请求分页、表格渲染与弹窗状态，职责边界偏重
  - 证据：
    - 筛选区拆分为 `UsersFilterBar`
    - 列表渲染拆分为 `UsersTable`
    - 页面层收敛为“筛选状态 + 查询 + 分页 + 对话框编排”
  - 定位：
    - `apps/moryflow/admin/src/features/users/components/users-filter-bar.tsx:28`
    - `apps/moryflow/admin/src/features/users/components/users-table.tsx:76`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:33`
    - `apps/moryflow/admin/src/pages/UsersPage.tsx:111`
  - 风险：
    - 后续改动集中在单文件，review 面积过大且回归成本偏高

- [S3][已修复] `usersApi` 列表接口参数通过字符串拼接构造，缺少统一编码与可维护性收敛
  - 证据：
    - 查询路径提取到 `query-paths.ts`，统一使用 `URLSearchParams` 构建
    - 新增 `api-paths.test.ts` 覆盖可选参数与编码场景
  - 定位：
    - `apps/moryflow/admin/src/features/users/query-paths.ts:4`
    - `apps/moryflow/admin/src/features/users/query-paths.ts:26`
    - `apps/moryflow/admin/src/features/users/api.ts:19`
    - `apps/moryflow/admin/src/features/users/api-paths.test.ts:4`
  - 风险：
    - 参数扩展时更容易出现编码遗漏、重复拼接和条件分支散落

## 分步修复计划（模块 A）

1. A-1：修复 `SetTierDialog` 状态同步（受控值 + `currentTier` 变化重置 + 关闭时清理 `selectedUser`）。（已完成）
2. A-2：将 `UsersPage` 列表区改为“状态片段 + `renderContentByState/switch`”，移除链式三元。（已完成）
3. A-3：拆分 `UsersPage`（筛选区 / 列表区 / 对话框编排）并保持页面层仅做装配。（已完成）
4. A-4：重构 `usersApi` 查询参数构造为 `URLSearchParams`（或等价方法）统一编码。（已完成）
5. A-5：模块级回归与一致性复查（组件边界、状态模型、请求参数映射）。（已完成）

## 模块 B 修复记录（按严重度排序）

- [S1][已修复] `ModelFormDialog` 超阈值职责混杂已拆分为容器 + 状态片段
  - 证据：
    - 容器文件收敛到 `157` 行，聚焦提交编排与状态装配
    - 表单主区/Reasoning 区/搜索区拆分到独立片段文件
  - 定位：
    - `apps/moryflow/admin/src/features/models/components/ModelFormDialog.tsx:38`
    - `apps/moryflow/admin/src/features/models/components/ModelFormDialog.tsx:109`
    - `apps/moryflow/admin/src/features/models/components/model-form-dialog/model-basic-fields-section.tsx:23`
    - `apps/moryflow/admin/src/features/models/components/model-form-dialog/model-reasoning-section.tsx:36`
  - 结果：
    - 复杂度显著下降，后续字段调整可在独立片段内单点维护

- [S1][已修复] 模块 B 页面链式三元已统一为“状态片段 + switch”
  - 证据：
    - `subscriptions/orders/providers/models` 页面全部改为 `resolve*ViewState + render*ByState/switch`
  - 定位：
    - `apps/moryflow/admin/src/pages/SubscriptionsPage.tsx:89`
    - `apps/moryflow/admin/src/pages/OrdersPage.tsx:79`
    - `apps/moryflow/admin/src/pages/ProvidersPage.tsx:79`
    - `apps/moryflow/admin/src/pages/ModelsPage.tsx:92`
  - 结果：
    - 多状态渲染路径清晰，可扩展性与可读性达标

- [S2][已修复] 列表页显式错误态已补齐，失败不再落空态
  - 证据：
    - 四个页面都纳入 `error` 状态分发，失败时展示独立错误片段
  - 定位：
    - `apps/moryflow/admin/src/pages/SubscriptionsPage.tsx:93`
    - `apps/moryflow/admin/src/pages/OrdersPage.tsx:83`
    - `apps/moryflow/admin/src/pages/ProvidersPage.tsx:97`
    - `apps/moryflow/admin/src/pages/ModelsPage.tsx:123`
  - 结果：
    - 接口异常时不会误导为“暂无数据”，排障信号更明确

- [S2][已修复] `modelsApi.getAll` 查询参数构建收敛为 `URLSearchParams`
  - 证据：
    - 新增 `buildModelsListPath`，`modelsApi` 改为复用 query builder
  - 定位：
    - `apps/moryflow/admin/src/features/models/query-paths.ts:5`
    - `apps/moryflow/admin/src/features/models/api.ts:15`
    - `apps/moryflow/admin/src/features/models/api-paths.test.ts:4`
  - 结果：
    - 参数编码统一，后续扩参不再分散拼接

- [S2][已修复] `ProviderFormDialog` 默认值重复定义已收敛为工厂函数
  - 证据：
    - `defaultValues` 与 `form.reset` 统一复用 `getProviderFormDefaultValues`
  - 定位：
    - `apps/moryflow/admin/src/features/providers/components/provider-form-defaults.ts:4`
    - `apps/moryflow/admin/src/features/providers/components/ProviderFormDialog.tsx:56`
    - `apps/moryflow/admin/src/features/providers/components/ProviderFormDialog.tsx:62`
  - 结果：
    - 打开/重开行为一致，新增字段无需双点同步

- [S3][已修复] payment/storage query 构建路径补齐回归测试
  - 证据：
    - 新增 `orders/subscriptions/storage/models` query builder 单测
    - 新增 `orders/subscriptions/providers/models` 视图状态分发单测
  - 定位：
    - `apps/moryflow/admin/src/features/payment/orders/api-paths.test.ts:4`
    - `apps/moryflow/admin/src/features/payment/subscriptions/api-paths.test.ts:4`
    - `apps/moryflow/admin/src/features/storage/query-paths.test.ts:8`
    - `apps/moryflow/admin/src/features/models/api-paths.test.ts:4`
    - `apps/moryflow/admin/src/features/payment/orders/view-state.test.ts:4`
    - `apps/moryflow/admin/src/features/payment/subscriptions/view-state.test.ts:4`
  - 结果：
    - query 映射与状态分发具备自动化回归防线

## 模块 C 修复记录（按严重度排序）

- [S1][已修复] 模块 C 多状态 UI 链式三元已统一为 `ViewState + renderByState/switch`
  - 证据：
    - `TraceTable`、`FailedToolTable`、`TraceDetailSheet`、`LogsPage` 均改为显式状态分发
  - 定位：
    - `apps/moryflow/admin/src/features/agent-traces/components/trace-table.tsx:40`
    - `apps/moryflow/admin/src/features/agent-traces/components/trace-table.tsx:46`
    - `apps/moryflow/admin/src/features/agent-traces/components/failed-tool-table.tsx:44`
    - `apps/moryflow/admin/src/features/agent-traces/components/failed-tool-table.tsx:50`
    - `apps/moryflow/admin/src/features/agent-traces/components/trace-detail-sheet.tsx:115`
    - `apps/moryflow/admin/src/features/agent-traces/components/trace-detail-sheet.tsx:126`
    - `apps/moryflow/admin/src/pages/LogsPage.tsx:101`
  - 结果：
    - 多状态渲染边界清晰，链式三元已从核心列表/详情链路清零

- [S1][已修复] `AlertRuleDialog` 硬编码邮箱默认值已移除
  - 证据：
    - 默认值/回填策略抽离到 `alert-rule-form.ts`，邮箱缺省值改为 `''`，并增加邮箱格式校验
  - 定位：
    - `apps/moryflow/admin/src/features/alerts/alert-rule-form.ts:67`
    - `apps/moryflow/admin/src/features/alerts/alert-rule-form.ts:83`
    - `apps/moryflow/admin/src/features/alerts/components/alert-rule-dialog.tsx:56`
    - `apps/moryflow/admin/src/features/alerts/components/alert-rule-dialog.tsx:66`
    - `apps/moryflow/admin/src/features/alerts/components/alert-rule-dialog.tsx:228`
  - 结果：
    - 避免默认误发到固定邮箱，规则创建/编辑默认行为可控

- [S1][已修复] `LogsPage` / `AlertRuleDialog` 超阈值组件已收敛到 300 行以内
  - 证据：
    - `LogsPage` 通过提取徽章与详情弹窗组件、列表状态分发后降至 `268` 行
    - `AlertRuleDialog` 通过提取 form defaults/options/dto mapper 降至 `253` 行
  - 定位：
    - `apps/moryflow/admin/src/pages/LogsPage.tsx:1`
    - `apps/moryflow/admin/src/features/admin-logs/components/log-detail-dialog.tsx:1`
    - `apps/moryflow/admin/src/features/alerts/components/alert-rule-dialog.tsx:1`
    - `apps/moryflow/admin/src/features/alerts/alert-rule-form.ts:1`
  - 结果：
    - 单文件职责收敛，改动面与 review 成本显著下降

- [S2][已修复] `agent-traces/alerts/admin-logs` 显式错误态已补齐
  - 证据：
    - 列表/详情链路接入 `error` 并渲染独立失败片段，空态与失败态分离
  - 定位：
    - `apps/moryflow/admin/src/pages/AgentTracesPage.tsx:155`
    - `apps/moryflow/admin/src/pages/AgentTracesFailedPage.tsx:90`
    - `apps/moryflow/admin/src/features/alerts/components/alert-rules-table.tsx:112`
    - `apps/moryflow/admin/src/features/alerts/components/alert-history-table.tsx:61`
    - `apps/moryflow/admin/src/pages/AlertsPage.tsx:132`
    - `apps/moryflow/admin/src/pages/LogsPage.tsx:108`
  - 结果：
    - 请求失败不会再误展示为“暂无数据”

- [S2][已修复] `ChatPane` 流式编排已收敛，闭包消息组装风险已消除
  - 证据：
    - 增加 `messagesRef + updateMessages` 保证请求消息组装基于最新状态
    - SSE 解析下沉到 `parseChatStreamChunk` helper 并补齐单测
  - 定位：
    - `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx:39`
    - `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx:62`
    - `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx:80`
    - `apps/moryflow/admin/src/features/chat/components/chat-pane.tsx:130`
    - `apps/moryflow/admin/src/features/chat/stream-parser.ts:15`
    - `apps/moryflow/admin/src/features/chat/stream-parser.test.ts:4`
  - 结果：
    - 流式解析可测试，消息上下文组装稳定性提升

- [S3][已修复] `TokenUsageIndicator` 阈值颜色分发收敛为命名函数
  - 证据：
    - 颜色决策逻辑提取为 `resolveUsageColorClass`
  - 定位：
    - `apps/moryflow/admin/src/features/chat/components/token-usage-indicator.tsx:14`
    - `apps/moryflow/admin/src/features/chat/components/token-usage-indicator.tsx:84`
  - 结果：
    - 阈值扩展可读性更高，样式逻辑更易维护

- [S3][已修复] alerts/agent-traces 查询字符串构建已统一为共享工具
  - 证据：
    - 新增 `buildQuerySuffix` 并在两个 feature API 复用
    - 补齐 `query-string` 单测覆盖空值过滤与空查询场景
  - 定位：
    - `apps/moryflow/admin/src/lib/query-string.ts:1`
    - `apps/moryflow/admin/src/features/alerts/api.ts:6`
    - `apps/moryflow/admin/src/features/agent-traces/api.ts:6`
    - `apps/moryflow/admin/src/lib/query-string.test.ts:4`
  - 结果：
    - 查询参数编码策略单点收敛，后续调整无需双点改动

## 模块 D 修复记录（按严重度排序）

- [S1][已修复] `SitesPage` 列表区链式三元已改为显式状态片段 + `switch`
  - 证据：
    - 新增 `SitesListViewState` 判定，并在 `SitesTable` 使用 `renderRowsByState + switch`
    - `SitesPage` 接入 query `error`，失败态不再落空态
  - 定位：
    - `apps/moryflow/admin/src/features/sites/view-state.ts:1`
    - `apps/moryflow/admin/src/features/sites/components/sites-table.tsx:115`
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:36`
  - 结果：
    - `loading/error/empty/ready` 状态边界清晰，列表渲染符合统一规范

- [S1][已修复] `ImageGenerator` 结果区多状态链式三元已移除
  - 证据：
    - 新增 `ImageGeneratorViewState` 与 `resolveGeneratedImageSource`
    - 结果区抽离为 `ImageGeneratorResult`，统一使用 `renderContentByState + switch`
  - 定位：
    - `apps/moryflow/admin/src/features/image-generation/view-state.ts:3`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:80`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator-result.tsx:97`
  - 结果：
    - `idle/loading/error/ready` 分发显式化，结果区不再依赖链式条件混排

- [S1][已修复] 模块 D 超阈值组件已拆分收敛（全部 < 300 行）
  - 证据：
    - `SitesPage` 拆分为筛选条/列表区/确认弹窗装配层，降至 `151` 行
    - `SiteDetailPage` 抽离详情内容与动作确认弹窗，降至 `177` 行
    - `ImageGenerator` 拆分 `image-generator-form` / `image-generator-result`，主组件降至 `180` 行
  - 定位：
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:23`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:53`
    - `apps/moryflow/admin/src/features/sites/components/site-detail-content.tsx:22`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:63`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator-form.tsx:50`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator-result.tsx:90`
  - 结果：
    - 页面容器职责显著收敛，维护与 review 成本下降

- [S2][已修复] 站点详情页显式错误态已补齐，失败与 not-found 已分离
  - 证据：
    - `SiteDetailPage` 接入 `resolveSiteDetailViewState`
    - `loading/error/not-found/ready` 分支独立渲染
  - 定位：
    - `apps/moryflow/admin/src/features/sites/view-state.ts:33`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:63`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:105`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:116`
  - 结果：
    - 失败场景不再误判为“站点不存在”

- [S2][已修复] 模块 D 回归测试已补齐（view-state/query-path）
  - 证据：
    - 新增 `sites view-state`、`sites query-paths`、`image-generation view-state` 单测
  - 定位：
    - `apps/moryflow/admin/src/features/sites/view-state.test.ts:1`
    - `apps/moryflow/admin/src/features/sites/query-paths.test.ts:1`
    - `apps/moryflow/admin/src/features/image-generation/view-state.test.ts:1`
  - 结果：
    - 状态分发与 query 构建具备回归防线

- [S3][已修复] `sitesApi.getAll` 查询构建已复用共享 `buildQuerySuffix`
  - 证据：
    - 新增 `buildSitesListPath` 并接入 `sitesApi.getAll`
  - 定位：
    - `apps/moryflow/admin/src/features/sites/query-paths.ts:1`
    - `apps/moryflow/admin/src/features/sites/api.ts:13`
  - 结果：
    - 查询拼装逻辑单点收敛，扩参成本更低

- [S3][已修复] `shared/data-table` 骨架屏实现已复用共享 `TableSkeleton`
  - 证据：
    - 移除局部重复实现，统一调用 `shared/table-skeleton`
  - 定位：
    - `apps/moryflow/admin/src/components/shared/data-table.tsx:15`
    - `apps/moryflow/admin/src/components/shared/data-table.tsx:55`
  - 结果：
    - 表格 loading 视觉与实现路径统一

## 模块 D 预扫描发现（历史记录，已全部修复）

- [S1][待修复] `SitesPage` 列表区使用链式三元处理多状态，违反“状态片段化 + switch”硬约束
  - 证据：
    - `isLoading -> list -> empty` 直接写在 JSX `TableBody` 中，且未接入显式 `error` 分支
  - 定位：
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:109`
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:285`
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:295`
  - 风险：
    - 请求失败时会落入空态/静默，状态扩展时分支冲突概率高

- [S1][待修复] `ImageGenerator` 结果区存在多状态链式三元，状态边界未显式建模
  - 证据：
    - 图片渲染路径 `url -> b64 -> empty` 采用链式三元
    - 原始响应折叠图标也以内联三元处理状态
  - 定位：
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:303`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:309`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:334`
  - 风险：
    - 后续增加错误态/占位态时会继续堆叠条件，维护成本快速上升

- [S1][待修复] 模块 D 存在 3 个超阈值大组件（>300 行）且职责耦合
  - 证据：
    - `SitesPage` 424 行、`SiteDetailPage` 356 行、`ImageGenerator` 354 行
    - 单文件同时承载筛选编排、请求状态、动作确认、展示渲染等多职责
  - 定位：
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:93`
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:424`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:51`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:356`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:40`
    - `apps/moryflow/admin/src/features/image-generation/components/image-generator.tsx:354`
  - 风险：
    - 变更面过大导致 review/回归开销显著增加，易引入回归

- [S2][待修复] 站点页面主链路缺少显式错误态，失败被折叠为“不存在/空数据”
  - 证据：
    - `SitesPage` 未消费 query `error`
    - `SiteDetailPage` 仅用 `!site` 渲染“不存在”，未区分“请求失败”
  - 定位：
    - `apps/moryflow/admin/src/pages/SitesPage.tsx:109`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:56`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx:97`
  - 风险：
    - 运维与客服无法快速区分数据缺失和接口异常

- [S2][待修复] 模块 D 当前缺少回归测试覆盖（状态分发/查询构建/关键交互）
  - 证据：
    - `sites`、`image-generation`、相关页面与 shared 目录下未检出测试文件
  - 定位：
    - `apps/moryflow/admin/src/features/sites`
    - `apps/moryflow/admin/src/features/image-generation`
    - `apps/moryflow/admin/src/pages/SitesPage.tsx`
    - `apps/moryflow/admin/src/pages/SiteDetailPage.tsx`
  - 风险：
    - 重构后缺少自动化回归防线

- [S3][待修复] `sitesApi.getAll` 查询构建未复用共享 `buildQuerySuffix`
  - 证据：
    - `sites` 模块仍内联 `URLSearchParams` 构建
    - 仓库已存在共享查询工具 `src/lib/query-string.ts`
  - 定位：
    - `apps/moryflow/admin/src/features/sites/api.ts:17`
    - `apps/moryflow/admin/src/lib/query-string.ts:1`
  - 风险：
    - 查询参数规则升级时需多点维护

- [S3][待修复] `components/shared/data-table.tsx` 内部重复定义骨架行逻辑
  - 证据：
    - 本地 `TableSkeleton` 与 `shared/table-skeleton.tsx` 职责重复
  - 定位：
    - `apps/moryflow/admin/src/components/shared/data-table.tsx:33`
    - `apps/moryflow/admin/src/components/shared/table-skeleton.tsx:1`
  - 风险：
    - 统一表格 loading 体验时会出现重复改动点

## 项目复盘（Step 22，完成）

### 复盘结论

- 模块 A/B/C/D 与复盘遗留项均已完成收口，`@moryflow/admin` 项目复盘闭环完成。
- 复盘阶段识别的 `S2x3 / S3x1` 已全部修复；页面层超阈值文件（>300 行）已清零。

### 复盘修复记录（按严重度排序）

- [S2][已修复] `ToolAnalyticsPage` 超阈值与多状态链式三元已收敛
  - 证据：
    - 页面降至 `160` 行，改为容器装配层
    - `ToolStatsTable` 接入 `resolveAgentTraceListViewState + switch`，失败列表复用 `FailedToolTable` 状态分发
    - 统计计算下沉到 `calculateToolAnalyticsSummary`
  - 定位：
    - `apps/moryflow/admin/src/pages/ToolAnalyticsPage.tsx:41`
    - `apps/moryflow/admin/src/pages/tool-analytics/components/tool-stats-table.tsx:93`
    - `apps/moryflow/admin/src/pages/tool-analytics/metrics.ts:18`
  - 结果：
    - 页面状态边界与职责边界清晰，链式三元已移除

- [S2][已修复] `AgentTraceStoragePage` 超阈值文件已拆分并接入 `view-state + switch`
  - 证据：
    - 页面降至 `110` 行，统计/状态分布/保留策略/手动清理/确认弹窗拆到独立组件
    - 新增 `resolveStorageStatsViewState`，显式区分 `loading/error/ready`
  - 定位：
    - `apps/moryflow/admin/src/pages/AgentTraceStoragePage.tsx:40`
    - `apps/moryflow/admin/src/pages/agent-trace-storage/metrics.ts:11`
    - `apps/moryflow/admin/src/pages/agent-trace-storage/components/storage-overview-cards.tsx:1`
  - 结果：
    - 页面容器只保留编排职责，失败态独立渲染

- [S2][已修复] `PaymentTestPage` 超阈值与链式三元已收敛
  - 证据：
    - 页面降至 `235` 行
    - 产品卡片抽离为 `ProductCard`，周期文案改为 `getCreditsCycleSuffix`，移除链式三元
  - 定位：
    - `apps/moryflow/admin/src/pages/PaymentTestPage.tsx:152`
    - `apps/moryflow/admin/src/pages/payment-test/components/product-card.tsx:49`
    - `apps/moryflow/admin/src/pages/payment-test/cycle.ts:1`
  - 结果：
    - 计费周期文案分发可维护，页面职责收敛

- [S3][已修复] 复盘遗留页面回归测试已补齐
  - 证据：
    - 新增 `tool-analytics` / `agent-trace-storage` / `payment-test` 三组单测
  - 定位：
    - `apps/moryflow/admin/src/pages/tool-analytics/metrics.test.ts:1`
    - `apps/moryflow/admin/src/pages/agent-trace-storage/metrics.test.ts:1`
    - `apps/moryflow/admin/src/pages/payment-test/cycle.test.ts:1`
  - 结果：
    - 复盘重构具备自动化回归防线

### 项目复盘收口结果

1. PR-1：`ToolAnalyticsPage` 状态片段化与组件拆分。（已完成）
2. PR-2：`AgentTraceStoragePage` 组件拆分与状态分发收敛。（已完成）
3. PR-3：`PaymentTestPage` 去链式三元与职责拆分。（已完成）
4. PR-4：复盘三页回归测试补齐并通过模块级校验。（已完成）

### 残余风险（已记录）

- `apps/moryflow/admin/src/components/ui/sidebar.tsx`（704 行）与 `apps/moryflow/admin/src/components/ui/chart.tsx`（355 行）仍超 300 行。
- 上述文件属于 shadcn 基础 UI 适配层，不在本轮业务页面收口范围；后续若进入 shared UI 专项再统一评估拆分收益。

## 分步修复计划（模块 B）

1. B-1：拆分 `ModelFormDialog`（搜索片段 / 基础字段片段 / reasoning 片段 / 提交映射），收敛容器职责。（已完成）
2. B-2：将 `SubscriptionsPage/OrdersPage/ProvidersPage/ModelsPage` 列表区统一改为“状态片段 + `renderContentByState/switch`”。（已完成）
3. B-3：为上述页面补齐显式 `error` 状态片段，避免失败落空态。（已完成）
4. B-4：重构 `modelsApi.getAll` 查询参数为 `URLSearchParams`（或等价 query helper），统一路径构建策略。（已完成）
5. B-5：抽离 `ProviderFormDialog` 默认值工厂函数，消除初始化与重置重复定义。（已完成）
6. B-6：补齐模块 B 回归测试（至少覆盖页面状态分发与 query 构建路径），并执行模块级校验。（已完成）

## 分步修复计划（模块 C）

1. C-1：将 `TraceTable` / `FailedToolTable` / `TraceDetailSheet` / `LogsPage` 的多状态渲染统一改为 `ViewState + renderByState/switch`，移除链式三元。（已完成）
2. C-2：移除 `AlertRuleDialog` 写死邮箱默认值，改为安全默认（空值 + 必填校验）并统一回填策略。（已完成）
3. C-3：拆分 `LogsPage`（筛选栏、列表区、详情弹窗、页面容器）与 `AlertRuleDialog`（字段片段 + DTO 映射），收敛单文件复杂度。（已完成）
4. C-4：补齐 `agent-traces/alerts/admin-logs` 的显式 `error` 状态片段，失败态与空态分离。（已完成）
5. C-5：抽离 `ChatPane` 流式编排到 `methods`/helper，修复请求消息组装对闭包态的依赖。（已完成）
6. C-6：收敛 `TokenUsageIndicator` 阈值颜色映射与重复 query builder，统一状态/请求工具约定。（已完成）
7. C-7：补齐模块 C 回归测试（状态分发、AlertRule DTO 映射、chat streaming 关键路径）并执行模块级校验。（已完成）

## 分步修复计划（模块 D）

1. D-1：将 `SitesPage` 列表区重构为 `SitesListViewState + renderRowsByState/switch`，移除链式三元并补 `error` 片段。（已完成）
2. D-2：将 `ImageGenerator` 结果区重构为显式 `ViewState`（idle/loading/error/ready）与状态片段渲染，移除链式三元。（已完成）
3. D-3：拆分 `SitesPage`（筛选条、列表区、操作确认弹窗）与 `SiteDetailPage`（头部动作、信息卡、页面表），收敛单文件复杂度。（已完成）
4. D-4：补齐 `SiteDetailPage` 显式错误态，区分 not-found 与 request-failed。（已完成）
5. D-5：收敛 `sitesApi.getAll` 查询参数构建到共享 `buildQuerySuffix`。（已完成）
6. D-6：收敛 `shared/data-table` 的 loading 骨架实现，复用统一 `TableSkeleton` 能力。（已完成）
7. D-7：补齐模块 D 回归测试（view-state、query-path、关键渲染分发）并执行模块级校验。（已完成）

## 建议验证命令（模块 C）

- `pnpm --filter @moryflow/admin lint`
- `pnpm --filter @moryflow/admin typecheck`
- `pnpm --filter @moryflow/admin test:unit`

## 建议验证命令（模块 D）

- `pnpm --filter @moryflow/admin lint`
- `pnpm --filter @moryflow/admin typecheck`
- `pnpm --filter @moryflow/admin test:unit`

## 建议验证命令（模块 B）

- `pnpm --filter @moryflow/admin lint`
- `pnpm --filter @moryflow/admin typecheck`
- `pnpm --filter @moryflow/admin test:unit`

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | auth/dashboard/users | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x1 / S2x2 / S3x1` |
| A-1 | auth/dashboard/users | 修复 `SetTierDialog` 目标用户切换状态同步 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `SetTierDialog` 改为受控值 + `currentTier` 变化重置；对话框关闭时清理 `selectedUser` |
| A-2 | auth/dashboard/users | `UsersPage` 列表区状态片段化（移除链式三元） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `UsersTableViewState` 与 `renderRowsByState + switch`；补齐 error 状态片段 |
| A-3 | auth/dashboard/users | `UsersPage` 职责拆分（筛选/列表/弹窗编排） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `UsersFilterBar` 与 `UsersTable`；`UsersPage` 收敛为容器编排层 |
| A-4 | auth/dashboard/users | `usersApi` 查询参数构造收敛 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `query-paths.ts`；列表与删除记录查询改为 `URLSearchParams` |
| A-5 | auth/dashboard/users | 模块级回归与一致性复查 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 新增 `set-tier-dialog.test.tsx` 与 `api-paths.test.ts`；全量单测 13 files / 69 tests 通过 |
| B-0 | payment/providers/models/storage | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x2 / S2x3 / S3x1` |
| B-1 | payment/providers/models/storage | 拆分 `ModelFormDialog` 职责 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 拆分 `model-form-dialog/*` 片段，容器收敛为装配层（157 行） |
| B-2 | payment/providers/models/storage | 列表区状态片段化 + switch 分发 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `Subscriptions/Orders/Providers/Models` 移除链式三元，改为 `resolve*ViewState + render*ByState` |
| B-3 | payment/providers/models/storage | 补齐显式错误态 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 四个列表页补齐 `error` 片段，失败不再落空态 |
| B-4 | payment/providers/models/storage | query 参数构造收敛 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `models/orders/subscriptions/storage` 新增 query builder 并接入 API |
| B-5 | payment/providers/models/storage | `ProviderFormDialog` 默认值工厂化 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `defaultValues` 与 `reset` 统一复用 `getProviderFormDefaultValues` |
| B-6 | payment/providers/models/storage | 模块级回归与一致性复查 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 新增 8 个测试文件；模块单测通过：21 files / 97 tests |
| C-0 | chat/agent-traces/alerts/admin-logs | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x2 / S3x2`（链式三元、硬编码邮箱、超阈值大组件、错误态缺失、流式编排耦合） |
| C-1 | chat/agent-traces/alerts/admin-logs | 多状态视图统一为 `ViewState + switch` | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `trace-table`/`failed-tool-table`/`trace-detail-sheet`/`LogsPage` 已移除链式三元 |
| C-2 | chat/agent-traces/alerts/admin-logs | 移除告警规则硬编码邮箱默认值 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `alert-rule-form` 默认值与 DTO 映射；邮箱默认值改为空并加格式校验 |
| C-3 | chat/agent-traces/alerts/admin-logs | 超阈值大组件拆分减责 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `LogsPage` 降至 268 行；`AlertRuleDialog` 降至 253 行 |
| C-4 | chat/agent-traces/alerts/admin-logs | 补齐显式错误态 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | agent-traces/alerts/admin-logs 主链路失败态与空态已分离 |
| C-5 | chat/agent-traces/alerts/admin-logs | Chat 流式编排收敛与闭包态修复 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `messagesRef + stream-parser` 落地，补齐 `stream-parser.test.ts` |
| C-6 | chat/agent-traces/alerts/admin-logs | S3 收敛（token 阈值映射 + query builder 复用） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `resolveUsageColorClass` 与 `buildQuerySuffix` 共享工具 |
| C-7 | chat/agent-traces/alerts/admin-logs | 模块级回归与一致性复查 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 模块单测通过：26 files / 117 tests |
| D-0 | sites/image-generation/shared | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x2 / S3x2`（链式三元、多文件超阈值、错误态缺失、测试空白、query/build 重复） |
| D-1 | sites/image-generation/shared | `SitesPage` 列表区状态片段化 + switch 分发 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `SitesTable` 接入 `SitesListViewState`，`loading/error/empty/ready` 显式分发 |
| D-2 | sites/image-generation/shared | `ImageGenerator` 结果区状态片段化 + switch 分发 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `ImageGeneratorViewState` 与 `ImageGeneratorResult`，移除结果区链式三元 |
| D-3 | sites/image-generation/shared | 大组件拆分减责（Sites/SiteDetail/ImageGenerator） | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `SitesPage(151)` / `SiteDetailPage(177)` / `ImageGenerator(180)` 均收敛到 300 行内 |
| D-4 | sites/image-generation/shared | 站点详情显式错误态补齐 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | `loading/error/not-found/ready` 分支拆分，失败与不存在分离 |
| D-5 | sites/image-generation/shared | `sitesApi` query 构建收敛到共享工具 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 新增 `buildSitesListPath` 并复用 `buildQuerySuffix` |
| D-6 | sites/image-generation/shared | `shared/data-table` skeleton 复用收敛 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 删除重复实现，统一复用 `TableSkeleton` |
| D-7 | sites/image-generation/shared | 模块级回归与一致性复查 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 新增 3 个测试文件；模块单测通过：29 files / 134 tests |
| R-0 | project review | 整项目一致性复盘扫描 | done | `wc -l` / `rg` 静态扫描 | 2026-02-26 | 完成复盘扫描并定位 3 个遗留页面问题 |
| R-1 | project review | `ToolAnalyticsPage` 状态片段化 + 拆分减责 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 页面降至 160 行；`ToolStatsTable` 改为 `ViewState + switch` |
| R-2 | project review | `AgentTraceStoragePage` 拆分减责 + 显式错误态 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 页面降至 110 行；接入 `resolveStorageStatsViewState` |
| R-3 | project review | `PaymentTestPage` 去链式三元 + 拆分减责 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit` | 2026-02-26 | 页面降至 235 行；周期文案改为 helper 分发 |
| R-4 | project review | 复盘遗留页回归测试与项目级校验 | done | `pnpm --filter @moryflow/admin lint` / `typecheck` / `test:unit`（pass） | 2026-02-26 | 新增 3 个测试文件；项目单测通过：32 files / 147 tests |
