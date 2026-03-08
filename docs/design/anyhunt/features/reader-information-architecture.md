---
title: Anyhunt Reader 信息架构
date: 2026-03-08
scope: apps/anyhunt/www
status: active
---

<!--
[INPUT]: Reader / Developer 壳层边界、Explore Topics 页面与 Reader 内工程收敛
[OUTPUT]: Reader IA 唯一事实源（路由 + 交互 + 壳层职责）
[POS]: Anyhunt Features / Reader

[PROTOCOL]: 仅在 Reader 路由边界、壳层交互、URL 同步或工程分层失真时更新；不维护阶段性实施叙事。
-->

# Anyhunt Reader 信息架构

## 1. 当前状态

1. `apps/anyhunt/www` 已经收口为双模块：Reader（C 端）与 Developer（开发者端）。
2. Reader 以壳层内完成任务为原则；登录、设置、预览、订阅等交互优先留在 Reader 上下文内。
3. Explore 已经从旧的三栏内部 view 收口为独立页面与独立 URL。
4. Reader 内部组件边界已收口为 ViewModel + SRP 模型，不再依赖长 Props 分发器。

## 2. 模块边界

### 2.1 Reader

1. 面向 C 端用户。
2. 以 SidePanel / List / Detail 的阅读上下文为主。
3. Follow、预览、账户设置、登录弹窗与探索主题都优先在 Reader 壳层内完成。

### 2.2 Developer

1. 面向开发者与营销内容。
2. 保留 Header / Footer 结构，承载 `/developer`、`/fetchx`、`/memox`、`/pricing` 等内容。
3. 公开 SEO 内容页继续使用 Developer 壳层，不与 Reader 混用。

## 3. 路由架构

### 3.1 Reader 路由

1. `/welcome`：Reader 默认入口与引导页。
2. `/explore`：Explore Topics 专用页。
3. `/topic/:slug`：Reader 内主题入口。
4. `/topic/:slug/editions/:editionId`：Reader 内深链详情。
5. `/inbox`：Inbox 入口，可继续派生筛选参数。

### 3.2 Developer / SEO 路由

1. `/developer`：开发者导航枢纽。
2. `/fetchx`、`/memox`、`/pricing`：开发者 / 营销页。
3. `/topics/:slug/editions/:editionId`：公开 SEO 内容页。

约束：

1. Reader 深链使用单数前缀 `/topic/*`，SEO 页面使用复数前缀 `/topics/*`，避免语义冲突。
2. 关键状态必须进入 URL，刷新后可恢复，支持前进后退与分享。

## 4. SidePanel Header 动作

```text
[Anyhunt logo]                         [+ Explore] [User / Sign in]
```

规则：

1. Logo 点击永远回到 `/welcome`。
2. `+` 进入 `/explore`，而不是旧的 SidePanel 内嵌 topics view。
3. 已登录显示 Avatar + UserMenu；未登录显示 icon-only 登录入口。
4. UserArea 不再占据 SidePanel 底部主导航位置。

## 5. Explore Topics 专用页

### 5.1 页面结构

```text
Left : 保留 Reader SidePanel
Right: Explore 搜索工作台
```

右侧工作台固定包含：

1. 标题与 helper text。
2. 搜索输入框，支持 `keyword / URL / RSS` 三类输入。
3. `Search` 与 `Create` 两类动作。
4. 结果列表或 Trending 空态。

### 5.2 强制规则

1. 用户点击 `Search` 后，无论是否有结果，结果区第一行固定展示创建入口。
2. 输入是 URL / RSS 时，创建入口文案必须切换到对应语义。
3. Explore 不再复用旧的三栏 Browse topics UI。

## 6. Reader 内交互规范

### 6.1 Auth / Settings

1. Reader 内所有登录触发统一走 `AuthDialog`，不再默认整页跳转 `/login`。
2. `Account Settings` 统一走 `AccountSettingsDialog`，不再依赖 Reader 内独立 `/settings` 路由。

### 6.2 预览与跳转

1. Topic 预览优先在 Reader 壳层完成，不强制跳出到 SEO 页面。
2. 列表到详情必须对应明确 URL，刷新后能恢复到当前文章。
3. Discover / Explore / Inbox 等状态不允许只停留在内部 state。

## 7. 工程收敛规范

### 7.1 ViewModel

1. `ReaderListPaneModel`：`discover | topics | inbox`
2. `ReaderDetailPaneModel`：`welcome | discover | topics | article`
3. 分支渲染组件只依赖 `model.type` 与最小字段集合。

### 7.2 容器层与渲染层

1. 容器层负责 query / mutation、状态推导与行为编排。
2. 渲染层只接收 ViewModel，不直接拉取数据。

### 7.3 SidePanel 分区

建议固定拆分为：

1. `SidePanelUserArea`
2. `SidePanelDeveloperEntry`
3. `SidePanelFeaturedTopics`
4. `SidePanelInboxNav`
5. `SidePanelSubscriptionList`

## 8. 与 Digest 数据架构的边界

1. Reader IA 只负责壳层、路由、交互和组件边界。
2. 订阅、Topic、Edition、计费与调度模型统一留在 [v2-intelligent-digest.md](/Users/lin/.codex/worktrees/17b2/moryflow/docs/design/anyhunt/features/v2-intelligent-digest.md)。
3. Digest 文档中的 Reader UI 事实应引用本文档，不再重复定义。

## 9. 当前验证基线

1. `apps/anyhunt/www` 涉及路由、SidePanel、Explore、AuthDialog 或 Reader ViewModel 的变更，至少执行受影响范围的 `typecheck` 与 `test:unit`。
2. 变更 Reader / Developer 路由边界、URL 恢复语义或壳层组件分层时，按 L2 执行根级校验。
