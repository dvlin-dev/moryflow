---
title: Moryflow WWW Agent-first Site Architecture
date: 2026-03-11
scope: apps/moryflow/www, docs/design/moryflow/features
status: active
---

<!--
[INPUT]:
- `apps/moryflow/www` 当前官网实现
- 官网页面 registry、首页区块配置、导航与下载口径
- 现有 SEO 内容规范与下载对齐 runbook

[OUTPUT]:
- Moryflow 官网当前定位、页面体系、首页结构与主转化路径的稳定事实源

[POS]:
- Moryflow Features / 官网产品叙事与页面体系单一事实源

[PROTOCOL]: 仅在官网定位、页面分类、首页信息架构、导航入口或跨文档契约失真时更新本文件。
-->

# Moryflow WWW Agent-first Site Architecture

## 1. 当前定位

`www.moryflow.com` 是 Moryflow 的产品官网，不承载 Anyhunt 品牌叙事。

当前官网固定围绕以下心智组织：

- `local-first AI agent workspace`
- 围绕桌面端下载转化展开
- 用 Compare、Pricing 和 SEO landing 补充首页叙事，而不是拆出额外的功能页

官网的主转化动作始终只有一个：

- 跳转 `/{-$locale}/download`

Compare、Pricing、Docs 和 GitHub 都是辅助入口，不替代下载主路径。

## 2. 页面体系

当前页面按四类组织：

1. 产品页
   - `/`
   - `/download`
   - `/pricing`
2. SEO landing 页
   - `/agent-workspace`
   - `/ai-note-taking-app`
   - `/local-first-ai-notes`
   - `/second-brain-app`
   - `/digital-garden-app`
   - `/notes-to-website`
   - `/telegram-ai-agent`
   - `/local-first-ai-agent`
3. Compare 页
   - `/compare`
   - `/compare/notion`
   - `/compare/obsidian`
   - `/compare/manus`
   - `/compare/cowork`
   - `/compare/openclaw`
4. Legal 页
   - `/privacy`
   - `/terms`

页面注册表的单一事实源是：

- `apps/moryflow/www/src/lib/site-pages.ts`

这个 registry 统一定义：

- 页面 `id / path / kind`
- 是否可索引
- locale 发布状态
- schema 模式
- sitemap `priority / changefreq / lastModified`

## 3. Locale 发布策略

当前官网采用中英文双语发布。

`site-pages.ts` 中当前所有公开页面都使用：

- `en`
- `zh`

路由、sitemap、canonical 和页面可见性都要以 `site-pages.ts` 为准，不能绕开这个 registry 各自维护。

## 4. 首页信息架构

首页入口：

- `apps/moryflow/www/src/routes/{-$locale}/index.tsx`

首页区块顺序的单一事实源：

- `apps/moryflow/www/src/lib/homepage-sections.ts`

当前首页顺序固定为：

1. `hero`
2. `trust-strip`
3. `feature-agents`
4. `feature-local`
5. `feature-publish`
6. `compare`
7. `download-cta`

当前首页不再依赖旧版产品大图叙事。首页结构用文案、能力区块和 Compare 收口解释产品差异，最终把流量导向下载页。

## 5. 导航与转化入口

顶部导航的稳定入口见：

- `apps/moryflow/www/src/components/layout/Header.tsx`

当前桌面端和移动端都围绕以下入口组织：

1. `Compare`
2. `Pricing`
3. `Docs`
4. `GitHub`
5. `Download`

其中：

- `Download` 是唯一主 CTA
- `Compare` 承接差异化叙事
- `Pricing` 承接套餐与额度说明
- `Docs` 与 `GitHub` 属于辅助入口

页脚继续承担补充导航，不承载新的主转化路径。

## 6. 下载与定价口径

公开下载口径统一遵守：

- 产品入口页：`/{-$locale}/download`
- 手动下载与 release notes：GitHub Releases
- 应用内自动更新：`download.moryflow.com`

下载页当前公开提供的手动下载平台只有：

- macOS Apple Silicon
- macOS Intel

定价页当前直接承接套餐、额度和 FAQ，不再依赖额外的功能页做说明。

更细的下载与更新规则统一参考：

- `docs/design/moryflow/runbooks/www-and-docs-download-alignment.md`
- `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`

## 7. SEO 与 Compare 约束

SEO landing 与 Compare 页共用以下稳定边界：

1. 页面注册统一从 `site-pages.ts` 读取。
2. 页面类型只使用当前 registry 中的 `kind` 分类。
3. CTA 统一回到 `/download`。
4. Compare 页保持中性表达，不做攻击性替代叙事。
5. SEO 内容生产规则统一收口到 `docs/reference/moryflow-www-seo-content-guidelines.md`。

## 8. 当前验证基线

当前官网结构的验证基线由以下文件组成：

- `apps/moryflow/www/src/lib/site-pages.ts`
- `apps/moryflow/www/src/lib/homepage-sections.ts`
- `apps/moryflow/www/src/components/layout/Header.tsx`
- `apps/moryflow/www/src/components/layout/Footer.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/index.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/download.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/pricing.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/compare/*`

官网定位、页面分类、首页顺序、导航入口或下载口径失真时，先更新本文，再改代码和索引。
