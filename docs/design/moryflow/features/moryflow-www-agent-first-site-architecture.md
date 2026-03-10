---
title: Moryflow WWW Agent-first Site Architecture
date: 2026-03-09
scope: apps/moryflow/www, docs/design/moryflow/features
status: active
---

<!--
[INPUT]:
- `apps/moryflow/www` 当前官网实现
- 官网页面 registry、首页区块配置与交互 Hero 壳层
- 现有 SEO 内容规范与下载对齐 runbook

[OUTPUT]:
- Moryflow 官网当前定位、页面体系、首页结构与交互 Hero 的稳定事实源

[POS]:
- Moryflow Features / 官网产品叙事与页面体系单一事实源

[PROTOCOL]: 仅在官网定位、页面分类、首页信息架构、交互 Hero 边界或跨文档契约失真时更新本文件。
-->

# Moryflow WWW Agent-first Site Architecture

## 1. 当前定位

`www.moryflow.com` 是 Moryflow 的 Agent-first 产品官网，不承载 Anyhunt 品牌叙事。

当前官网主定位固定为：

- `local-first AI agent workspace`
- 围绕桌面端下载转化展开
- 用 knowledge-native workspace 解释 Moryflow 与通用 chat agent、纯 PKM 工具和纯自动化产品的差异

当前全站主转化动作只有一个：

- 跳转 `/{-$locale}/download`

## 2. 页面体系

官网页面当前分为四类：

1. 产品页
   - `/`
   - `/features`
   - `/use-cases`
   - `/download`
   - `/pricing`
   - `/about`
2. SEO 落地页
   - `/agent-workspace`
   - `/ai-note-taking-app`
   - `/local-first-ai-notes`
   - `/second-brain-app`
   - `/digital-garden-app`
   - `/notes-to-website`
   - `/telegram-ai-agent`
   - `/local-first-ai-agent`
3. Compare 页
   - `/compare/notion`
   - `/compare/obsidian`
   - `/compare/manus`
   - `/compare/cowork`
   - `/compare/openclaw`
4. Legal 页
   - `/privacy`
   - `/terms`

页面级单一事实源是：

- `apps/moryflow/www/src/lib/site-pages.ts`

该 registry 统一定义：

- 页面 `id / path / kind`
- 是否可索引
- locale 发布状态
- schema 模式
- sitemap `priority / changefreq / lastModified`

## 3. Locale 发布策略

当前 locale 不是“全站双语”，而是按页面类型选择性发布：

1. 首页、功能页、使用场景页、下载页、定价页：
   - `en` + `zh`
2. About 与 legal：
   - 当前以英文为主
3. SEO 落地页与 compare 页：
   - 当前以英文为主，中文默认不发布

locale 发布状态仍以 `site-pages.ts` 为准，路由与 sitemap 不得绕开该 registry 单独维护。

## 4. 首页信息架构

首页装配入口：

- `apps/moryflow/www/src/routes/{-$locale}/index.tsx`

首页区块顺序单一事实源：

- `apps/moryflow/www/src/lib/homepage-sections.ts`
- `apps/moryflow/www/src/components/landing/HomePageSections.tsx`

当前首页顺序固定为：

1. `hero`
2. `pillars`
3. `workflow`
4. `use-cases`
5. `telegram`
6. `compare`
7. `publishing`
8. `social-proof`
9. `download-cta`

这条顺序表达的稳定约束是：

- Telegram 能力必须在首页中段直接出现，而不是只藏在次级页面
- Compare 必须先于 Publishing，避免“发布能力”先于“差异解释”
- 最终收口仍然是下载

## 5. Hero

Hero 入口组件：

- `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`

当前 Hero 为标题 + 副标题 + 下载 CTA 的纯文案结构，预留产品截图位（后续放置静态产品截图）。

## 6. 下载路径与产品口径

官网所有公开下载口径统一遵守：

- 产品入口页：`/{-$locale}/download`
- 公开下载配置：`apps/moryflow/shared/public-download.ts`
- 手动下载与 release notes：GitHub Releases
- 应用内自动更新：`download.moryflow.com`

官网产品页、SEO 页与首页 CTA 不再各自维护版本号、平台矩阵或下载直链。

当前公开平台口径：

- macOS Apple Silicon
- macOS Intel
- Windows 为 coming soon

更细的下载与更新规则，统一参考：

- `docs/design/moryflow/runbooks/www-and-docs-download-alignment.md`
- `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

## 7. SEO 与 Compare 体系

SEO 落地页与 compare 页的正文组件当前已经抽象为两类：

1. `SeoLandingPage`
2. `ComparePage`

这些页面共享的稳定约束包括：

- 统一从 `site-pages.ts` 获取页面注册与可发布状态
- 使用结构化 schema（FAQPage / WebPage / SoftwareApplication）
- 所有 CTA 回到 `/download`
- compare 页必须中性表达，不把“替代品”叙事写成攻击性对比

SEO 内容生成规范不继续放在 `docs/plans/*`，统一沉淀在：

- `docs/reference/moryflow-www-seo-content-guidelines.md`

## 8. 当前验证基线

以下文件共同构成官网当前实现的验证基线：

- `apps/moryflow/www/src/lib/site-pages.ts`
- `apps/moryflow/www/src/lib/homepage-sections.ts`
- `apps/moryflow/www/src/components/landing/HomePageSections.tsx`
- `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/index.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/download.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/compare/*`
- `apps/moryflow/www/src/routes/{-$locale}/*.tsx` 中的 SEO landing routes

后续若调整官网定位、首页区块顺序、Hero 交互边界、页面 registry 或 locale 发布矩阵，必须先更新本文，再同步代码与索引。
