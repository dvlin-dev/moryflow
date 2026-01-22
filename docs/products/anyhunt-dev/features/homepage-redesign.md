---
title: Anyhunt 首页重构方案
date: 2026-01-15
scope: anyhunt.app
status: archived
---

# Anyhunt 首页重构方案

> 状态：**已实现（已被新信息架构替代）** | 创建日期：2026-01-15 | 更新日期：2026-01-15

> 注意：本方案已被「Reader 顶部导航 + Explore Topics 专用页」替代，保留仅供回溯参考：`docs/products/anyhunt-dev/features/explore-topics-revamp.md`

## 背景

当前首页对于未登录用户过于单调，仅显示一个简单的 WelcomeGuide 组件。需要重新设计首页体验，让未登录用户也能感受到产品价值，同时保持 Notion 风格的简洁交互。

## 设计目标

1. **降低使用门槛**：未登录用户可以直接浏览内容，感受产品价值
2. **引导转化**：通过内容吸引用户注册
3. **保持简洁**：遵循 Notion 交互规范，不过度设计

---

## 核心设计

### Feed 抽象

将"多 Topic 聚合内容"建模为独立的 **Discover Feed** 模块，而非硬塞进现有 Topics API：

- **读写分离**：Discover 是纯读场景，可激进缓存
- **单一职责**：新增 Discover 模块，不污染现有 Topics/Inbox 逻辑
- **渐进式复杂度**：先做简单版本，为未来扩展留空间

### 状态矩阵

| 状态                 | Sidebar                    | 文章列表            | 详情区           |
| -------------------- | -------------------------- | ------------------- | ---------------- |
| **未登录**           | Discover + Featured Topics | Welcome Card + Feed | 内容详情（可读） |
| **已登录（新用户）** | 同上 + 创建订阅入口        | 同上                | 同上 + 操作按钮  |
| **已登录（有订阅）** | 订阅列表 + Discover 入口   | Inbox 内容          | 同上             |

---

## API 设计

### 新增模块：`/api/v1/discover`

#### 1. Discover Feed（聚合多个 Topic 的最新内容）

```
GET /api/v1/discover/feed
Query: {
  type: 'featured' | 'trending',
  limit?: number,  // default 20, max 50
}

Response: {
  items: DiscoverFeedItem[],
  generatedAt: string,  // 缓存时间戳
}
```

```typescript
interface DiscoverFeedItem {
  // 内容
  id: string;
  title: string;
  url: string;
  aiSummary: string | null;
  siteName: string | null;
  favicon: string | null;
  scoreOverall: number;

  // Topic 上下文
  topic: {
    id: string;
    slug: string;
    title: string;
    subscriberCount: number;
  };

  // Edition 上下文（用于深度链接）
  editionId: string;
  editionAt: string;
}
```

#### 2. Featured Topics

```
GET /api/v1/discover/featured-topics
Query: { limit?: number }  // default 5

Response: {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    subscriberCount: number;
    lastEditionAt: string | null;
  }>
}
```

#### 3. Trending Topics

```
GET /api/v1/discover/trending-topics
Query: { limit?: number }  // default 10

Response: {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    subscriberCount: number;
    lastEditionAt: string | null;
    trendingScore: number;  // 便于调试
  }>
}
```

### Trending 排序算法

简单版本：按 `subscriberCount DESC, lastEditionAt DESC` 双排序

```sql
ORDER BY subscriber_count DESC, last_edition_at DESC NULLS LAST
```

### 缓存策略

```typescript
// Redis 缓存
const CACHE_KEYS = {
  featuredFeed: 'discover:feed:featured', // TTL: 5 min
  trendingFeed: 'discover:feed:trending', // TTL: 5 min
  featuredTopics: 'discover:topics:featured', // TTL: 5 min
  trendingTopics: 'discover:topics:trending', // TTL: 5 min
};

// 缓存失效时机
// 1. Topic Edition 完成时（Processor 触发）
// 2. Admin 修改 Featured 配置时
// 3. TTL 自然过期
```

---

## 目录结构

### 后端

```
src/digest/
├── controllers/
│   ├── digest-public-topic.controller.ts  # 现有：Topic CRUD
│   ├── digest-console.controller.ts       # 现有：Inbox/Subscription
│   └── digest-discover.controller.ts      # 新增：Discover Feed
├── services/
│   ├── topic.service.ts                   # 现有
│   ├── subscription.service.ts            # 现有
│   └── discover.service.ts                # 新增：Feed 聚合逻辑
└── dto/
    ├── topic.schema.ts                    # 现有
    └── discover.schema.ts                 # 新增：Discover 响应
```

### 前端

```
src/
├── features/
│   └── discover/                          # 新增
│       ├── api.ts                         # API 调用
│       ├── hooks.ts                       # React Query hooks
│       └── types.ts                       # 类型定义
├── components/
│   └── reader/
│       ├── SidePanel.tsx                  # 重构：添加 Discover 区块
│       ├── WelcomeCard.tsx                # 新增：欢迎卡片
│       └── DiscoverFeedList.tsx           # 新增：Feed 列表
└── routes/
    └── index.tsx                          # 重构：支持 Discover 视图
```

---

## 首页布局

```
┌─────────────────────────────────────────────────────────────┐
│                         Header                               │
├───────────────┬─────────────────────┬───────────────────────┤
│   Sidebar     │    Article List     │    Article Detail     │
│               │                     │                       │
│ ┌───────────┐ │ ┌─────────────────┐ │ ┌───────────────────┐ │
│ │ Discover  │ │ │ [Welcome Card]  │ │ │                   │ │
│ │ ─────────-│ │ │ (未登录首条)    │ │ │  Content          │ │
│ │ ★ Featured│ │ ├─────────────────┤ │ │                   │ │
│ │ 🔥 Trending│ │ │ Feed Item 1     │ │ │  + Topic 信息     │ │
│ │           │ │ │ └ from AI News  │ │ │  + Follow 按钮    │ │
│ ├───────────┤ │ ├─────────────────┤ │ │                   │ │
│ │ Topics    │ │ │ Feed Item 2     │ │ └───────────────────┘ │
│ │ ├ AI News │ │ │ └ from Tech W.  │ │                       │
│ │ ├ Tech W. │ │ ├─────────────────┤ │                       │
│ │ └ ...     │ │ │ ...             │ │                       │
│ ├───────────┤ │ └─────────────────┘ │                       │
│ │ [登录状态]│ │                     │                       │
│ │ My Inbox  │ │                     │                       │
│ │ Saved     │ │                     │                       │
│ └───────────┘ │                     │                       │
└───────────────┴─────────────────────┴───────────────────────┘
```

---

## 前端状态设计

```typescript
// 首页视图状态
type HomeView =
  | { type: 'discover'; feed: 'featured' | 'trending' } // 未登录默认
  | { type: 'topic'; slug: string } // 查看单个 Topic
  | { type: 'inbox'; filter: 'all' | 'saved' | string }; // 已登录默认

// URL 映射
// /                      → 根据登录状态自动选择
// /?feed=featured        → Discover Featured
// /?feed=trending        → Discover Trending
```

---

## 已确认决策

| 项目              | 决策                                        |
| ----------------- | ------------------------------------------- |
| Welcome Card 内容 | 硬编码前端                                  |
| Trending 算法     | 简单版本（subscriberCount + lastEditionAt） |
| 缓存 TTL          | 5 分钟                                      |
| Feed 数量         | 默认 20 条                                  |
| Sidebar Topics    | 最多 5 个                                   |

---

## 实现优先级

### Phase 1：后端 Discover API

1. 新增 `discover.service.ts` + `discover.controller.ts`
2. 实现 `GET /api/v1/discover/feed?type=featured`
3. 实现 `GET /api/v1/discover/feed?type=trending`
4. 实现 `GET /api/v1/discover/featured-topics`
5. 实现 `GET /api/v1/discover/trending-topics`
6. 添加 Redis 缓存

### Phase 2：前端首页重构

1. 创建 Discover API hooks
2. Sidebar 新增 Discover 区块
3. 支持 DiscoverFeed 数据源
4. 创建 WelcomeCard 组件
5. URL 状态管理（`?feed=xxx`）

### Phase 3：优化

1. 未登录默认显示 Featured Feed
2. 登录提示交互
3. 性能优化（prefetch、skeleton）

---

## 参考

- [Notion 首页](https://www.notion.so/)
- [Feedly Explore](https://feedly.com/i/discover)
