---
title: Anyhunt Server SSRF & Network Isolation Code Review
date: 2026-01-26
scope: apps/anyhunt/server (common/scraper/crawler/batch-scrape/map/browser/digest/webhook)
status: done
---

<!--
[INPUT]: apps/anyhunt/server/src/common, scraper, crawler, batch-scrape, map, browser, digest, webhook
[OUTPUT]: SSRF 风险清单 + 修复方案 + 进度记录
[POS]: Phase 2 / P0 模块审查记录（Anyhunt Server：抓取安全/网络隔离）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt Server SSRF & Network Isolation Code Review

## 范围

- SSRF 核心：`apps/anyhunt/server/src/common/validators/url.validator.ts`
- 抓取入口：`scraper/`, `crawler/`, `batch-scrape/`, `map/`
- Browser 网络：`browser/browser-pool.ts`, `browser/network/interceptor.service.ts`
- Digest：`digest/services/rss.service.ts`, `digest/services/site-crawl.service.ts`, `digest/processors/webhook-delivery.processor.ts`
- Webhook：`common/services/webhook.service.ts`, `webhook/webhook.service.ts`

核心入口：

- `POST /api/v1/scrape`
- `POST /api/v1/crawl`
- `POST /api/v1/batch-scrape`
- `POST /api/v1/map`
- Browser L2 API（openUrl + network intercept）
- Digest RSS/Site Crawl/Webhook 投递

## 文件/模块地图

- `apps/anyhunt/server/src/common/validators/url.validator.ts`
  - SSRF 判定：协议/用户信息/DNS 解析/IPv4+IPv6 公网判断
- `apps/anyhunt/server/src/common/utils/ssrf-fetch.ts`
  - SSRF 安全 fetch（重定向校验）
- `apps/anyhunt/server/src/common/services/webhook.service.ts`
  - 通用 webhook 发送（SSRF 校验 + 禁止重定向）
- `apps/anyhunt/server/src/scraper/scraper.service.ts`
  - Scrape 输入 URL 校验
- `apps/anyhunt/server/src/crawler/crawler.service.ts`
  - Crawl startUrl + webhookUrl 校验
- `apps/anyhunt/server/src/batch-scrape/batch-scrape.service.ts`
  - 批量 URL + webhookUrl 校验
- `apps/anyhunt/server/src/map/map.service.ts`
  - 起始 URL + sitemap/links 校验
- `apps/anyhunt/server/src/map/sitemap-parser.ts`
  - sitemap/robots fetch（重定向校验）
- `apps/anyhunt/server/src/browser/browser-pool.ts`
  - Playwright context 网络层 SSRF guard
- `apps/anyhunt/server/src/browser/network/interceptor.service.ts`
  - 拦截规则前置 SSRF 校验
- `apps/anyhunt/server/src/digest/services/rss.service.ts`
  - RSS fetch（重定向校验）
- `apps/anyhunt/server/src/digest/services/site-crawl.service.ts`
  - siteUrl 校验
- `apps/anyhunt/server/src/digest/processors/webhook-delivery.processor.ts`
  - webhook 投递校验 + 禁止重定向
- `apps/anyhunt/server/src/webhook/webhook.service.ts`
  - webhook CRUD 入参校验

## 结论摘要

- 高风险问题（P0）：5 个
- 中风险问题（P1）：2 个
- 低风险/规范问题（P2）：若干

## 发现（按严重程度排序）

- [P0] UrlValidator 仅基于 hostname 正则判断，缺少 DNS 解析与 IPv6/凭据拦截，存在绕过（DNS rebinding、IPv6 bracket、userinfo）
- [P0] Map/Sitemap/RSS fetch 未对 robots/sitemap/重定向链路做 SSRF 校验，可能通过 sitemap 或 302 跳转访问内网
- [P0] BrowserPool 仅校验 openUrl，不拦截子请求，页面可通过 `<img/src>` 等向内网探测
- [P0] NetworkInterceptor 未做 SSRF 校验，用户设置拦截规则时可绕过 BrowserPool 的防护
- [P0] webhookUrl 在 crawler/batch-scrape/webhook CRUD 未校验；投递链路会跟随重定向

- [P1] Webhook 投递与通用 webhook 发送默认跟随重定向，可能被跳转到内网
- [P1] SSRF 校验缺少统一的“重定向验证”工具，存在逻辑分散

## 修复计划与进度

- 状态：已完成
- 目标：统一 UrlValidator 规则、补齐 URL 入口校验、增加网络层 SSRF guard、重定向安全处理、补测试

## 修复对照表（逐条问题 → 变更）

- [P0] UrlValidator 缺少 DNS/IPv6/凭据拦截 → 升级为 DNS 解析 + IPv4/IPv6 公网判断 + 阻断 userinfo + IPv6 bracket 规范化
  - `apps/anyhunt/server/src/common/validators/url.validator.ts`
  - `apps/anyhunt/server/src/common/__tests__/url-validator.spec.ts`
- [P0] sitemap/robots/RSS 未校验重定向 → 引入 SSRF-safe fetch 并统一使用
  - `apps/anyhunt/server/src/common/utils/ssrf-fetch.ts`
  - `apps/anyhunt/server/src/map/sitemap-parser.ts`
  - `apps/anyhunt/server/src/digest/services/rss.service.ts`
  - `apps/anyhunt/server/src/common/__tests__/ssrf-fetch.spec.ts`
- [P0] Browser 子请求绕过 → BrowserPool 增加 context 级网络 guard + NetworkInterceptor 前置 SSRF 校验
  - `apps/anyhunt/server/src/browser/browser-pool.ts`
  - `apps/anyhunt/server/src/browser/network/interceptor.service.ts`
- [P0] webhookUrl 未校验 → crawler/batch-scrape/webhook CRUD 强制校验
  - `apps/anyhunt/server/src/crawler/crawler.service.ts`
  - `apps/anyhunt/server/src/batch-scrape/batch-scrape.service.ts`
  - `apps/anyhunt/server/src/webhook/webhook.service.ts`
  - `apps/anyhunt/server/src/crawler/__tests__/crawler.service.spec.ts`
  - `apps/anyhunt/server/src/batch-scrape/__tests__/batch-scrape.service.spec.ts`
  - `apps/anyhunt/server/src/webhook/__tests__/webhook.service.spec.ts`
- [P1] webhook 跟随重定向 → 投递端禁用重定向
  - `apps/anyhunt/server/src/common/services/webhook.service.ts`
  - `apps/anyhunt/server/src/digest/processors/webhook-delivery.processor.ts`

## 测试审计

- 新增/更新：
  - `apps/anyhunt/server/src/common/__tests__/url-validator.spec.ts`
  - `apps/anyhunt/server/src/common/__tests__/ssrf-fetch.spec.ts`
  - `apps/anyhunt/server/src/crawler/__tests__/crawler.service.spec.ts`
  - `apps/anyhunt/server/src/batch-scrape/__tests__/batch-scrape.service.spec.ts`
  - `apps/anyhunt/server/src/webhook/__tests__/webhook.service.spec.ts`
  - 相关 Mock 适配：`apps/anyhunt/server/src/digest/__tests__/mocks/services.mock.ts`
  - RSS fetch mock 适配：`apps/anyhunt/server/src/digest/__tests__/services/rss.service.spec.ts`

## 后续建议（非阻塞）

- 建议补充：
  - Playwright 网络 guard 的集成测试（防止子请求访问内网）
  - MapService 对 sitemap/robots 重定向链路的黑盒验证

## 本次验证

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`

## 残留风险

- DNS rebinding 仍可能在“校验后、实际连接前”发生；若要彻底规避，需要在 HTTP client 层绑定解析结果（后续可评估自定义 dispatcher/agent）。
