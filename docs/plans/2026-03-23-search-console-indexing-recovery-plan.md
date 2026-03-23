# Moryflow Search Console 收录修复方案

## 目标

基于 Google Search Console 2026-03-23 的官方数据，解释 `moryflow.com` 当前大量页面未收录的直接原因，并给出可执行的修复方案。

本文档将严格区分：

- `Google 官方结论`：直接来自 Search Console 页面或 URL Inspection 的状态与文案
- `仓库 / 站点事实`：来自当前线上页面与仓库实现
- `推断`：基于上述两类事实做出的工程判断

## 基线采集信息

- 采集时间：`2026-03-23 10:30-11:40 CST (UTC+08:00)`
- 采集来源：
  - Search Console 属性入口：`https://search.google.com/search-console?resource_id=sc-domain:moryflow.com`
  - Pages report：`https://search.google.com/search-console/index?resource_id=sc-domain:moryflow.com`
  - Sitemaps report：同一属性下 `Sitemaps` 页面
  - URL Inspection：同一属性下 `URL inspection`，逐条检查本文列出的样例 URL
- 样本筛选口径：
  - `Pages 总览` 与 `Sitemaps 状态` 直接记录属性页在采集时刻显示的官方数字
  - `已收录样例` 优先选择已经确认 `Page is indexed` 的 compare、核心 landing、blog URL
  - `URL is unknown to Google` 与 `Discovered - currently not indexed` 样例优先选择当前业务价值高、同时在 sitemap 或 landing 扩展集中出现的 URL
  - 未收录样例覆盖英文与中文、landing 与 blog 两类页面，避免只基于单一路径得出判断

## Google 官方结论

### 1. Pages 总览

在 `Page indexing` 页面中，Search Console 当前显示：

- `Not indexed`: `179`
- `Indexed`: `32`

Google 给出的未收录原因共 `7` 类：

1. `Not found (404)`: `95`
2. `Page with redirect`: `19`
3. `Duplicate without user-selected canonical`: `6`
4. `Soft 404`: `2`
5. `Alternate page with proper canonical tag`: `1`
6. `Discovered - currently not indexed`: `45`
7. `Crawled - currently not indexed`: `11`

### 2. Sitemaps 状态

在 `Sitemaps` 页面中，Search Console 当前显示：

- Sitemap: `https://moryflow.com/sitemap.xml`
- Status: `Success`
- Submitted: `Mar 20, 2026`
- Last read: `Mar 20, 2026`
- `Discovered pages`: `60`
- `Discovered videos`: `0`

### 3. URL Inspection 抽样

以下结论均来自 Search Console 的 `URL Inspection`。

#### 已收录样例

- `https://moryflow.com/compare/manus`: `URL is on Google`
- `https://moryflow.com/compare/cowork`: `URL is on Google`
- `https://moryflow.com/agent-workspace`: `Page is indexed`
- `https://moryflow.com/zh/compare/cowork`: `Page is indexed`
- `https://moryflow.com/blog/best-ai-note-app-for-mac`: `Page is indexed`
- `https://moryflow.com/blog/ai-agents-for-writing`: `Page is indexed`
- `https://moryflow.com/zh/blog/ai-agents-for-writing`: `Page is indexed`

#### 未收录样例 A: `URL is unknown to Google`

- `https://moryflow.com/blog/moryflow-vs-typingmind`
  - `URL is not on Google`
  - `Page is not indexed: URL is unknown to Google`
  - `No referring sitemaps detected`
  - `Referring page: None detected`
  - `Last crawl: N/A`
- `https://moryflow.com/zh/blog/moryflow-vs-typingmind`
  - `Page is not indexed: URL is unknown to Google`
- `https://moryflow.com/ai-note-taking-app`
  - `Page is not indexed: URL is unknown to Google`

#### 未收录样例 B: `Discovered - currently not indexed`

- `https://moryflow.com/telegram-ai-agent`
  - `URL is not on Google`
  - `Page is not indexed: Discovered - currently not indexed`
  - `Sitemaps: https://moryflow.com/sitemap.xml`
  - `Referring page: None detected`
  - `Last crawl: N/A`
- `https://moryflow.com/notes-to-website`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/local-first-ai-notes`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/second-brain-app`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/digital-garden-app`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/local-first-ai-agent`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/blog/local-first-ai-tools`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/blog/notion-ai-alternatives`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/blog/second-brain-capture-to-publish`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/telegram-ai-agent`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/notes-to-website`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/ai-note-taking-app`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/local-first-ai-notes`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/second-brain-app`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/digital-garden-app`
  - `Page is not indexed: Discovered - currently not indexed`
- `https://moryflow.com/zh/local-first-ai-agent`
  - `Page is not indexed: Discovered - currently not indexed`

## 仓库 / 站点事实

### 1. 当前线上 sitemap

当前线上 `https://moryflow.com/sitemap.xml` 返回正常。

本地抓取当前 sitemap 后，`<loc>` 总数为 `80`。

并且以下 URL 确实已经出现在当前 sitemap 中：

- `/ai-note-taking-app`
- `/local-first-ai-notes`
- `/second-brain-app`
- `/digital-garden-app`
- `/telegram-ai-agent`
- `/local-first-ai-agent`
- `/blog/moryflow-vs-typingmind`
- `/blog/local-first-ai-tools`
- `/blog/notion-ai-alternatives`
- `/blog/second-brain-capture-to-publish`

相关实现：

- `apps/moryflow/www/src/lib/site-pages.ts`
- `apps/moryflow/www/src/lib/geo-article-defs.ts`
- `apps/moryflow/www/src/lib/sitemap.ts`

### 2. robots / canonical / SSR 基线

当前站点公开检查结果显示：

- `robots.txt` 允许抓取，并声明了 `Sitemap: https://moryflow.com/sitemap.xml`
- 页面 HTML 为 SSR 输出
- 样例页面存在 `meta robots=index, follow`
- 样例页面存在自指 canonical
- `www.moryflow.com` 会 301 到 `moryflow.com`

这说明“完全不可抓取”不是当前主问题。

### 3. 站内链接分布

从当前实现看，很多 SEO landing / blog 页面主要依赖：

- sitemap 暴露
- 页面内 `relatedPages`
- blog index 列表页

而全站稳定入口主要只覆盖：

- Header 中的少量 compare 页
- Footer 中的少量 compare 页与 `/blog`
- Home / Product 页对大量 SEO landing 页没有强入口

这意味着很多页面的站内发现链路偏弱。

## 推断

以下不是 Google 明说，而是基于 Search Console 官方数据与当前实现做出的工程判断。

### 1. 当前 sitemap 已与 Search Console 已读版本脱节

证据：

- Search Console `Sitemaps` 页显示 `Discovered pages = 60`
- 当前线上 sitemap 实际包含 `80` 个 URL
- `Last read = Mar 20, 2026`
- 但当前线上 sitemap 中已有多批 URL，在 URL Inspection 中依然出现：
  - `No referring sitemaps detected`
  - `URL is unknown to Google`

判断：

- Google 当前尚未完整处理现在线上的 sitemap 内容
- 至少有一部分新增 URL 还没有进入 Search Console 的有效发现链路

### 2. 当前“未收录很多”主要不是单一问题，而是三类问题叠加

优先级从高到低看，当前真正影响可索引页面的不是 `404`，而是：

1. `URL is unknown to Google`
2. `Discovered - currently not indexed`
3. `Crawled - currently not indexed`

其中：

- `404 (95)` 和 `redirect (19)` 会把总数显著抬高
- 但对当前官网可索引页面真正造成损失的，是 Google 尚未发现、发现但未抓取、抓取后仍未收录

### 3. 站内链接和内容信号不足，导致大量页面过度依赖 sitemap

证据：

- 多个 URL 虽然已在 sitemap 中，但 Inspection 仍显示未进入有效发现链路
- 站点导航对大多数 SEO landing 页和博客页没有稳定入口
- 大量 SEO 页面是相似模板结构，容易在被发现后继续落入 `Discovered` 或 `Crawled` 阶段

判断：

- 仅靠 sitemap 不足以让这些页稳定进入索引
- 需要补强内部链接、主题聚合页、以及内容差异化信号

## 修复方案

### P0. 先修 discovery 基线

#### 1. 重新提交 sitemap

立即在 Search Console 中重新提交：

- `https://moryflow.com/sitemap.xml`

目标：

- 让 `Last read` 更新到当前日期
- 让 `Discovered pages` 与当前 sitemap 实际 URL 数靠近

完成标准：

- Search Console 中 `Last read` 更新
- `Discovered pages` 不再停留在 `60`

#### 2. 将单文件 sitemap 拆分为 sitemap index

当前建议改成：

- `sitemap.xml` 作为 sitemap index
- `sitemap-pages.xml`
- `sitemap-blog.xml`

原因：

- 保持拆分数量最小，避免为了排障把 sitemap 结构切得过碎
- 能直接区分 `blog` 与 `pages` 两类 URL，足够覆盖当前主要收录问题
- 更容易在 Search Console 中判断到底是博客页掉队，还是产品 / SEO landing 页掉队
- 后续若确认问题主要集中在某一类，再考虑进一步按语言拆分，而不是一开始同时按内容类型和语言混合拆分

落点：

- `apps/moryflow/www/src/lib/sitemap.ts`
- `apps/moryflow/www/src/routes/sitemap[.]xml.ts`

配套要求：

- `robots.txt` 继续只声明 `Sitemap: https://moryflow.com/sitemap.xml`
- Search Console 重新提交的入口也只保留 `sitemap.xml`
- `sitemap-pages.xml` 覆盖首页、产品页、SEO landing、compare、legal
- `sitemap-blog.xml` 覆盖 blog index 与 blog article pages

#### 3. 为当前高价值未收录 URL 手动请求收录

优先批次：

1. `/ai-note-taking-app`
2. `/local-first-ai-notes`
3. `/second-brain-app`
4. `/digital-garden-app`
5. `/telegram-ai-agent`
6. `/local-first-ai-agent`
7. `/blog/moryflow-vs-typingmind`
8. `/blog/local-first-ai-tools`
9. `/blog/notion-ai-alternatives`
10. `/blog/second-brain-capture-to-publish`

原因：

- 这些 URL 已被 Search Console 明确标记为 `unknown to Google` 或 `discovered - currently not indexed`
- 它们是当前产品叙事和 SEO 入口中的高价值页

### P1. 补强内部链接，不再只靠 sitemap

#### 1. 增加稳定聚合入口

新增至少一个稳定入口页，集中链接 SEO landing 页，例如：

- `/use-cases`
- `/ai-workflows`
- 或在现有 `/compare`、`/blog` 之外新增产品能力索引页

要求：

- 首页、下载页、定价页、博客页都能链到这个聚合页
- 聚合页再链接全部高价值 SEO landing 页

#### 2. 首页与产品页增加到高价值落地页的直链

至少补以下直链：

- `/agent-workspace`
- `/ai-note-taking-app`
- `/local-first-ai-notes`
- `/second-brain-app`
- `/notes-to-website`

原因：

- 当前这些页面里有多页已被 Google 标为 `Discovered - currently not indexed`
- 它们需要来自强页面的稳定内部链接

#### 3. 每篇博客至少获得 3 个稳定入链

最低要求：

- 1 个来自 blog index
- 1 个来自相关 compare / SEO landing 页
- 1 个来自产品或主题聚合页

当前 `relatedPages` 还不够，尤其当页面本身尚未收录时，相关页之间互链的价值有限。

### P1. 修 sitemap 与 URL Inspection 的不一致

针对 `URL is unknown to Google` 这类页面，重点核对：

1. 当前 sitemap 是否稳定输出这些 URL
2. 这些 URL 是否在 Search Console 的最新已读 sitemap 版本里
3. 是否存在生成顺序、缓存或部署滞后，导致公开 sitemap 与 Google 实际读取版本不一致

建议验证项：

- 每次部署后记录 sitemap URL 总数
- 抽样比对高价值 URL 是否出现在最新线上 sitemap
- 重新读取后再看 Search Console 的 `Discovered pages`

### P2. 做内容去模板化，降低被跳过概率

这部分不是 Search Console 直接给出的原因，但从当前页面结构看是必要项。

#### 1. 强化每个 SEO landing 页的独特信息增量

避免只做模板替换，优先增加：

- 明确的目标人群差异
- 真实 workflow 差异
- 明确的产品边界
- 更具体的 FAQ，而不是泛化 FAQ

#### 2. 强化博客页的主题聚类

当前 blog 中存在一批产品对比 / 工具盘点 / workflow 文章，建议增加：

- 相关文章分组
- 主题页反向链接
- 系列文章导航

目标是让博客页不只是孤立 URL，而是形成主题簇。

### P2. 清理 404 / redirect / duplicate 噪音

虽然这不是“当前大量目标页未收录”的唯一根因，但它会显著污染 Search Console 总表。

需要从 Search Console 导出这三类 URL 并分别处理：

#### 1. `Not found (404)` `95`

- 区分历史遗留死链、错误外链、已删除路由
- 对仍有价值的旧 URL 做 301
- 对无价值 URL 保持 404，但移除站内链接与 sitemap 引用

#### 2. `Page with redirect` `19`

- 确认这些 URL 不在 sitemap 中
- 确认站内统一链接到最终 canonical URL

#### 3. `Duplicate without user-selected canonical` `6`

- 检查 hreflang / canonical / path 变体是否存在冲突
- 优先排查带 locale、尾斜杠、大小写、参数变体

## 执行计划

以下计划按依赖顺序执行。原则是先修 `发现链路`，再修 `内部链接`，最后再做 `噪音治理`。

### 阶段 0：锁定 Search Console 基线

**目标：**

- 在改代码前，固化一份可对比的 Search Console 基线

**执行项：**

1. 在 Search Console 导出当前 `Page indexing` 报表
2. 在 Search Console 导出 `Sitemaps` 页状态
3. 记录以下关键指标
   - `Not indexed = 179`
   - `Indexed = 32`
   - `Discovered - currently not indexed = 45`
   - `Crawled - currently not indexed = 11`
   - `Discovered pages = 60`
4. 记录当前高价值样例 URL 的 Inspection 状态
   - `/ai-note-taking-app`
   - `/telegram-ai-agent`
   - `/local-first-ai-notes`
   - `/blog/moryflow-vs-typingmind`
   - `/blog/local-first-ai-tools`

**交付物：**

- 一份本地保存的导出文件或截图集，作为改动前基线

### 阶段 1：重构 sitemap 为 index + 2 个子 sitemap

**目标：**

- 让 sitemap 结构更容易被 Search Console 观察和排障

**Files:**

- Modify: `apps/moryflow/www/src/lib/sitemap.ts`
- Modify: `apps/moryflow/www/src/routes/sitemap[.]xml.ts`
- Create: `apps/moryflow/www/src/routes/sitemap-pages[.]xml.ts`
- Create: `apps/moryflow/www/src/routes/sitemap-blog[.]xml.ts`
- Modify: `apps/moryflow/www/src/lib/__tests__/sitemap.spec.ts`

**执行项：**

1. 将现有 `generateSitemapXml` 拆成：
   - `generateSitemapIndexXml`
   - `generatePagesSitemapXml`
   - `generateBlogSitemapXml`
2. 让 `sitemap.xml` 输出 sitemap index，而不是直接输出全部 URL
3. 让 `sitemap-pages.xml` 只覆盖：
   - home
   - product
   - seo-landing
   - compare
   - legal
4. 让 `sitemap-blog.xml` 只覆盖：
   - blog index
   - blog article pages
5. 为 sitemap index 和两个子 sitemap 增加单元测试
6. 验证旧的 sitemap 断言已全部迁移到新的测试结构

**验证命令：**

```bash
pnpm --filter @moryflow/www test -- sitemap
pnpm --filter @moryflow/www typecheck
```

**完成标准：**

- `sitemap.xml` 返回合法 sitemap index
- `sitemap-pages.xml` 和 `sitemap-blog.xml` 都返回合法 XML
- 测试覆盖 index 与子 sitemap 内容边界

### 阶段 2：同步 robots 与 sitemap 配套测试

**目标：**

- 确保搜索引擎和 Search Console 都只通过 `sitemap.xml` 进入 sitemap index

**Files:**

- Modify: `apps/moryflow/www/src/routes/robots[.]txt.ts`
- Modify: `apps/moryflow/www/src/lib/__tests__/robots.spec.ts`

**执行项：**

1. 确认 `robots.txt` 只保留：
   - `Sitemap: https://moryflow.com/sitemap.xml`
2. 不在 `robots.txt` 中暴露子 sitemap
3. 更新 `robots.spec.ts`，固定新的期望输出

**验证命令：**

```bash
pnpm --filter @moryflow/www test -- robots
pnpm --filter @moryflow/www typecheck
```

**完成标准：**

- `robots.txt` 与 sitemap index 方案一致
- robots 相关测试全部通过

### 阶段 3：新增稳定聚合页，补强高价值页的内部发现链路

**目标：**

- 给高价值 SEO landing 页提供一个来自强页面的稳定入口

**Files:**

- Modify: `apps/moryflow/www/src/lib/site-pages.ts`
- Create: `apps/moryflow/www/src/routes/{-$locale}/use-cases.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/index.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/blog/index.tsx`
- Modify: `apps/moryflow/www/src/components/layout/Header.tsx`
- Modify: `apps/moryflow/www/src/components/layout/Footer.tsx`
- Modify: `apps/moryflow/www/src/lib/marketing-copy.ts`
- Modify: `apps/moryflow/www/src/lib/__tests__/seo.spec.ts`

**执行项：**

1. 在 `site-pages.ts` 注册 `/use-cases`
2. 创建 `/use-cases` 页面，集中链接以下高价值页
   - `/agent-workspace`
   - `/ai-note-taking-app`
   - `/local-first-ai-notes`
   - `/second-brain-app`
   - `/digital-garden-app`
   - `/notes-to-website`
   - `/telegram-ai-agent`
   - `/local-first-ai-agent`
3. 从首页增加到 `/use-cases` 的明确入口
4. 从 blog index 增加到 `/use-cases` 的入口
5. 从 Footer 增加到 `/use-cases` 的入口
6. 只在必要时更新 Header，避免新增噪音入口
7. 为新页面补 canonical / hreflang / registry 测试

**验证命令：**

```bash
pnpm --filter @moryflow/www test -- seo
pnpm --filter @moryflow/www typecheck
```

**完成标准：**

- `/use-cases` 可访问、已注册、可进 sitemap pages
- 首页 / blog / footer 都能稳定链到该页
- 聚合页能稳定链到全部高价值 SEO landing 页

### 阶段 4：补强目标页之间的主题内链

**目标：**

- 让高价值落地页和文章页形成最小主题簇，而不是只靠 sitemap 暴露

**Files:**

- Modify: `apps/moryflow/www/src/routes/{-$locale}/agent-workspace.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/ai-note-taking-app.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/local-first-ai-notes.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/second-brain-app.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/notes-to-website.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/telegram-ai-agent.tsx`
- Modify: `apps/moryflow/www/src/routes/{-$locale}/local-first-ai-agent.tsx`
- Modify: `apps/moryflow/www/src/content/geo/moryflow-vs-typingmind/en.md`
- Modify: `apps/moryflow/www/src/content/geo/moryflow-vs-typingmind/zh.md`
- Modify: `apps/moryflow/www/src/content/geo/local-first-ai-tools/en.md`
- Modify: `apps/moryflow/www/src/content/geo/local-first-ai-tools/zh.md`
- Modify: `apps/moryflow/www/src/content/geo/notion-ai-alternatives/en.md`
- Modify: `apps/moryflow/www/src/content/geo/notion-ai-alternatives/zh.md`
- Modify: `apps/moryflow/www/src/content/geo/second-brain-capture-to-publish/en.md`
- Modify: `apps/moryflow/www/src/content/geo/second-brain-capture-to-publish/zh.md`

**执行项：**

1. 检查每个高价值 landing 页的 `relatedPages`
2. 确保每页至少链到：
   - 1 个同类 landing 页
   - 1 个产品 / 下载页
   - 1 个 compare 或 blog 页
3. 检查目标博客页 frontmatter 中的 `relatedPages`
4. 补足至少 3 个稳定内链
5. 优先修复当前被官方标记为：
   - `URL is unknown to Google`
   - `Discovered - currently not indexed`

**验证命令：**

```bash
pnpm --filter @moryflow/www test:unit
pnpm --filter @moryflow/www typecheck
```

**完成标准：**

- 高价值 SEO 页和博客页都具备最小主题簇链接
- 不再只依赖 blog index 或 sitemap 单点发现

### 阶段 5：部署后重新提交 sitemap 并请求收录

**目标：**

- 让 Google 重新读取新的 sitemap 结构，并把高价值页推进到抓取队列

**执行项：**

1. 部署 sitemap index 与内链改动
2. 在 Search Console 重新提交：
   - `https://moryflow.com/sitemap.xml`
3. 对以下 URL 手动 `Request indexing`
   - `/ai-note-taking-app`
   - `/local-first-ai-notes`
   - `/second-brain-app`
   - `/digital-garden-app`
   - `/telegram-ai-agent`
   - `/local-first-ai-agent`
   - `/blog/moryflow-vs-typingmind`
   - `/blog/local-first-ai-tools`
   - `/blog/notion-ai-alternatives`
   - `/blog/second-brain-capture-to-publish`
4. 记录重新提交后的 `Last read`
5. 记录重新提交后一周内的 URL Inspection 变化

**完成标准：**

- `Last read` 更新到重新提交后的日期
- Search Console 中能看到新的 sitemap 结构被成功读取
- 高价值未收录页开始从 `unknown to Google` / `discovered` 进入下一阶段

### 阶段 6：清理 Search Console 噪音项

**目标：**

- 降低 `404` / `redirect` / `duplicate` 对排障视图的污染

**Files:**

- 待 Search Console 导出结果确认后逐项落地

**执行项：**

1. 导出 `404` URL 列表
2. 分类为：
   - 必须 301 的旧 URL
   - 应保留 404 的无价值 URL
3. 导出 `Page with redirect` 列表
4. 确认这些 URL 不再出现在 sitemap 与站内链接中
5. 导出 `Duplicate without user-selected canonical` 列表
6. 对照 canonical / hreflang / locale path 逐项修正

**完成标准：**

- Search Console 总表中噪音项下降
- 后续排障时可以更聚焦真实目标页的收录问题

## 建议改动落点

优先会涉及这些文件：

- `apps/moryflow/www/src/lib/site-pages.ts`
- `apps/moryflow/www/src/lib/sitemap.ts`
- `apps/moryflow/www/src/routes/sitemap[.]xml.ts`
- `apps/moryflow/www/src/routes/{-$locale}/index.tsx`
- `apps/moryflow/www/src/routes/{-$locale}/blog/index.tsx`
- `apps/moryflow/www/src/components/layout/Header.tsx`
- `apps/moryflow/www/src/components/layout/Footer.tsx`
- 新增一个 SEO / use cases 聚合页

## 验收标准

### 第一阶段

- Search Console `Sitemaps` 页的 `Last read` 更新为重新提交后的日期
- `Discovered pages` 从 `60` 上升并接近当前 sitemap 实际 URL 数
- 高价值未收录页完成手动 `Request indexing`

### 第二阶段

- `/ai-note-taking-app`
- `/local-first-ai-notes`
- `/second-brain-app`
- `/digital-garden-app`
- `/telegram-ai-agent`
- `/local-first-ai-agent`

上述 URL 中至少一半转为 `URL is on Google` / `Page is indexed`

### 第三阶段

- `unknown to Google` 样例页清零
- `Discovered - currently not indexed` 数量明显下降
- `404` / `redirect` / `duplicate` 的非预期条目减少

## 最终结论

当前问题不是“robots 配错”或“页面没 SSR”，而是：

1. Search Console 当前读取到的 sitemap 状态落后于线上 sitemap
2. 一批目标页虽然已在 sitemap 中，但仍停留在 `unknown to Google` 或 `discovered - currently not indexed`
3. 站内链接与内容信号不足，使这些页面过度依赖 sitemap，导致 Google 发现后也没有快速推进到抓取和收录

因此修复顺序应该是：

1. 先修 sitemap 发现链路
2. 再补内部链接
3. 再做内容去模板化
4. 最后清理 404 / redirect / duplicate 噪音
