---
title: 智能内容订阅系统 v2.0 - 需求方案
date: 2026-01-12
scope: aiget.dev, server.aiget.dev
status: review
authors: ["AI Assistant"]
reviewers: []
---

<!--
[INPUT]: 面向 C 端用户的「随时订阅信息」产品；支持任意 cron + IANA timezone；全局共享内容池（跨用户）；去重主键 canonicalUrlHash；允许二次投递（默认冷却 7 天）；Web Inbox（网页）为默认入口；输出语言跟随 UI（UserPreference.uiLocale）；允许任意 RSS feedUrl（需 SSRF/风控）；内容与历史永久保留（含全文）；支持 Public Topics（aiget.dev SEO 页面）与一键订阅；计费为“按 run 结算一次，但按本次 Fetchx 实际调用成本汇总，且命中缓存也收费”
[OUTPUT]: 可落地的端到端需求规格（体验、流程、数据模型、接口、调度/去重/重试、计费与风控）
[POS]: Feature 文档：为 `apps/aiget/server` 实现「内容入池 → 订阅编排 → Web Inbox（网页）展示与管理 → Public Topics（SEO）→（可选）邮件/多渠道推送」提供统一方案

[PROTOCOL]: 本文件新增/变更需同步更新 `docs/features/index.md`、`docs/CLAUDE.md` 与根 `CLAUDE.md`（文档索引）。
-->

# 智能内容订阅系统 v2.0 - 需求方案

## 1. 产品定义与目标

### 1.1 产品一句话

让 C 端用户把“我想持续关注的主题/来源”变成一份 **可控、可读、不过载** 的定时简报（Web Inbox 优先，Email 推送可选），并且随着使用逐步更聪明。

### 1.2 核心体验（MVP 建议）

1. **30 秒创建订阅**：输入主题（自然语言也可以）→ 选择频率与投递时间（timezone + cron，高级模式支持任意 cron）→ 选择简报长度（Brief/Standard/Deep）。
2. **每期“先给结论，再给链接”**：Web Inbox 的“本期简报”开头是一段“本期发生了什么”的叙事摘要，下面是条目列表（标题 + 1～3 行摘要 + 来源 + 链接）。
3. **用户维度全局去重**：同一用户多个订阅之间不重复发同一条内容（canonicalUrlHash）。
4. **允许二次投递但可控**：同一条内容在满足策略时可再次出现（默认：冷却 7 天后允许再次投递；可选：内容显著更新时提前再投递）。
5. **Web Inbox（MVP 必做）**：先在网页上完成“查看 + 管理”（列表/筛选/收藏/不感兴趣），并提供对应 API；Email 推送放到最后做，且作为可选项。

### 1.3 关键产品策略（建议直接拍板）

- **默认做“少而精”**：默认 `maxItems=20`，并提供一键切换：Brief(10) / Standard(20) / Deep(30)。
- **默认做“解释性”**：每条内容给出“为什么入选”（命中的兴趣词/来源信誉/新鲜度），让用户信任而不是黑盒。
- **默认做“无配置可用”**：提供订阅模板（AI/产品/投融资/编程语言/地区新闻等），用户不需要懂 query/engines。
- **默认不“再发布全文”**：抓全文用于摘要/评分/后续 AI 处理；Web Inbox（以及未来可选的 Email/SEO 页面）默认只展示摘要/要点 + 链接，避免版权风险与阅读负担。**但系统内部可以永久保留全文**（你已确认“永久保留全文”），用于后续再加工与迁移到 Moryflow。
- **默认做“安全与可退订”**：当用户开启 Email 推送后，邮件必带 unsubscribe（按订阅粒度），避免被当成营销邮件影响送达率。

### 1.4 参考项目与取舍

本方案借鉴 [aigc-weekly](https://github.com/miantiao-me/aigc-weekly) 的思路（评分与写作），但 **不照搬完整多代理流水线**：

- ✅ 保留：三维评分（相关性/影响力/质量）、“Writer”式叙事摘要
- ✅ 强化：全局共享内容池（跨用户复用抓取/摘要结果，降低成本）
- ❌ 暂不做：研究员→编辑→审核多阶段人设代理（过重、过慢、难控成本）

### 1.5 核心目标（对齐已确认的决策）

1. **全局共享内容池（跨用户）**：内容与内容级 AI 结果尽量复用，降低边际成本。
2. **去重主键 canonicalUrlHash**：统一的“同一内容”判定基准。
3. **允许二次投递**：但必须有明确策略（冷却/更新），避免噪音。
4. **按 run 结算一次（但按 Fetchx 实际成本汇总）**：一次 run 只扣一次费用；run 内部的 Fetchx 调用会被计入总价（含缓存命中），LLM 暂不单独计费。
5. **Writer 风格更自由**：允许更像“编辑写稿”，但仍需避免编造事实并提供来源列表。

### 1.6 Public Topics（首页展示 + SEO + 一键订阅）

你新增的需求可以总结为：把 Digest 做成“可对外发布的主题频道”，让 `aiget.dev` 产生可索引的内容页，带来自然流量，并且让新用户可以“直接订阅别人已经发布的话题”。

这里的 **Edition（期刊“第 N 期/本期”）页** 指的是：某个 Topic 的“一期内容”（一次公开发布的结果），对应数据模型里的 `DigestTopicEdition` / `DigestTopicEditionItem`，并在 `aiget.dev` 下形成稳定 URL，便于 SEO 收录与分享。

示例 URL：

- 话题详情：`https://aiget.dev/topics/:slug`
- Edition 页（一期）：`https://aiget.dev/topics/:slug/editions/:id`（或 `:yyyy-mm-dd`）

我建议把它设计为 **Public Topic Directory**（公开话题目录），并遵循两个产品底线：

1. **隐私保护（在“默认公开”前提下）**：用户的“订阅”仍然是私有资产，但用户发布的 Topic 默认公开且可收录；因此产品必须在发布/创建时明确提示“公开可被搜索引擎收录”，并且把“切换为私密（付费）/删除话题”做成可见且可撤销的能力。
2. **版权与垃圾内容可控**：SEO 页只展示“摘要/要点 + 链接 + 来源列表”，避免全文转载；并提供最小审核/举报/下架机制，避免被 spam 反噬 SEO。

你已确认的发布可见性（两档）：

- `PUBLIC`：默认公开（可收录，进首页/目录/站点地图）
- `PRIVATE`：私密（仅创建者可见），**仅付费用户可切换为私密**

风险提示（必须在产品里明确提示用户）：默认公开意味着用户的订阅意图可能被暴露，因此建议在创建/发布话题时提供醒目的“公开可被搜索引擎收录”的提示，并允许用户在发布前预览公开页面。

#### 1.6.1 域名与路由（你已确认用 aiget.dev 做单品主站）

你希望把该单品用 `aiget.dev` 主域名承载，并且用户可以在该页面完成部分操作；同时它又要和 Fetchx/Memox 一样，作为 Aiget Dev 的“原子能力”之一对外提供 API。

我建议用“公开站点 + 控制台”的经典分层：

- `aiget.dev`：**公开产品站 + SEO 内容页**（可浏览 Topics/Editions、搜索、查看趋势；点击订阅/管理会跳转登录）
- `console.aiget.dev`：**登录后管理**（创建/管理订阅、Inbox、发布/私密话题、额度/账单）
- `server.aiget.dev/api/v1`：**API 能力入口**（Public API + Public SEO API）

这样可以同时满足：

- SEO（必须在公开域名、可 SSR/SSG）
- 产品转化（公开页引流到 console）
- 能力化（server.aiget.dev 作为统一 API 域名，不破坏既有约束）

SEO 页建议落在 `aiget.dev`（而不是 `console.aiget.dev`），例如：

- 话题目录：`https://aiget.dev/topics`
- 话题详情：`https://aiget.dev/topics/:slug`
- 每期内容页：`https://aiget.dev/topics/:slug/editions/:yyyy-mm-dd`（或 `:editionId`）

订阅转化路径（强推荐）：

1. 未登录用户在 `aiget.dev` 看到话题 → 点 `Subscribe`
2. 跳转 `console.aiget.dev` 登录/注册
3. 登录后自动“创建订阅”（基于该 topic 的默认配置，可让用户改 cron/timezone）

产品交互建议（能显著提升 SEO → 订阅转化的闭环）：

- `Subscribe`：**跟随该 Topic 的公开 editions**（用户看到的“每期内容”与 SEO 页一致），用户只调整“投递时间”（cron/timezone）与个人状态（read/saved/notInterested）
- `Fork`（可选）：克隆为自己的私有订阅（允许改 topic/interests/sources），并且可选择是否发布为新的 Topic

补充（你已确认）：Follow 允许用户微调，但建议限制在“不会破坏公开话题一致性”的范围内：

- ✅ 允许：加/减关键词（正向/负向）、调 `minScore`、调 `maxItems`、调 cron/timezone、调语言模式
- ❌ 不建议：修改 sources（否则会与公开 edition 列表背离；需要改 sources 请走 Fork）

---

## 2. 架构设计

### 2.0 术语表（避免混淆）

> 本功能同时包含“用户订阅运行（Subscription Run）”与“公开期刊发布（Topic Edition）”两条链路。为了避免实现与产品文案混乱，这里先把术语统一。

| 术语 | 含义 | 面向谁 | 备注 |
|------|------|--------|------|
| `ContentItem` | 全局内容池中的一条内容（唯一键 `canonicalUrlHash`） | 系统/开发 | 可缓存全文/摘要/评分，跨用户复用 |
| `DigestSubscription`（订阅） | 用户的私有订阅配置（cron/timezone/topic 等） | 用户/Console | 默认不公开 |
| `DigestRun`（Run） | 一次订阅执行的记录（一次“投递到 Inbox”） | 用户/Console | 按 run 结算一次（Fetchx 成本汇总） |
| `DigestRunItem` | 某次 Run 中入选并投递的条目快照 | 用户/Console | 用于 Inbox 展示与追溯 |
| `UserContentState` | 用户维度的去重与状态（read/saved/notInterested） | 用户/Console | 跨订阅共享，决定二次投递 |
| `DigestTopic`（Topic） | 公开话题（默认 PUBLIC；付费可 PRIVATE） | 访客/SEO/Console | 对应 `aiget.dev/topics/:slug` |
| `DigestTopicEdition`（Edition） | 某个 Topic 的一期公开内容（“第 N 期/本期”） | 访客/SEO | 对应 `aiget.dev/topics/:slug/editions/:id` |
| `DigestTopicEditionItem` | 某期 Edition 的条目快照 | 访客/SEO | 只展示摘要/链接，不展示全文 |
| Follow（跟随订阅） | 基于 Topic 的 editions 作为候选集的订阅方式 | 用户 | 允许微调（关键词/阈值/时间），不建议改 sources（改 sources 用 Fork） |
| Fork（克隆订阅） | 复制 Topic 的默认配置为自己的订阅并可深度改造 | 用户 | 允许改 sources/interests 并可选择发布为新 Topic |

### 2.1 核心原则（落地导向）

- **内容是全局共享的，相关性是订阅私有的**
  - `impact/quality` 可在内容入池时计算与缓存（全局）
  - `relevance` 必须在订阅运行时基于订阅兴趣计算（否则全局池会被某个订阅“污染”）
- **canonicalUrlHash 是所有去重/复用的基础设施**：入池先 canonicalize，再 hash。
- **按 run 结算一次**：DigestRun 内部调用 Fetchx 时不应“逐次扣费”，而应只做计量与汇总（避免出现 run 结束又额外扣一笔的双重计费）；并且命中缓存也应计入成本（你已确认）。
- **渐进式智能**：先用启发式评分 + 基础摘要跑通闭环，再引入更贵的 LLM 评分/学习系统。

### 2.2 参考项目映射（我从哪里借鉴了什么）

> 参考项目路径：`aigc-weekly-ref/`（你提供的 repo 本地克隆副本）

本方案没有照搬参考项目的“多代理流水线”，而是抽取了其中**可复用的策略与规范**，并把它们改造成更适合 C 端产品的确定性后端流程。

| 本方案模块 | 参考项目的对应角色/文件 | 借鉴点 | 我做的改造 |
|---|---|---|---|
| 信息源清单 | `aigc-weekly-ref/agent/.claude/REFERENCE.md` | 信息源列表与“优先抓原文”的倾向 | 在 Aiget 中改为 `DigestSource` 可配置 + 可复用；并增加 `rss.aiget.dev`（RSSHub） |
| 抓取与清洗 | `aigc-weekly-ref/agent/.claude/agents/crawler.md` | 列表页→详情页、重试策略、时间范围筛选、优先原始来源 | 改为 BullMQ ingest job；抓全文只做“按需补全/缓存”，并考虑版权与成本 |
| 去重策略 | `aigc-weekly-ref/agent/.claude/agents/editor.md` | 与历史内容对比去重（标题/URL/主题） | 改为确定性的 `canonicalUrlHash` 主键 + 用户维度状态（read/save/notInterested）+ 7 天冷却二次投递 |
| 三维评分矩阵 | `aigc-weekly-ref/agent/.claude/agents/editor.md` | 相关性/影响力/实操性（utility）权重与阈值 | 我保留“三维”思想，但把 “utility” 改为更通用的 “quality”，并拆分成“全局两维 + 订阅一维”以适配全局内容池 |
| Writer 叙事稿 | `aigc-weekly-ref/agent/.claude/agents/writer.md` | 把条目组织成可读的周刊正文 | 改为 `DigestRun.narrativeMarkdown`（Web Inbox 的“本期简报”编辑稿），并要求 Sources 可追溯 |
| 质量审核 | `aigc-weekly-ref/agent/.claude/agents/reviewer.md` | 审稿与质量门槛 | 在产品里替换为“可解释 + 可降级 + 可追溯”的规则，不引入强依赖的 reviewer 阶段（避免耗时/成本） |

### 2.3 总体数据流

```
                   ┌───────────────────────────┐
                   │   DigestSource (global)   │   (RSS / Site / Search config)
                   └─────────────┬─────────────┘
                                 │
                         (scheduled / on-run)
                                 │
┌───────────────────────────────▼────────────────────────────────┐
│                Ingest Jobs (BullMQ)                              │
│  - fetch new links / crawl / parse rss                           │
│  - canonicalize url -> canonicalUrlHash                           │
│  - upsert ContentItem (global)                                   │
│  - compute impact/quality + optional content/summary caching      │
└───────────────────────────────┬────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────┐
│                Content Pool (PostgreSQL, global)                 │
│  ContentItem (unique by canonicalUrlHash)                        │
└───────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ candidates (time window + filters)
                                 │
┌───────────────────────────────▼────────────────────────────────┐
│            DigestRun Orchestration (per subscription)            │
│  - compute relevance per subscription                             │
│  - apply dedup + redelivery policy (per user)                     │
│  - pick top N and compose (optional Writer)                       │
│  - deliver email / webhook                                        │
└───────────────────────────────┬────────────────────────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │ UserContentState    │  (per user, canonicalUrlHash)
                      │ + DigestRunItem log │
                      └─────────────────────┘
```

### 2.3.1 Public Topics（SEO）数据流（新增）

当引入 Public Topic Directory（见 1.6 / 3.8 / 6.6）后，系统会多出一条“公开发布链路”：

```text
DigestTopic (PUBLIC)
  └─ TopicScheduler (cron+timezone)
      └─ DigestTopicEdition + DigestTopicEditionItems (public editions, SEO)
          └─ aiget.dev/topics/...  (indexable pages)
          └─ user clicks Subscribe
              └─ create DigestSubscription (follow topic or fork)
                  └─ user Inbox delivery (still uses UserContentState for dedup & status)
```

关键点：**公开话题的 editions 应该是稳定且可复现的**（不受某个用户的 read/saved/notInterested 影响），否则 SEO 页与用户订阅体验会割裂。

### 2.4 为什么全局内容池对 C 端很关键

- **成本**：抓全文/摘要是最贵的部分，全局复用能显著降低边际成本。
- **质量**：同一篇文章可以逐步被“加工得更好”（更好的摘要、更干净的正文），所有用户受益。
- **速度**：订阅运行时更多是“选题与编排”，而不是每次都从 0 抓取。

### 2.5 参考项目不一定正确：我认为更好的做法（面向 C 端）

参考项目的定位是“每周生成一篇周刊”，它天然允许：

- 运行耗时较长（编辑稿可以慢慢写）
- 过程更依赖大模型（多代理链路更像“内容生产”）
- 去重范围偏“最近几期文章”

而你的目标是 C 端“随时订阅信息 + 网页管理”，我建议的更优策略是：

1. **确定性优先**：把“入池/去重/写入 Inbox”做成可预测的流程（DB 约束 + 幂等键），LLM 只做“增益”，失败可降级
2. **缓存优先**：内容级 LLM 处理结果缓存到 `ContentItem`，跨用户复用；避免每个用户重复花钱
3. **用户状态优先**：将 `read/saved/notInterested` 变成第一公民（决定未来筛选与引流），而不是只做“入选/不入选”
4. **RSS 优先于爬虫**：能用 RSS/RSSHub 的尽量用（稳定、便宜、结构化）；爬虫只做补全（摘要/质量评估需要正文时）
5. **评估机制**：引入最小可观测指标（例如：Inbox 未读率、收藏率、不感兴趣率、阅读时长），用来反推评分权重与 LLM 投入是否值得

---

## 3. 数据模型（概念模型）

> 最终以 `apps/aiget/server/prisma/main/schema.prisma` 为准；请求/响应类型以 Zod schema 为单一数据源（`z.infer<>`）。

> MVP 简化建议：Console 不直接暴露“Source”概念；创建订阅时后端自动绑定一个 `search` 类型的 `DigestSource`（query≈topic），后续再开放 RSS/站点等多源编辑。

### 3.0 UserPreference（用户设置：语言/时区，Digest 跟随 UI）

你选择了“Digest 输出语言跟随 UI 语言”。为了让“前端 UI 语言”与“后端生成语言”一致且可控，我建议在 Aiget 增加一个明确的用户设置（最佳实践）：

- `uiLocale`：用户选择的 UI 语言（例如 `en` / `zh-CN` / `ja`）
- `timezone`：用户默认时区（IANA，例如 `Asia/Shanghai`）
- `localeMode`：`AUTO`（跟随浏览器 Accept-Language）/ `MANUAL`（用户手动选择）

服务端使用策略（建议）：

1. Console 登录态（SessionGuard）：以 `UserPreference.uiLocale` 为准（若是 AUTO 则用请求的 `Accept-Language` 推断并缓存）
2. Public API（ApiKeyGuard）：允许调用方在创建订阅时显式传 `outputLocale`；若未传则默认 `en`
3. 为保证历史一致性：每次 run 把“实际输出语言”写入 `DigestRun.outputLocale`

### 3.1 DigestSubscription（用户订阅）

```typescript
type DigestTone = 'neutral' | 'opinionated' | 'concise';
type DigestLength = 'brief' | 'standard' | 'deep'; // brief=10, standard=20, deep=30
type DigestLanguageMode = 'FOLLOW_UI' | 'FIXED';

type RedeliveryPolicy =
  | 'NEVER' // 永不二次投递
  | 'COOLDOWN' // 冷却期后允许再次投递（默认）
  | 'ON_CONTENT_UPDATE'; // 内容显著更新时允许再次投递（v2+）

interface DigestSubscription {
  id: string;
  userId: string;

  name: string;

  // 用户输入（偏产品的表达）
  topic: string; // 用户输入的主题，如 "AI agents in 2026"
  interests: string[]; // 关键词（可由 topic 派生，也允许用户编辑）

  // 选题控制
  minScore: number; // 默认 70
  maxItems: number; // 默认 20（Brief=10 / Standard=20 / Deep=30）
  contentWindowHours: number; // 默认 168（7 天）；可按 cron/场景调整（例如 monthly digest 可设 720）

  // 去重 & 二次投递
  redeliveryPolicy: RedeliveryPolicy; // 默认 COOLDOWN
  redeliveryCooldownDays: number; // 默认 7（仅 COOLDOWN 生效）

  // 调度
  cron: string; // Cron 表达式（建议支持标准 5 段 + 可选 6 段(秒)；UI 提供高级模式）
  timezone: string; // IANA timezone

  // 输出语言（你已选择默认 FOLLOW_UI）
  languageMode: DigestLanguageMode; // 默认 FOLLOW_UI
  outputLocale?: string; // languageMode=FIXED 时使用，例如 'en' / 'zh-CN'

  // 投递
  inboxEnabled: boolean; // MVP: true（Web Inbox 为默认入口）
  emailEnabled: boolean; // MVP: false（后置可选）
  emailTo?: string; // 默认 user.email（仅 emailEnabled=true 生效）
  emailSubjectTemplate?: string; // Phase 4：英文模板，如 `Your digest: {{name}}`
  webhookUrl?: string; // v2+: 需要 SSRF 防护
  webhookEnabled: boolean;

  // AI & 写作偏好（不绑定具体模型）
  generateItemSummaries: boolean;
  composeNarrative: boolean;
  tone: DigestTone; // 默认 neutral
  lengthPreset: DigestLength; // brief/standard/deep

  enabled: boolean;
  nextRunAt: Date;
  lastRunAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### 3.2 DigestSource（全局数据源）

> 一个 Source 可以被多个订阅复用；同一个 RSS feed/站点/搜索配置只存一份。

RSSHub 接入建议：

- 你已自部署 RSSHub：`rss.aiget.dev`
- 本方案建议把 RSSHub 当作一种“可编程 RSS 生成器”，统一把许多非 RSS 的网站/频道转换为标准 RSS，再走同一条 RSS ingest 逻辑
- `DigestSource.type='rss'` 即可：`feedUrl` 填 RSSHub 生成的地址（例如 `https://rss.aiget.dev/github/trending/daily/zh`）
- 安全建议（你已确认“允许填写任意 RSS feedUrl”）：必须做 SSRF 防护与风控（至少：仅允许 http/https、公网域名、禁止 localhost/内网段/云元数据；DNS 解析后再次校验最终 IP；限制响应体大小与超时；域名级并发/频率限制）。实现上可复用现有 `apps/aiget/server/src/common/validators/url.validator.ts`，并补强“DNS 解析校验”以避免绕过。

```typescript
type DigestSourceType = 'search' | 'rss' | 'siteCrawl';
type DigestSourceRefreshMode = 'ON_RUN' | 'SCHEDULED';

interface DigestSource {
  id: string;

  type: DigestSourceType;
  refreshMode: DigestSourceRefreshMode;

  config: Record<string, unknown>; // search: { query, engines, timeRange } / rss: { feedUrl } / crawl: { siteUrl, includePaths }
  configHash: string; // SHA256(normalized config)

  enabled: boolean;

  // 仅对 SCHEDULED 生效
  refreshCron?: string;
  timezone?: string;
  nextRefreshAt?: Date;
  lastRefreshAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // @@unique([type, configHash])
}
```

### 3.3 DigestSubscriptionSource（订阅与数据源关系）

```typescript
interface DigestSubscriptionSource {
  id: string;
  subscriptionId: string;
  sourceId: string;

  enabled: boolean;
  weight?: number; // 可用于多源融合时的偏好
  overrideMinScore?: number; // 可选：单源阈值覆盖

  createdAt: Date;
  updatedAt: Date;

  // @@unique([subscriptionId, sourceId])
}
```

### 3.4 ContentItem（全局内容条目）

```typescript
interface ContentItem {
  id: string;

  canonicalUrl: string;
  canonicalUrlHash: string; // SHA256(canonicalUrl) - 全局唯一键

  title: string;
  description?: string;

  // 抓取/提取结果（可缓存）
  // 你已确认“永久保留全文”：一旦抓到正文就不做清理（只可能做存储迁移/压缩）。
  // 为避免 Postgres 被大字段拖垮，建议把正文存对象存储（R2/S3），DB 只存引用。
  contentMarkdown?: string; // 主体内容（可选：小内容可直接存 DB）
  contentStorageKey?: string; // 对象存储 key（推荐）
  contentHash?: string; // SHA256(normalized markdown)
  summary?: string; // 内容级摘要（可复用，非 run 级）

  // 元数据
  author?: string;
  publishedAt?: Date;
  language?: string;
  siteName?: string;

  // 全局评分（与订阅无关）
  scoreImpact: number; // 0-100
  scoreQuality: number; // 0-100
  scoreUpdatedAt: Date;

  // 采集追踪
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastFetchedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // @@unique([canonicalUrlHash])
  // @@index([publishedAt])
  // @@index([scoreImpact, scoreQuality])
}
```

### 3.5 DigestRun（一次订阅执行）

```typescript
type DigestRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
type DigestRunSource = 'SCHEDULED' | 'MANUAL';

interface DigestRun {
  id: string;
  subscriptionId: string;
  userId: string;

  status: DigestRunStatus;
  source: DigestRunSource;

  scheduledAt: Date;
  startedAt?: Date;
  finishedAt?: Date;

  // 本次输出语言（用于跟随 UI；保证历史一致性）
  outputLocale: string; // 例如 'en' / 'zh-CN'

  // 本期“编辑稿”（用于 Web Inbox 展示，未来也可用于 Email）
  narrativeMarkdown?: string;

  // Phase 4（Email 可选推送）：为了保证历史一致性，建议保存渲染后的 subject
  emailSubject?: string;

  // 计费：按 run 结算一次，但价格按本次 Fetchx 实际调用成本汇总（缓存也收费）
  billing: {
    model: 'FETCHX_ACTUAL';
    totalCredits: number;
    breakdown: Partial<
      Record<
        | 'fetchx.search'
        | 'fetchx.scrape'
        | 'fetchx.batchScrape'
        | 'fetchx.crawl'
        | 'fetchx.map'
        | 'fetchx.extract',
        { count: number; costPerCall: number; subtotalCredits: number }
      >
    >;
  };
  quotaTransactionId?: string;

  result?: {
    itemsCandidate: number;
    itemsSelected: number;
    itemsDelivered: number;
    itemsDedupSkipped: number;
    itemsRedelivered: number;
    narrativeTokensUsed?: number;
  };

  error?: string;
}
```

### 3.6 DigestRunItem（本次简报包含的条目）

> 这是“可追溯”的核心：每期简报到底发了什么、为什么发、当时分数是多少。

```typescript
interface DigestRunItem {
  id: string;
  runId: string;
  subscriptionId: string;
  userId: string;

  contentId: string;
  canonicalUrlHash: string;

  // 分数快照（订阅私有）
  scoreRelevance: number; // 0-100
  scoreOverall: number; // 0-100
  scoringReason?: string; // 可选：解释性（命中词/来源/新鲜度）

  rank: number;

  // 展示快照（避免后续内容更新导致历史不一致；用于 Inbox/未来 Email）
  titleSnapshot: string;
  urlSnapshot: string;
  summarySnapshot?: string;

  deliveredAt?: Date; // 进入用户 Web Inbox 的时间（MVP 即“投递成功”）

  // @@index([runId, rank])
  // @@index([userId, deliveredAt])
}
```

### 3.7 UserContentState（用户维度去重与二次投递状态）

```typescript
interface UserContentState {
  id: string;
  userId: string;
  canonicalUrlHash: string;

  firstDeliveredAt?: Date;
  lastDeliveredAt?: Date;
  deliveredCount: number;

  // Web Inbox 行为（用于前端展示与后续学习）
  lastOpenedAt?: Date;
  readAt?: Date;
  savedAt?: Date;
  notInterestedAt?: Date;

  // 用于 ON_CONTENT_UPDATE（v2+）
  lastDeliveredContentHash?: string;
  lastDeliveredRunId?: string;

  // @@unique([userId, canonicalUrlHash])
  // @@index([userId, lastDeliveredAt])
}
```

### 3.8 DigestTopic（Public Topic Directory，用于 SEO）

> 用于 `aiget.dev/topics` 的“公开话题”。注意：这里的 Topic 是**发布用的公共对象**，不等同于用户私有的 `DigestSubscription`。
>
> - 用户订阅默认是 private
> - 当用户选择“发布话题”时，才会生成/更新 `DigestTopic`
> - SEO 页只展示摘要/链接，不展示全文

```typescript
type DigestTopicVisibility = 'PUBLIC' | 'PRIVATE';

interface DigestTopic {
  id: string;
  slug: string; // URL path，如 "ai-agents-daily"

  title: string;
  description?: string;
  visibility: DigestTopicVisibility;

  // 默认配置（订阅时可 clone 并允许用户改 cron/timezone）
  topic: string;
  interests: string[];
  minScore: number;
  maxItems: number;
  redeliveryPolicy: RedeliveryPolicy;
  redeliveryCooldownDays: number;

  // 话题的“公开发布节奏”（用于生成 editions 与 SEO）
  cron: string;
  timezone: string;

  // 语言：默认跟随 topic 创建者的 UI locale；SEO 页可做多语言版本（v2+）
  locale: string;

  // 统计（用于首页排序）
  subscriberCount: number;
  lastEditionAt?: Date;

  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.9 DigestTopicEdition（公开话题的一期内容）

```typescript
type DigestTopicEditionStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

interface DigestTopicEdition {
  id: string;
  topicId: string;

  status: DigestTopicEditionStatus;
  scheduledAt: Date;
  startedAt?: Date;
  finishedAt?: Date;

  // SEO 页展示用（可选）
  narrativeMarkdown?: string;
  outputLocale: string;

  createdAt: Date;
}
```

### 3.10 DigestTopicEditionItem（公开话题的一期条目）

```typescript
interface DigestTopicEditionItem {
  id: string;
  runId: string;
  topicId: string;

  contentId: string;
  canonicalUrlHash: string;

  rank: number;
  scoreOverall: number;

  // SEO/公开展示快照（避免后续内容更新影响历史一致性）
  titleSnapshot: string;
  urlSnapshot: string;
  summarySnapshot?: string;
}
```

---

## 4. 评分与写作（让产品“有脑子”但可控）

### 4.1 三维评分：全局两维 + 订阅一维

| 维度 | 归属 | 说明 | 默认权重 |
|------|------|------|----------|
| 相关性 Relevance | 订阅私有 | 与订阅兴趣/主题的匹配度 | 50% |
| 影响力 Impact | 全局 | 新鲜度、来源信誉、被引用/讨论等信号 | 30% |
| 质量 Quality | 全局 | 是否是完整文章/是否有实质内容/是否有代码或数据 | 20% |

参考来源（aigc-weekly）：

- 三维评分矩阵 + 阈值：`aigc-weekly-ref/agent/.claude/agents/editor.md`（Relevance/Impact/Utility 与 ≥70 入选规则）

说明：参考项目的权重更偏“周刊选题”（Relevance 40% / Impact 30% / Utility 30%）。本方案为了适配“C 端长期订阅 + 全局内容池”，把 Utility 改为更通用的 Quality，并把权重调整为 50/30/20（先跑通闭环，后续用行为数据再校准）。

推荐的综合分（0-100）计算方式：

```text
scoreOverall = 0.5 * relevance + 0.3 * impact + 0.2 * quality
```

> 权重不是最终真理：建议先固定，后续基于行为反馈再调。

### 4.2 MVP 评分策略（不依赖昂贵 LLM）

- Relevance：关键词命中 + 同义词扩展（可选）+ 标题/摘要/正文不同权重
- Impact：发布时间新鲜度 + 域名白名单/黑名单 + 来源渠道（HN/Reddit/官方博客）加权
- Quality：正文长度/结构（是否有标题层级/代码块/引用）+ 是否为“聚合页/导航页”惩罚

### 4.3 Writer（自由风格，但要有底线）

你确认“允许更自由的编辑风格”，我建议把底线写死在实现里：

- Writer 输出可以更像“编辑写稿”，允许观点、串联、对比。
- 但 **不能编造具体事实/数字/结论**：所有“事实性句子”应来自本期条目（否则必须写成推测/观点）。
- Web Inbox（以及未来可选的 Email）都需要给出 **Sources** 列表（本期所有链接），让用户可追溯。

参考来源（aigc-weekly）：

- Writer 的“周刊正文组织方式”：`aigc-weekly-ref/agent/.claude/agents/writer.md`
- Reviewer 的质量门槛（避免营销/保持链接）：`aigc-weekly-ref/agent/.claude/agents/reviewer.md`

### 4.4 LLM 在“数据处理”里的具体用法（本方案建议补齐）

> 你提到参考项目大量依赖大模型做“筛选/评分/写作”。本方案也会用 LLM，但要遵循两个约束：
>
> 1) **全局复用**：能缓存到 `ContentItem` 的尽量缓存（摘要/标签/提取结果），避免每个用户重复花钱  
> 2) **可降级**：LLM 失败时不阻塞主流程（仍能写入 Inbox）

建议把 LLM 的使用拆成两类：**内容级（全局）处理** 与 **订阅级（用户私有）处理**。

参考来源（aigc-weekly）：

- Claude Agent + Firecrawl 的整体形态：`aigc-weekly-ref/README.md`
- “research → edit → write → review” 的命令编排：`aigc-weekly-ref/agent/.claude/commands/weekly.md`

#### 4.4.1 内容级（全局）LLM 处理：写入 `ContentItem`

这些结果对所有用户都可复用，适合在入池或 run 时“按需补全”，并缓存：

- **内容摘要**：生成 `ContentItem.summary`（短摘要，1～3 行）
- **标签/分类**：生成 `ContentItem.language`、`tags`（若未来加字段）、以及“是否是教程/发布/观点”等轻量分类
- **结构化信息提取（可选）**：例如从文章中提取产品名、GitHub repo、版本号、发布日期等（用于 Impact/Quality 的启发式增强）

你选择了“Digest 输出语言跟随 UI 语言”，因此**内容级缓存也必须按语言维度切分**（否则中文用户会读到英文摘要，或反之）。建议把 enrichment 从 `ContentItem.summary` 演进为“按 locale 的全局缓存”，例如：

- 方案 A（推荐）：`ContentItemEnrichment { contentId, canonicalUrlHash, locale, summary, tags, ... }`（一篇内容可以有多条 enrichment）
- 方案 B（简单）：`ContentItem.summaryI18n` 用 JSON 存 `{ "en": "...", "zh-CN": "..." }`（查询方便，但 schema 演进不如独立表清晰）

缓存 key 建议包含：`canonicalUrlHash + locale + promptVersion`（避免后续 prompt 调整导致旧缓存“污染”）。

输出建议遵循稳定 schema（示例，非最终）：

```typescript
interface ContentEnrichment {
  locale?: string; // e.g. 'en' | 'zh-CN'
  summary: string;
  tags: string[];
  language?: string;
  contentType?: 'news' | 'release' | 'tutorial' | 'opinion' | 'paper';
  keyEntities?: string[];
}
```

#### 4.4.2 订阅级（用户私有）LLM 处理：写入 `DigestRun` / `DigestRunItem`

这些结果依赖用户订阅的 topic/interests，不能全局复用（或者只能部分复用），建议只在需要时使用：

- **相关性（Relevance）判定增强（可选）**：
  - MVP 可以先用关键词匹配
  - 进阶再用 LLM 进行“语义相关性”打分/解释（返回 `scoringReason`，用于 UI 解释性）
- **Writer 叙事**：
  - 生成 `DigestRun.narrativeMarkdown`
  - 输入是本期 top N 条目的标题/摘要/来源（必要时带正文片段），输出是“编辑稿”

输出建议遵循稳定 schema（示例）：

```typescript
interface SubscriptionScoring {
  relevance: number; // 0-100
  reason: string; // 面向用户解释
}

interface RunNarrative {
  narrativeMarkdown: string;
  highlights: string[]; // 可用于 UI 的要点列表
}
```

#### 4.4.3 LLM 与去重/二次投递的关系（建议）

- 主去重仍以 `canonicalUrlHash` 为准（确定性、可解释、便宜）
- LLM/Embedding 只用于“补充能力”（v2+）：
  - **语义重复检测**：不同 URL 但同一事件/同一产品的重复报道，作为 Quality 惩罚或“同一 run 内去重”参考
  - **内容显著更新**：用于 `ON_CONTENT_UPDATE`（需要 `contentHash` 或 diff 机制；LLM 只做辅助判断，不做主判据）

#### 4.4.4 模型与 SDK（与现有技术栈对齐）

- 后端建议统一通过 Vercel AI SDK（项目技术栈已列出），屏蔽供应商差异（OpenAI/Anthropic/Google 可切换）
- 需要做 **幂等与缓存**：
  - 内容级：用 `ContentItem.canonicalUrlHash` 做 key 缓存
  - run 级：用 `runId` 做 key，避免 `retry` 重复生成与重复扣费

---

## 5. 端到端流程

> 本节会把“数据抓取/评分/去重/写入 Inbox/用户管理状态/未来推送”按实际可实现的顺序展开。

### 5.0 调度与队列（MVP 时序）

MVP 推荐的运行方式是 **“拉模式”**（scan due → enqueue），而不是为每个订阅创建 BullMQ repeatable job：

1. Scheduler（每分钟）扫描 `DigestSubscription.enabled=true && nextRunAt<=now()`
2. 对每条订阅：
   - 先原子推进 `nextRunAt`（避免重复命中）
   - 创建 `DigestRun(PENDING)` 并入队
3. Worker 消费队列，执行 5.2 的完整流程

伪代码（示意）：

```text
cron every 60s:
  subs = find due subscriptions
  for sub in subs:
    if advanceNextRunAtAtomically(sub) == false: continue
    run = createDigestRun(sub, source=SCHEDULED)
    enqueue(run.id)
```

这样做的好处：

- 任意 cron + timezone 更容易（只要 `nextRunAt` 计算正确）
- 订阅更新/停用不会产生“残留 repeat job”
- 便于实现 run 级幂等、计费与重试

补充：**Source 刷新也建议用同一套“拉模式”**（尤其是 RSS/RSSHub/siteCrawl 这类 SCHEDULED source）。

1. SourceScheduler（每分钟）扫描 `DigestSource.refreshMode=SCHEDULED && enabled=true && nextRefreshAt<=now()`
2. 对每个 source：
   - 原子推进 `nextRefreshAt`
   - 入队 `DigestSourceIngestJob(sourceId)`
3. Worker 执行 ingest（见 5.1），更新 `lastRefreshAt`

这样可以把“内容入池”从“订阅运行”里彻底解耦：订阅 run 更像选题/编排，source refresh 更像抓取/归档。

### 5.1 内容入池（Ingest）

对每个 Source（SCHEDULED）或订阅 Run（ON_RUN）：

1. 拉取新链接（RSS / RSSHub / 搜索 / 站点爬取）
2. 标准化链接：`canonicalize(url)`
   - 跟随重定向
   - 去掉跟踪参数（utm/fbclid 等）
   - 优先使用页面 `rel=canonical`（若有且可信）
3. 计算主键：`canonicalUrlHash = sha256(canonicalUrl)`
4. 入池写入：`upsert ContentItem`（全局唯一）
   - `firstSeenAt/lastSeenAt` 更新
   - 如果同一条内容来自多个 Source，可在 `ContentItem` 上维护 `siteName/sourceHints`（v2+）
5. 全局评分（启发式，便宜且稳定）：
   - `scoreImpact`：新鲜度 + 来源信誉 +（可选）讨论热度信号
   - `scoreQuality`：正文长度/结构/是否聚合页等
6. 可选：抓全文（只对 top K 或重要来源，避免成本爆炸）
   - 抓取结果写入 `contentMarkdown/contentHash/lastFetchedAt`
7. 可选：LLM 内容级补全（全局缓存）：
   - `ContentItem.summary`（短摘要）
   - `tags/contentType/keyEntities`（若未来扩展字段）

参考来源（aigc-weekly）：

- 抓取 agent 的重试与筛选规范：`aigc-weekly-ref/agent/.claude/agents/crawler.md`
- 信息源列表样例：`aigc-weekly-ref/agent/.claude/REFERENCE.md`

#### 5.1.1 Search Source（ON_RUN，订阅触发时拉取）

适用场景：用户创建订阅时只填 `topic`，系统自动用 search 来“找近期链接”，避免用户配置复杂来源。

流程建议：

1. `SearchService.search({ bill:false })` 拉取候选（注意：Digest 已按 run 计费，这里必须免二次扣费）
2. 对每个结果：
   - `canonicalize(result.url)` → `canonicalUrlHash`
   - `upsert ContentItem`（标题/description/来源域名/publishedAt 若可得）
3. 只对 top K 抓全文（或仅对缺摘要/高分内容抓全文）
4. `ContentItem.summary` 缺失时再做内容级 LLM 摘要（全局缓存）

#### 5.1.2 RSS Source（SCHEDULED，全局定时入池）

适用场景：稳定、低成本、结构化；建议优先于爬虫。

关键点（建议写入实现约束，避免线上质量崩）：

- **增量拉取**：优先用 `ETag` / `If-Modified-Since`，减少带宽与解析成本
- **发布时间**：用 RSS item 的 `pubDate/updated`；缺失时用 `firstSeenAt`
- **唯一性**：优先取 `link`；仅 `guid` 时，需要判断是否可当作 URL（很多 feed 的 guid 不是 URL）
- **内容字段**：`description/content:encoded` 可作为 `ContentItem.description` 或摘要候选；正文仍以抓全文为准

#### 5.1.3 RSSHub（rss.aiget.dev）接入方式（SCHEDULED）

你已自部署 RSSHub：`rss.aiget.dev`。我建议把它当作“抓取入口的标准化层”，让更多来源变成 RSS，然后走 5.1.2 的稳定流程：

- 模型上仍是 `DigestSource.type='rss'`，`feedUrl=https://rss.aiget.dev/...`
- 同时，你已确认“允许填写任意 RSS feedUrl”。因此在实现上需要区分：
  - **推荐路径**：优先引导用户用 RSSHub（更稳定、你可控、可统一修复）
  - **开放路径**：允许用户填任意 RSS，但必须做更强的 SSRF/风控

开放任意 RSS 的安全策略（建议直接做）：

- 复用 `UrlValidator` 做基础校验（协议/域名黑名单/IP 段黑名单），并补强“DNS 解析后校验最终 IP”
- 限制单次响应体大小（例如 ≤ 5MB），限制超时（例如 10s）
- 域名级并发/频率限制（避免被当成 RSS 聚合爬虫）
- 对 public indexed 的话题：建议增加“来源域名审核/黑白名单”，否则会被 spam 话题拖垮 SEO（见 1.6）

#### 5.1.4 Site Crawl Source（SCHEDULED，全局定时入池）

适用场景：没有 RSS 的站点；成本更高、失败率更高，因此需要更严格的“可控范围”：

- **可控范围**：必须支持 `siteUrl + includePaths/excludePaths + maxDepth + limit`
- **礼貌与风控**：
  - 全局并发上限 + 域名级并发上限
  - 对 4xx/403 直接降级跳过，避免反爬对抗升级
  - 不抓登录态页面；严格 SSRF 防护
- **成本控制**：默认只抓列表页提取链接 + 少量详情页抓正文；不要全站 crawl

参考来源（aigc-weekly）：

- “列表页识别详情页链接、优先抓原始来源、重试退避”：`aigc-weekly-ref/agent/.claude/agents/crawler.md`

#### 5.1.5 canonicalize 与 contentHash（建议标准化，便于跨产品迁移）

为了保证 `canonicalUrlHash` 的稳定性（也为了未来 Aiget → Moryflow 迁移不出“同一篇文章 hash 不一样”这种灾难），建议把 canonicalize 规则固化为可复用函数，并尽量保持跨业务线一致：

- URL 规范化（建议）：
  - 小写 host；移除 fragment（`#...`）；移除默认端口；path 去重斜杠
  - query 参数排序；移除追踪参数（`utm_*`、`fbclid`、`gclid`、`spm`、`ref` 等）
  - 跟随 3xx 重定向（限制次数，例如 ≤5）
  - 若抓正文：优先采信页面 `rel=canonical` / `og:url`（但要校验同域或可信规则，避免被“投毒”跳到无关站点）
- `contentHash`（用于内容更新判定，v2+）：
  - 对 `contentMarkdown` 做 normalize（去掉多余空白/脚注导航/动态推荐等噪声）再 sha256
  - 不要对“全 HTML”直接 hash（太不稳定）

### 5.2 订阅运行（DigestRun）

对每个到期订阅：

1. **计费**：本次 run 的费用 = 本次 Fetchx 实际调用成本汇总（缓存也收费），并且只结算一次（见 7.1/16.1）
2. 组装候选集（Candidates）：
   - 若订阅为 **Topic Follow**（来自 `DigestTopic`）：直接取该 Topic 的最新一期（或指定范围内）的 `DigestTopicRunItems` 作为候选（保证与 SEO 页一致）
   - 若订阅绑定了 `search`（ON_RUN）：执行一次 search 并把新内容入池（注意：Digest 内部调用必须免二次扣费）
   - 若订阅绑定了 `rss/siteCrawl`（SCHEDULED）：直接从内容池取最近窗口内内容
   - 窗口：`publishedAt`（缺失则用 `firstSeenAt`）在 `contentWindowHours` 内
   - 候选集按 `canonicalUrlHash` 去重（多源命中同一内容只算一次）
3. 计算订阅私有相关性（Relevance）：
   - MVP：关键词匹配（title/description/summary/content 不同权重）
   - v2：可选 LLM 语义相关性 + 解释（写 `scoringReason`）
   - 若为 Topic Follow：可直接复用 `DigestTopicRunItem.scoreOverall/summarySnapshot`，并仅生成“解释性 reason”（或直接沿用 topic 的 reason）
4. 合成总分并排序：
   - `scoreOverall = 0.5 * relevance + 0.3 * impact + 0.2 * quality`
   - 过滤：`scoreOverall >= minScore`
   - 排序：按 `scoreOverall desc`
5. 去重 + 二次投递策略（见 5.3）：
   - 基于 `UserContentState` 决定是否允许进入本次 Inbox
6. 选出 top N（maxItems）并生成 run 快照：
   - 写 `DigestRunItem`（title/url/summary 的 snapshot + 分数快照 + deliveredAt）
7. 可选：为缺失摘要的内容生成 `ContentItem.summary`（内容级缓存）
8. 可选：Writer 生成本期叙事摘要（run 级），写入 `DigestRun.narrativeMarkdown`
9. 更新 `UserContentState`：
   - `firstDeliveredAt/lastDeliveredAt/deliveredCount`
   - 保留用户行为字段（read/saved/notInterested）
10. 更新 `DigestRun` 为 SUCCEEDED/FAILED

参考来源（aigc-weekly）：

- “筛选→去重→三维评分→入选阈值”的编辑工作流：`aigc-weekly-ref/agent/.claude/agents/editor.md`

### 5.3 去重与二次投递策略（canonicalUrlHash）

- **主键**：`canonicalUrlHash`
- **用户维度全局去重范围**：同一用户跨所有订阅共享 `UserContentState`

默认策略（建议）：

- `redeliveryPolicy=COOLDOWN`
- `redeliveryCooldownDays=7`
- 行为：
  - 若用户从未投递过该 `canonicalUrlHash` → 允许投递
  - 若已投递过且 `now - lastDeliveredAt < cooldownDays` → 跳过
  - 若超过 cooldownDays → 允许再次投递，并计入 `itemsRedelivered`
  - 若用户已标记 `notInterestedAt` → 始终跳过（除非用户撤销该标记）

参考来源（aigc-weekly）：

- 去重的判断维度（标题/URL/主题）与“无需逐字对比全文”的原则：`aigc-weekly-ref/agent/.claude/agents/editor.md`

v2+ 策略（可选）：

- `redeliveryPolicy=ON_CONTENT_UPDATE`
- 前提：ContentItem 有 `contentHash` 且我们能检测到“显著更新”（可用 diff ratio 或长度变化阈值）
- 行为：
  - 若 `contentHash` 与 `UserContentState.lastDeliveredContentHash` 不同且变化幅度超过阈值 → 允许提前再投递（但仍建议加最短间隔，如 7 天）

### 5.4 幂等、并发与重试（必须在方案里讲清楚）

- **同一订阅不重复跑**：Scheduler 扫描 due 时，必须原子推进 `nextRunAt` 或使用 DB 乐观锁，避免重复入队。
- **同一用户并发 run 不重复投递**：写 `UserContentState` 时用 `@@unique([userId, canonicalUrlHash])` 兜底，并采用“先占位再写入 Inbox”的模式：
  - 在事务里尝试 `upsert UserContentState` 并判断是否满足 redelivery
  - 只有成功占位的内容才进入本次发送列表
- **失败重试**：
  - Search/RSS/Crawl 失败：run 可以降级（返回更少条目），但仍算一次 run（是否退费取决于产品策略）
  - 写入 Web Inbox 失败（未能持久化 `DigestRunItem`）：run 标记 FAILED，可重试同一个 run（推荐：`retry` 走同一 `runId`，避免重复扣费）
  - 可选推送（Email/Webhook）失败：不影响 Inbox 可见性；可以在后续提供“重试推送”的独立接口

### 5.5 Web Inbox 状态管理（已读/收藏/不感兴趣）

这些用户行为不仅用于 UI，还应该反向影响后续选题：

- **readAt**：用于未读计数与排序（例如优先展示未读）
- **savedAt**：作为“高意图信号”，用于：
  - 提供 “Saved” 视图
  - 引流到 Moryflow（`Save to Moryflow` 的默认触发点）
  - 未来做偏好学习（提高相似内容的 relevance）
- **notInterestedAt**：作为“强负反馈”，用于：
  - 直接过滤未来候选（见 5.3）
  - 可选：自动把关键词加入订阅的 negative keywords（v2+）

---

## 6. API 设计（与现有路径约定对齐）

### 6.1 Console（SessionGuard）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/console/digests` | 创建订阅 |
| GET | `/api/v1/console/digests` | 列表 |
| GET | `/api/v1/console/digests/:id` | 详情 |
| PATCH | `/api/v1/console/digests/:id` | 更新/启停 |
| DELETE | `/api/v1/console/digests/:id` | 软删除 |
| POST | `/api/v1/console/digests/:id/run` | 手动触发一次 |
| GET | `/api/v1/console/digests/:id/preview` | 预览下期选题（不写入 Inbox） |
| GET | `/api/v1/console/digests/:id/runs` | 执行历史 |
| GET | `/api/v1/console/digests/runs/:runId` | 单次 run 详情（含 items） |
| POST | `/api/v1/console/digests/runs/:runId/retry` | 重试失败的 run（不重复扣费） |
| GET | `/api/v1/console/digests/inbox/items` | Web Inbox：按用户汇总已投递条目（分页/搜索） |
| PATCH | `/api/v1/console/digests/inbox/items/:itemId` | Web Inbox：更新条目状态（已读/收藏/不感兴趣等） |
| GET | `/api/v1/console/digests/inbox/stats` | Web Inbox：未读/收藏计数（用于侧边栏 Badge） |

### 6.2 Public API（ApiKeyGuard，至少提供）

> 你提到“开放任意 cron，这样既可以提供 API 能力，又可以发布单独的产品”。我建议把 Digest 能力同时作为：
>
> 1) Console 产品功能（SessionGuard）  
> 2) Aiget Dev Public API（ApiKeyGuard，给开发者/集成方）
>
> 两者共享同一套底层数据模型与服务层，只是鉴权方式不同（`CurrentUser` 来自 session 或 apiKey）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/digests` | 创建订阅 |
| GET | `/api/v1/digests` | 列表 |
| GET | `/api/v1/digests/:id` | 详情 |
| PATCH | `/api/v1/digests/:id` | 更新/启停 |
| DELETE | `/api/v1/digests/:id` | 软删除 |
| POST | `/api/v1/digests/:id/run` | 手动触发一次（计费：按本次 Fetchx 实际成本汇总；缓存也收费） |
| GET | `/api/v1/digests/:id/preview` | 预览下期选题（建议不计费，但需限流） |
| GET | `/api/v1/digests/:id/runs` | 执行历史 |
| GET | `/api/v1/digests/runs/:runId` | run 详情（含 items） |
| GET | `/api/v1/digests/inbox/items` | Web Inbox 条目列表（分页/筛选） |
| PATCH | `/api/v1/digests/inbox/items/:itemId` | 更新条目状态（已读/收藏/不感兴趣） |

计费建议：

- `POST /digests/:id/run`：计费（一次 run 一次扣费）
- `GET /digests/:id/preview`：不计费（否则用户无法调参），但要做频控（例如每小时 ≤ N 次）

语言建议（Public API 场景）：

- `POST /api/v1/digests` 创建订阅时允许传 `languageMode/outputLocale`
- 若未传：默认 `outputLocale='en'`（因为 Public API 未必有 UI 语言可跟随）

### 6.3 Admin（RequireAdmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/digests/subscriptions` | 全量订阅列表 |
| GET | `/api/v1/admin/digests/runs` | run 列表（筛选失败/耗时） |
| GET | `/api/v1/admin/digests/stats` | 使用统计（run 次数/成功率/成本估算） |
| PATCH | `/api/v1/admin/digests/subscriptions/:id/status` | 强制启用/禁用 |

### 6.4 Web Inbox（MVP：可展示 + 可管理）

推荐把 Web Inbox 视为“用户的投递记录流”，数据来源以 `DigestRunItem` 为主（因为它有展示快照与分数快照，不会被后续内容更新影响历史）。

- `GET /api/v1/console/digests/inbox/items`
  - 典型 query：`cursor`/`limit`（分页）、`q`（搜索：title/source）、`subscriptionId`（筛选）、`from`/`to`（时间范围）、`saved=true`、`unread=true`、`notInterested=false`
  - 返回建议包含：`runId`、`subscriptionId`、`deliveredAt`、`titleSnapshot`、`summarySnapshot`、`urlSnapshot`、`scoreOverall`、`scoringReason`、`readAt`、`savedAt`、`notInterestedAt`
- `PATCH /api/v1/console/digests/inbox/items/:itemId`
  - 支持操作：`markRead`、`markUnread`、`save`、`unsave`、`notInterested`、`undoNotInterested`
  - 数据落点：优先写入 `UserContentState`（按 `userId + canonicalUrlHash` 聚合），以便跨多次投递复用状态

### 6.5 Console UI（MVP 必须有展示）

- Inbox 列表：支持 `unread/saved/notInterested` 快捷筛选，默认按 `deliveredAt` 倒序
- 本期简报（run）详情：展示 `DigestRun.narrativeMarkdown` + 条目列表（Sources），并支持对条目操作：已读/收藏/不感兴趣
- 订阅管理：创建/编辑订阅（cron + timezone + 条数/阈值）；手动 run；查看 run 历史

### 6.6 Public Topics（SEO Pages，无鉴权）

> 用于 `aiget.dev` 的可索引页面（见 1.6 / Phase 2.5）。这些接口应当：
>
> - 默认只返回 `PUBLIC` 的话题（避免泄露私密话题）
> - 返回内容以“摘要/要点 + 链接”为主（不要返回全文）
> - 支持 CDN 缓存（`Cache-Control`）与速率限制

建议接口（示例）：

- `GET /api/v1/public/digest-topics`
  - query：`q`（搜索）、`sort=trending|latest|most_followed|quality`、`cursor/limit`、`locale`
  - 返回：`slug/title/description/locale/lastEditionAt/subscriberCount` 等
- `GET /api/v1/public/digest-topics/:slug`
  - 返回：话题配置（去敏后的公开部分）+ 最近 N 期 editions 列表
- `GET /api/v1/public/digest-topics/:slug/editions/:id`
  - 返回：该期 narrative + items（title/summarySnapshot/urlSnapshot/source）
- 可选：`GET /api/v1/public/digest-topics/:slug/rss.xml`
  - 作为“public topic 的 RSS 输出”，同时也会增强增长（RSS 传播）

#### 6.6.1 首页与列表页的排序/聚合规则（按最佳实践直接拍板）

> 你要求“SEO 首页展示所有话题 + 每期内容，并且可带来自然流量”。我建议把首页拆成两个核心区块：**Trending Topics** + **Latest Editions**，并提供可筛选/可分页的 Topics 列表页。

**页面结构建议（aiget.dev）**

- 首页 `aiget.dev`：
  - Hero：一句话价值主张 + 搜索框（搜索 topics + keywords）
  - Trending Topics（默认排序）
  - Latest Editions（最近发布的公开期刊/简报）
  - “Subscribe” CTA（跳转 console 登录/创建订阅）
- 话题目录 `aiget.dev/topics`：
  - 默认排序：Trending
  - 支持排序切换：Trending / Latest / Most followed / Quality
  - 支持筛选：locale、tag（v2+）、timeRange（7d/30d）
- 话题详情 `aiget.dev/topics/:slug`：
  - 该话题简介 + 订阅按钮
  - editions 列表（按 `scheduledAt desc`）
  - 可选：展示“本话题常见来源域名/关键词”（便于用户判断质量）

**排序定义（尽量抗 spam、同时符合增长目标）**

1. `sort=latest`（最新）：
   - 主键：`lastEditionAt desc`（有新一期的优先）
   - 次级：`subscriberCount desc`

2. `sort=most_followed`（订阅最多）：
   - 主键：`subscriberCount desc`
   - 次级：`lastEditionAt desc`

3. `sort=quality`（质量优先，建议上线时作为可选 tab）：
   - 主键：`avgEditionQualityScore30d desc`
   - 次级：`subscriberCount desc`
   - 质量分建议来自：edition 内条目的 `scoreQuality/scoreImpact` 聚合 + 低质域名惩罚

4. `sort=trending`（默认，最适合首页与 SEO）：
   - 核心目标：把“近期增长快 + 持续更新 + 用户认可”的话题推上来，同时压制 spam
   - 推荐公式（示意，0-100）：
     - `growthScore`：`log1p(subscriberCount7dGained)`（7 天净增长取 log）
     - `freshnessScore`：对 `lastEditionAt` 做 time-decay（例如 7 天内高，30 天外趋近 0）
     - `engagementScore`：订阅用户的行为信号（例如 save rate、notInterested rate 的反向）做平滑
     - `penalty`：被举报次数、低质来源比例、重复内容比例
     - `trendingScore = 0.4*growthScore + 0.3*freshnessScore + 0.3*engagementScore - penalty`

说明：

- 默认公开意味着更容易被 spam 利用，因此 Trending 必须引入 `penalty` 与“更新频率/来源质量”的约束，否则首页会被垃圾话题占领。
- Engagement 信号的来源：来自“订阅该 topic 的用户”的 Inbox 行为（read/saved/notInterested）。对外只展示聚合统计，不暴露个人数据。

#### 6.6.2 SEO 落地清单（避免做出来但不收录）

- `sitemap.xml`：包含 topics 列表、topic 详情、edition 页（只包含 PUBLIC）
- `robots.txt`：允许抓取 public pages；阻止 console/admin
- `canonical`：每个 edition 页设置 canonical URL，避免 query 参数导致重复收录
- 分页：topics 列表与 editions 列表必须分页，并使用稳定 URL（例如 `?cursor=` 或 `/page/:n`）
- 结构化数据（JSON-LD）：
  - topics 页用 `CollectionPage`
  - edition 页用 `Article`（headline/datePublished/author=“Aiget Digest”/mainEntityOfPage/url）

订阅转化接口建议走 Console（需要登录），例如：

- `POST /api/v1/console/digest-topics/:slug/subscribe`
  - 行为：创建一个 `DigestSubscription`（克隆 topic 默认配置，允许用户改 cron/timezone）

---

## 7. 计费与成本控制（按 run 结算一次：按 Fetchx 实际成本汇总）

### 7.1 计费模型（已确认）

- 计费单位：**按 run 结算一次**（但 run 的价格由“本次 run 内实际发生的 Fetchx 调用成本”动态决定）
- 计费范围（你已确认的口径）：**只算抓取相关费用**（Fetchx），LLM 成本先不对用户单独计费
- 计费原则（你已确认）：**命中缓存也收费**（Digest 内部调用不跳过扣费）
- 推荐退费策略（默认）：若本次 run **未成功写入 Web Inbox**（未能持久化 `DigestRunItem`）则自动退费；若成功写入但发生“摘要失败/抓取失败/条目偏少”等降级则不退费；`retry` 复用同一 `runId` 不重复扣费

建议落地方式（兼容现有配额系统、同时保证用户体验）：

1. run 开始时先做一次“预算检查”（基于 maxItems=30 的上界估算最大抓取成本），不足则提前失败（避免跑一半才报额度不足）
2. run 结束后按实际发生的 Fetchx 调用数量与单价汇总 cost（见 16.1），并只扣一次（单 transaction）
3. `retry` 复用同一 `runId` 时：
   - 若上次已扣费：重试不再扣费（但要避免重复抓取/重复写入 Inbox）
   - 若上次未扣费：按重试实际成本扣一次

### 7.2 成本控制（默认公开 + 任意 cron + 永久保留全文时，必须风控）

即使不对用户按条计费，也必须在系统层限制成本：

- `maxItems` 强制上限（建议 hard cap：30）
- 抓全文策略：只对 top K 抓（例如 K=5），其余用标题+description
- 内容级缓存：`ContentItem.summary/contentMarkdown` 生成一次后全局复用
- **全文永久保留（你已确认）带来的存储成本**：建议把正文存到对象存储（R2/S3），DB 只存指针与 hash；并做压缩（gzip）与去重（`contentHash` 相同则复用）
- 频率限制：同一用户每小时最多触发 N 次手动 run（防滥用）
- 订阅上限 + 最小 cron 间隔：建议按 tier 限制（见 16.1），否则“任意 cron”会被滥用成压测器

### 7.3 与现有 Search/Scraper 计费的关系（避免重复扣费）

当前 `SearchService.search()` 与 `ScraperService.scrape()` 已有独立扣费逻辑。为了保证“按 run 结算一次（按 Fetchx 成本汇总）”：

- Digest 内部调用必须走“只计量不扣费”的内部路径（否则会变成每次 search/scrape 都扣费 + run 再扣一次，双重计费）：
  - Search：新增 `searchInternal()` 或 `search({ bill: false, meter: true })` 模式（只返回结果与计量信息）
  - Scrape：固定 `bill:false`，并且即使 `fromCache=true` 也要把它计入 metering（你已确认“缓存也收费”）
- 更新：按你新的计费口径，Digest 不使用固定单价，而是 run 完成后按 Fetchx 成本汇总扣一次（仍是“按 run 结算一次”）

---

## 8. 实施阶段（建议按产品闭环推进）

### Phase 1：MVP（跑通 C 端闭环，1-2 周）

- [ ] Prisma 模型：ContentItem（global）+ DigestSource + DigestSubscriptionSource + DigestSubscription + DigestRun + DigestRunItem + UserContentState
- [ ] 订阅 CRUD + 手动 run + run 历史查询
- [ ] Web Inbox API：条目列表（分页/筛选）+ 状态管理（已读/收藏/不感兴趣）
- [ ] Console UI：Inbox 列表 + 条目详情 + 订阅管理（可用即可，不追求复杂交互）
- [ ] 搜索型 source（ON_RUN）：每次 run 搜索并入池
- [ ] canonicalize + canonicalUrlHash 去重
- [ ] 二次投递策略：COOLDOWN（7 天）
- [ ] Scheduler：扫描 due → 创建 run → 入队执行
- [ ] run 级计费：按 Fetchx 成本“按 run 汇总扣一次”（命中缓存也收费）

### Phase 2：AI（让“知识策展”真的成立，1 周）

- [ ] 内容级摘要缓存（LLM → ContentItem.summary，全局复用）
- [ ] Writer 叙事摘要（LLM → DigestRun.narrativeMarkdown）
- [ ] Explainability：每条 item 带简短 reason（先启发式；可选 LLM 生成更自然的解释）
- [ ] 预览接口（不写入 Inbox）

### Phase 2.5：Public Topics + SEO（增长闭环，1-2 周）

> 目标：让 `aiget.dev` 有可索引的“话题/每期内容页”，并且一键把用户导向 `console.aiget.dev` 创建订阅。

- [ ] 数据模型：`DigestTopic`（slug/可见性/默认配置/统计）+ `DigestTopicEdition` + `DigestTopicEditionItem`
- [ ] Public API：`GET /api/v1/public/digest-topics`、`GET /api/v1/public/digest-topics/:slug`、`GET /api/v1/public/digest-topics/:slug/editions/:id`
- [ ] Console：话题发布/下架（PUBLIC/PRIVATE；仅付费可 PRIVATE），以及“从话题订阅”（follow topic 或 fork config）
- [ ] `apps/aiget/www`：话题目录页 + 话题详情页 + 每期内容页（SSR/SSG + OG/meta + sitemap）
- [ ] 基础治理：spam/侵权举报入口 + 管理员下架开关（避免 SEO 被污染）

### Phase 3：多源（提升内容质量与可控性，1-2 周）

- [ ] RSS source（SCHEDULED）：全局拉取入池（包含 `rss.aiget.dev` RSSHub 生成的 feed + 用户自定义任意 RSS feedUrl）
- [ ] Site crawl source（SCHEDULED）：可控范围抓取入池
- [ ] Scheduled refresh：扫描 due 的 `DigestSource` → 入队刷新（BullMQ），并更新 `nextRefreshAt/lastRefreshAt`
- [ ] 更完善的 Impact/Quality 信号（域名信誉、重复转载惩罚）

### Phase 4：多渠道 + 反馈学习（长期）

- [ ] Webhook 投递（出站 SSRF 防护 + 签名）
- [ ] Email 推送（可选开关）：统一模板 + unsubscribe + 失败重试（不影响 Inbox）
- [ ] 投递追踪：Email open/click（可选），Webhook delivery 状态
- [ ] 个性化：基于反馈自动调整 interests / minScore / sources

---

## 9. 复用现有基础设施（需要补一个“免二次扣费”模式）

| 组件 | 状态 | 复用方式 |
|------|------|----------|
| EmailService | ✅ 就绪（Phase 4） | 发送 digest 邮件（可选推送） |
| BullMQ | ✅ 就绪 | `digest` 队列 + worker |
| @nestjs/schedule | ✅ 就绪 | due 扫描调度 |
| SearchService | ✅ 就绪 | 需要增加内部免扣费调用 |
| ScraperService | ✅ 就绪 | Digest 固定 `bill:false` |
| BillingService | ✅ 就绪（需扩展） | 需要支持“按任意 amount 扣费一次”，并允许 Digest 明确指定“缓存也收费” |

---

## 10. 文件结构（建议）

```
apps/aiget/server/src/digest/
  digest.module.ts
  digest.controller.ts
  digest.service.ts
  digest.scheduler.ts
  digest.processor.ts
  dto/
    digest.schema.ts
  scoring/
    digest-scorer.service.ts
  sources/
    digest-source.interface.ts
    search-source.service.ts
    rss-source.service.ts
    site-crawl-source.service.ts
  delivery/
    email-delivery.service.ts
    webhook-delivery.service.ts
```

---

## 11. 关键决策（已确认 + 建议新增）

| 决策 | 选择 | 理由 |
|------|------|------|
| 内容池范围 | 全局共享（跨用户） | 复用抓取/摘要，降低成本 |
| 去重主键 | canonicalUrlHash | 统一口径、可解释 |
| 二次投递 | 允许（COOLDOWN=7 天） | 避免错过“持续演进的内容”，同时控制噪音 |
| 调度表达式 | 任意 cron + timezone（建议兼容 5 段 + 可选 6 段(秒)） | 既能做 API 能力，也方便独立产品形态 |
| 输出语言 | 跟随 UI 语言 | 让用户在 Inbox/SEO 页的阅读体验一致（3.0） |
| 计费 | 按 run 结算一次（按 Fetchx 实际成本汇总；缓存也收费） | 价格可解释（“抓了多少就扣多少”），但需要更强风控与预算检查 |
| Writer | 自由风格 | 差异化、可读性更强 |
| 默认条数 | 10（Brief/Standard/Deep） | “少而精”，降低过载 |
| 默认入口 | Web Inbox（网页） | 先做“可见可控”，再做推送渠道 |
| 内容保留 | 永久保留（含全文） | 便于后续 AI 再加工与迁移到 Moryflow（你已确认） |
| RSS 源开放 | 允许任意 feedUrl | 覆盖更多来源；必须加强 SSRF/风控（3.2/5.1.3） |
| 邮件模板 | Phase 4：统一模板（可选） | 开启 Email 时优先保证送达率与退订链路 |
| Web Inbox | MVP：API + 前端展示 + 管理 | 已读/收藏/不感兴趣可用于后续学习与个性化 |
| Public Topics（SEO） | `PUBLIC/PRIVATE`（默认 PUBLIC，付费可 PRIVATE） | 增长优先；需产品级风险提示与治理（见 1.6/6.6） |

---

## 12. 默认订阅模板（建议，可调整）

- `AI Daily (Brief)`：`0 9 * * *`，`maxItems=10`，topic 示例：`AI agents, LLM, OpenAI, Anthropic, Google DeepMind`
- `Product & Startups (Weekly)`：`0 9 * * 1`，`maxItems=10`，topic 示例：`startup, product strategy, YC, fundraising`
- `Engineering Deep Dives (Weekly)`：`0 9 * * 2`，`maxItems=10`，topic 示例：`distributed systems, databases, system design`
- `Frontend (Weekly)`：`0 9 * * 3`，`maxItems=10`，topic 示例：`React, TypeScript, web performance, Next.js`
- `Security (Daily)`：`0 9 * * *`，`maxItems=10`，topic 示例：`CVE, security advisory, vulnerability`

---

## 13. 验收标准（Definition of Done）

1. ✅ 用户可创建订阅（cron + timezone），按期生成简报并在 Web Inbox 可查看（Email 推送为后置可选项）
2. ✅ Web Inbox 可管理：支持已读/收藏/不感兴趣，并可筛选（unread/saved/notInterested）
3. ✅ canonicalUrlHash 去重：同一用户跨订阅不重复（在冷却期内）
4. ✅ 二次投递策略生效：超过冷却期后允许再次投递，并在 run 统计中可见；notInterested 内容不再出现
5. ✅ run 历史可查：每次 run 的 items、分数、reason 可追溯
6. ✅ 幂等与重试：并发/重试不产生重复写入 Inbox；未来开启推送时也不产生重复推送
7. ✅ 计费正确：每次 run 仅结算一次（按 Fetchx 成本汇总；缓存也收费），失败按策略退费

---

## 14. 与 Moryflow 的迁移与引流（产品与数据层设计）

> 你希望该功能作为 Aiget 的独立产品能力，同时未来接入主产品 **Moryflow**（你提到的 “Mulflow” 我理解为 Moryflow，如命名不同请纠正）。
>
> 由于两条业务线 **不共享账号/Token/数据库**，这里的迁移/引流必须遵循“用户显式授权 + 可审计 + 可回滚”的原则。

长期结构建议（避免未来返工）：

- 把 Digest 的“引擎逻辑”（canonicalize、评分、选题、Writer 组稿、幂等/去重策略）尽量沉淀到共享包（例如 `packages/` 下的新包），让 Aiget 与 Moryflow 复用实现
- 但**数据仍各自落库**（符合两条业务线隔离约束），两边仅通过“导出/导入/连接”做用户级迁移与同步

### 14.1 数据迁移目标（迁什么）

从 Aiget → Moryflow 的迁移，建议聚焦“用户真正需要延续的资产”：

1. **订阅配置**：topic/interests/cron/timezone/maxItems/minScore/redeliveryPolicy 等
2. **Inbox 状态**：已读/收藏/不感兴趣（`UserContentState`）
3. **内容清单快照**：历史 `DigestRun` 与 `DigestRunItem`（尤其是 `summarySnapshot/scoringReason/narrativeMarkdown`）

不建议迁移：

- 全局内容池 `ContentItem` 的所有数据（体积大、且在 Moryflow 内可按需重新拉取/复用）

### 14.2 迁移方式（推荐 2 条，按产品阶段选择）

**方式 A：导出文件（最稳，MVP 可做）**

- Aiget 生成导出包（JSON/NDJSON + version），用户下载
- Moryflow 提供 Import 页面上传导入
- 优点：完全不需要跨服务调用；符合同业务线隔离约束
- 缺点：流程略重，转化率可能偏低

**方式 B：一次性迁移码（更顺滑，推荐用于引流）**

- Aiget 生成 `transferCode`（短期有效，例如 15 分钟），用户点击 “Continue in Moryflow”
- 打开 Moryflow 的 Import 页面（带 code），用户在 Moryflow 登录后确认
- Moryflow 后端用 `transferCode` 拉取导出包并导入（仅一次，过期作废）
- 优点：更顺滑；适合“引流”
- 关键：`transferCode` 必须是一次性的、短期有效、可撤销，并且导出的数据集可控（默认只导出“收藏/未读/本期简报”）

#### 14.2.1 默认导出范围（建议）

为了保证“引流顺滑 + 不引入法律/版权风险 + 数据量可控”，建议默认导出：

- `subscriptions`：只导出 enabled 的订阅（或提供开关）
- `runs/runItems`：只导出最近 N 次（例如 N=20），或最近 90 天
- `userContentStates`：只导出 `savedAt` / `notInterestedAt`（可选包含 `readAt`，但 readAt 体量会很大）

并在 UI 提供“高级导出”开关让用户选择全量/范围。

#### 14.2.2 transferCode 的实现要点（建议提前写入方案）

为了符合“显式授权 + 可审计 + 可回滚”，建议 `transferCode` 对应一条可追踪记录（概念）：

- `DigestTransfer { id, userId, scope, status, expiresAt, usedAt, revokedAt, exportedAt, checksum }`
- scope 示例：`SAVED_ONLY` / `SAVED_AND_LATEST_RUNS` / `FULL`
- `checksum`：导出包的 sha256（便于审计与一致性校验）

流程（建议）：

1. Aiget Console：用户点击 `Continue in Moryflow` → 选择导出范围 → 生成 transferCode
2. Aiget Server：把导出包写入对象存储（或临时表），返回 `transferCode`
3. 跳转 Moryflow：`/import/aiget-digest?code=...`
4. Moryflow Server：用户登录后确认导入 → 用 code 拉取导出包 → 导入 → 标记 code used（一次性）

注意：**Moryflow 导入必须是幂等的**（重复提交 code 不应重复导入）。

### 14.3 数据同步（迁移后如何“持续同步”）

我建议默认是 **单向同步（Aiget → Moryflow）**，并且必须是用户主动开启：

- 用户在 Aiget 内点击 “Connect Moryflow”
- Moryflow 生成一个 **个人集成 Token**（例如 PAT），用户复制到 Aiget（或走 OAuth）
- Aiget 之后可以把每期 run（或用户收藏的条目）同步为 Moryflow 的一条 Note / Database Item

同步策略建议：

- 默认只同步 **saved** 的内容（收藏即“我需要沉淀到主产品”）
- 可选同步：每期生成一条 “Weekly Digest Note”，内容由 `DigestRun.narrativeMarkdown + Sources` 构成

实现建议（避免重复同步）：

- 在 Aiget 侧维护一张映射表（概念）：
  - `MoryflowExport { userId, canonicalUrlHash, exportedAt, moryflowPageId }`
- 当用户点击 `Save to Moryflow`：
  - 若已存在映射 → 直接打开对应页面（或提示已同步）
  - 若不存在 → 调用 Moryflow API 创建页面，并落库映射（幂等 key 可用 `userId + canonicalUrlHash`）

#### 14.3.1 为什么“默认只同步 saved”是最优引流点

- saved 是强意图信号：用户已经认可内容值得沉淀，转化更自然
- saved 的数据量可控：避免“全量同步”导致 Moryflow 初次导入太重、体验变差
- 也更符合主产品定位：Moryflow 是知识工作流，核心是沉淀与再加工

### 14.4 引流路径设计（保证顺滑）

核心目标：用户在 Aiget 里看到价值 → 产生“沉淀/管理”的需求 → 一键进入 Moryflow 并带着数据过去。

建议的关键触点：

1. Inbox Item 的 CTA：`Save to Moryflow`（对收藏行为做自然延伸）
2. Run 详情页 CTA：`Turn this digest into a Moryflow page`（把 narrative + items 变成可编辑页面）
3. Inbox 空状态：提示 “Connect Moryflow to build your knowledge base”

#### 14.4.1 引流的“顺滑三步”（建议做成产品默认路径）

1. **Aha moment**：用户第一次看到“结论优先”的 digest（narrative + explainability）
2. **管理需求出现**：用户开始收藏/不感兴趣/筛选（Web Inbox 管理成为刚需）
3. **一键沉淀**：在收藏或 run 详情页提示 `Save to Moryflow / Turn into page`，并在第一次触发时引导完成 transferCode 导入或 Connect

### 14.5 数据映射（Aiget → Moryflow）

建议把 Aiget 的数据映射成 Moryflow 里更“可编辑/可复用”的结构：

- `DigestSubscription` → Moryflow 中的一个 “Source/Automation”（或 Workflow 配置）
- `DigestRun` → Moryflow 的一篇页面（标题可用英文：`Digest: {{subscriptionName}} ({{date}})`）
- `DigestRunItem` → 页面中的条目列表（包含 summary + link + scoringReason）
- `UserContentState.savedAt` → Moryflow 中的“收藏夹/知识库数据库”的一条记录（用于长期沉淀）
- `notInterestedAt` → Moryflow 的“忽略词/忽略主题”配置（可选）

补充：为了让“迁移后去重仍然稳定”，建议 Aiget 与 Moryflow 共享同一套 `canonicalize()` 规则（见 5.1.5），并把该实现沉淀到共享包（或至少共享测试用例）。

### 14.6 导出/导入数据格式（建议有版本号）

建议定义一个明确版本的导出 schema（示例）：

```json
{
  "version": "aiget-digest-export@1",
  "exportedAt": "2026-01-12T00:00:00Z",
  "subscriptions": [],
  "runs": [],
  "runItems": [],
  "userContentStates": []
}
```

这样后续你即使调整 Aiget 内部表结构，也能保持迁移链路稳定。

## 15. 已确认决策（你已回复，2026-01-12）

1. **Digest 输出语言**：跟随 UI 语言（见 3.0 `UserPreference.uiLocale` 与 `DigestRun.outputLocale`）
2. **Preview 是否消耗额度**：不消耗额度，仅限流（你已同意）
3. **内容保留策略**：永久保留 `DigestRun/DigestRunItem`；永久保留 `ContentItem` 全文（你已确认）
4. **RSS 源开放程度**：允许用户填写任意 RSS feedUrl（必须 SSRF 防护与风控，你已确认）
5. **Public Topics 默认可见性**：默认 PUBLIC；付费用户可切换 PRIVATE（你已确认）
6. **计费范围（抓取费用）**：`fetchx.search` 计入“抓取实际费用”（你已确认，选 A）

## 16. 默认参数与建议（已可按此开工）

### 16.1 订阅阶梯与积分消耗（我给你的建议方案）

你希望“按 Aiget 总积分走”，并且 Digest 的计费是“按抓取实际费用结算，命中缓存也收费，但最后按 run 汇总扣一次”。结合当前 Aiget 的 tier（月度配额）：

- FREE：100 credits / month
- BASIC：5,000 credits / month
- PRO：20,000 credits / month
- TEAM：60,000 credits / month

长度预设（你已确认要扩大条数）：

- Brief：10 items
- Standard：20 items（默认）
- Deep：30 items

计费建议（以现有 Aiget 的 billing 体系为参照，见 `apps/aiget/server/src/billing/billing.rules.ts`）：

- DigestRun 的最终 cost = Σ（本次 run 内的 Fetchx 调用次数 × 对应 cost）
- 计入的 Fetchx keys（建议全部计入，因为都属于“抓取/数据获取成本”）：
  - `fetchx.search`
  - `fetchx.scrape`
  - `fetchx.batchScrape`
  - `fetchx.crawl`
  - `fetchx.map`
  - `fetchx.extract`
- **命中缓存也收费**：Digest 内部调用必须显式关闭 `skipIfFromCache`（即使 scrape fromCache=true 也扣费）
- Preview：不计费（但限流）

对照 Aiget 现有的基础能力计费（当前大多是 1 credit / call，见 `apps/aiget/server/src/billing/billing.rules.ts`）：

- `fetchx.search`：1
- `fetchx.scrape`：1（命中缓存可跳过扣费）
- `fetchx.crawl` / `fetchx.map` / `fetchx.extract`：1

Digest 在用户视角仍是“按 run 结算一次”，但计价更像“本次 run 实际做了多少抓取工作”。在你要求“缓存也收费”后，成本控制更依赖：限制 maxItems、限制抓全文比例、RSS 优先、域名级并发与频率限制（见 7.2）。

折算示例（以极简计价为例：假设一次 Standard run 触发 1 次 search + 10 次 scrape = 11 credits；实际会因 RSS/source 配置而变化）：

- FREE（100）：约 9 次 / 月
- BASIC（5000）：约 454 次 / 月

配套风控（强建议同时做，否则任意 cron 会被滥用）：

- **最小 cron 间隔按 tier 限制**（示例）：FREE ≥ 60min，BASIC ≥ 10min，PRO ≥ 1min，TEAM ≥ 1min
- **订阅数上限按 tier 限制**（示例）：FREE=3，BASIC=20，PRO=100，TEAM=500（可按你的增长策略再调）

### 16.2 `ON_CONTENT_UPDATE` 是做什么的（你问的点）

`ON_CONTENT_UPDATE` 是一种 **二次投递策略**（redeliveryPolicy）。它解决的问题是：

- 同一条 URL 对应的内容在未来发生了“显著更新”（例如 release notes 追加了重要信息、同一篇博客被作者大幅修订）
- 即使还没到 7 天冷却期，也希望把“更新”再次投递给用户（否则用户会错过变化）

实现思路（建议）：

1. 入池或定期 backfill 抓全文，计算 `ContentItem.contentHash`
2. 用户每次投递时，把当时的 `contentHash` 记录到 `UserContentState.lastDeliveredContentHash`
3. 后续再次看到同一 `canonicalUrlHash` 时：
   - 若 `contentHash` 与 `lastDeliveredContentHash` 不同，且 diff 超过阈值 → 允许再投递
   - 仍建议加一个最短间隔（例如 24h 或 7d），避免同一页面频繁改动导致 spam

是否要做：我建议放到 v2+（Phase 4 或更后），先用 `COOLDOWN=7d` 跑通体验与成本模型。

### 16.3 Public Topics（SEO）在“默认公开”下的治理建议（强烈建议）

你选择“默认公开，付费可私密”。这个决策对增长非常友好，但对 SEO 与内容安全的要求会显著变高（否则很容易被 spam 污染，甚至带来法律/侵权风险）。

建议最小治理能力（MVP 就做）：

1. **发布确认弹窗**：明确提示“公开可被搜索引擎收录”，并展示预览 URL
2. **一键下架（改为 PRIVATE）**：付费用户可随时私密；免费用户至少要支持“删除 Topic”（即停止公开展示）
3. **举报与管理员下架**：public 页面底部提供 Report；后台提供 `digest-topics` 下架与域名黑名单
4. **反 spam 限制**：
   - 免费用户最多 **3 个 PUBLIC topics**；每天最多创建/更新 PUBLIC topic **3 次**（create+update 合计，见 17.3）
   - 单个 PUBLIC topic 的 sources/来源域名上限（避免做成聚合爬虫站，见 17.3）
   - 对明显低质/重复内容做自动降权（例如重复转载、无正文、纯导航页）

### 16.4 计费口径补充（已拍板）

你已确认 `fetchx.search` 计入“抓取实际费用”。因此 Digest run 的成本汇总口径为：

- `fetchx.search`（计入）
- `fetchx.scrape` / `fetchx.batchScrape` / `fetchx.crawl` / `fetchx.map` / `fetchx.extract`（计入）

并且命中缓存也收费（即使 `fromCache=true` 也要计入汇总 cost）。

## 17. 已确认的关键实现约束（你已回复，2026-01-12）

> 本节是“默认公开 + SEO + 按 Fetchx 实际成本计费”下，必须写死的实现约束，避免边做边改。

### 17.1 Public Topic 的 Edition 生成成本由平台承担（建议方案，按最佳实践落地）

你希望 `aiget.dev` 作为单品主站，有稳定的可索引内容产出。因此 Public Topic 的 **Edition（`DigestTopicEdition`）** 建议由平台定期生成（平台预算），而不是依赖某个订阅用户的 run 结果。

落地约束（建议写死）：

- Public Topic 的 Edition 生成不向普通浏览用户收费
- 平台侧设置预算与频控（防 spam）：
  - 免费用户最多 **3 个 PUBLIC topics**（你已确认）
  - 每个 PUBLIC topic 的最小发布间隔：**24 小时**（建议），避免被用作高频聚合站
  - Topic edition 生成队列需全局限流（例如全局并发 ≤ 20；单域名并发 ≤ 2）
- Topic editions 产出后可被“Follow 订阅”复用，尽量减少订阅 run 的 Fetchx 调用（降低用户成本）

### 17.2 免费用户的撤销/自救能力：提供删除

你已确认：提供“删除 Topic（停止公开展示）”。

建议补充（最佳实践）：

- 删除应当是“立即生效”（前端页面 404 或跳转到已删除提示页），并从 sitemap 移除
- 管理端保留审计记录（避免 spam 反复发布/删除逃避治理）

### 17.3 反 spam 的硬阈值（我按最佳实践给出默认值）

你已确认：免费用户最多 3 个 PUBLIC topics。其余阈值我建议如下（MVP 直接写死，后续可做配置化）：

- 免费用户：每天最多创建/更新 PUBLIC topic **3 次**（create+update 合计）
- 单个 PUBLIC topic：
  - sources（RSS feedUrl 或站点源）数量上限：**≤ 5**
  - 来源域名数量上限：**≤ 10**（统计 feed 内 link 域名 + source 域名）
  - edition 列表页最多展示最近 **30 期**
- RSS refresh：
  - 同一 feedUrl 的最小刷新间隔：**≥ 30 分钟**
  - 单用户并发 refresh：**≤ 2**
  - 单域名并发：**≤ 2**

### 17.4 任意 RSS 的跳转策略：允许 301/302

你已确认：允许 RSS feed 301/302 跳转到不同域名。

强制安全约束（必须做）：

- 每次跳转后都必须重新做 URL 校验（协议/黑名单/解析后 IP 校验）
- 对最终落地 URL 再校验一次，防止 redirect 链绕过

### 17.5 全文永久保留：DB 优先，超大走 R2，最大 10MB

你已确认：

- 单篇正文内容较小：存数据库（大部分情况）
- 内容过大：存 R2（对象存储）
- 单篇最大不超过 **10MB**

建议实现约束（避免被异常内容打爆存储）：

- 超过 10MB：不保存全文，只保存摘要 + 链接，并记录 `contentTooLarge=true`（用于调试/治理）
- 建议正文入库前 gzip 压缩（尤其是 R2 存储）

### 17.6 Trending 排序：启用 engagement 信号（按建议）

你已确认：按建议启用 `saved/notInterested` 等聚合 engagement 信号，作为 Trending 的质量因子（仅聚合，不暴露个人数据）。

### 17.7 Follow 默认允许微调

你已确认：Follow 允许微调。

落地建议（既满足“可微调”，又尽量不破坏 SEO 的一致性）：

- Follow 的候选集默认来自 Topic 的 editions（与公开页一致）
- 用户微调作为“overlay”应用在候选集上：
  - 允许调整关键词（正向/负向）与阈值导致“过滤/重排序”
  - 若用户要改 sources，则提示 Fork（避免把 Follow 变成完全不同的订阅）

## 附录：与 v1（overview.md）对比

| 维度 | v1（Email Digest） | v2（本方案） |
|------|---------------------|--------------|
| 产品定位 | “定时发链接” | “知识策展（结论优先）” |
| 内容池 | 订阅运行时临时数据 | 全局共享 Content Pool（跨用户） |
| 评分 | 无 | 三维评分（全局两维 + 订阅一维） |
| 去重 | user-global 去重 | canonicalUrlHash + 可控二次投递 |
| 计费 | 分项计费（搜索/抓取/摘要） | 按 run 结算一次（按 Fetchx 实际成本汇总；缓存也收费；LLM 暂不单独计费） |
| AI | 可选摘要 | 内容级摘要缓存 + Writer 叙事摘要 |
| 投递 | Email | Web Inbox（MVP）→ Email/Webhook（可选，后置） |
