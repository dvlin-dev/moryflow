---
title: www Reader 与 Developer 双模块方案（含 SRP 收敛）
date: 2026-02-28
scope: apps/anyhunt/www, anyhunt.app
status: implemented
---

<!--
[INPUT]: Reader/Developer 壳层拆分方案、Reader 组件 SRP/Props 收敛实施结果
[OUTPUT]: www 单一事实源（信息架构 + 交互 + 工程收敛）
[POS]: Anyhunt Features / Reader

[PROTOCOL]: 本文件变更需同步更新 `docs/design/anyhunt/features/index.md` 与 `docs/index.md`。
-->

# 目标

将 `apps/anyhunt/www` 统一为双模块形态，并保证 Reader（C 端）交互尽量不跳页：

1. **Reader（C 端）**：三栏阅读器为主入口（`/`），操作型行为优先在壳层内完成。
2. **Developer（开发者端）**：保留 Header/Footer 结构，承载开发者资源与营销页。
3. **工程收敛**：Reader 内部采用 SRP + ViewModel，消除长 Props 与职责混杂。

## 交互总原则

- Notion 风格：减少跳转，就地完成任务。
- 弹窗/抽屉优先：登录、设置、订阅操作不打断阅读上下文。
- hover 只作为提示，不承载关键状态切换。
- 键盘可用与焦点可回退（Esc/Tab/Enter）。

# 信息架构（目标态）

## 模块 1：Reader（C 端）

- 路由入口：`/`
- 页面结构：三栏（SidePanel / List / Detail）
- 操作原则：登录/注册、账户设置、创建订阅、Follow/Publish 等尽量在 Reader 壳层完成

## 模块 2：Developer（开发者端）

- 路由入口：`/developer`
- 页面结构：Header + Footer
- 内容定位：`/fetchx`、`/memox`、`/pricing`、Developer Hub、公开 SEO 内容页

# Reader 交互规范

## 1) 统一 Auth 弹窗

Reader 内所有登录触发统一为弹窗，不再直接跳 `/login`：

- 触发点：SidePanel、WelcomeGuide、所有需要登录的操作
- 结构：`AuthDialog`（Sign in / Register / Forgot password）
- 细节：打开自动聚焦、Esc 关闭、关闭后焦点回到触发元素

## 2) Account Settings 弹窗

- UserMenu 的 `Account Settings` 改为打开 `AccountSettingsDialog`
- Reader 内不再依赖 `/settings` 独立路由

## 3) Discover 与 Topic 预览留在 Reader 壳层

- `/discover` 独立路由移除，改为 Reader 中栏 Topics 浏览视图
- Topic 预览优先在 Reader 右栏完成，不跳出三栏上下文

# Developer 导航规范

## 1) Reader 内固定 Developer 入口

- SidePanel 中提供清晰 Developer 入口
- 面向未登录用户也可见

## 2) `/developer` 作为导航枢纽

- Products：Fetchx / Memox
- Resources：Docs / Console / API Keys
- Digest：`Back to Reader`（`/`）

## 3) Header 双向入口

- 保留 Developer 导航语义
- 明确提供 `Reader` 入口返回 `/`

# 路由边界（固定）

| 类别          | 路由                                    | 壳层          | 说明                          |
| ------------- | --------------------------------------- | ------------- | ----------------------------- |
| Reader        | `/`                                     | Reader        | 主入口（三栏）                |
| Developer     | `/developer`                            | Header/Footer | 开发者导航页                  |
| Developer     | `/fetchx` `/memox` `/pricing`           | Header/Footer | 开发者/营销页                 |
| Developer/SEO | `/topics/*`                             | Header/Footer | 公开内容页（可索引）          |
| Auth 直达     | `/login` `/register` `/forgot-password` | 入口页/弹窗   | 主要用于外部 redirect 场景    |

# 工程收敛规范（SRP + ViewModel）

本节合并原 Reader SRP/Props 重构文档。

## 1) ViewModel 收敛长 Props（固定）

- `ReaderListPaneModel`：`discover | topics | inbox`
- `ReaderDetailPaneModel`：`welcome | discover | topics | article`

规则：

- 分支渲染组件只依赖 `model.type` 与最小字段集合。
- model 在组合层用 `useMemo` 构建，避免无意义 rerender。

## 2) 容器层与渲染层分离（固定）

- 容器层：负责 query/mutation、状态推导、行为编排
- 渲染层：只接收 ViewModel，不直接拉取数据

建议组件边界：

- List：`DiscoverListPane` / `TopicsListPane` / `InboxListPane`
- Detail：`WelcomePane` / `DiscoverDetailPane` / `TopicPreviewPane` / `ArticleDetailPane`

## 3) SidePanel 按 section 拆分（固定）

建议拆分：

- `SidePanelUserArea`
- `SidePanelDeveloperEntry`
- `SidePanelFeaturedTopics`
- `SidePanelInboxNav`
- `SidePanelSubscriptionList`

actions 采用结构化对象（`auth` / `navigation` / `subscription`），不再平铺大量 callbacks。

## 4) 性能与稳定性约束

- 保持 pane 级错误边界，避免局部错误击穿整页。
- 维持 lazy chunk + preload 策略，不回退首包体验。
- Skeleton 优先，避免强干扰 loading。

# 已实施结果（2026-01-15）

1. Topic Preview 已落地为 Reader 右栏预览，不再强制跳转 `topics/*`。
2. Auth 已统一为全局弹窗；`/login`、`/register`、`/forgot-password` 作为入口页触发弹窗。
3. `/discover` 独立路由已移除，Topics 浏览改为 Reader 中栏视图。
4. Reader 左侧新增 Developer 入口；Developer 壳层可双向切换至 Digest。
5. Reader SRP 重构（ViewModel + 分区拆分 + SidePanel 收敛）已完成并通过验收。

# 验收标准

- 行为层：Reader 内核心操作不跳页。
- 边界层：新增视图/动作可明确归属到单一模块。
- 性能层：无明显额外 rerender 热点，chunk 策略保持稳定。
- 可维护性：新增交互不再依赖“长 Props 分发器”。
