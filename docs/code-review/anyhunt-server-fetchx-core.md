---
title: Anyhunt Server Fetchx Core Code Review
date: 2026-01-26
scope: apps/anyhunt/server (scraper/crawler/extract/map/batch-scrape)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/scraper, src/crawler, src/extract, src/map, src/batch-scrape, prisma/main/schema.prisma, billing rules
[OUTPUT]: 风险清单 + 修复建议 + 进度记录
[POS]: Phase 2 / P1 模块审查记录（Anyhunt Server：Scraper/Crawler/Extract/Map）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server Fetchx Core Code Review

## 范围

- Scraper：`apps/anyhunt/server/src/scraper/`
- Crawler：`apps/anyhunt/server/src/crawler/`
- Extract：`apps/anyhunt/server/src/extract/`
- Map：`apps/anyhunt/server/src/map/`
- Batch Scrape：`apps/anyhunt/server/src/batch-scrape/`
- 计费规则：`apps/anyhunt/server/src/billing/billing.rules.ts`
- 相关数据模型：`apps/anyhunt/server/prisma/main/schema.prisma`（ScrapeJob/CrawlJob/BatchScrape）

主要入口：

- `POST /api/v1/scrape`（ApiKey）
- `POST /api/v1/crawl`（ApiKey）
- `POST /api/v1/map`（ApiKey）
- `POST /api/v1/extract`（ApiKey）
- `POST /api/v1/batch-scrape`（ApiKey）

## 结论摘要

- 高风险问题（P0）：0
- 中风险问题（P1）：0
- 低风险/规范问题（P2）：0

## 发现（按严重程度排序）

- [P1] **自定义请求头在设备预设下被覆盖（已修复）** → 合并用户 headers 与设备 UA，一次性设置；若用户自定义 `User-Agent` 则不覆盖。  
  文件：`apps/anyhunt/server/src/scraper/handlers/page-config.handler.ts`

- [P1] **同步等待超时与页面超时耦合（已修复）** → 引入 `syncTimeout`（默认 120s）专用于同步等待，页面超时仍由 `timeout` 控制。  
  文件：`apps/anyhunt/server/src/scraper/scraper.service.ts`, `apps/anyhunt/server/src/scraper/dto/scrape.dto.ts`, `apps/anyhunt/server/src/scraper/scraper.constants.ts`

- [P1] **SSRF 拒绝走通用 Error → 500（已修复）** → 统一改为 `ForbiddenException`，返回 403。  
  文件：`apps/anyhunt/server/src/scraper/scraper.service.ts`, `apps/anyhunt/server/src/map/map.service.ts`, `apps/anyhunt/server/src/crawler/crawler.service.ts`, `apps/anyhunt/server/src/batch-scrape/batch-scrape.service.ts`

- [P1] **Extract 未在扣费前验证 URL 有效性（已修复）** → 扣费前统一校验 URL 列表，非法 URL 直接拒绝。  
  文件：`apps/anyhunt/server/src/extract/extract.service.ts`

- [P1] **ScrapeJob 持久化包含原始 headers（已修复）** → `headers` 仅用于请求与 hash，不写入 `ScrapeJob.options`。  
  文件：`apps/anyhunt/server/src/scraper/scraper.service.ts`

- [P2] **缓存 key 包含 `sync`（已修复）** → hash 逻辑剔除 `sync/syncTimeout`，同步/异步复用缓存。  
  文件：`apps/anyhunt/server/src/scraper/scraper.service.ts`

- [P2] **计费语义与文档不一致（已修复）** → 明确为“每次任务扣 1”，文档对齐实现。  
  文件：`apps/anyhunt/server/src/batch-scrape/CLAUDE.md`, `apps/anyhunt/server/src/billing/billing.rules.ts`

- [P2] **`DEFAULT_BATCH_MAX_URLS` 未使用（已修复）** → DTO 校验复用常量。  
  文件：`apps/anyhunt/server/src/batch-scrape/batch-scrape.constants.ts`, `apps/anyhunt/server/src/batch-scrape/dto/batch-scrape.dto.ts`

- [P2] **关键文件 Header 注释缺失/路径注释过时（已修复）** → 统一补齐 header。  
  文件：`apps/anyhunt/server/src/map/dto/map.dto.ts`, `apps/anyhunt/server/src/crawler/url-frontier.ts`, `apps/anyhunt/server/src/scraper/scraper.constants.ts`

- [P2] **URL Frontier 限额检查非原子（已修复）** → 使用 Redis Lua 脚本原子化“去重 + 限额 + 入队”。  
  文件：`apps/anyhunt/server/src/crawler/url-frontier.ts`

- [P2] **未使用的工具函数（已修复）** → 删除 `normalizeUrl()`。  
  文件：`apps/anyhunt/server/src/scraper/scraper.constants.ts`

## 测试审计

- 已有：
  - `apps/anyhunt/server/src/scraper/__tests__/*`
  - `apps/anyhunt/server/src/crawler/__tests__/*`
  - `apps/anyhunt/server/src/map/__tests__/map.service.spec.ts`
  - `apps/anyhunt/server/src/batch-scrape/__tests__/*`
  - `apps/anyhunt/server/src/extract/__tests__/extract.service.spec.ts`
- 补充：
  - `PageConfigHandler` headers 合并单测
  - Extract SSRF 拒绝与扣费前置校验单测

## 修复计划与进度

- 状态：**修复完成（2026-01-26）**

## 修复记录

- 2026-01-26：修复 headers 合并、SSRF 403、syncTimeout 拆分、URL Frontier 原子入队、敏感 headers 不落库；补齐测试与文档
