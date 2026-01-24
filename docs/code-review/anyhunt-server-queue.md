---
title: Anyhunt Server Queue & Async Consistency Code Review
date: 2026-01-24
scope: apps/anyhunt/server (queue/digest/scraper/crawler/batch-scrape/admin)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/queue, apps/anyhunt/server/src/scraper, apps/anyhunt/server/src/crawler, apps/anyhunt/server/src/batch-scrape, apps/anyhunt/server/src/digest, apps/anyhunt/server/src/admin, apps/anyhunt/server/prisma/main/schema.prisma
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：Queue/异步一致性）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Queue/异步一致性 Code Review

## 范围

- 队列基础设施：`apps/anyhunt/server/src/queue/queue.module.ts`、`apps/anyhunt/server/src/queue/queue.utils.ts`、`apps/anyhunt/server/src/queue/queue.constants.ts`
- Fetchx 队列链路：`apps/anyhunt/server/src/scraper/`、`apps/anyhunt/server/src/batch-scrape/`、`apps/anyhunt/server/src/crawler/`
- Digest 队列链路：`apps/anyhunt/server/src/digest/`
- 管理侧队列监控：`apps/anyhunt/server/src/admin/admin-queue.service.ts`、`apps/anyhunt/server/src/admin/admin-queue.controller.ts`
- 数据模型：`apps/anyhunt/server/prisma/main/schema.prisma`

主要入口点（HTTP/Queue）：

- HTTP：`apps/anyhunt/server/src/scraper/scraper.controller.ts`、`apps/anyhunt/server/src/batch-scrape/batch-scrape.controller.ts`、`apps/anyhunt/server/src/crawler/crawler.controller.ts`
- Digest 手动运行入口：`apps/anyhunt/server/src/digest/controllers/digest-console-subscription.controller.ts`
- Admin 队列管理：`apps/anyhunt/server/src/admin/admin-queue.controller.ts`
- Worker：`apps/anyhunt/server/src/scraper/scraper.processor.ts`、`apps/anyhunt/server/src/batch-scrape/batch-scrape.processor.ts`、`apps/anyhunt/server/src/crawler/crawler.processor.ts`、`apps/anyhunt/server/src/digest/processors/*`

依赖：

- Redis（BullMQ 队列/QueueEvents）
- PostgreSQL（Prisma 模型：ScrapeJob/BatchScrape/Crawl/Digest）
- Playwright 浏览器池（Scrape/Crawl）

## 结论摘要

- 高风险问题（P0）：2 个
- 中风险问题（P1）：4 个
- 低风险/规范问题（P2）：4 个

## 发现（按严重程度排序）

- [P0] Crawl 同步模式并未真正等待任务完成 → `apps/anyhunt/server/src/crawler/crawler.service.ts` 的 `waitForCompletion` 仅等待 `crawl-start` job 完成，而该 job 在调度完 `crawl-batch` 后立即完成；结果是 sync 请求会在爬取未完成时就返回（状态仍是 `CRAWLING`），并且没有真正的完成/失败阻塞。**用户表现**：同步接口返回的数据不完整或状态仍在进行中。建议改为等待 DB 状态变为 `COMPLETED/FAILED`（轮询+超时），或将 “整段 crawl” 合并为单一 job。
- [P0] Digest Scheduler 队列缺少 Producer/Repeatable Job → 未在仓库内发现对 `digest-subscription-scheduler` 与 `digest-source-scheduler` 的入队逻辑或 repeatable job 初始化（`apps/anyhunt/server/src/digest/digest.module.ts` 仅注册队列）。**用户表现**：订阅自动运行/源刷新不会自动触发，只能手动 run。建议在 app bootstrap/专用 scheduler 模块中创建 repeatable job 或显式入队，并在文档里记录触发方式。

- [P1] Batch Scrape 任务重试/续跑会产生状态与计数错误 → `apps/anyhunt/server/src/batch-scrape/batch-scrape.processor.ts` 仅处理 `PENDING` 项并从 0 开始计数；如果任务重试或部分已完成，`items.length` 可能为 0，最终状态会被标记为 `FAILED`（`failedCount === items.length`），并覆盖原有统计。建议以 DB 聚合统计为准（已完成/失败数从数据库读取），并在无待处理项时直接返回或保持原状态。
- [P1] Crawl 批处理链路缺少幂等保护与完成态护栏 → `apps/anyhunt/server/src/crawler/crawler.processor.ts` 中 `crawl-batch`/`crawl-check` 没有去重 jobId，也未在 `COMPLETED/FAILED` 时提前退出；重复 job 可能导致重复累加计数、重复处理或“完成后继续处理”。建议：在 DB 中判断状态为终态即 return，并为批处理/检查引入可控的 jobId 或改为单 job 内循环。
- [P1] Scheduler 并发下易产生重复 Run/Refresh → `apps/anyhunt/server/src/digest/processors/subscription-scheduler.processor.ts` 与 `apps/anyhunt/server/src/digest/processors/source-scheduler.processor.ts` 先查询、再创建任务、再更新 `nextRunAt/nextRefreshAt`，缺少行级锁或“claim”机制；并发/重试会创建重复运行与重复通知。建议：用“原子 claim + update”模式（`updateMany` + 条件过滤）、或为 `runId`/`refresh` 建唯一约束，确保幂等。
- [P1] QueueEvents 连接参数与 BullMQ 主连接不一致 → `apps/anyhunt/server/src/queue/queue.module.ts` 解析 `REDIS_URL` 支持 username，但 `apps/anyhunt/server/src/queue/queue.utils.ts` 只使用 host/port/password，不支持 username/db/tls；如果 Redis 使用 ACL/TLS/非 0 DB，sync 模式会连接失败或连接到错误 DB。建议统一解析函数，支持 username/db/tls 并复用同一配置。

- [P2] Digest 通知入队缺少幂等 jobId → `apps/anyhunt/server/src/digest/services/notification.service.ts` 对 webhook/email 没有 `jobId` 去重；当运行重试或重复触发时会重复发送通知。建议使用 `jobId: webhook:{runId}` / `email:{runId}`。
- [P2] 无主队列与未实现队列常量 → `apps/anyhunt/server/src/queue/queue.constants.ts` 中 `SCREENSHOT_QUEUE`、`DIGEST_TOPIC_SCHEDULER_QUEUE`、`DIGEST_TOPIC_EDITION_QUEUE`、`DIGEST_CONTENT_INGEST_QUEUE` 未发现生产者或处理器；`apps/anyhunt/server/src/queue/queue.module.ts` 与 `apps/anyhunt/server/src/admin/admin-queue.service.ts` 仍注册/展示该队列，属于历史包袱。建议删除或补齐实现。
- [P2] Admin 队列监控未覆盖 Digest 队列 → `apps/anyhunt/server/src/admin/admin-queue.service.ts` 仅监控 scrape/crawl/batch/screenshot，不含 digest 队列，排障盲区。建议纳入 digest 队列或明确“只监控 Fetchx”。
- [P2] QueueEvents 资源未显式关闭 → `apps/anyhunt/server/src/scraper/scraper.service.ts`、`apps/anyhunt/server/src/batch-scrape/batch-scrape.service.ts`、`apps/anyhunt/server/src/crawler/crawler.service.ts` 创建 `QueueEvents` 但未在模块销毁时 `close()`，在热重载/测试环境可能出现连接泄漏。建议实现 `OnModuleDestroy` 关闭连接。

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/queue/__tests__/queue.utils.spec.ts`
  - `apps/anyhunt/server/src/scraper/__tests__/scraper.service.spec.ts`
  - `apps/anyhunt/server/src/batch-scrape/__tests__/batch-scrape.service.spec.ts`
  - `apps/anyhunt/server/src/batch-scrape/__tests__/batch-scrape.processor.spec.ts`
  - `apps/anyhunt/server/src/crawler/__tests__/crawler.service.spec.ts`
  - `apps/anyhunt/server/src/crawler/__tests__/crawler.processor.spec.ts`
  - Digest processors/service 单测（`apps/anyhunt/server/src/digest/__tests__/processors/*`）
  - `apps/anyhunt/server/src/digest/__tests__/services/scheduler.service.spec.ts`
- 缺失（需补）：
  - 暂无强制补充项

## 修复建议（按优先级）

1. 修复 Crawl sync 等待逻辑（P0），确保返回时已完成或明确失败。
2. 补齐 Digest Scheduler 的 repeatable job/producer，并写清触发方式（P0）。
3. 优化批处理幂等与计数一致性（Batch Scrape + Crawl）（P1）。
4. 统一 Redis 连接解析（QueueEvents 与 Bull 主连接一致）（P1）。
5. 清理未使用队列与补齐 Admin 监控（P2）。

## 修复对照表（逐条问题 → 变更）

- [P0] Crawl sync 等待未生效 → 改为轮询 DB 状态并在超时抛出 `CrawlTimeoutError`
  - `apps/anyhunt/server/src/crawler/crawler.service.ts`
  - `apps/anyhunt/server/src/crawler/crawler.constants.ts`
- [P0] Digest Scheduler 队列缺少 Producer/Repeatable Job → 启动时注册 repeatable job
  - `apps/anyhunt/server/src/digest/services/scheduler.service.ts`
  - `apps/anyhunt/server/src/digest/digest.module.ts`
- [P1] Batch Scrape 重试导致计数偏差 → 基于 Item 状态初始化计数并保证终态一致
  - `apps/anyhunt/server/src/batch-scrape/batch-scrape.processor.ts`
- [P1] Crawl 批处理终态保护 → COMPLETED/FAILED 直接返回，避免重复批处理
  - `apps/anyhunt/server/src/crawler/crawler.processor.ts`
- [P1] Scheduler 并发重复调度 → Redis 锁保护订阅/源调度
  - `apps/anyhunt/server/src/digest/processors/subscription-scheduler.processor.ts`
  - `apps/anyhunt/server/src/digest/processors/source-scheduler.processor.ts`
- [P1] QueueEvents 连接解析不一致 → 统一解析（username/db/tls）
  - `apps/anyhunt/server/src/queue/queue.utils.ts`
  - `apps/anyhunt/server/src/queue/queue.module.ts`
- [P2] 通知队列缺少幂等 jobId → Webhook/Email jobId 去重
  - `apps/anyhunt/server/src/digest/services/notification.service.ts`
- [P2] 无主队列与未实现队列常量 → 移除未使用的 Screenshot/Topic/Content 队列
  - `apps/anyhunt/server/src/queue/queue.constants.ts`
  - `apps/anyhunt/server/src/queue/queue.module.ts`
  - `apps/anyhunt/server/src/digest/digest.module.ts`
  - `apps/anyhunt/server/src/digest/digest.constants.ts`
- [P2] Admin 队列监控未覆盖 Digest → 增加 Digest 队列注入与统计
  - `apps/anyhunt/server/src/admin/admin.module.ts`
  - `apps/anyhunt/server/src/admin/admin-queue.service.ts`
- [P2] QueueEvents 资源未显式关闭 → 关闭 QueueEvents 连接
  - `apps/anyhunt/server/src/scraper/scraper.service.ts`
  - `apps/anyhunt/server/src/batch-scrape/batch-scrape.service.ts`

## 修复记录

- 状态：**修复完成**（2026-01-24）
