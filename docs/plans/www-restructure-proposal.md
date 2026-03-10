# Moryflow WWW 整站结构重构方案

> **Status**: `completed` — Phase 1~4 全部完成

## 一、背景与目标

Phase 1~3 完成了视觉体系对齐（token 统一、品牌色、字体、动效）。本次聚焦 **页面结构与内容架构** 的重构。

### 当前问题

1. **首页过长（9 个 section）**，pillars / workflow / use-cases / publishing / telegram 内容高度重叠
2. **独立页面与首页重复**：`/features` 和首页 pillars 重复；`/use-cases` 和首页 use-cases section 重复
3. **`/about` 内容单薄**，只有几段通用使命宣言，无独立价值
4. **Pricing 页仍是占位的"免费"卡片**，server 已有完整 4 tier 定价但官网未消费
5. **Compare 页未按流量优先级排列**，且在首页入口不够显眼
6. **导航入口与转化路径不匹配**：Features / Use Cases 占据导航位，Compare（截流主力）反而藏在首页中段
7. **Hero "Free forever" 文案与付费定价矛盾**

### 重构目标

- 首页精简到 4 section，提高信息密度和转化效率
- 导航以 Compare 截流 + GitHub star + Download 转化为核心
- Pricing 页消费 server 真实定价数据（Free / Starter / Basic / Pro）
- 砍掉与首页重复的独立页，降低维护成本
- Compare 页按实际流量排序，提升 SEO 截流效果
- GitHub Star 实时计数，增强社会证明

---

## 二、目标页面体系

### 保留页面

| 页面           | 路由                  | 说明                       |
| -------------- | --------------------- | -------------------------- |
| 首页           | `/`                   | 重构为 4 section           |
| 下载           | `/download`           | 保留，文案同步更新         |
| 定价           | `/pricing`            | 重写，消费 server 真实定价 |
| 隐私           | `/privacy`            | 法律必须                   |
| 条款           | `/terms`              | 法律必须                   |
| Compare 页 × 5 | `/compare/*`          | 截流主力，按流量排序       |
| SEO 落地页 × 8 | `/agent-workspace` 等 | 长尾关键词截流             |

### 删除页面

| 页面     | 路由         | 理由                        | 重定向目标 |
| -------- | ------------ | --------------------------- | ---------- |
| 功能     | `/features`  | 合并到首页 Features section | 301 → `/`  |
| 使用场景 | `/use-cases` | 合并到 SEO 页承载           | 301 → `/`  |
| 关于     | `/about`     | 内容太薄，暂无独立价值      | 301 → `/`  |

删除时需同步清理：`site-pages.ts` registry、`i18n.ts` 相关 key、Header/Footer 导航链接、sitemap。

301 重定向在 `www/server/routes/` 新建 Nitro server routes 实现。

---

## 三、首页重构

### 当前（9 section）

```
Hero → Pillars → Workflow → UseCases → Telegram → Compare → Publishing → SocialProof → DownloadCTA
```

### 目标（4 section）

```
Hero → Features → Compare → DownloadCTA
```

### Section 1: Hero

- 两行居中标题："Your AI agents" / "your knowledge"
- 副标题（一句话产品定位）
- Download 按钮 + GitHub Star 徽章（实时 star 数 + 品牌紫胶囊）
- **文案修正**："Free forever" → **"Free to start · Open Source"**（避免与付费 tier 矛盾）
- 产品截图占位（后续替换）

### Section 2: Features（新建）

合并原 CorePillarsSection + WorkflowLoopSection + TelegramAgentSection + PublishingSection 为一组紧凑的特性网格。

**布局**：2×3 卡片网格（移动端单列）

| 特性                 | 图标          | 一句话描述                                           |
| -------------------- | ------------- | ---------------------------------------------------- |
| AI Agent Workflows   | Bot           | Agents that work with your notes, files, and context |
| Local-first Notes    | HardDrive     | Your data stays on your device, always               |
| Knowledge Memory     | Brain         | Agents reference your past work across sessions      |
| One-click Publishing | Globe         | Turn any note into a live website                    |
| Telegram Agent       | MessageCircle | Continue your workflow from Telegram                 |
| Web Search           | Search        | Agents search the web with your context              |

每张卡片：图标 + 标题 + 一句描述，shadow 卡片 + hover 效果。不展开详细 workflow/步骤/截图——简洁有力。

### Section 3: Compare（改造 CompareStripSection）

**标题**："See how Moryflow compares"

**首页外露 Top 3**（用户确认）：

1. **OpenClaw** — 流量最高
2. **Cowork**
3. **Obsidian**

底部补一行："Also compare with [Manus](/compare/manus), [Notion](/compare/notion) →"

每张卡片：竞品名 + 一句核心差异 + "See comparison →" 链接。

### Section 4: Download CTA

合并原 SocialProofSection + DownloadCTA：

- GitHub Star 按钮（实时 star 数，显眼）
- "Free to start · Open Source" 文案
- Download 按钮
- 版本号 + Release notes 链接

---

## 四、导航重构

### 当前 Header

```
[Moryflow]    Features   Use Cases   Docs    [Download]
```

### 目标 Header

```
[Moryflow]    Compare ▾    Pricing    Docs    GitHub ★    [Download]
```

| 入口           | 说明                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Compare ▾**  | 下拉菜单，按流量排序列出 5 个竞品对比页（OpenClaw / Cowork / Obsidian / Manus / Notion） |
| **Pricing**    | 链接 `/pricing`                                                                          |
| **Docs**       | 外链 `docs.moryflow.com`                                                                 |
| **GitHub ★**   | 外链 `github.com/dvlin-dev/moryflow`，显示实时 star 数                                   |
| **[Download]** | 主 CTA 按钮，链接 `/download`                                                            |

移动端 hamburger 菜单中，Compare 以列表形式展开（不用下拉）。

### Footer

更新 link groups：

- **Product**: Download / Pricing
- **Compare**: OpenClaw / Manus / Cowork / Obsidian / Notion
- **Resources**: Docs / GitHub / Release Notes
- **Legal**: Privacy / Terms

---

## 五、Pricing 页重写

### 数据源

消费 `apps/moryflow/server/src/config/pricing.config.ts` 的真实定价：

| Tier        | 月付   | 年付   | AI Credits/月 | 站点数 | 存储   | 文件上限 |
| ----------- | ------ | ------ | ------------- | ------ | ------ | -------- |
| **Free**    | $0     | —      | 100/天        | 1      | 50 MB  | 1 MB     |
| **Starter** | $4.99  | $49.90 | 5,000         | 3      | 500 MB | 5 MB     |
| **Basic**   | $9.90  | $99    | 10,000        | 无限   | 1 GB   | 10 MB    |
| **Pro**     | $19.90 | $199   | 20,000        | 无限   | 10 GB  | 100 MB   |

额外 Credit 包：5,000/$5、10,000/$10、50,000/$50

### Credit 用户面表述

Server 内部用 "credits"（1000:1 USD），面向用户需要转换为可理解的语言。建议方案：

- 使用 **"AI credits"** 作为用户面术语
- 每个 tier 卡片标注 credit 数量 + 类比说明（如 "~X AI requests/month"）
- 具体类比数字需根据实际平均消耗确定

### 页面结构

1. Hero："Simple, transparent pricing"
2. 月付/年付切换（toggle）
3. 4 列定价卡片（Free / Starter / Basic / Pro）
   - Basic 作为 recommended，加 `border-brand` 高亮
   - 每列：价格 + 功能清单 + CTA 按钮
4. Credit 包补充说明
5. FAQ section（复用 FaqSection 组件）

### 结构化数据

Pricing 页使用 `SoftwareApplication` schema（和首页一致），内嵌 `offers` 数组描述 4 个 tier + FAQ schema。

### 实现注意

- 定价数据在 www 内硬编码（定价变动频率低，不值得引入共享配置的复杂度）
- 若后续定价频繁调整再考虑 `apps/moryflow/shared/pricing.ts`

---

## 六、GitHub Star 实时计数

### 方案

通过 Nitro server route 代理 GitHub API，1 小时 TTL 缓存。

### 实现

新建 `www/server/routes/api/v1/github-stars.ts`：

```
GET /api/v1/github-stars → { stars: number }
```

- 调用 `https://api.github.com/repos/dvlin-dev/moryflow`
- 读取 `stargazers_count`
- 内存缓存 1 小时（无需认证，60 次/小时足够）
- 前端通过 `fetch('/api/v1/github-stars')` 获取，SSR 时直接调用

### 使用位置

- Hero：GitHub Star 徽章显示 "★ {count} Star on GitHub"
- Header：GitHub 链接旁显示 star 数
- Download CTA：GitHub Star 按钮显示实时数

---

## 七、Compare 页优化

### 流量优先级排序

| 优先级 | 竞品     | 路由                | 首页外露 |
| ------ | -------- | ------------------- | -------- |
| 1      | OpenClaw | `/compare/openclaw` | ✅       |
| 2      | Manus    | `/compare/manus`    | 底部链接 |
| 3      | Cowork   | `/compare/cowork`   | ✅       |
| 4      | Obsidian | `/compare/obsidian` | ✅       |
| 5      | Notion   | `/compare/notion`   | 底部链接 |

### SEO 优化

- 标题格式：`Moryflow vs {Competitor} — Open Source AI Agent Workspace Alternative`
- 每页确保独立的 FAQ schema
- 内容需定期核实竞品最新动态

### 内部互链策略

- 每个 Compare 页底部 `relatedPages` 链接到相关 SEO 落地页
- 每个 SEO 落地页底部 `relatedPages` 链接到相关 Compare 页
- `SeoLandingPage` 和 `ComparePage` 模板已有 `relatedPages` prop，确保数据完整

### 后续扩展方向

可根据搜索量新增更多 Compare 页：Cursor、Mem、Reflect、Logseq 等。

---

## 八、删除页面的内容迁移

### `/features` → 首页 Features section

原 features 页的 4 个详细特性描述 → 精简为首页 6 张特性卡片。
详细特性描述由 SEO 落地页承载（`/agent-workspace`、`/local-first-ai-notes` 等已覆盖）。

### `/use-cases` → SEO 页承载

原 4 个场景已有对应 SEO 落地页覆盖：

- Research → `/agent-workspace`
- Writing → `/ai-note-taking-app`
- PKM → `/second-brain-app`
- Digital Garden → `/digital-garden-app`

### `/about` → 直接删除

暂无独立价值。公司信息后续可在 Footer 或 Docs 站承载。

---

## 九、执行分 Phase

### Phase 1: 首页重构 + 导航 + Compare 排序 + 下载页文案 ✅ completed

| 任务                                                              | 文件                                                    | 状态 |
| ----------------------------------------------------------------- | ------------------------------------------------------- | ---- |
| 新建 FeaturesSection 组件（6 卡片网格）                           | `src/components/landing/FeaturesSection.tsx`            | ✅   |
| 改造 CompareStripSection（Top 3 + 底部链接，按流量排序）          | `src/components/landing/CompareStripSection.tsx`        | ✅   |
| 合并 SocialProof + DownloadCTA 为新 DownloadCTA（含 GitHub Star） | `src/components/landing/DownloadCTA.tsx`                | ✅   |
| 更新 homepage-sections 配置（4 section）                          | `src/lib/homepage-sections.ts` + `HomePageSections.tsx` | ✅   |
| Header 改为 Compare 下拉 + Pricing + Docs + GitHub ★ + Download   | `src/components/layout/Header.tsx`                      | ✅   |
| Footer link groups 更新                                           | `src/lib/marketing-copy.ts`                             | ✅   |
| Hero 文案修正（"Free to start · Open Source"）                    | `AgentFirstHero.tsx` + `i18n.ts`                        | ✅   |
| Download 页文案同步更新（去掉 "Free during beta"）                | `i18n.ts`                                               | ✅   |
| GitHub Star API 路由（Nitro，1h 缓存）                            | `server/routes/api/v1/github-stars.ts`                  | ✅   |
| GitHub Star 客户端 Hook                                           | `src/hooks/useGitHubStars.ts`                           | ✅   |
| Compare 页 SEO 标题优化                                           | `src/routes/{-$locale}/compare/*.tsx`                   | ✅   |
| i18n 新增/更新 key（en + zh）                                     | `src/lib/i18n.ts`                                       | ✅   |
| 测试更新（homepage-sections / localized-copy / AgentFirstHero）   | `__tests__/*`                                           | ✅   |

### Phase 2: Pricing 页重写 ✅ completed

| 任务                                                        | 文件                                | 状态 |
| ----------------------------------------------------------- | ----------------------------------- | ---- |
| Pricing 页重写（4 tier 卡片 + 月/年切换 + FAQ + Credit 包） | `src/routes/{-$locale}/pricing.tsx` | ✅   |
| i18n 定价相关 key（en + zh）                                | `src/lib/i18n.ts`                   | ✅   |
| meta description 更新                                       | `src/lib/i18n.ts`                   | ✅   |

### Phase 3: 删除页面 + 清理 ✅ completed

| 任务                                             | 文件                                                    | 状态 |
| ------------------------------------------------ | ------------------------------------------------------- | ---- |
| 删除 features.tsx、use-cases.tsx、about.tsx 路由 | `src/routes/{-$locale}/`                                | ✅   |
| site-pages.ts 移除对应 registry                  | `src/lib/site-pages.ts`                                 | ✅   |
| i18n.ts 清理废弃 key（~100+ en/zh）              | `src/lib/i18n.ts`                                       | ✅   |
| Header/Footer 已在 Phase 1 更新，无废弃链接      | 布局组件                                                | ✅   |
| 新建 301 重定向 Nitro routes                     | `server/routes/features.ts`、`use-cases.ts`、`about.ts` | ✅   |
| 删除废弃组件（6 个 section 组件）                | `src/components/landing/`                               | ✅   |
| 更新 landing barrel export                       | `src/components/landing/index.ts`                       | ✅   |
| 修复 seo.spec.ts / sitemap.spec.ts 测试          | `__tests__/*`                                           | ✅   |

---

## 十、删除组件清单

Phase 3 统一删除：

- `CorePillarsSection.tsx` → 被 FeaturesSection 替代
- `WorkflowLoopSection.tsx` → 合并到 FeaturesSection
- `UseCasesSection.tsx` → 删除（SEO 页承载）
- `TelegramAgentSection.tsx` → 合并到 FeaturesSection 一张卡片
- `PublishingSection.tsx` → 合并到 FeaturesSection 一张卡片
- `SocialProofSection.tsx` → 合并到 DownloadCTA

---

## 十一、Phase 4: 文案一致性 + SEO 补强 ✅ completed

| 任务                                                                   | 状态 |
| ---------------------------------------------------------------------- | ---- |
| "Free during beta" → "Free to start" 全量替换（i18n + 8 SEO 页 + FAQ） | ✅   |
| 移除 Windows 承诺（i18n meta/FAQ + SEO 页 FAQ/workflow）               | ✅   |
| Compare 页 "Proprietary" → "Open Source" + 定价行更新                  | ✅   |
| `obsidian.tsx` FAQ 开源描述修正                                        | ✅   |
| `openclaw.tsx` 差异描述修正（both open source）                        | ✅   |
| relatedPages 断链修复（`/features`、`/use-cases` 引用归零）            | ✅   |
| SEO 页互链补充（second-brain + local-first-ai-notes 双向）             | ✅   |
| Pricing 页结构化数据（SoftwareApplication + 4 Offer）                  | ✅   |
| `site-pages.ts` pricing schema → SoftwareApplication                   | ✅   |

---

## 十二、风险与约束

1. **301 重定向**：`/features`、`/use-cases`、`/about` 在 `www/server/routes/` 新建 Nitro 路由实现 301 到 `/`，避免 SEO 断链
2. **i18n 范围**：首页新 section + pricing 页需要同步 en + zh 翻译
3. **定价数据同步**：www 硬编码当前定价，server 调整时需手动同步
4. **Compare 内容核实**：所有竞品对比内容需在执行前对照最新公开资料核实
5. **GitHub API 限流**：无认证 60 次/小时，1 小时缓存足够；高并发场景需增加缓存层或添加 GitHub token
6. **内部互链**：确保 SEO 页和 Compare 页的 `relatedPages` 数据完整互链
