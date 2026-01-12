---
title: 定时内容订阅（Email Digest）- 需求方案
date: 2026-01-07
scope: aiget.dev, server.aiget.dev
status: draft
---

<!--
[INPUT]: 用户定义订阅主题（query/来源偏好）+ 自定义 cron + 时区；支持抓取全文与 AI 摘要；同一用户跨订阅全局去重
[OUTPUT]: 可落地的端到端需求规格（流程、数据模型、接口、调度/去重/重试策略、风险与待确认项）
[POS]: Feature 文档：为 `apps/aiget/server` 实现“定时抓取 → 邮件投递 → 去重”提供统一方案

[PROTOCOL]: 本文件新增/变更需同步更新 `docs/products/aiget-dev/index.md`、`docs/index.md` 与 `docs/CLAUDE.md`。
-->

# 定时内容订阅（Email Digest）- 需求方案

## 1. 背景与目标

用户希望在 Aiget 平台配置“我想关注什么 + 什么时候发给我”，平台定时抓取内容并发送到用户邮箱，例如：

- 订阅 A：`AI 新闻`，每天 09:00（Asia/Shanghai）
- 订阅 B：`全球新闻`，每周一 10:00（Asia/Shanghai）

核心目标：

1. **可配置**：支持自定义 cron + 时区，覆盖“每周几几点”等需求。
2. **可控内容**：既能返回标题+摘要+链接，也能抓全文（`scrapeResults`），并使用 LLM 生成摘要（单条摘要 + 邮件总览摘要）。
3. **全局去重**：同一用户跨所有订阅**不重复发送同一内容**（以 URL/内容指纹为键）。
4. **可观测/可重试**：运行历史、失败原因、重试机制清晰可查；幂等保证避免重复发信。

## 2. 非目标（本期不做）

- 不做“跨业务线互通”（Aiget Dev 与 Moryflow 不共享用户/订阅）。
- 不做对外 Webhook 投递（本功能以 Email 为主；后续可扩展）。
- 不做复杂个性化推荐系统（只基于 query/过滤条件）。
- 不做严格“来源可信度评级/反垃圾”体系（仅基础去重与失败隔离）。

## 3. 角色与核心用例

### 3.1 角色

- **订阅用户**：在 Console 配置订阅、收取邮件、查看历史。
- **系统执行器**：按 cron 触发订阅运行，聚合内容并发送邮件。
- **管理员（可选）**：排查失败、全局开关、额度/限流策略审计。

### 3.2 用例

1. 创建订阅（名称、query、cron、时区、抓全文开关、AI 摘要开关、邮件模板偏好）。
2. 暂停/恢复订阅。
3. 手动触发一次（用于验证订阅质量）。
4. 查看运行历史（每次发了哪些内容，是否命中去重、失败原因）。
5. 全局去重：用户有多个订阅时，任何内容只在首次出现时发送一次。

## 4. 功能范围与配置项

### 4.1 订阅配置（Subscription）

最小必填：

- `name`: string
- `query`: string（如 “AI news” / “global news” / “site:xxx.com topic”）
- `cron`: string（标准 5 段或 6 段 cron，需在实现时统一规范）
- `timezone`: string（IANA，如 `Asia/Shanghai`）
- `emailTo`: string（默认 `User.email`）
- `enabled`: boolean

内容获取相关：

- `search`：
  - `limit`: number（默认 10）
  - `categories/engines/language/timeRange/safeSearch`: 可选（映射到 Search API）
- `scrapeResults`: boolean（抓全文）
- `scrapeOptions`: object（传递给 Scraper，默认 `formats=['markdown']` + `onlyMainContent=true`）
- `aiSummary`：
  - `enabled`: boolean
  - `model`: string（默认平台配置）
  - `perItem`: boolean（对每条内容生成摘要）
  - `digestIntro`: boolean（生成本期邮件“总览摘要”）

邮件相关：

- `emailSubjectTemplate`: string（用户可见内容需英文，例如 `Your weekly digest: {{name}}`）
- `emailTemplate`: enum（默认模板即可）

### 4.2 去重策略（User-Global Dedup）

去重范围：**同一 userId 全局**（跨所有订阅）。

去重键（contentKey）建议优先级：

1. `canonicalUrl` 的 SHA256（主键）
2. 无 URL 或 URL 不稳定时：`source + normalizedTitle + publishedAt(天)` 的 SHA256（补充）
3. 抓全文后可追加：`contentHash(markdown)`（用于识别同 URL 内容变体，需谨慎）

说明：

- “同一内容”通常以 URL 为准；若同 URL 更新了内容，是否允许再次发送需明确（建议默认不再次发送，未来可引入“内容更新阈值”策略）。

## 5. 端到端业务流程

### 5.1 创建订阅

1. Console 提交订阅配置。
2. 服务端校验 cron/timezone/query。
3. 计算 `nextRunAt`（基于 cron + timezone）。
4. 保存订阅，写入审计字段（createdBy/updatedBy）。

### 5.2 定时运行（一次 run）

1. Scheduler 找到所有 `enabled=true && nextRunAt<=now()` 的订阅。
2. 为每个订阅创建一条 `DigestRun` 记录（状态 RUNNING），并入队执行（避免在 Cron 线程做重活）。
3. Worker 执行：
   1. 调用 Search 获取候选列表（标题+摘要+链接）。
   2. 基于 `userId` 全局去重：过滤已发送过的 items。
   3. 若 `scrapeResults=true`：并发抓取每条内容全文（markdown），失败则降级保留标题+摘要+链接。
   4. 若 `aiSummary.enabled=true`：
      - per-item summary：对每条内容（标题+摘要+全文）生成短摘要
      - digest intro：对本期 items 生成“总览摘要”
   5. 渲染邮件 HTML（固定模板）。
   6. 发送邮件（Resend）。
   7. 记录本次发送的 items（以及去重键），更新 run 状态为 SUCCEEDED。
4. 计算并更新订阅的下次运行时间 `nextRunAt`。

### 5.3 手动触发

- 通过 API 触发创建一条 `DigestRun`（标记 source=MANUAL），复用同一 worker 流程。

## 6. 数据模型（建议）

> 以 `apps/aiget/server` 的 Prisma/Postgres 为准，命名仅供方案讨论。

### 6.1 DigestSubscription

- `id`, `userId`
- `name`, `query`
- `cron`, `timezone`
- `enabled`
- `emailTo`
- `searchOptions`（Json）
- `scrapeResults`, `scrapeOptions`（Json）
- `aiSummaryOptions`（Json）
- `nextRunAt`, `lastRunAt`
- `createdAt`, `updatedAt`, `deletedAt?`

索引：

- `(enabled, nextRunAt)` 用于扫描 due
- `(userId)` 用于列表查询

### 6.2 DigestRun（一次执行）

- `id`, `subscriptionId`, `userId`
- `status`: PENDING/RUNNING/SUCCEEDED/FAILED/CANCELLED
- `scheduledAt`（本应触发的时间）、`startedAt`, `finishedAt`
- `result`（Json：发送的条数、去重过滤数、抓取成功率、模型用量等）
- `error`（失败原因）

索引：

- `(subscriptionId, createdAt)`
- `(userId, createdAt)`

### 6.3 UserDeliveredContent（全局去重表）

- `id`, `userId`
- `contentKey`（SHA256）
- `url`, `title`, `publishedAt?`, `source?`
- `firstSeenAt`, `firstDeliveredAt`
- `deliveredBySubscriptionId?`, `deliveredByRunId?`

唯一约束：

- `@@unique([userId, contentKey])`

可选增强（并发抢占）：

- 增加 `state: RESERVED|SENT` + `reservedAt` + `runId`，用于并发执行时“先占位再发送”，避免两条订阅同时发送同一条内容。

## 7. 接口建议（Aiget Dev Console）

> 以 `/api/v1` 为前缀（server.aiget.dev），鉴权走 SessionGuard（Console）或内部服务账户。

- `POST /api/v1/digests/subscriptions` 创建订阅
- `GET /api/v1/digests/subscriptions` 列表
- `PATCH /api/v1/digests/subscriptions/:id` 更新/启停
- `DELETE /api/v1/digests/subscriptions/:id` 删除（软删）
- `POST /api/v1/digests/subscriptions/:id/run` 手动触发
- `GET /api/v1/digests/runs?subscriptionId=` 运行历史
- `GET /api/v1/digests/runs/:id` 运行详情（items/摘要/失败原因）

## 8. 调度、并发、幂等与重试

### 8.1 调度策略

推荐：**Cron 扫描 due → 入队 worker** 的“拉模式”：

- 每分钟/每 30 秒扫描 `(enabled=true && nextRunAt<=now)`。
- 对每条订阅创建 `DigestRun` 并 enqueue。
- 立即把 `nextRunAt` 计算并更新为下一次（避免同一订阅被重复扫描命中）。

优势：

- 支持自定义 cron + timezone（只要 nextRunAt 计算正确）。
- 订阅变更无需改动 BullMQ repeatable job。

### 8.2 并发与幂等

需要保证：

- 同一 `subscriptionId` 在同一触发窗口只执行一次。
- 同一 `userId` 在并发 runs 下不重复发送同一 `contentKey`。

建议措施：

- `DigestRun` 写入时使用 DB 层幂等约束：例如在创建 run 前先把 subscription 的 `nextRunAt` 原子推进（或加锁字段）。
- 全局去重表用唯一约束兜底，并配合“RESERVED 抢占”：
  - 生成候选 items 后，先尝试批量 `insert`（RESERVED），成功的才进入“本期发送列表”；冲突的视为已被其他 run 抢走/已发送。

### 8.3 重试

- Search/Scrape/LLM 调用失败：按阶段降级（例如抓全文失败不影响发送；LLM 失败退回“标题+摘要”）。
- 邮件发送失败：run 标记 FAILED，可手动重试；若已做 RESERVED，需要在失败时释放/超时回收（或允许下次继续发送未 SENT 的 RESERVED）。

## 9. 成本、配额与风控（需要明确）

本功能会消耗资源：

- Search：每次 run 至少 1 次
- Scrape：按条数消耗
- LLM：按 tokens 消耗
- Email：按发送次数计费

需要产品侧确认：

1. **是否计入用户配额**（建议计入，且在订阅配置页估算“每次运行成本”）。
2. 订阅上限、每次最多条数、抓取并发上限（避免滥用）。
3. 黑名单/SSRF 防护：抓全文必须复用现有 URL 校验与抓取策略。

## 10. 验收标准（Definition of Done）

1. 用户可创建带 cron+timezone 的订阅，能按期收到邮件。
2. 邮件包含：标题、来源、摘要、链接；若开启抓全文与 AI，总览摘要 + 每条简要摘要。
3. 同一用户跨多个订阅：同一内容（同一 contentKey）最多发送一次。
4. 运行历史可查：包含去重过滤数量、抓取/摘要失败降级信息。
5. 失败可重试且不产生重复发送。

## 11. 待确认问题（必须对齐）

1. contentKey 的 canonical 规则：只按 URL 还是允许“内容更新后再次发送”？
2. 自定义 cron 支持范围：5 段/6 段、是否支持秒、是否允许 `@weekly` 等宏。
3. 邮件模板与语言：subject/CTA 是否统一英文模板，是否允许用户自定义。
4. AI 摘要策略：每条摘要字数、是否引用原文、是否需要“引用来源段落”。
5. 配额/计费：是否强制要求用户有订阅/额度才可启用。
