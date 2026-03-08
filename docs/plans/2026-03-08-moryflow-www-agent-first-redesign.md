# Moryflow WWW Agent-First Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition `apps/moryflow/www` into an agent-first Moryflow product site, add registry-driven SEO landing pages, and ship a reusable SEO content generation guideline for future Codex-assisted page production.

**Architecture:** The implementation keeps TanStack Start file routes, rewrites the homepage and shared layout around an agent-first information architecture, introduces a single SEO page registry to drive route metadata and sitemap output, and adds reusable section components plus a stable SEO writing guideline document under `docs/reference`.

**Tech Stack:** TanStack Start (SSR), React 19, Tailwind CSS v4, Vitest, Nitro server routes, Markdown docs

---

## Design Summary

### Background

`apps/moryflow/www` 当前已经具备官网路由、基础 SEO 元信息、`robots.txt` 与 `sitemap.xml`，但整体仍偏通用 AI 营销站表达：

- 首页主叙事是 “thinking companion”，对 Agent 平台身份表达不足。
- 文案更像泛 AI assistant，不能准确体现 Moryflow 当前产品能力与差异。
- SEO 仍停留在基础 meta/sitemap 层，没有围绕主关键词簇建设专门落地页。
- 视觉上使用较多发光渐变和演示卡片，和目标中的 Notion 式克制产品官网风格不一致。

同时，市场上像 OpenClaw 这样的产品正在吸引一批“chat-native AI agent / Telegram AI assistant / personal AI operator”需求。公开资料显示，OpenClaw 当前主打的是 self-hosted、多聊天渠道接入、支持 Telegram 等消息入口的 agent gateway。这说明市场教育已经在发生，用户开始理解“能接消息渠道、能持续运行、有记忆的个人 Agent”这类产品形态。

对 Moryflow 而言，这不是要复制 OpenClaw，而是要借这波需求，把自己的差异说清楚：

- Moryflow 同样具备接入 Telegram 的能力，且能力覆盖已经接近用户对这类产品的核心预期。
- Moryflow 的差异不是“接更多渠道”，而是“更简单启动 + knowledge-native + local-first notes + publishable outputs”。
- 对很多非重度 self-hosted 用户，`打开桌面端即可使用` 本身就是更强的转化优势。

本次改造的目标不是做一次表层换皮，而是把 `www.moryflow.com` 调整为一个围绕桌面端下载转化的、Agent-first 的产品官网，并建立可持续扩张的 SEO 页面体系。

### Goals

业务目标：

- 让 `www.moryflow.com` 明确只介绍 Moryflow，不混入 Anyhunt 或泛品牌叙事。
- 将官网主心智收敛为 `local-first AI agent workspace`。
- 以桌面端下载作为全站唯一主转化目标。
- 把 `local-first AI notes` 与 `knowledge-native agent workflow` 作为核心差异化。

搜索目标：

- 主关键词簇：AI note-taking、Agent workspace / agent platform、PKM、second brain、digital garden
- 次关键词簇：notes to website、content publishing、publish notes as website
- 趋势截流词簇：OpenClaw alternative、Telegram AI agent、Telegram AI assistant、local-first AI agent、Notion AI agent、Obsidian AI agent

体验目标：

- 官网视觉风格参考 Notion 的克制、可信、强排版路线，而不是继续使用泛 AI landing page 风格。
- 信息架构必须围绕“Agent 平台 + knowledge-native + local-first + publishing”展开，避免双中心叙事导致首页分裂。

### Non-goals

- 本次不扩展 Moryflow 产品能力本身，不为官网编造不存在的功能。
- 不建设长篇博客系统，SEO 页以高转化落地页为主。
- 不做旧文案兼容；已有不准确页面允许直接重写或从主导航淡出。
- 不以注册、登录或案例浏览作为首页主 CTA。

### Product Positioning

定位一句话：

Moryflow 是一个 local-first 的 AI agent workspace：Agent 能在你的知识、笔记和文件上下文中持续工作，并把结果沉淀为可管理、可发布的知识资产。

品牌表达原则：

- 第一身份：`AI Agent Platform / Agent Workspace`
- 核心差异：`knowledge-native`，不是纯聊天 Agent，也不是纯自动化执行器
- 第二差异：`local-first AI notes`，对标 Notion / Obsidian 的知识组织能力
- 第三能力：`notes to website / content publishing`，作为知识输出层，而不是首页第一中心

首页表达口径：

- 中心叙事讲 `Agent platform`
- 用 `local-first AI notes` 解释为什么它比 Manus / Cowork 一类平台更适合长期知识工作
- 用 `publish notes to website` 解释为什么它不仅能执行，还能产出和发布

### Audiences And Conversion

核心受众：

1. 通用 Agent 工具用户
- 关注 Agent 能否持续理解上下文、沉淀结果、减少重复输入

2. Notion / Obsidian / PKM 用户
- 关注 AI-native 工作流、本地优先、知识资产化

3. 知识发布用户
- 关注能否把笔记快速发布为公开网站

4. 被 OpenClaw 一类产品教育过的用户
- 关注是否支持 Telegram / chat-first agent workflow
- 关注是否必须自托管、是否需要复杂配置
- 关注是否能把 Agent 的过程沉淀进长期知识系统

统一转化路径：

- 搜索入口或首页进入
- 明确理解 Moryflow 的 Agent-first 定位
- 看到与竞品的结构性差异
- 进入下载页
- 下载桌面端

### Site Information Architecture

顶部导航建议收敛为：

- Product
- Use Cases
- Compare
- Download
- Docs

首页结构建议：

1. Hero
- 标题直接表达 Agent 平台定位
- 副标题解释 `local-first` 与 `knowledge-native`
- 主 CTA：`Download for macOS / Windows`

2. Why Moryflow
- `Agent-native workspace`
- `Local-first AI notes`
- `Publishable knowledge`

3. How It Works
- collect context
- run agent tasks
- capture outputs into notes
- publish selected knowledge

4. Use Cases
- Research workflows
- Writing and drafting
- Personal knowledge base
- Digital garden publishing

5. Comparison
- 对比通用 Agent 平台与 Notion / Obsidian

6. Publishing
- notes to website 作为能力延伸

7. Final CTA
- 再次收敛到桌面端下载

页面取舍：

- `/`：重写为 Agent-first 首页
- `/download`：保留，但文案围绕桌面端安装与系统要求重写
- `/features`：重构为更聚焦的产品能力总览页
- `/pricing`：弱化，不作为主导航重点
- `/about`、`/privacy`、`/terms`：保留

### Visual Direction

- 参考 Notion，但不复刻 Notion
- 白底、米灰底、极浅分区背景
- 弱边框、高留白、强排版、少装饰
- 弱化聊天气泡式 demo，强化 workspace / notes / publish 结构展示
- 仅保留少量进入和区块显现动效，去掉持续发光、漂浮球等装饰

### SEO Architecture

SEO 页面不采用博客模型，而采用高转化落地页模型：

1. 核心关键词页
- `/agent-workspace`
- `/ai-note-taking-app`
- `/local-first-ai-notes`
- `/second-brain-app`
- `/digital-garden-app`

2. 次级能力页
- `/notes-to-website`
- `/publish-notes-as-website`
- `/content-publishing-for-notes`
- `/telegram-ai-agent`
- `/telegram-ai-assistant`
- `/local-first-ai-agent`

3. 对比页
- `/compare/notion`
- `/compare/obsidian`
- `/compare/manus`
- `/compare/cowork`
- `/compare/openclaw`

每个 SEO 页的统一骨架：

1. Hero
2. Problem framing
3. Why Moryflow
4. Workflow / use cases
5. Comparison or alternatives
6. FAQ
7. CTA

SEO 技术原则：

- 建立统一 SEO page registry，作为路由、meta、schema、sitemap 的单一事实源
- `sitemap.xml` 从 registry 动态生成
- 首页与产品页补齐 `SoftwareApplication` / `WebPage` / `FAQPage` 等结构化数据
- canonical、Open Graph、Twitter meta 统一生成

### Trend Capture And Traffic Strategy

这次官网和 SEO 不是只做“品牌页”，还要主动承接已经被市场教育过的需求。围绕 OpenClaw 热度，建议补三条流量线：

1. 替代词截流
- 目标：承接 “OpenClaw alternative / OpenClaw vs ...” 需求
- 动作：
- 增加 `/compare/openclaw`
- 在页面中明确对比两种路径：
- OpenClaw：偏 self-hosted、多渠道 gateway、配置能力强
- Moryflow：偏桌面端即开即用、knowledge-native、local-first、内容沉淀更自然
- 原则：只做能力与上手路径对比，不写不可证实的攻击性文案

2. Telegram 需求承接
- 目标：承接 “Telegram AI agent / Telegram AI assistant” 搜索和社媒讨论流量
- 动作：
- 增加 `/telegram-ai-agent`
- 增加 `/telegram-ai-assistant`
- 文案重点不是“我们也能连 TG”，而是“TG 只是入口，真正差异在长期记忆与本地知识上下文”

3. Agent + PKM 差异词
- 目标：承接同时在看 OpenClaw、Notion、Obsidian、Manus、Cowork 的用户
- 动作：
- 增加 `/local-first-ai-agent`
- 在首页、features、compare 页里强化这句结构性心智：
- `Agent platform with a real knowledge base, not just a chat endpoint`

除了 SEO 页面，还应在文档里预留非搜索分发方向：

- 对比型短内容：`Moryflow vs OpenClaw`, `Telegram AI agent without self-hosting`
- 场景型短内容：`Turn Telegram chats into durable knowledge`
- 产品演示素材：展示“打开桌面端 -> 连接 Telegram -> Agent 工作结果沉淀为 notes -> 发布网页”的闭环

这些内容不要求这轮马上上线，但官网文案和页面骨架必须为它们预留一致口径。

### SEO Content Guideline Requirement

需要新增稳定规范文档 `docs/reference/moryflow-www-seo-content-guidelines.md`，用于后续 Codex 批量生成 SEO 页。文档必须定义：

- 关键词输入格式
- 页面类型与适用场景
- slug 规则
- title / H1 / description 模板
- 正文固定结构
- FAQ 规则
- schema 规则
- 内链规则
- CTA 规则
- 禁止写法
- Codex 输入输出契约

### Acceptance Criteria

- 首屏 5 秒内能理解 Moryflow 是一个什么产品
- 用户能明确知道主 CTA 是下载桌面端
- 首页能回答“它和 Manus / Cowork / Notion / Obsidian 有什么不同”
- 首页和 compare 页能回答“它和 OpenClaw 有什么不同，为什么更适合即开即用的桌面 Agent 工作流”
- 建立一批围绕主关键词簇的专门 SEO 页面
- 建立一批用于承接趋势流量的页面：OpenClaw 替代词、Telegram AI agent 词、local-first agent 词
- SEO 技术设施升级为 registry 驱动
- 文案口径统一为 Agent-first + local-first + knowledge-native

## Execution Notes

- 本计划按 TDD 和最小闭环拆分，但当前仓库规则禁止未授权的 `git commit` / `git push`，因此所有“提交”步骤默认替换为“整理 diff 并等待用户授权”。
- 这是官网重构，不要求兼容旧营销叙事；失真的旧文案、旧 section、旧视觉样式允许直接删除。
- 风险级别整体按 L1 处理；若变更扩大到 shared SEO 工具或 SSR 头信息逻辑，按 L2 补充验证。

### Task 1: Freeze scope and shared copy contract

**Files:**
- Modify: `apps/moryflow/www/CLAUDE.md`
- Modify: `apps/moryflow/www/src/lib/seo.ts`
- Inspect: `apps/moryflow/www/src/components/seo/JsonLd.tsx`

**Step 1: Update local facts before UI work**

记录官网新的职责与页面体系，确保 `apps/moryflow/www/CLAUDE.md` 不再描述旧的 landing-only 结构，而是明确：

- 官网主定位为 Moryflow Agent-first product site
- 存在产品页、SEO 落地页、legal 页三类页面
- SEO registry 是后续单一事实源

**Step 2: Normalize site-wide SEO copy source**

在 `apps/moryflow/www/src/lib/seo.ts` 中重写 `siteConfig.title`、`siteConfig.description` 等默认口径，使全站基础 meta 与新的 Agent-first 定位一致。

**Step 3: Decide structured data scope**

检查 `apps/moryflow/www/src/components/seo/JsonLd.tsx` 现有 schema 类型，并列出需要补充的类型：

- `WebPage`
- `FAQPage`
- 可能的 compare/use-case page schema

**Step 4: Verification**

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

**Step 5: Diff checkpoint**

整理本任务 diff，等待用户授权后再决定是否提交。

### Task 2: Rebuild the global layout and navigation

**Files:**
- Modify: `apps/moryflow/www/src/components/layout/Header.tsx`
- Modify: `apps/moryflow/www/src/components/layout/Footer.tsx`
- Modify: `apps/moryflow/www/src/routes/__root.tsx`
- Modify: `apps/moryflow/www/src/styles/globals.css`

**Step 1: Write or update layout-focused tests if needed**

如果当前布局逻辑抽离出可测试的配置数据，优先为导航/footer link config 增加简单单元测试；若仍为纯展示组件，则记录为手工验证项。

**Step 2: Replace old navigation model**

将头部导航从 `Docs + Download` 最小模式改为新的产品官网信息架构，包含：

- Product
- Use Cases
- Compare
- Download
- Docs

同时保留移动端可用性，不新增复杂菜单状态。

**Step 3: Rebuild footer link groups**

把 footer 从旧的 `Product / Company` 调整为更适合 SEO 内链的分组，例如：

- Product
- Compare
- Resources
- Company

**Step 4: Align root-level document metadata**

在 `__root.tsx` 中校准 theme-color、通用 meta、可能的字体/preload 策略，去除与新视觉方向不一致的遗留设置。

**Step 5: Reset visual tokens**

在 `globals.css` 中把过强的紫色辉光和漂浮视觉语言收敛为 Notion-inspired 的浅底色、弱边框、清晰层级和有限动效。

**Step 6: Verification**

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

### Task 3: Rebuild the homepage into an agent-first product narrative

**Files:**
- Modify: `apps/moryflow/www/src/routes/index.tsx`
- Create: `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`
- Create: `apps/moryflow/www/src/components/landing/CorePillarsSection.tsx`
- Create: `apps/moryflow/www/src/components/landing/WorkflowLoopSection.tsx`
- Create: `apps/moryflow/www/src/components/landing/UseCasesSection.tsx`
- Create: `apps/moryflow/www/src/components/landing/CompareSection.tsx`
- Create: `apps/moryflow/www/src/components/landing/PublishingSection.tsx`
- Modify: `apps/moryflow/www/src/components/landing/index.ts`
- Delete or stop using: `apps/moryflow/www/src/components/landing/Hero.tsx`
- Delete or stop using: `apps/moryflow/www/src/components/landing/AgentShowcase.tsx`
- Delete or stop using: `apps/moryflow/www/src/components/landing/CapabilitiesSection.tsx`
- Delete or stop using: `apps/moryflow/www/src/components/landing/WhyLocalSection.tsx`
- Modify: `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`

**Step 1: Write a focused regression test for home metadata**

扩展 `apps/moryflow/www/src/lib/__tests__/seo.spec.ts` 或新增首页相关测试，确保首页 title/description/canonical 反映新的 Agent-first 文案。

**Step 2: Replace the hero**

用新的 `AgentFirstHero` 取代现有会话式 demo hero，首屏必须明确：

- Moryflow 是 Agent workspace
- local-first notes 是差异化底座
- 主 CTA 是下载桌面端

**Step 3: Build core narrative sections**

新增核心价值、工作流闭环、场景、竞品差异、发布能力五个 section，确保首页从“功能堆砌”变成“结构化产品叙事”。

**Step 4: Remove obsolete messaging**

删除或停用旧的 “thinking companion / not a chatbot” 等文案与演示逻辑，避免新旧叙事并存。

**Step 5: Tighten CTA flow**

首页所有主 CTA 统一跳转到 `/download`，不要引入额外主转化入口。

**Step 6: Verification**

Run: `pnpm --filter @moryflow/www test:unit`
Expected: PASS

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

### Task 4: Refactor existing product pages around the new message

**Files:**
- Modify: `apps/moryflow/www/src/routes/features.tsx`
- Modify: `apps/moryflow/www/src/routes/download.tsx`
- Modify: `apps/moryflow/www/src/routes/pricing.tsx`
- Modify: `apps/moryflow/www/src/routes/about.tsx`

**Step 1: Rewrite `/features` as product capabilities**

把 `/features` 从泛功能九宫格改成围绕 Agent workflow、knowledge memory、local-first notes、publishing 的能力页。

**Step 2: Rewrite `/download` for conversion**

把下载页聚焦到安装、系统要求、平台说明和下载引导，减少空泛品牌形容词。

**Step 3: De-emphasize `/pricing`**

保留 Beta 免费信息，但不要让 `pricing` 与首页形成新的主叙事中心；必要时把它改成 `Beta access / availability` 型页面。

**Step 4: Align `/about`**

让关于页与官网新定位一致，避免出现偏品牌故事或泛 AI 描述。

**Step 5: Verification**

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

### Task 5: Introduce the SEO page registry and dynamic sitemap source

**Files:**
- Create: `apps/moryflow/www/src/lib/seo-pages.ts`
- Modify: `apps/moryflow/www/src/lib/seo.ts`
- Modify: `apps/moryflow/www/server/routes/sitemap.xml.ts`
- Modify: `apps/moryflow/www/server/routes/__tests__/sitemap.spec.ts`
- Modify: `apps/moryflow/www/src/components/seo/JsonLd.tsx`

**Step 1: Write failing sitemap/registry tests**

先为 `sitemap.xml` 和 SEO registry 行为补测试，至少覆盖：

- 核心静态产品页存在
- 第一批 SEO 落地页存在
- compare 页存在

**Step 2: Create the registry**

在 `src/lib/seo-pages.ts` 中定义统一数据源，每条记录至少包含：

- slug/path
- page type
- title
- description
- keyword cluster
- canonical path
- schema mode
- sitemap priority / changefreq

**Step 3: Refactor sitemap generation**

让 `server/routes/sitemap.xml.ts` 从 registry 读取页面，而不是维护单独的硬编码数组。

**Step 4: Expand schema support**

让 `JsonLd.tsx` 支持首页、产品页、FAQ 页、对比页等所需 schema，避免后续每个页面重复造 schema。

**Step 5: Verification**

Run: `pnpm --filter @moryflow/www test:unit`
Expected: PASS

### Task 6: Ship the first batch of SEO landing pages

**Files:**
- Create: `apps/moryflow/www/src/components/seo-pages/SeoLandingPage.tsx`
- Create: `apps/moryflow/www/src/components/seo-pages/ComparePage.tsx`
- Create: `apps/moryflow/www/src/routes/agent-workspace.tsx`
- Create: `apps/moryflow/www/src/routes/ai-note-taking-app.tsx`
- Create: `apps/moryflow/www/src/routes/local-first-ai-notes.tsx`
- Create: `apps/moryflow/www/src/routes/second-brain-app.tsx`
- Create: `apps/moryflow/www/src/routes/digital-garden-app.tsx`
- Create: `apps/moryflow/www/src/routes/notes-to-website.tsx`
- Create: `apps/moryflow/www/src/routes/publish-notes-as-website.tsx`
- Create: `apps/moryflow/www/src/routes/telegram-ai-agent.tsx`
- Create: `apps/moryflow/www/src/routes/telegram-ai-assistant.tsx`
- Create: `apps/moryflow/www/src/routes/local-first-ai-agent.tsx`
- Create: `apps/moryflow/www/src/routes/compare/notion.tsx`
- Create: `apps/moryflow/www/src/routes/compare/obsidian.tsx`
- Create: `apps/moryflow/www/src/routes/compare/manus.tsx`
- Create: `apps/moryflow/www/src/routes/compare/cowork.tsx`
- Create: `apps/moryflow/www/src/routes/compare/openclaw.tsx`

**Step 1: Define reusable landing page props**

先设计 `SeoLandingPage` 和 `ComparePage` 的最小 props，确保页面可通过 registry 数据驱动，而不是为每个 route 复制一套 JSX。

**Step 2: Implement the first keyword-cluster routes**

创建主关键词簇与次关键词簇的首批页面，并让每个页面都具备：

- 唯一 title/H1
- 结构化 section
- 下载 CTA
- FAQ
- schema

**Step 3: Implement compare routes**

优先完成 `Notion / Obsidian / Manus / Cowork / OpenClaw` 五个对比页，以支撑用户心智迁移和趋势截流。

`/compare/openclaw` 的文案重点：

- 不否认 OpenClaw 的渠道能力与 self-hosted 价值
- 重点强调 Moryflow 的即开即用、桌面端下载转化、knowledge-native 工作流、本地优先沉淀
- 用“适合谁”而不是“谁更强”来组织比较

**Step 3.5: Implement trend-capture Telegram routes**

补 `telegram-ai-agent`、`telegram-ai-assistant`、`local-first-ai-agent` 三个页面，承接被 OpenClaw 和同类产品教育过的需求。

**Step 4: Interlink pages**

从首页、features、footer 与各 SEO 页之间补足内链，形成关键词簇之间的基本网络，并确保：

- 首页可链向 `telegram-ai-agent` 与 `/compare/openclaw`
- `/compare/openclaw` 回链到 `agent-workspace`、`local-first-ai-notes`、`download`

**Step 5: Verification**

Run: `pnpm --filter @moryflow/www test:unit`
Expected: PASS

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

### Task 7: Add the SEO content generation guideline for Codex workflows

**Files:**
- Create: `docs/reference/moryflow-www-seo-content-guidelines.md`
- Modify: `docs/index.md`

**Step 1: Write the guideline as a stable reference**

文档必须覆盖：

- 页面类型
- 关键词输入格式
- slug 规则
- title/H1/meta 模板
- section 模板
- FAQ 模板
- schema 规则
- internal linking 规则
- CTA 规则
- 禁止项

**Step 2: Add Codex-oriented production contract**

给出适合 Codex App 批量生成的输入输出契约，例如：

- 输入字段：primary keyword, secondary keywords, intent, audience, competitors, CTA
- 输出字段：meta, route slug, page outline, FAQ, schema payload

**Step 3: Ensure docs navigation stays truthful**

若新增参考文档使 `docs/index.md` 或相关索引失真，补最小必要导航修正。

**Step 4: Verification**

用人工走读确认该文档能直接作为后续 AI 生成页面的规范输入，不依赖上下文脑补。

### Task 8: Final validation and handoff

**Files:**
- Inspect: `apps/moryflow/www/src/routes/*`
- Inspect: `apps/moryflow/www/server/routes/*`
- Inspect: `docs/reference/moryflow-www-seo-content-guidelines.md`

**Step 1: Run the minimum affected validation set**

Run: `pnpm --filter @moryflow/www test:unit`
Expected: PASS

Run: `pnpm --filter @moryflow/www typecheck`
Expected: PASS

Run: `pnpm --filter @moryflow/www build`
Expected: PASS

**Step 2: Perform manual route checks**

手工检查以下页面的标题、首屏和 CTA：

- `/`
- `/download`
- `/agent-workspace`
- `/local-first-ai-notes`
- `/compare/notion`
- `/notes-to-website`

并确认 `sitemap.xml`、`robots.txt` 输出与预期一致。

**Step 3: Summarize residual risks**

记录未覆盖项，例如：

- 文案是否仍有 AI 模板味
- 对比页是否需要法律/品牌用语复核
- 是否需要后续补真实截图或产品画面

**Step 4: Handoff**

整理 diff、验证结果与剩余风险，等待用户决定是否进入实现。
