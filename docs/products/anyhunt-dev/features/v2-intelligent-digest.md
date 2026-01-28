---
title: 智能内容订阅系统 v2.0 - 需求方案
date: 2026-01-12
scope: anyhunt.app, server.anyhunt.app
status: active
authors: ['AI Assistant']
reviewers: []
updated: 2026-01-14
---

<!--
[INPUT]: 面向 C 端用户的「随时订阅信息」产品
[OUTPUT]: 端到端需求规格（数据模型、流程、计费）
[POS]: Feature 文档：Digest 智能信息订阅功能规格

[PROTOCOL]: 本文件变更需同步更新 `docs/products/anyhunt-dev/index.md`。
-->

# 智能内容订阅系统 v2.0

## 1. 产品定义

### 1.1 产品一句话

让用户把"我想持续关注的主题/来源"变成一份**可控、可读、不过载**的定时简报（Web Inbox 优先，Email 推送可选）。

### 1.2 核心体验

1. **30 秒创建订阅**：输入主题 → 选择频率/时间 → AI 自动筛选有价值内容
2. **结论优先**：每期开头是叙事摘要，下面是条目列表（标题 + AI 摘要 + 来源 + 链接）
3. **用户维度去重**：同一用户多个订阅间不重复（`canonicalUrlHash`）
4. **允许二次投递**：冷却 7 天后允许再次投递（可配置）
5. **Web Inbox 为主**：网页完成查看/管理，Email 为可选推送

### 1.3 产品策略

- **智能筛选**：AI 判断价值，用户设置 `minItems`（保底）和 `searchLimit`（候选上限）
- **可解释性**：每条内容给出入选原因（关键词/来源/新鲜度）
- **无配置可用**：提供订阅模板（AI/产品/投融资等）
- **全文不存储**：抓取全文仅用于 AI 分析，分析后丢弃（临时缓存 1 小时），只存 AI 摘要 + metadata
- **安全退订**：Email 推送必带 unsubscribe 链接

### 1.4 Public Topics（SEO + 一键订阅）

将 Digest 做成"可对外发布的主题频道"：

- **显式发布**：订阅默认私有，用户主动发布才创建 Topic
- **三档可见性**：`PUBLIC`（公开收录）/ `PRIVATE`（仅付费用户）/ `UNLISTED`（已下架）
- **删除联动**：删除订阅时关联 Topic 自动下架
- **发布者付费**：Topic Edition 生成费用由发布者承担，订阅者免费

---

## 2. 术语表

| 术语                     | 含义                                                | 面向谁       |
| ------------------------ | --------------------------------------------------- | ------------ |
| `ContentItem`            | 全局内容池中的一条内容（唯一键 `canonicalUrlHash`） | 系统/开发    |
| `DigestSubscription`     | 用户的私有订阅配置（cron/timezone/topic 等）        | 用户/Console |
| `DigestRun`              | 一次订阅执行的记录（一次投递到 Inbox）              | 用户/Console |
| `DigestRunItem`          | 某次 Run 中入选并投递的条目快照                     | 用户/Console |
| `UserContentState`       | 用户维度的去重与状态（read/saved/notInterested）    | 用户/Console |
| `DigestTopic`            | 公开话题（用户显式发布后创建）                      | 访客/SEO     |
| `DigestTopicEdition`     | 某个 Topic 的一期公开内容                           | 访客/SEO     |
| `DigestTopicEditionItem` | 某期 Edition 的条目快照                             | 访客/SEO     |
| Follow（跟随订阅）       | 基于 Topic editions 作为候选集（免费）              | 用户         |
| Fork（克隆订阅）         | 复制 Topic 配置为独立订阅（付费）                   | 用户         |

---

## 3. 架构设计

### 3.1 核心原则

- **内容全局共享，相关性订阅私有**：`impact/quality` 入池时计算，`relevance` 订阅运行时计算
- **canonicalUrlHash 是去重基础**：入池先 canonicalize，再 hash
- **按 run 结算一次**：run 内部 Fetchx 调用只做计量，结束后汇总扣费
- **渐进式智能**：先启发式评分，再引入 LLM 增强

### 3.2 总体数据流

```
┌───────────────────────────┐
│   DigestSource (global)   │   (RSS / Site / Search config)
└─────────────┬─────────────┘
              │ (scheduled / on-run)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Ingest Jobs (BullMQ)                       │
│  - fetch links / parse rss / canonicalize → canonicalUrlHash  │
│  - upsert ContentItem (global) + compute impact/quality       │
└─────────────┬─────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────┐
│   Content Pool (global)   │  ContentItem (unique by canonicalUrlHash)
└─────────────┬─────────────┘
              │ candidates (time window + filters)
              ▼
┌─────────────────────────────────────────────────────────────┐
│         DigestRun Orchestration (per subscription)            │
│  - compute relevance → apply dedup + redelivery policy        │
│  - pick top N → compose narrative → deliver to Inbox          │
└─────────────┬─────────────────────────────────────────────────┘
              │
    ┌─────────▼─────────┐
    │ UserContentState  │  (per user, canonicalUrlHash)
    │ + DigestRunItem   │
    └───────────────────┘
```

### 3.3 Topic Edition 生成流程（发布者付费）

```
TopicScheduler (每分钟扫描)
  │
  ├─ 扫描 DigestTopic.status='ACTIVE' && nextEditionAt <= now()
  ├─ 检查发布者余额 → 不足则 topic.status = 'PAUSED_INSUFFICIENT_CREDITS'
  ├─ 原子推进 nextEditionAt
  ├─ 创建 DigestTopicEdition(PENDING) 并入队执行
  │     └─ 触发 sourceSubscription 的 run 逻辑
  ├─ 写入 DigestTopicEditionItems（快照）
  └─ 计费：从发布者账户扣除
```

---

## 4. 数据模型

> 最终以 `apps/anyhunt/server/prisma/main/schema.prisma` 为准

### 4.1 DigestSubscription（用户订阅）

| 字段                     | 类型     | 说明                                       |
| ------------------------ | -------- | ------------------------------------------ |
| `id`                     | string   | 主键                                       |
| `userId`                 | string   | 所属用户                                   |
| `name`                   | string   | 订阅名称                                   |
| `topic`                  | string   | 用户输入的主题                             |
| `interests`              | string[] | 关键词列表                                 |
| `searchLimit`            | number   | 搜索候选上限（1-100，默认 60）             |
| `scrapeLimit`            | number   | 抓取全文上限（0-100，默认 20）             |
| `minItems`               | number   | 最少返回数量（1-30，默认 5）               |
| `minScore`               | number   | 评分阈值（0-100，默认 70）                 |
| `contentWindowHours`     | number   | 内容窗口（默认 168 = 7 天）                |
| `redeliveryPolicy`       | enum     | `NEVER` / `COOLDOWN` / `ON_CONTENT_UPDATE` |
| `redeliveryCooldownDays` | number   | 冷却天数（默认 7）                         |
| `followedTopicId`        | string?  | 跟随的 Topic ID（Follow 订阅）             |
| `cron`                   | string   | Cron 表达式                                |
| `timezone`               | string   | IANA 时区                                  |
| `languageMode`           | enum     | `FOLLOW_UI` / `FIXED`                      |
| `outputLocale`           | string?  | 固定输出语言                               |
| `inboxEnabled`           | boolean  | Web Inbox 开关（默认 true）                |
| `emailEnabled`           | boolean  | Email 推送开关（默认 false）               |
| `generateItemSummaries`  | boolean  | 生成条目摘要                               |
| `composeNarrative`       | boolean  | 生成叙事摘要                               |
| `tone`                   | enum     | `neutral` / `opinionated` / `concise`      |
| `enabled`                | boolean  | 启用状态                                   |
| `nextRunAt`              | Date     | 下次运行时间                               |

### 4.2 DigestSource（全局数据源）

| 字段            | 类型    | 说明                                                                     |
| --------------- | ------- | ------------------------------------------------------------------------ |
| `id`            | string  | 主键                                                                     |
| `type`          | enum    | `search` / `rss` / `siteCrawl`                                           |
| `refreshMode`   | enum    | `ON_RUN` / `SCHEDULED`                                                   |
| `config`        | JSON    | 配置（search: query/engines, rss: feedUrl, crawl: siteUrl/includePaths） |
| `configHash`    | string  | SHA256(normalized config)                                                |
| `refreshCron`   | string? | 刷新 cron（SCHEDULED 模式）                                              |
| `nextRefreshAt` | Date?   | 下次刷新时间                                                             |

### 4.3 ContentItem（全局内容条目）

| 字段               | 类型    | 说明                      |
| ------------------ | ------- | ------------------------- |
| `id`               | string  | 主键                      |
| `canonicalUrl`     | string  | 标准化 URL                |
| `canonicalUrlHash` | string  | SHA256 哈希（全局唯一键） |
| `title`            | string  | 标题                      |
| `description`      | string? | 原始描述                  |
| `author`           | string? | 作者                      |
| `publishedAt`      | Date?   | 发布时间                  |
| `language`         | string? | 原文语言                  |
| `siteName`         | string? | 站点名称                  |
| `favicon`          | string? | 站点图标                  |
| `contentHash`      | string? | 内容指纹（用于检测更新）  |
| `scoreImpact`      | number  | 影响力分（0-100）         |
| `scoreQuality`     | number  | 质量分（0-100）           |
| `firstSeenAt`      | Date    | 首次发现时间              |
| `lastSeenAt`       | Date    | 最后发现时间              |

### 4.4 ContentItemEnrichment（多语言 AI 摘要缓存）

| 字段               | 类型      | 说明                                |
| ------------------ | --------- | ----------------------------------- |
| `id`               | string    | 主键                                |
| `contentId`        | string    | 关联 ContentItem                    |
| `canonicalUrlHash` | string    | 哈希                                |
| `locale`           | string    | 语言（en/zh-CN/ja）                 |
| `promptVersion`    | string    | Prompt 版本号                       |
| `aiSummary`        | string    | AI 摘要（200-500 字）               |
| `aiTags`           | string[]? | AI 提取标签                         |
| `contentType`      | enum?     | news/release/tutorial/opinion/paper |

> 唯一约束：`@@unique([canonicalUrlHash, locale, promptVersion])`

### 4.5 DigestRun（一次订阅执行）

| 字段                | 类型    | 说明                                           |
| ------------------- | ------- | ---------------------------------------------- |
| `id`                | string  | 主键                                           |
| `subscriptionId`    | string  | 关联订阅                                       |
| `userId`            | string  | 所属用户                                       |
| `status`            | enum    | `PENDING` / `RUNNING` / `SUCCEEDED` / `FAILED` |
| `source`            | enum    | `SCHEDULED` / `MANUAL`                         |
| `scheduledAt`       | Date    | 计划执行时间                                   |
| `startedAt`         | Date?   | 实际开始时间                                   |
| `finishedAt`        | Date?   | 完成时间                                       |
| `outputLocale`      | string  | 输出语言                                       |
| `narrativeMarkdown` | string? | 叙事摘要                                       |
| `billing`           | JSON    | 计费明细（totalCredits, breakdown）            |
| `result`            | JSON?   | 执行结果统计                                   |
| `error`             | string? | 错误信息                                       |

### 4.6 DigestRunItem（运行条目快照）

| 字段                | 类型    | 说明              |
| ------------------- | ------- | ----------------- |
| `id`                | string  | 主键              |
| `runId`             | string  | 关联 Run          |
| `contentId`         | string  | 关联 ContentItem  |
| `canonicalUrlHash`  | string  | 哈希              |
| `scoreRelevance`    | number  | 相关性分（0-100） |
| `scoreOverall`      | number  | 综合分（0-100）   |
| `scoringReason`     | string? | 入选原因          |
| `rank`              | number  | 排名              |
| `titleSnapshot`     | string  | 标题快照          |
| `urlSnapshot`       | string  | URL 快照          |
| `aiSummarySnapshot` | string? | AI 摘要快照       |
| `deliveredAt`       | Date?   | 投递时间          |

### 4.7 UserContentState（用户维度状态）

| 字段               | 类型   | 说明             |
| ------------------ | ------ | ---------------- |
| `id`               | string | 主键             |
| `userId`           | string | 所属用户         |
| `canonicalUrlHash` | string | 内容哈希         |
| `firstDeliveredAt` | Date?  | 首次投递时间     |
| `lastDeliveredAt`  | Date?  | 最后投递时间     |
| `deliveredCount`   | number | 投递次数         |
| `readAt`           | Date?  | 阅读时间         |
| `savedAt`          | Date?  | 收藏时间         |
| `notInterestedAt`  | Date?  | 不感兴趣标记时间 |

> 唯一约束：`@@unique([userId, canonicalUrlHash])`

### 4.8 DigestTopic（公开话题）

| 字段                   | 类型    | 说明                                                         |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `id`                   | string  | 主键                                                         |
| `slug`                 | string  | URL 路径（全局唯一，3-50 字符）                              |
| `title`                | string  | 标题                                                         |
| `description`          | string? | 描述                                                         |
| `visibility`           | enum    | `PUBLIC` / `PRIVATE` / `UNLISTED`                            |
| `status`               | enum    | `ACTIVE` / `PAUSED_INSUFFICIENT_CREDITS` / `PAUSED_BY_ADMIN` |
| `sourceSubscriptionId` | string  | 关联的源订阅                                                 |
| `subscriberCount`      | number  | 订阅者数量                                                   |
| `lastEditionAt`        | Date?   | 最后更新时间                                                 |
| `nextEditionAt`        | Date?   | 下次更新时间                                                 |
| `createdByUserId`      | string  | 创建者                                                       |

### 4.9 DigestTopicEdition / DigestTopicEditionItem

与 DigestRun/DigestRunItem 结构类似，用于公开话题的期刊内容。

---

## 5. 评分规则

### 5.1 三维评分

| 维度      | 归属     | 说明                       | 权重 |
| --------- | -------- | -------------------------- | ---- |
| Relevance | 订阅私有 | 与订阅兴趣的匹配度         | 50%  |
| Impact    | 全局     | 新鲜度、来源信誉、讨论热度 | 30%  |
| Quality   | 全局     | 内容完整性、结构化程度     | 20%  |

**综合分计算**：

```
scoreOverall = 0.5 * relevance + 0.3 * impact + 0.2 * quality
```

### 5.2 MVP 评分策略（无 LLM）

- **Relevance**：关键词命中 + 同义词扩展 + 标题/摘要/正文不同权重
- **Impact**：发布时间新鲜度 + 域名白/黑名单 + 来源渠道加权
- **Quality**：正文长度/结构 + 聚合页/导航页惩罚

### 5.3 Writer 叙事规则

- 允许更自由的编辑风格（观点、串联、对比）
- **底线**：不能编造具体事实/数字，所有事实性句子须来自本期条目
- 必须提供 Sources 列表

---

## 6. 核心流程

### 6.1 调度（Scheduler）

1. 每分钟扫描 `DigestSubscription.enabled=true && nextRunAt <= now()`
2. 原子推进 `nextRunAt`（避免重复命中）
3. 创建 `DigestRun(PENDING)` 并入队

### 6.2 订阅运行（DigestRun）

1. **组装候选集**（最多 `searchLimit` 条）：
   - Follow 订阅：直接取 Topic Edition items
   - Search 订阅（ON_RUN）：执行搜索并入池
   - RSS/Crawl 订阅（SCHEDULED）：从内容池取最近窗口内容
2. **计算相关性**：MVP 用关键词匹配，v2 可用 LLM 增强
3. **合成总分并排序**
4. **去重 + 二次投递策略**：基于 `UserContentState`
5. **智能筛选**：`scoreOverall >= minScore`，不足则补足到 `minItems`
6. **生成摘要**：缺失 AI 摘要的内容调用 LLM 生成
7. **Writer 叙事**：可选生成 `narrativeMarkdown`
8. **更新状态**：写入 `DigestRunItem` + `UserContentState`
9. **计费**：成功后按 Fetchx 调用汇总扣费

### 6.3 去重策略

- **主键**：`canonicalUrlHash`
- **范围**：同一用户跨所有订阅
- **默认策略**（COOLDOWN）：
  - 未投递过 → 允许
  - 已投递且 < 7 天 → 跳过
  - 已投递且 >= 7 天 → 允许再投递
  - 已标记 `notInterestedAt` → 始终跳过

### 6.4 幂等与重试

- **同一订阅不重复跑**：原子推进 `nextRunAt` 或乐观锁
- **并发写入防护**：`@@unique([userId, canonicalUrlHash])` 兜底
- **失败重试**：同一 `runId` 重试不重复扣费

---

## 7. API 设计

> 完整路由表。详细参数见 Zod schema。

### 7.1 App API（Session）

**订阅管理**：

| 方法   | 路径                                           | 说明                 |
| ------ | ---------------------------------------------- | -------------------- |
| POST   | `/api/v1/app/digest/subscriptions`             | 创建订阅             |
| GET    | `/api/v1/app/digest/subscriptions`             | 列表                 |
| GET    | `/api/v1/app/digest/subscriptions/:id`         | 详情                 |
| PATCH  | `/api/v1/app/digest/subscriptions/:id`         | 更新/启停            |
| DELETE | `/api/v1/app/digest/subscriptions/:id`         | 软删除               |
| POST   | `/api/v1/app/digest/subscriptions/:id/run`     | 手动触发             |
| POST   | `/api/v1/app/digest/subscriptions/:id/preview` | 预览（不写入 Inbox） |
| GET    | `/api/v1/app/digest/subscriptions/:id/runs`    | 运行历史             |

**Web Inbox**：

| 方法  | 路径                             | 说明          |
| ----- | -------------------------------- | ------------- |
| GET   | `/api/v1/app/digest/inbox`       | 条目列表      |
| PATCH | `/api/v1/app/digest/inbox/:id`   | 更新状态      |
| GET   | `/api/v1/app/digest/inbox/stats` | 未读/收藏计数 |

**Topic 管理**：

| 方法   | 路径                                     | 说明             |
| ------ | ---------------------------------------- | ---------------- |
| POST   | `/api/v1/app/digest/topics`              | 发布 Topic       |
| GET    | `/api/v1/app/digest/topics`              | 我的 Topics      |
| PATCH  | `/api/v1/app/digest/topics/:id`          | 更新             |
| DELETE | `/api/v1/app/digest/topics/:id`          | 删除（下架）     |
| POST   | `/api/v1/app/digest/topics/:slug/follow` | 创建 Follow 订阅 |

### 7.2 ApiKey API（不提供 Digest）

- Digest 不提供 ApiKey API；对外仅保留 public/app 通道。

### 7.3 Public Topics API（无鉴权，SEO）

| 方法 | 路径                                              | 说明         |
| ---- | ------------------------------------------------- | ------------ |
| GET  | `/api/v1/public/digest/topics`                    | 公开话题列表 |
| GET  | `/api/v1/public/digest/topics/:slug`              | 话题详情     |
| GET  | `/api/v1/public/digest/topics/:slug/editions`     | 历史期刊     |
| GET  | `/api/v1/public/digest/topics/:slug/editions/:id` | 单期详情     |
| POST | `/api/v1/public/digest/topics/:slug/report`       | 举报         |

### 7.4 Admin API（RequireAdmin）

| 方法  | 路径                                    | 说明     |
| ----- | --------------------------------------- | -------- |
| GET   | `/api/v1/admin/digest/subscriptions`    | 全量订阅 |
| GET   | `/api/v1/admin/digest/runs`             | 运行列表 |
| GET   | `/api/v1/admin/digest/reports`          | 举报列表 |
| PATCH | `/api/v1/admin/digest/topics/:id/pause` | 下架话题 |

---

## 8. 计费规则

### 8.1 计费模型

- **按 run 结算一次**：run 完成后按 Fetchx 实际调用成本汇总
- **命中缓存也收费**：即使 `fromCache=true` 也计入成本
- **失败不收费**：只有 `status='SUCCEEDED'` 才扣费
- **LLM 暂不单独计费**

### 8.2 Fetchx 成本项

| Key                  | Cost |
| -------------------- | ---- |
| `fetchx.search`      | 1    |
| `fetchx.scrape`      | 1    |
| `fetchx.batchScrape` | 1    |
| `fetchx.crawl`       | 1    |
| `fetchx.map`         | 1    |
| `fetchx.extract`     | 1    |

### 8.3 AI 成本项（内部计量）

| 操作               | Credits |
| ------------------ | ------- |
| `ai.summary`       | 0.5     |
| `ai.narrative`     | 2       |
| `ai.explainReason` | 0.2     |

### 8.4 典型费用

- 默认参数（`searchLimit=60`, `scrapeLimit=20`）
- 典型费用：1 search + 20 scrape = **21 credits/run**
- FREE（100 credits/天，UTC 重置）：约 **4-5 次/天**
- BASIC（5000 credits/月）：约 **238 次/月**

### 8.5 Topic 计费规则

- **发布者付费**：Topic Edition 生成费用由 `sourceSubscription.userId` 承担
- **订阅者免费**：Follow 订阅直接读取 Edition，无 Fetchx 调用
- **余额不足**：`topic.status = 'PAUSED_INSUFFICIENT_CREDITS'`，不自动下架

### 8.6 风控约束

| 约束               | FREE           | BASIC | PRO  | TEAM |
| ------------------ | -------------- | ----- | ---- | ---- |
| 最小 cron 间隔     | 60min          | 10min | 1min | 1min |
| 订阅数上限         | 3              | 20    | 100  | 500  |
| PUBLIC topics 上限 | 3              | 20    | 100  | 500  |
| Preview 频控       | 10次/小时/用户 | -     | -    | -    |

---

## 9. 实施进度

| 阶段                          | 状态    | 说明                                                   |
| ----------------------------- | ------- | ------------------------------------------------------ |
| Phase 1: MVP                  | ✅ 完成 | Prisma + 后端服务 + API + Console UI                   |
| Phase 2: AI                   | ✅ 完成 | AI 摘要、Writer 叙事、Explainability、Preview          |
| Phase 2.5: Public Topics      | ✅ 完成 | 数据模型 + Public API + SEO 页面 + 举报治理            |
| Phase 2.6: 统一登录与前端架构 | ✅ 完成 | 统一登录入口 + www 用户功能 + Console 精简             |
| Phase 2.7: 首页 C 端改造      | ✅ 完成 | Digest 主产品定位 + 首页 Public Topics 展示 + 精选配置 |
| Phase 3: 多源                 | ✅ 完成 | RSS/Site crawl/Scheduled refresh（后端完整实现）       |
| Phase 4: 多渠道               | ✅ 完成 | Webhook 投递 + Email 推送 + 反馈学习                   |

---

## 10. 关键决策

| 决策          | 选择                           | 理由                    |
| ------------- | ------------------------------ | ----------------------- |
| 内容池范围    | 全局共享（跨用户）             | 复用抓取/摘要，降低成本 |
| 去重主键      | canonicalUrlHash               | 统一口径、可解释        |
| 二次投递      | COOLDOWN=7 天                  | 避免错过持续演进的内容  |
| 调度表达式    | 任意 cron + timezone           | 可作 API 能力           |
| 输出语言      | 跟随 UI 语言                   | 阅读体验一致            |
| 计费          | 按 run 结算（Fetchx 成本汇总） | 可解释                  |
| Topic 计费    | 发布者付费，订阅者免费         | 防滥用                  |
| Writer        | 自由风格                       | 差异化                  |
| 智能筛选      | AI 判断 + minItems 保底        | 避免空结果              |
| 默认入口      | Web Inbox                      | 先做可见可控            |
| 内容保留      | 不存全文，只存 AI 摘要         | 降成本、规避版权        |
| RSS 源        | 允许任意 feedUrl               | 覆盖更多来源            |
| Public Topics | 默认 PUBLIC                    | 增长优先                |

---

## 11. 未实现功能规格

### Phase 2.6: 统一登录与前端架构迁移

> 详细设计文档：[unified-auth-and-digest-architecture.md](./unified-auth-and-digest-architecture.md)

**背景**：

- 当前登录分散（www、console、admin 各自有登录页面）
- Digest 订阅管理（C 端功能）错误地放在了 Console（开发者工具）中
- `anyhunt.app` 仅作为官网落地页，未充分利用

**目标**：

1. 统一登录入口到 `anyhunt.app/login`
2. 将 `anyhunt.app` 从官网升级为主产品（面向 C 端用户）
3. Console 回归开发者工具定位
4. 跨子域 Session 共享（Cookie domain: `.anyhunt.app`）

**实施阶段**：

| 子阶段      | 内容                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Phase 2.6.1 | www 新增 `/login`、`/register`、`/forgot-password`；配置 Cookie domain `.anyhunt.app`；Console/Admin 移除登录页改为重定向 |
| Phase 2.6.2 | www 新增用户路由（`/dashboard`、`/inbox`、`/subscriptions`、`/my-topics`）；迁移 Console 中的 Digest 组件到 www           |
| Phase 2.6.3 | Console 移除 Digest 管理功能；新增 Digest API Playground；更新导航添加「前往 www 管理订阅」入口                           |

**应用定位调整**：

| 应用    | 域名                  | 定位       | 目标用户                       |
| ------- | --------------------- | ---------- | ------------------------------ |
| www     | `anyhunt.app`         | 主产品     | C 端用户（内容消费者、创作者） |
| console | `console.anyhunt.app` | 开发者工具 | 开发者（API 调用、调试）       |
| admin   | `admin.anyhunt.app`   | 运营后台   | 管理员（审核、监控）           |

---

### Phase 2.7: 首页 C 端改造 ✅ 已完成

> **实现状态**：已完成全部功能（Phase 2.7.1 ~ 2.7.4）
>
> - 后端：DigestTopic featured 字段 + Admin API（Phase 2.7.1）
> - 后端：Public Topics API featured 筛选支持（Phase 2.7.2）
> - 前端：www 首页重构（Hero + Featured/Trending/Latest Topics + How It Works + CTA）（Phase 2.7.3）
> - Admin：Featured Topics 管理界面（查看/设置精选/排序）（Phase 2.7.4）

**背景**：

- 当前 `anyhunt.app` 首页仍是开发者导向（展示 Fetchx/Memox API 产品）
- Digest 作为主产品，需要在首页突出展示
- Public Topics 已完成，但未在首页曝光，缺少流量入口

**目标**：

1. 将 `anyhunt.app` 首页改造为面向 C 端用户的产品首页
2. 以 Digest 作为核心产品，突出展示「AI 智能信息订阅」价值
3. 首页展示 Public Topics：精选、热门、最新
4. 后台可配置精选 Topics（Featured）

**实施内容**：

| 子阶段      | 内容                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| Phase 2.7.1 | 后端：DigestTopic 新增 `featured: Boolean` + `featuredOrder: Int?`；新增 Admin API 配置 |
| Phase 2.7.2 | 后端：Public Topics API 新增 `featured=true` 筛选参数                                   |
| Phase 2.7.3 | 前端：www 首页重构 - Hero（Digest 产品介绍）+ Featured Topics + Trending + Latest + CTA |
| Phase 2.7.4 | Admin：新增 Featured Topics 管理界面（选择/排序/取消精选）                              |

**首页结构设计**：

```
┌─────────────────────────────────────────────────────────┐
│ Hero Section                                            │
│ - 标题：AI-Powered Content Digest                       │
│ - 副标题：让 AI 帮你筛选、整理、总结你关心的信息        │
│ - CTA：Get Started / Explore Topics                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Featured Topics（精选话题 - 后台配置）                   │
│ - 3-6 个精选 Topic 卡片，按 featuredOrder 排序          │
│ - 卡片：标题 + 描述 + 订阅者数 + 最近更新               │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Trending Topics（热门话题）                              │
│ - API 参数：sort=trending                               │
│ - 展示 6-8 个热门 Topic                                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Latest Topics（最新话题）                                │
│ - API 参数：sort=latest                                 │
│ - 展示 6-8 个最新 Topic                                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ How It Works（工作原理）                                 │
│ - Step 1: 关注你感兴趣的话题                            │
│ - Step 2: AI 自动筛选有价值内容                         │
│ - Step 3: 定期收到结构化简报                            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ CTA Section（最终行动召唤）                              │
│ - 创建你自己的订阅 / 探索更多话题                       │
└─────────────────────────────────────────────────────────┘
```

**数据模型变更**：

```prisma
model DigestTopic {
  // ... 现有字段
  featured       Boolean  @default(false)  // 是否精选
  featuredOrder  Int?                      // 精选排序（越小越靠前）
  featuredAt     DateTime?                 // 设为精选的时间
  featuredByUserId String?                 // 设置者（Admin）
}
```

**新增 API**：

| 方法  | 路径                                         | Guard        | 说明             |
| ----- | -------------------------------------------- | ------------ | ---------------- |
| GET   | `/api/v1/public/digest/topics?featured=true` | 无（公开）   | 获取精选话题列表 |
| PATCH | `/api/v1/admin/digest/topics/:id`            | RequireAdmin | 设置/取消精选    |
| POST  | `/api/v1/admin/digest/topics/reorder`        | RequireAdmin | 调整精选排序     |

**验收标准**：

1. ✅ 首页以 Digest 为核心产品展示
2. ✅ 精选话题后台可配置（Admin API）
3. ✅ 热门/最新话题正确排序展示
4. ✅ Topic 卡片点击跳转到话题详情页
5. ✅ 响应式设计（移动端适配）

---

### Phase 3: 多源 ✅ 已完成

> **实现状态**：后端核心功能已完成
>
> - `DigestRssService` - RSS/Atom 解析器
> - `DigestSiteCrawlService` - 网站爬取服务
> - `DigestSourceService` - 统一源管理
> - `SourceSchedulerProcessor` - 定时调度
> - `SourceRefreshProcessor` - 刷新执行

#### 11.1 RSS Source（SCHEDULED）

**目标**：稳定、低成本、结构化的内容源

**实现要点**：

- 增量拉取：优先用 `ETag` / `If-Modified-Since`
- 发布时间：用 RSS item 的 `pubDate/updated`；缺失时用 `firstSeenAt`
- 唯一性：优先取 `link`；仅 `guid` 时判断是否可当作 URL
- 内容字段：`description/content:encoded` 作为初始描述

**RSSHub 接入**：

- 已自部署：`rss.anyhunt.app`
- 模型上仍是 `DigestSource.type='rss'`，`feedUrl=https://rss.anyhunt.app/...`
- 优先引导用户用 RSSHub；允许任意 RSS 但加强 SSRF/风控

**任意 RSS 安全策略**：

- 复用 `UrlValidator` 做基础校验 + DNS 解析后校验最终 IP
- 限制响应体大小（≤ 5MB）、超时（10s）
- 域名级并发/频率限制
- 跳转策略：允许 301/302，每次跳转后重新校验

#### 11.2 Site Crawl Source（SCHEDULED）

**目标**：没有 RSS 的站点

**可控范围**：

- 必须支持 `siteUrl + includePaths/excludePaths + maxDepth + limit`
- 全局并发上限 + 域名级并发上限
- 对 4xx/403 直接降级跳过
- 不抓登录态页面；严格 SSRF 防护
- 默认只抓列表页提取链接 + 少量详情页抓正文

#### 11.3 Scheduled Source Refresh

**调度机制**：

1. SourceScheduler（每分钟）扫描 `DigestSource.refreshMode=SCHEDULED && nextRefreshAt <= now()`
2. 原子推进 `nextRefreshAt`
3. 入队 `DigestSourceIngestJob(sourceId)`
4. Worker 执行 ingest，更新 `lastRefreshAt`

**安全约束**：

- 同一 feedUrl 最小刷新间隔：≥ 30 分钟
- 单用户并发 refresh：≤ 2
- 单域名并发：≤ 2

### Phase 4: 多渠道 + 反馈学习（长期）

#### 11.4 Webhook 投递

**实现要点**：

- 出站 SSRF 防护（复用 UrlValidator）
- 请求签名（HMAC-SHA256）
- 重试策略：指数退避，最多 3 次
- 独立于 Inbox 可见性（Webhook 失败不影响 Inbox）

**Payload 结构**：

```json
{
  "event": "digest.run.completed",
  "runId": "...",
  "subscriptionId": "...",
  "items": [{ "title", "url", "aiSummary", "scoreOverall" }],
  "narrative": "...",
  "timestamp": "..."
}
```

#### 11.5 Email 推送

**实现要点**：

- 可选开关（`emailEnabled`）
- 统一模板 + unsubscribe 链接（按订阅粒度）
- 失败重试（不影响 Inbox）
- `DigestRun.emailSubject` 保存渲染后的 subject

**Subject 模板**：

```
Your digest: {{subscriptionName}} - {{date}}
```

**追踪（可选）**：

- Email open/click 追踪
- Webhook delivery 状态

#### 11.6 反馈学习

**目标**：基于用户行为自动调整订阅

**信号来源**：

- `savedAt`：高意图信号 → 提高相似内容 relevance
- `notInterestedAt`：强负反馈 → 过滤 + 自动加 negative keywords
- read/click 行为：用于评估内容质量

**学习机制**：

- 收集 30 天内的用户行为
- 分析 saved 内容的共同特征（关键词、来源、类型）
- 自动调整 `interests` / `minScore` / source 权重
- 需要用户确认或可回滚

#### 11.7 ON_CONTENT_UPDATE 策略

**目标**：同一 URL 内容显著更新时提前再投递

**实现思路**：

1. 入池或定期 backfill 抓全文，计算 `ContentItem.contentHash`
2. 每次投递记录 `UserContentState.lastDeliveredContentHash`
3. 若 `contentHash` 与上次不同且 diff 超过阈值 → 允许再投递
4. 仍加最短间隔（如 7 天），避免频繁改动导致 spam

**建议**：先用 `COOLDOWN=7d` 跑通体验，后续再引入

---

## 12. 默认订阅模板

| 模板               | Cron        | Topic 示例                        |
| ------------------ | ----------- | --------------------------------- |
| AI Daily           | `0 9 * * *` | AI agents, LLM, OpenAI, Anthropic |
| Product Weekly     | `0 9 * * 1` | startup, product strategy, YC     |
| Engineering Weekly | `0 9 * * 2` | distributed systems, databases    |
| Frontend Weekly    | `0 9 * * 3` | React, TypeScript, Next.js        |
| Security Daily     | `0 9 * * *` | CVE, security advisory            |

---

## 13. 验收标准

1. ✅ 用户可创建订阅，按期生成简报并在 Web Inbox 查看
2. ✅ Web Inbox 可管理：已读/收藏/不感兴趣
3. ✅ canonicalUrlHash 去重生效
4. ✅ 二次投递策略生效
5. ✅ run 历史可追溯
6. ✅ 幂等与重试不产生重复
7. ✅ 计费正确：按 run 结算一次，失败不收费

---

## 附录 A: canonicalize 规则

URL 标准化规则（跨业务线一致）：

1. 小写 host
2. 移除 fragment（`#...`）
3. 移除默认端口
4. path 去重斜杠
5. query 参数排序
6. 移除追踪参数：`utm_*`, `fbclid`, `gclid`, `spm`, `ref`
7. 跟随 3xx 重定向（≤5 次）
8. 优先采信 `rel=canonical` / `og:url`（同域限制）

**Canonical URL 信任边界**：

- 同域优先：canonical URL 必须与原始 URL 同域
- 拒绝跨站：完全不同站点的 canonical 忽略
- 协议一致：必须是 http/https
- 循环检测：最多跟随 2 次

---

## 附录 B: 全文临时缓存策略

**规则**：

- 临时缓存：Redis TTL = 1 小时
- 分析后丢弃：AI 生成摘要后全文自动过期
- 用户看原文：通过链接跳转原站

**安全约束**：

- 体积上限：单条 ≤ 500KB
- 压缩：> 10KB 使用 gzip
- 总容量监控：Redis > 1GB 触发告警
- LRU 淘汰：`maxmemory-policy allkeys-lru`

---

_版本: 2.1 | 更新日期: 2026-01-14_
