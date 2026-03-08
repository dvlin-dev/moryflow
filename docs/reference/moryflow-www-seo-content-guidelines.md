---
title: Moryflow WWW SEO Content Guidelines
scope: apps/moryflow/www
status: active
---

# Moryflow WWW SEO 内容生成规范

本文档是 Moryflow 官网 SEO 页面的内容生产规范，既用于人工撰写也用于 AI（Codex）批量生成。

## 页面类型

| 类型          | 说明                         | 组件             | Schema                            |
| ------------- | ---------------------------- | ---------------- | --------------------------------- |
| `seo-landing` | 核心 / 次级关键词落地页      | `SeoLandingPage` | `FAQPage`                         |
| `compare`     | 竞品对比页                   | `ComparePage`    | `FAQPage`                         |
| `product`     | 产品页（首页、功能、下载等） | 自定义           | `WebPage` / `SoftwareApplication` |
| `legal`       | 法律页（隐私、条款）         | 自定义           | `WebPage`                         |

## Slug 规则

- 全小写，单词用连字符分隔：`/agent-workspace`、`/ai-note-taking-app`
- 对比页统一前缀 `/compare/`：`/compare/notion`
- 不使用下划线、驼峰、尾部斜杠
- Slug 必须与 SEO registry（`src/lib/seo-pages.ts`）中 `path` 字段完全一致
- 路由文件放在 `src/routes/{-$locale}/` 下，对比页放在 `src/routes/{-$locale}/compare/`

## 关键词输入格式

每页必须明确：

- **Primary keyword**：页面核心目标词（1 个），用作 H1 核心
- **Secondary keywords**：长尾 / 相关词（2-5 个），在 H2、FAQ、正文中自然覆盖
- **Search intent**：Informational / Commercial / Navigational
- **Target audience**：描述目标用户画像（1-2 句）

## Title / H1 / Meta 模板

### Title（`<title>` / OG title）

```
{Page Title} | Moryflow
```

- 总长度不超过 60 字符（含 `| Moryflow`）
- 核心关键词放在最前
- 禁止全大写、感叹号、emoji

### H1

- 每页只有一个 H1
- H1 必须包含 primary keyword 或其自然变体
- H1 不与 `<title>` 完全重复，但含义一致
- 不以问句作为 H1

### Meta Description

- 120-155 字符
- 包含 primary keyword
- 以动词或名词开头，描述用户将获得什么
- 禁止 "Learn more about..." / "Discover..." 等空泛开头

## Section 模板

### SeoLandingPage 结构

```
Hero → Problem Framing → Why Moryflow → Workflow → FAQ → Related Pages → CTA
```

**Hero**

- H1 + 1-2 行 subheadline
- 下载 CTA 按钮
- "Free during beta · macOS & Windows"

**Problem Framing**

- H2 标题说明用户痛点范畴
- 4 个卡片，每卡包含 title + description
- 基于具体用户痛点和真实场景
- **禁止**："Have you ever..." / "你是否曾经..." / "Imagine a world where..." 等 AI 模板句式
- **禁止**：空泛描述和抽象痛点
- 每个 point 必须可被一个真实用户场景验证

**Why Moryflow**

- H2 + 3 个 icon 卡片
- 每卡含 LucideIcon + title + description
- 聚焦 Moryflow 如何解决上述痛点
- 使用具体动词描述能力，不用形容词堆砌

**Workflow**

- "How it works" H2
- 4 步骤，每步含 step label + title + description
- 步骤逻辑必须连贯：context → action → output → value

**FAQ**

- 4-5 个问答
- 覆盖 primary + secondary keywords 的自然问法
- 最后一个 FAQ 固定为 "Is Moryflow free?" 或定价相关

### ComparePage 结构

```
Hero → At a Glance → Who It's For → Key Differences → FAQ → Related Pages → CTA
```

**At a Glance**

- 6 行对比表格
- 行维度：Architecture / AI approach / Data / Publishing / Focus / Pricing
- 每格简短事实描述，不评价

**Who It's For（双栏）**

- 左：Moryflow may be a better fit if you…（5 点）
- 右：{Competitor} may be a better fit if you…（5 点）
- **禁止**"替代品" / "更好" / "更强" 等攻击性表述
- 公平承认竞品优势

**Key Differences**

- 3-4 个 area 卡片
- 中性描述，用 "different approach" / "focuses on" 框架

## FAQ 模板

- 问题用自然问法，覆盖用户实际搜索词
- 答案 2-4 句话，直接回答问题
- 答案不开头说 "Great question!" / "That's a good question"
- 每页 FAQ 中至少 1 个覆盖 primary keyword 的定义型问题（"What is..."）
- 至少 1 个覆盖 Moryflow 与竞品/替代方案的差异型问题
- FAQ 用于 FAQPage JSON-LD schema，必须确保 question 和 answer 字段完整

## Schema 规则

- SEO 落地页和对比页统一使用 `FAQPage` schema
- 通过 `createFAQPageSchema()` 工厂函数生成
- 首页使用 `Organization` + `SoftwareApplication`
- 下载页使用 `SoftwareApplication`
- 其他产品页使用 `WebPage`
- Schema 通过 `<JsonLd data={...} />` 组件注入

## Registry 规则

每个新页面必须在 `src/lib/seo-pages.ts` 注册，字段要求：

| 字段                | 必需 | 说明                                                   |
| ------------------- | ---- | ------------------------------------------------------ | ---------------- |
| `path`              | 是   | URL path（无 locale 前缀），以 `/` 开头                |
| `pageType`          | 是   | `product` / `seo-landing` / `compare` / `legal`        |
| `title`             | 是   | 页面 title（不含 `                                     | Moryflow` 后缀） |
| `description`       | 是   | Meta description                                       |
| `keywordCluster`    | 否   | 关键词簇，逗号分隔                                     |
| `canonical`         | 是   | 完整 canonical URL                                     |
| `schemaMode`        | 是   | `WebPage` / `FAQPage` / `SoftwareApplication` / `none` |
| `sitemapPriority`   | 是   | `1.0` / `0.8` / `0.7` / `0.5` / `0.3`                  |
| `sitemapChangefreq` | 是   | `weekly` / `monthly` / `yearly`                        |
| `lastModified`      | 是   | ISO 日期字符串，使用 `BUILD_DATE` 常量                 |
| `locales`           | 是   | 支持的 locale 数组：`['en', 'zh']` 或 `['en']`         |
| `ogImage`           | 否   | Per-page OG 图片 URL                                   |
| `redirects`         | 否   | 旧路径数组，用于 301 重定向                            |

## Internal Linking 规则

- 每个 SEO 落地页的 `relatedPages` 至少 3 个内链
- 链接目标覆盖：至少 1 个同类 SEO 页 + 至少 1 个产品页（features/download/use-cases）
- 对比页回链到对应能力页（agent-workspace、local-first-ai-notes 等）+ download
- use-cases 每个场景链向对应 SEO 落地页
- Footer 保持完整的 Compare 组和 Resources 组链接
- features 底部保持 compare 链接入口

## CTA 规则

- 每页有且仅有 2 个下载 CTA：Hero 区域 1 个 + 底部 1 个
- CTA 按钮文案统一：`Download Moryflow`
- 按钮使用 `@moryflow/ui` 的 `Button` 组件
- 必须有 `data-track-cta` 属性：`seo-hero-download` / `seo-cta-download` / `compare-cta-download`
- CTA 下方小字：`Free during beta · macOS & Windows`
- 所有 CTA 跳转到 `/download`

## 禁止项

### 文案禁止

- "Have you ever..." / "你是否曾经..." / "Imagine..." 等 AI 模板句式
- "Best" / "最好的" / "industry-leading" / "revolutionary" 等空泛形容词
- "替代品" / "更好" / "更强" / "killer" 等攻击性竞品表述
- "Learn more" / "Discover" / "Explore" 作为 meta description 开头
- 全大写、感叹号、emoji
- 虚构的用户评价、统计数据或社会证明
- 未经事实核查的竞品功能描述

### 技术禁止

- `lastModified` 使用 `new Date()` 动态生成
- 页面不在 registry 注册
- FAQ 问答数少于 4 个
- H1 缺少 primary keyword
- 缺少 JSON-LD schema
- 内链少于 3 个

### 视觉禁止

- 装饰性动画（float / glow / particle / gradient blob）
- `backdrop-blur`、`bg-gradient-to-*` 装饰
- 品牌色 `#ff9f1c` 用于大面积背景
- `animate-*` 除白名单（`fade-in`、`spin` for loader）外

---

## Codex 批量生成契约

### 输入格式

```typescript
interface SeoPageInput {
  primaryKeyword: string; // "AI agent workspace"
  secondaryKeywords: string[]; // ["agent platform", "AI workspace app"]
  intent: 'informational' | 'commercial' | 'navigational';
  audience: string; // "Knowledge workers looking for AI-powered note-taking"
  competitors?: string[]; // ["Notion", "Obsidian"] — only for compare pages
  pageType: 'seo-landing' | 'compare';
}
```

### 输出格式

```typescript
interface SeoPageOutput {
  // Registry entry
  registry: {
    path: string; // "/agent-workspace"
    pageType: PageType;
    title: string; // "AI Agent Workspace"
    description: string; // Meta description (120-155 chars)
    keywordCluster: string; // "agent workspace, agent platform"
    canonical: string; // "${BASE_URL}/agent-workspace"
    schemaMode: SchemaMode; // "FAQPage"
    sitemapPriority: string; // "0.8" for core, "0.7" for secondary
    sitemapChangefreq: string; // "monthly"
    locales: string[]; // ["en", "zh"]
  };

  // Route file content
  route: {
    slug: string; // "agent-workspace"
    componentName: string; // "AgentWorkspacePage"
    filePath: string; // "src/routes/{-$locale}/agent-workspace.tsx"
  };

  // Page content (for SeoLandingPage props)
  content: {
    headline: string;
    subheadline: string;
    problemTitle: string;
    problemPoints: { title: string; description: string }[];
    whyTitle: string;
    whyPoints: { icon: string; title: string; description: string }[];
    workflowSteps: { step: string; title: string; description: string }[];
    faqs: { question: string; answer: string }[];
    ctaTitle: string;
    ctaDescription: string;
    relatedPages: { label: string; href: string }[];
  };

  // For ComparePage (when pageType is 'compare')
  compareContent?: {
    competitor: string;
    dimensions: { label: string; moryflow: string; competitor: string }[];
    moryflowFit: { title: string; points: string[] };
    competitorFit: { title: string; points: string[] };
    differences: { area: string; description: string }[];
  };
}
```

### 生成流程

1. 接收 `SeoPageInput`
2. 根据 `pageType` 选择 `SeoLandingPage` 或 `ComparePage` 模板
3. 生成 `SeoPageOutput` 中的所有字段
4. 在 `seo-pages.ts` 中添加 registry 条目
5. 创建路由文件
6. 重新生成路由树：`npx @tanstack/router-cli generate`
7. 验证：`pnpm --filter @moryflow/www typecheck && pnpm --filter @moryflow/www test:unit`

### 质量检查清单

- [ ] H1 包含 primary keyword
- [ ] Meta description 120-155 字符，包含 primary keyword
- [ ] Problem framing 基于真实用户场景，无 AI 模板句式
- [ ] FAQ 覆盖 primary + secondary keywords
- [ ] FAQ 包含定义型问题和差异型问题
- [ ] relatedPages 至少 3 个内链
- [ ] registry 条目已添加
- [ ] data-track-cta 属性已设置
- [ ] typecheck 和 test:unit 通过
