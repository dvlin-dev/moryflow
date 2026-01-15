---
title: www Reader SRP 与 Props 收敛重构计划
date: 2026-01-15
scope: apps/aiget/www (Reader)
status: implemented
---

<!--
[INPUT]: 当前 Reader 相关组件（ReaderPage/SidePanel/ReaderListPane/ReaderDetailPane）存在 Props 过长与职责混杂的问题
[OUTPUT]: 一套可落地的 SRP + 模块边界 + 性能友好 的重构方案与进度清单
[POS]: 为后续代码重构提供“方向 + 里程碑 + 验收标准”，便于审阅与跟踪
-->

# 目标与结论

结论：对 `apps/aiget/www` 的 Reader 模块，采用 **“按视图拆分（SRP） + ViewModel（判别联合）收敛 Props + 细粒度组合”** 的架构最符合最佳实践。

它同时满足：

- **开发体验**：每个组件只关心一个视图/一个 section；Props 自解释、自动补全友好、减少传参噪音。
- **可维护性**：边界明确（Discover/Topics/Inbox/Dialogs/Sidebar Sections）；改一处不会牵扯全局。
- **性能**：减少无意义 rerender（引用稳定的 ViewModel），保持现有 lazy-chunk / preload 策略可持续扩展。

# 背景（现状痛点）

目前存在的主要问题：

- `ReaderListPane` / `ReaderDetailPane` 作为“分发器”，同时注入 **Discover + Topics + Inbox** 三套数据与交互，导致 Props 过长，阅读与改动成本高。
- `SidePanel` 同时承载导航、用户区域、featured topics、订阅列表、上下文菜单动作等，action props 过多且边界不清晰。
- `ReaderPage` 体积偏大（承担编排 + 状态 + 数据获取 + 交互整合），虽然逻辑已拆分一部分，但仍可进一步 SRP 化，降低未来迭代复杂度。

# 需要优化的组件清单（已扫描）

以下为“Props 过长 / 职责混杂”优先级最高的目标（按 Props 数量与影响范围排序）：

| 组件               | 文件                                                                 | 症状                                                                                 |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ReaderListPane`   | `apps/aiget/www/src/features/reader/components/ReaderListPane.tsx`   | `ReaderListPaneProps` 约 25 个字段，混合 3 个域                                      |
| `ReaderDetailPane` | `apps/aiget/www/src/features/reader/components/ReaderDetailPane.tsx` | `ReaderDetailPaneProps` 约 21 个字段，混合 4 个域（Welcome/Discover/Topics/Article） |
| `SidePanel`        | `apps/aiget/www/src/components/reader/SidePanel.tsx`                 | `SidePanelProps` 约 17 个字段，包含大量 actions                                      |

“可选但推荐”优化目标（不一定是 Props 长，但有明显 SRP/拆分收益）：

- `ReaderPage`：`apps/aiget/www/src/features/reader/ReaderPage.tsx`（大组件，编排逻辑仍偏集中）
- `HeroPlayground`：`apps/aiget/www/src/components/playground/HeroPlayground.tsx`（大组件，后续若继续压首包可拆 section/chunk）
- `Header`：`apps/aiget/www/src/components/layout/Header.tsx`（导航逻辑较多，可拆 Desktop/Mobile/NavItems）

# 设计方案（最佳实践）

## 1) 用 ViewModel（判别联合）收敛 Props（核心）

把“分支视图渲染器”从“长 Props 注入”改为“传入一个 **判别联合 ViewModel**”，例如：

- `ReaderListPaneModel`：
  - `{ type: 'discover', ... }`
  - `{ type: 'topics', ... }`
  - `{ type: 'inbox', ... }`
- `ReaderDetailPaneModel`：
  - `{ type: 'welcome', ... }`
  - `{ type: 'discover', ... }`
  - `{ type: 'topics', ... }`
  - `{ type: 'article', ... }`

收益：

- “切换器组件”只依赖 `model.type` + 最小字段集合。
- 每个分支字段天然分组，不会出现跨域字段混在一起的参数列表。

实现要点：

- 在 `ReaderPage` 用 `useMemo` 构建 ViewModel，确保引用稳定（减少 rerender）。
- ViewModel 里仅放 UI 必需数据与 callbacks；复杂逻辑留在 hooks/containers。

## 2) 拆分为「容器组件」+「纯渲染组件」（SRP）

按域拆出容器层，负责：

- 数据获取（React Query）
- view-state 推导
- optimistic/pending 状态合并
- 事件编排（比如 follow/topic preview/refresh）

纯渲染层只接收 ViewModel（或最小 props），不直接关心 query/mutation。

建议拆分（示例命名）：

- List pane
  - `DiscoverListPane`（纯渲染）+ `useDiscoverListModel`（组装 model）
  - `TopicsListPane`（纯渲染）+ `useTopicsListModel`
  - `InboxListPane`（纯渲染）+ `useInboxListModel`
- Detail pane
  - `WelcomePane`
  - `DiscoverDetailPane`
  - `TopicPreviewPane`
  - `ArticleDetailPane`

## 3) SidePanel 按 section 拆分，并将 actions 收敛为结构化对象

`SidePanel` 建议拆为：

- `SidePanelUserArea`
- `SidePanelDeveloperEntry`
- `SidePanelFeaturedTopics`
- `SidePanelInboxNav`
- `SidePanelSubscriptionList`

同时把 actions 从“平铺 props”改为结构化：

- `actions.auth`（sign-in/open-auth）
- `actions.navigation`（change view、browse topics、preview topic）
- `actions.subscription`（settings/history/suggestions/publish）
- 允许某些 section “不提供 action”时自然降级（按钮 disabled/不渲染），符合 Notion 的“明确可操作性”原则。

## 4) 错误边界与加载骨架规则不变，但明确为约束

保持现有策略（并作为重构验收标准）：

- **Pane 级错误边界**：list/detail 出错不影响整个 Reader shell。
- **Notion 风格 loading**：优先 Skeleton，不使用强干扰 spinner；避免大面积 layout shift。
- **预取（preload）**：hover/click 预取，避免首次打开 dialog/preview 卡顿。

# 进度与里程碑（Checklist）

## Phase 0（准备）

- [x] 定义 `ReaderListPaneModel` / `ReaderDetailPaneModel` 类型（判别联合）
- [x] 统一 model 构建约束（`useMemo`/稳定引用/最小字段集）

## Phase 1（List Pane 收敛）

- [x] 为 Discover/Topics/Inbox 拆出各自的 list pane 组件（SRP）
- [x] `ReaderListPane` 改为接收 `model`
- [x] 删除旧的长 Props 接口与相关 glue 代码

## Phase 2（Detail Pane 收敛）

- [x] 右栏同样改为 `model` + SRP 分支组件
- [x] 继续保留现有 lazy-chunk（Topic preview / markdown）与 preload

## Phase 3（SidePanel 收敛）

- [x] SidePanel 按 section 拆分
- [x] actions 结构化（减少 props 平铺）
- [x] 订阅条目动作统一为 `SubscriptionAction`（减少多处 callbacks）

## Phase 4（ReaderPage 进一步 SRP）

- [x] ReaderPage 收敛为组合层（渲染 scaffold + boundaries + dialogs）
- [x] 控制器 hook（`useReaderController`）集中管理状态/数据/交互/模型组装

## Phase 5（验收与清理）

- [x] `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全通过
- [x] 保持现有 code-splitting + preload 策略
- [x] 删除无用的长 Props glue 与重复回调

# 验收标准（必须满足）

- 行为不变：Reader 内操作仍不跳页（auth/settings 等为弹窗）。
- 交互不变或更好：同等场景下更少的“无响应/卡顿”，更少的状态错乱风险。
- 代码边界更清晰：任何新增 Reader 视图/动作，都能明确落在某个域（discover/topics/inbox/dialogs/sidebar）。
- 性能基线不退化：chunk 策略可维护、无明显额外 rerender 热点。

# 风险与应对

- 风险：过度使用 Context 导致全局 rerender。  
  应对：优先 ViewModel + 组合；如需 Context，拆细粒度 Context，避免“一锅端”状态。

- 风险：ViewModel 每次 render 产生新对象导致子树 rerender。  
  应对：`useMemo` 构建 model，并确保 callbacks 稳定（`useCallback`）。

- 风险：重构导致 chunk 边界变更、首包回退。  
  应对：保持当前 lazy/preload 入口不变，重构仅调整组件层次与 props 结构。
