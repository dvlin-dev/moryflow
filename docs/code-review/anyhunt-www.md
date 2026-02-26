---
title: Anyhunt WWW Code Review
date: 2026-02-26
scope: apps/anyhunt/www
status: in_progress
---

<!--
[INPUT]: apps/anyhunt/www（本轮聚焦：模块 A+B+C，reader-shell/layout/routes + inbox/digest/subscriptions + explore/topic/welcome）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt WWW）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt WWW Code Review

## 范围

- 项目：`apps/anyhunt/www`
- 本轮模块 A：`src/features/reader-shell`、`src/components/layout`、`src/routes`
- 本轮模块 B：`src/features/inbox`、`src/components/digest`、`src/features/subscriptions`、`src/components/reader`
- 本轮模块 C：`src/features/explore`、`src/features/topic`、`src/features/welcome`、`src/routes/welcome.tsx`
- 说明：模块 D（`stores / hooks / 数据映射`）将在后续步骤单独展开

## 结论摘要（模块 A 预扫描）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：2 项
- 当前状态：模块 A 已完成修复（`A-1 ~ A-6`）

## 结论摘要（模块 B 实施）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：1 项
- `S3`（可延后）：1 项
- 当前状态：模块 B 已完成修复（`B-1 ~ B-5`）

## 结论摘要（模块 C 实施）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：2 项
- 当前状态：模块 C 已完成修复（`C-1 ~ C-5`）

## 发现（按严重度排序）

- [S1][已修复] `Header.tsx` 单文件超阈值且职责混杂（导航编排 + 交互控制 + 认证 CTA + 菜单项实现）
  - 证据：
    - 文件行数 `428`（阈值：`> 300` 必须拆分）
    - 同文件同时承载桌面导航、移动导航、Developers 下拉交互、Auth CTA 状态渲染、菜单项子组件
  - 定位：
    - `apps/anyhunt/www/src/components/layout/Header.tsx:16`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:93`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:225`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:255`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:370`
  - 修复：
    - `Header` 拆分为容器 + `header/desktop-navigation` + `header/mobile-navigation` + `header/auth-actions` + `header/menu-items`
    - Header 主文件收敛为状态编排层

- [S1][已修复] 多状态 UI 仍使用链式三元，未收敛为“状态片段 + `renderContentByState/switch`”
  - 证据：
    - Header 桌面与移动端认证区都使用 `isLoading ? ... : isAuthenticated ? ... : ...`
    - Topics 列表区使用 `loading/empty/ready` 链式三元分发
  - 定位：
    - `apps/anyhunt/www/src/components/layout/Header.tsx:227`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:329`
    - `apps/anyhunt/www/src/routes/topics/index.tsx:76`
  - 修复：
    - Header 认证区改为 `auth-actions.tsx` 内 `switch` 分发
    - Topics 路由改为 `resolveViewState + renderContentByState()`，移除链式三元

- [S1][已修复] `topics` 路由请求编排分散在页面组件，未收敛到 `methods/store` 分层
  - 证据：
    - 页面组件内直接维护请求状态、分页、异常与数据拼接
    - 同类请求流程在 3 个路由重复，缺少统一状态模型与可复用编排层
  - 定位：
    - `apps/anyhunt/www/src/routes/topics/index.tsx:36`
    - `apps/anyhunt/www/src/routes/topics/$slug/index.tsx:26`
    - `apps/anyhunt/www/src/routes/topics/$slug/editions/$editionId.tsx:21`
  - 修复：
    - 新增 `features/public-topics/public-topics.api.ts` 与 `public-topics.hooks.ts`
    - `topics/*` 路由改为只做页面拼装，数据请求和分页编排下沉到 feature hooks

- [S2][已修复] 认证弹窗路由编排重复（`login/register/forgot-password`）
  - 证据：
    - 三个路由重复 fallback path 计算、`openAuthModal` 调用与 Reader 壳层返回结构
  - 定位：
    - `apps/anyhunt/www/src/routes/login.tsx:34`
    - `apps/anyhunt/www/src/routes/register.tsx:34`
    - `apps/anyhunt/www/src/routes/forgot-password.tsx:23`
  - 修复：
    - 新增 `features/reader-shell/AuthModalRouteShell.tsx`
    - 三个路由统一复用该壳层并保留既有跳转语义

- [S2][已修复] `ReaderShell` 与 `ReaderDialogs` 的弹窗状态分散，状态模型可读性不足
  - 证据：
    - `ReaderShell` 同时维护 create/settings/publish 开关与选中订阅状态
    - `ReaderDialogs` 通过 3 组独立 `shouldRender*` + 3 个 `useEffect` 做懒挂载
  - 定位：
    - `apps/anyhunt/www/src/features/reader-shell/ReaderShell.tsx:44`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderShell.tsx:129`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderDialogs.tsx:80`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderDialogs.tsx:116`
  - 修复：
    - 新增 `reader-dialog-state.ts` 判别状态模型
    - `ReaderShell` 改为单一 `dialogState` 管理
    - `ReaderDialogs` 改为基于判别状态派生 open/defaultTab，并收敛 lazy mount 逻辑

- [S3][已修复] `developer` 路由存在无效三元表达式（恒等分支）
  - 证据：
    - `resource.title === 'Fetchx API' ? 'Learn More' : 'Learn More'`
  - 定位：
    - `apps/anyhunt/www/src/routes/developer.tsx:99`
  - 修复：
    - 直接收敛为固定文案 `Learn More`

- [S3][已修复] `fetchx/memox` 落地页路由结构高度重复，可后续统一页面壳层
  - 证据：
    - 两个路由同样的 Header/Footer + section 序列，仅组件来源不同
  - 定位：
    - `apps/anyhunt/www/src/routes/fetchx.tsx:17`
    - `apps/anyhunt/www/src/routes/memox.tsx:17`
  - 修复：
    - 新增 `components/layout/MarketingPageShell.tsx`
    - `fetchx.tsx` 与 `memox.tsx` 统一复用 shared shell

## 发现（模块 B，按严重度排序）

- [S1][已修复] 订阅创建/设置弹窗重复维护 schema/default/interest 解析，且设置弹窗职责过重
  - 证据：
    - 预扫描阶段 `CreateSubscriptionDialog.tsx`、`SubscriptionSettingsDialog.tsx` 都内置了重复表单契约，后者还混合了容器编排 + Tabs + 基础表单 + Footer 动作
  - 定位：
    - `apps/anyhunt/www/src/components/reader/CreateSubscriptionDialog.tsx:24`
    - `apps/anyhunt/www/src/components/reader/SubscriptionSettingsDialog.tsx:25`
    - `apps/anyhunt/www/src/components/reader/subscription-form-schema.ts:30`
    - `apps/anyhunt/www/src/components/reader/subscriptions/SubscriptionSettingsTabs.tsx:27`
  - 修复：
    - 新增共享 `subscription-form-schema.ts`，统一 `create/update` schema、default values、interest parser
    - `CreateSubscriptionDialog` 收敛为容器层，表单实现下沉到 `CreateSubscriptionDialogForm`
    - `SubscriptionSettingsDialog` 收敛为容器层，Tabs/基础表单下沉到 `subscriptions/*`
    - 文件长度收敛：`CreateSubscriptionDialog.tsx` `148` 行，`SubscriptionSettingsDialog.tsx` `167` 行

- [S1][已修复] `InboxPane` 多状态 UI 采用链式三元，且渲染状态分支与请求状态耦合
  - 证据：
    - 列表和详情区域都以链式三元拼接 `loading/error/empty/ready`，可读性低且不满足“状态片段化 + switch”规范
  - 定位：
    - `apps/anyhunt/www/src/features/inbox/InboxPane.tsx:50`
    - `apps/anyhunt/www/src/features/inbox/InboxPane.tsx:90`
    - `apps/anyhunt/www/src/features/inbox/InboxPane.tsx:141`
  - 修复：
    - 新增 `resolveInboxListContentState` / `resolveInboxDetailContentState`
    - 新增 `renderInboxListContentByState` / `renderInboxDetailContentByState`
    - 登录引导收敛为 `SignInPrompt`，详情请求统一固定调用 `useInboxItemContent(detailItemId)`

- [S1][已修复] `SubscriptionSettingsTabs` 基础表单与 Tabs/Footer 动作耦合，表单上下文边界不清晰
  - 证据：
    - 基础 Tab 内部独立 `Form + form`，Footer Save 动作在外层，结构上存在职责重复
  - 定位：
    - `apps/anyhunt/www/src/components/reader/subscriptions/SubscriptionSettingsTabs.tsx:38`
    - `apps/anyhunt/www/src/components/reader/subscriptions/SubscriptionSettingsBasicTab.tsx:30`
  - 修复：
    - `Form` 上提到 Tabs 容器统一提供上下文
    - `SubscriptionSettingsBasicTab` 收敛为纯字段片段，不再承载提交语义

- [S2][已修复] `ReportTopicDialog` 成功/编辑态以 JSX 三元内联，状态表达不统一
  - 证据：
    - 主体内容区通过 `success ? ... : ...` 内联切换，后续扩展复核/重试状态成本高
  - 定位：
    - `apps/anyhunt/www/src/components/digest/report-topic-dialog.tsx:57`
    - `apps/anyhunt/www/src/components/digest/report-topic-dialog.tsx:100`
  - 修复：
    - 新增 `resolveReportTopicDialogState` + `renderContentByState()`，改为显式状态分发

- [S3][已修复] `SubscriptionsList` 动作分发使用连续 `if`，可读性和可扩展性不足
  - 证据：
    - `settings/history/suggestions/publish` 动作通过多段 `if` 分发
  - 定位：
    - `apps/anyhunt/www/src/features/subscriptions/SubscriptionsList.tsx:29`
  - 修复：
    - 统一改为 `switch(action)` 分发，分支语义更稳定

## 发现（模块 C，按严重度排序）

- [S1][已修复] `TopicPane` 条件式 Hook 调用风险已消除（`editionQuery` 改为统一调用 + `enabled` 控制）
  - 证据：
    - `topicQuery` / `editionsQuery` / `editionQuery` 均在顶层统一声明
    - `editionQuery` 通过 `enabled: props.kind === 'edition'` 控制，避免按分支条件调用 Hook
  - 定位：
    - `apps/anyhunt/www/src/features/topic/TopicPane.tsx:185`
    - `apps/anyhunt/www/src/features/topic/TopicPane.tsx:190`
    - `apps/anyhunt/www/src/features/topic/TopicPane.tsx:198`
  - 修复：
    - `TopicPane` 改为 `switch(kind)` 渲染
    - `editionId` 统一派生，`editionQuery` 全路径可预测

- [S1][已修复] Explore 多状态 UI 收敛为状态片段化（搜索/Trending 全部改 `resolve + renderByState/switch`）
  - 证据：
    - 搜索区使用 `resolveSearchContentState + renderSearchContentByState`
    - Trending 区使用 `resolveTrendingContentState + renderTrendingContentByState`
  - 定位：
    - `apps/anyhunt/www/src/features/explore/ExploreTopicsContent.tsx:63`
    - `apps/anyhunt/www/src/features/explore/ExploreTopicsContent.tsx:111`
    - `apps/anyhunt/www/src/features/explore/ExploreTopicsContent.tsx:166`
  - 修复：
    - 新增 `ExploreTopicsContent`，容器层不再内联多状态链式三元
    - `TopicPreviewDialog` 也补齐状态分发（`resolveTopicPreviewContentState`）

- [S1][已修复] Welcome 双栏统一改为显式状态片段 + `switch` 分发
  - 证据：
    - `WelcomeListPane` 使用 `resolveWelcomeListViewState + renderWelcomeListContentByState`
    - `WelcomeContentPane` 使用 `resolveWelcomeContentViewState + renderWelcomeContentByState`
  - 定位：
    - `apps/anyhunt/www/src/features/welcome/WelcomeListPane.tsx:19`
    - `apps/anyhunt/www/src/features/welcome/WelcomeListPane.tsx:39`
    - `apps/anyhunt/www/src/features/welcome/WelcomeContentPane.tsx:21`
    - `apps/anyhunt/www/src/features/welcome/WelcomeContentPane.tsx:70`
  - 修复：
    - 列表区与内容区均移除 `loading/error/empty/ready` 链式三元
    - 状态分发逻辑可复用且可单测

- [S2][已修复] Explore 容器职责分层（编排层与渲染层拆分）
  - 证据：
    - `ExploreTopicsPane` 仅保留 query/行为编排与弹窗控制
    - 列表渲染与状态分发下沉到 `ExploreTopicsContent`
  - 定位：
    - `apps/anyhunt/www/src/features/explore/ExploreTopicsPane.tsx:27`
    - `apps/anyhunt/www/src/features/explore/ExploreTopicsContent.tsx:202`
  - 修复：
    - 新增 `ExploreTopicsContent.tsx`，容器/展示职责清晰
    - `ExploreTopicsPane` 文件从原 232 行收敛到 146 行

- [S2][已修复] `WelcomeRoute` 副作用解耦（移动端重定向与 page 归一化拆分为双 effect）
  - 证据：
    - 移动端跳转与桌面 page 归一化分别由独立 `useEffect` 管理
    - `resolveDesiredWelcomePage` 纯函数化，路由副作用边界更清晰
  - 定位：
    - `apps/anyhunt/www/src/routes/welcome.tsx:40`
    - `apps/anyhunt/www/src/routes/welcome.tsx:57`
    - `apps/anyhunt/www/src/routes/welcome.tsx:63`
  - 修复：
    - 新增 `resolveDesiredWelcomePage` 纯函数
    - 拆分 effect，避免两类导航副作用耦合

- [S3][已修复] `TopicPane` 恒等条件分支噪声已清理
  - 证据：
    - `isActive ? 'text-foreground' : 'text-foreground'` 已删除
  - 定位：
    - `apps/anyhunt/www/src/features/topic/TopicPane.tsx:90`
  - 修复：
    - `className` 分支仅保留真正差异项（active 背景）

- [S3][已修复] `WelcomeContentPane` 已补齐 `openSignIn` 主动作分支
  - 证据：
    - 主动作渲染改为 `resolvePrimaryActionNode`，覆盖 `openExplore` 与 `openSignIn`
  - 定位：
    - `apps/anyhunt/www/src/features/welcome/welcome.types.ts:8`
    - `apps/anyhunt/www/src/features/welcome/WelcomeContentPane.tsx:41`
    - `apps/anyhunt/www/src/features/welcome/WelcomeContentPane.tsx:57`
  - 修复：
    - `openSignIn` 通过 `/login?redirect=/welcome?page=...` 回到当前 welcome 上下文

## 分步修复计划（模块 A）

1. A-1：拆分 `Header.tsx` 为容器层 + `desktop-nav`/`mobile-nav`/`auth-actions`/`menu-items` 子模块。（已完成）
2. A-2：收敛 Header 与 Topics 路由多状态渲染，统一改为“状态片段 + `renderContentByState/switch`”。（已完成）
3. A-3：抽离 `topics` 路由请求编排到 `features/public-topics`（`api + hooks`），路由页仅保留拼装与 SEO。（已完成）
4. A-4：抽离 `login/register/forgot-password` 共享路由壳层（Auth Modal Route Shell）。（已完成）
5. A-5：收敛 `ReaderShell`/`ReaderDialogs` 弹窗状态模型（判别状态对象 + 统一渲染分发函数）。（已完成）
6. A-6：清理低优先级重复与噪声逻辑（`developer` 恒等三元、`fetchx/memox` 壳层复用点）。（已完成）

## 验证命令（模块 A）

- `pnpm --filter @anyhunt/anyhunt-www typecheck`
- `pnpm --filter @anyhunt/anyhunt-www test:unit`
- `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`
- `pnpm --filter @anyhunt/anyhunt-www build`

## 分步修复计划（模块 B）

1. B-1：提取订阅创建/更新共享表单契约（schema/default/parser），消除 `Create/Settings` 重复定义。（已完成）
2. B-2：`CreateSubscriptionDialog` 收敛为容器层，表单实现拆分到子组件。（已完成）
3. B-3：`SubscriptionSettingsDialog` 收敛为容器层，Tabs 与基础表单拆分并统一表单上下文。（已完成）
4. B-4：`InboxPane` 改为状态片段化（`resolve*State` + `render*ByState/switch`）。（已完成）
5. B-5：收敛剩余中低优先级状态分发（`report-topic-dialog`、`SubscriptionsList`）并完成模块验证。（已完成）

## 分步修复计划（模块 C）

1. C-1：拆分 `TopicPane`（list/overview/edition）并消除条件式 Hook 调用；所有数据查询上提到容器层统一调用。（已完成）
2. C-2：`ExploreTopicsPane` 改造为状态片段化（`resolveSearch/TrendingContentState` + `render*ByState`），移除多状态链式三元。（已完成）
3. C-3：拆分 Explore 容器职责（query/follow/dialog 编排与列表展示分层）并补齐可复用 ViewModel。（已完成）
4. C-4：`WelcomeListPane` / `WelcomeContentPane` 状态渲染收敛到 `switch/renderContentByState`。（已完成）
5. C-5：拆分 `WelcomeRoute` effect（移动端重定向与 page 归一化）并补 S3 噪声清理与验证。（已完成）

## 验证命令（模块 B）

- `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题：`@moryflow/api/client`/`@moryflow/types` 解析失败 + auth 既有 `error is unknown`）
- `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题：`@moryflow/api/client` 解析失败导致 `api.spec.ts` 与 `auth-session.spec.ts`）
- `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass）

## 验证命令（模块 C）

- `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题：`@moryflow/api/client`/`@moryflow/types` 解析失败 + auth 既有 `error is unknown`）
- `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题：`@moryflow/api/client` 解析失败导致 `api.spec.ts` 与 `auth-session.spec.ts`）
- `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass）

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | reader-shell/layout/routes | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x2 / S3x2` |
| A-1 | reader-shell/layout/routes | Header 分层拆分（container + desktop/mobile/auth/menu） | done | `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass） | 2026-02-26 | `Header.tsx` 从 428 行收敛为容器层，新增 `components/layout/header/*` |
| A-2 | reader-shell/layout/routes | 多状态 UI 状态片段化（Header + Topics） | done | 同 A-1（pass） | 2026-02-26 | 移除关键链式三元，改为 `switch` 与渲染函数 |
| A-3 | reader-shell/layout/routes | `topics/*` 请求编排下沉到 feature hooks | done | 同 A-1（pass） | 2026-02-26 | 新增 `features/public-topics`，路由层只保留页面装配 |
| A-4 | reader-shell/layout/routes | Auth 路由壳层复用（login/register/forgot-password） | done | 同 A-1（pass） | 2026-02-26 | 新增 `AuthModalRouteShell`，去重三路由重复逻辑 |
| A-5 | reader-shell/layout/routes | Reader 对话框状态模型收敛 | done | 同 A-1（pass） | 2026-02-26 | 新增 `reader-dialog-state`，`ReaderShell/ReaderDialogs` 使用判别状态 |
| A-6 | reader-shell/layout/routes | S3 清理（developer 恒等三元 + fetchx/memox 壳层复用） | done | `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www build`（fail，基线问题） | 2026-02-26 | 失败原因为既有基线：`@moryflow/api/client` 解析失败与旧文件 `error is unknown`；本轮新增文件未出现新的报错位点 |
| B-0 | inbox/digest/subscriptions | 预扫描（仅问题清单） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x1 / S3x1` |
| B-1 | inbox/digest/subscriptions | 共享订阅表单契约抽离（schema/default/parser） | done | 同 B-5（汇总验证） | 2026-02-26 | 新增 `subscription-form-schema.ts`，Create/Settings 复用 |
| B-2 | inbox/digest/subscriptions | Create 弹窗容器/表单拆分 | done | 同 B-5（汇总验证） | 2026-02-26 | 新增 `CreateSubscriptionDialogForm.tsx`，容器仅保留编排 |
| B-3 | inbox/digest/subscriptions | Settings 弹窗容器/Tab 拆分与表单上下文收敛 | done | 同 B-5（汇总验证） | 2026-02-26 | 新增 `SubscriptionSettingsTabs`、`SubscriptionSettingsBasicTab`，Settings 主文件收敛为容器 |
| B-4 | inbox/digest/subscriptions | InboxPane 状态片段化（列表/详情） | done | 同 B-5（汇总验证） | 2026-02-26 | 引入 `resolve*State` + `render*ByState`，移除多状态链式三元 |
| B-5 | inbox/digest/subscriptions | 收敛 report/subscriptions 状态分发并完成验证 | done | `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass） | 2026-02-26 | `report-topic-dialog` 改 `renderContentByState`；`SubscriptionsList` 动作分发改 `switch` |
| C-0 | explore/topic/welcome | 预扫描（仅问题清单） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x2 / S3x2` |
| C-1 | explore/topic/welcome | `TopicPane` 条件 Hook 风险修复 + 分支状态收敛 | done | 同 C-5（汇总验证） | 2026-02-26 | `editionQuery` 改顶层统一调用 + `enabled` 控制，`list/edition` 状态统一 `switch` |
| C-2 | explore/topic/welcome | Explore 多状态 UI 状态片段化 | done | 同 C-5（汇总验证） | 2026-02-26 | 搜索/Trending 状态改 `resolve*State + render*ByState`，移除链式三元 |
| C-3 | explore/topic/welcome | Explore 容器/展示职责拆分 | done | 同 C-5（汇总验证） | 2026-02-26 | 新增 `ExploreTopicsContent.tsx`，`ExploreTopicsPane` 收敛为编排层 |
| C-4 | explore/topic/welcome | Welcome 双栏状态分发收敛 + 动作分支补齐 | done | 同 C-5（汇总验证） | 2026-02-26 | `WelcomeListPane/WelcomeContentPane` 改 `switch`；补齐 `openSignIn` 动作 |
| C-5 | explore/topic/welcome | `welcome` 路由副作用解耦 + C 模块验证 | done | `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass） | 2026-02-26 | `WelcomeRoute` 拆分双 effect；模块 C 全量修复完成 |
