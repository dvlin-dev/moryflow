---
title: Anyhunt WWW Mobile Bottom Navigation Proposal
date: 2026-01-28
scope: anyhunt-www
status: implemented
---

<!--
[INPUT]: Anyhunt WWW 移动端交互目标与当前 Reader 架构
[OUTPUT]: 3 个底部导航的 IA + 页面结构 + 交互逻辑（移动端优先、PC 不变）
[POS]: Anyhunt WWW（C 端订阅阅读器）移动端导航改造方案
-->

# Anyhunt WWW 移动端底部导航方案（Mobile First）

## 目标与约束

- **目标**：将当前移动端的“左右滑动切栏”改为 **iOS App 风格底部导航**，提升可发现性与稳定操作感。
- **产品定位**：Anyhunt WWW 仍是单一的 C 端信息订阅产品，不引入开发者后台模块。
- **兼容要求**：**PC 端逻辑保持不变**（三栏/两栏 Reader 布局不改）。
- **交互风格**：参考 Notion 的移动端体验（底部 Tab + 每个 Tab 独立堆栈 + 明确返回）。

## 底部导航（3 个）

> 所有用户可见文案使用英文。

| Tab Label         | Route (Primary)         | 目标人群    | 核心动作                  |
| ----------------- | ----------------------- | ----------- | ------------------------- |
| **Inbox**         | `/inbox`                | 已订阅用户  | 阅读最新推送、进入详情    |
| **Explore**       | `/explore`              | 找主题/订阅 | 搜索、预览、关注/创建订阅 |
| **Subscriptions** | `/subscriptions` (新增) | 已订阅用户  | 管理订阅、快速进入话题    |

> `Subscriptions` 是移动端的独立入口，对应当前桌面 SidePanel 的订阅区块（内容不变，仅移动端承载方式变化）。

## 页面内容与结构

### 1) Inbox（/inbox）

**定位**：最新内容阅读入口（Notion 的 Updates 类似）。

**内容结构（Mobile）**

- 顶部 App Bar：标题 `Inbox` + 过滤器入口（如 `All/Unread`）。
- 主区：Inbox 列表（沿用 `InboxPane` list）。
- 详情：点击条目进入 `/inbox/items/:id` 全屏阅读。

**说明**：阅读详情时隐藏底部 Tab，避免视觉噪音（Notion 风格）。

### 2) Explore（/explore）

**定位**：找主题 + 订阅入口（Notion 的 Search 类似）。

**内容结构（Mobile）**

- 顶部 App Bar：标题 `Explore` + 右侧 `Create` 快捷入口。
- 搜索区：单行输入 + `Search` 按钮。
- 主区：Trending / 搜索结果列表（沿用 `ExploreTopicsPane`）。
- 详情：`Preview` 弹层不变；进入话题页后为全屏阅读。

**说明**：保留当前“Preview / Follow / Create”逻辑，移动端改为单列卡片。

### 3) Subscriptions（/subscriptions）

**定位**：订阅管理入口（等价于桌面 SidePanel 订阅区）。

**内容结构（Mobile）**

- 顶部 App Bar：标题 `Subscriptions` + `Create` 按钮。
- 主区：已关注主题列表（沿用 `SidePanelSubscriptionsSection` 数据）。
- 辅助区：推荐主题（沿用 `SidePanelRecommendedSection`）。
- 详情：点击订阅进入 `/inbox?subscriptionId=` 筛选阅读；长按/更多进入设置。

**说明**：这一页只负责“管理 + 快速跳转”，不做内容阅读。

## 整体交互逻辑（Notion 风格）

### 1) Tab 级别（全局）

- Tab 切换 = 路由切换（保留各自的滚动位置与筛选条件）。
- **再次点击当前 Tab**：回到该 Tab 的根页（例如从详情返回列表）。
- Tab 内部保持独立的“栈式导航”。

### 2) 详情页（全屏）

- 从列表进入详情 → **Push**（全屏）。
- 详情页顶部显示 Back；系统返回键与浏览器返回都可用。
- **禁止左右滑动切栏**（移除现有 Swipe Panel 逻辑）。

### 3) 底部导航显隐规则

- **显示**：Tab 根页（Inbox/Explore/Subscriptions）。
- **隐藏**：阅读详情页（/topic/_、/inbox/items/_）。

### 4) 登录态

- 未登录：`Inbox` 和 `Subscriptions` 展示引导文案 + `Sign in` CTA（已存在逻辑）。
- 登录后：回到原来的 Tab 根页，并恢复状态。

## 路由显示逻辑（移动端优先）

- 移动端不展示 `/welcome` 入口（即底部导航不包含 Welcome）。
- PC 端保持现有 `/welcome` 行为不变（后续可以再单独评估下线）。

## 结构示意（ASCII）

### 图 1：底部导航（Mobile）

```
┌──────────────────────────────┐
│            Content           │
│                              │
├──────────────────────────────┤
│ Inbox │ Explore │ Subscriptions │
└──────────────────────────────┘
```

### 图 2：Inbox / Explore 典型导航

```
Explore (List) ──tap──▶ Topic Detail (Full Screen)
   ▲                              │
   └──────────── back ────────────┘

Inbox (List) ──tap──▶ Inbox Item (Full Screen)
   ▲                            │
   └──────────── back ──────────┘
```

### 图 3：Explore 订阅流

```
Explore (Search/Trending)
   │
   ├─ Preview (sheet)
   ├─ Follow → Subscriptions
   └─ Topic Page (Full Screen)
```

### 图 4：桌面与移动端分层

```
Desktop (unchanged)                 Mobile (new)
┌────────┬────────┬──────────┐     ┌──────────────────────┐
│ Side   │ List   │ Detail   │     │   Tab Root (List)    │
│ Panel  │        │          │     ├──────────────────────┤
└────────┴────────┴──────────┘     │ Bottom Tab Bar       │
                                  └──────────────────────┘
```

## 兼容性说明（PC 保持不变）

- 桌面端继续使用现有 `ReaderLayout`（三栏/两栏）。
- 仅在移动端启用新的 `BottomTabShell`（替换 `MobileReaderLayout` 的横向滑动）。
- URL 不变（除新增 `/subscriptions`）；移动端不展示 `/welcome` 入口。

## 可执行要点（供后续落地）

- 新增移动端底部导航 Shell（仅在 `md` 以下渲染）。
- 新增 `/subscriptions` 路由，内容复用 SidePanel 数据源。
- 详情页进入时隐藏 Tab；返回后恢复 Tab 状态与滚动位置。
