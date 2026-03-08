# Moryflow 官网 Agent-First 改造实施计划

> **For Claude:** 必需子技能：使用 superpowers:executing-plans 逐任务执行本计划。

**目标：** 将 `apps/moryflow/www` 重新定位为 Agent-first 的 Moryflow 产品官网，新增 registry 驱动的 SEO 落地页体系，并产出可复用的 SEO 内容生成规范，供后续 Codex 辅助批量生产。

**架构：** 保留 TanStack Start 文件路由，围绕 Agent-first 信息架构重写首页和共享布局，引入统一 SEO 页面 registry 驱动路由元信息和 sitemap 输出，新增可复用的 section 组件，并在 `docs/reference` 下新增稳定的 SEO 写作规范文档。

**技术栈：** TanStack Start (SSR)、React 19、Tailwind CSS v4、Vitest、Nitro 服务端路由、Markdown 文档

**UI 组件约束：** 优先使用 `@moryflow/ui`（`packages/ui`）中已有的组件（Button、Card、Accordion、NavigationMenu、Sheet、Tabs、Badge、Separator 等），通过外部 `className` 覆盖实现官网品牌风格自定义，不修改组件库源码。仅当组件库不覆盖的场景（如 bento grid 布局、Hero 截图容器等）才新建官网专属组件。

---

## 设计摘要

### 背景

`apps/moryflow/www` 当前已经具备官网路由、基础 SEO 元信息、`robots.txt` 与 `sitemap.xml`，但整体仍偏通用 AI 营销站表达：

- 首页主叙事是 “thinking companion”，对 Agent 平台身份表达不足。
- 文案更像泛 AI assistant，不能准确体现 Moryflow 当前产品能力与差异。
- SEO 仍停留在基础 meta/sitemap 层，没有围绕主关键词簇建设专门落地页。
- 视觉上使用较多发光渐变和演示卡片，和目标中的 Notion 式克制产品官网风格不一致。

同时，市场上像 OpenClaw 这样的产品正在吸引一批“chat-native AI agent / Telegram AI assistant / personal AI operator”需求。公开资料显示，OpenClaw 当前主打的是 self-hosted、多聊天渠道接入、支持 Telegram 等消息入口的 agent gateway。这说明市场教育已经在发生，用户开始理解“能接消息渠道、能持续运行、有记忆的个人 Agent”这类产品形态。

对 Moryflow 而言，这不是要复制 OpenClaw，而是要借这波需求，把自己的差异说清楚：

- Moryflow 已具备 Telegram 接入能力（当前唯一支持的外部消息渠道，未来将拓展更多），在 Agent + 知识沉淀路径上已形成差异化。注意：OpenClaw 拥有 250K+ GitHub stars、13,700+ 社区 skills、支持 WhatsApp/Telegram/Slack/邮件/浏览器自动化等多渠道多任务执行，两者产品形态差异显著，官网不应暗示"可替代"，而应强调"不同路径"。
- Moryflow 的差异不是“接更多渠道”，而是“更简单启动 + knowledge-native + local-first notes + publishable outputs”。
- 对很多非重度 self-hosted 用户，`打开桌面端即可使用` 本身就是更强的转化优势。
- Cowork（Claude Cowork）是 Anthropic 旗下产品，对比页需审慎措辞，避免品牌风险。

本次改造的目标不是做一次表层换皮，而是把 `www.moryflow.com` 调整为一个围绕桌面端下载转化的、Agent-first 的产品官网，并建立可持续扩张的 SEO 页面体系。

### 目标

业务目标：

- 让 `www.moryflow.com` 明确只介绍 Moryflow，不混入 Anyhunt 或泛品牌叙事。
- 将官网主心智收敛为 `local-first AI agent workspace`。
- 以桌面端下载作为全站唯一主转化目标。
- 把 `local-first AI notes` 与 `knowledge-native agent workflow` 作为核心差异化。

搜索目标：

- 主关键词簇：AI note-taking、Agent workspace / agent platform、PKM、second brain、digital garden
- 次关键词簇：notes to website、content publishing、publish notes as website
- 趋势截流词簇：OpenClaw alternative、Telegram AI agent、local-first AI agent、Notion AI agent、Obsidian AI agent
  - 注意："Telegram AI assistant" 作为长尾词在 `/telegram-ai-agent` 页面的 H2/FAQ 中覆盖，不单独建页，避免关键词自蚕食

体验目标：

- 官网视觉风格参考 Notion 的克制、可信、强排版路线，而不是继续使用泛 AI landing page 风格。
- 信息架构必须围绕“Agent 平台 + knowledge-native + local-first + publishing”展开，避免双中心叙事导致首页分裂。

国际化目标：

- 官网一期支持英文（默认）和中文两种语言。
- 采用 URL 路径前缀策略：英文为根路径 `/`，中文为 `/zh/` 前缀。
- 每个页面输出 `hreflang` 标签，指向对应语言版本。
- sitemap 包含所有语言版本的 URL。
- SEO 落地页优先完成英文版，中文版作为二期跟进或与英文版同步建设。

### 非目标

- 本次不扩展 Moryflow 产品能力本身，不为官网编造不存在的功能。
- 不建设长篇博客系统，SEO 页以高转化落地页为主。
- 不做旧文案兼容；已有不准确页面允许直接重写或从主导航淡出。
- 不以注册、登录或案例浏览作为首页主 CTA。

### 产品定位

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

### 受众与转化

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

### 站点信息架构

顶部导航参考 Notion 官网结构（左侧品牌+导航，右侧 CTA），收敛为：

左侧导航：
- Logo + Moryflow（品牌，链接首页）
- Product → `/features`
- Use Cases → `/use-cases`
- Docs → `docs.moryflow.com`（外部链接，`target="_blank"`）

右侧 CTA 区：
- Download（primary button，始终可见，链接 `/download`；参考 Notion 右上角 "Get Notion free" 的处理方式）

注意：Compare 不作为顶级导航项，通过 footer "Compare" 分组和 `/features` 页面底部承接。把 Compare 放在顶部导航会暴露攻击性意图。

移动端：左侧折叠为汉堡菜单，右侧 Download 按钮保持可见。

首页结构建议：

1. Hero（参考 Notion：简洁标题 + 产品界面截图）
- 标题直接表达 Agent 平台定位，一句话说清 Moryflow 是什么
- 副标题解释 `local-first` 与 `knowledge-native`，不超过两行
- 主 CTA：单个按钮，根据 User-Agent 自动检测当前 OS 展示对应文案（如 "Download for macOS"），下方小字链接其他平台（参考 Notion "Download for Mac" + 底部 "also available on..." 的做法）。需基于现有 `useDownload.ts` 扩展 `detectPlatform()` 函数（当前 hook 仅有 manifest 拉取，无 OS 自动检测）
- 标题下方必须展示产品界面截图或动态 mockup（桌面端界面，展示 Agent workspace + Notes 的核心视觉）。没有截图的纯文字 Hero 无法让用户在首屏理解产品形态

2. Why Moryflow（Notion-style bento grid，非传统三列文字卡片）
- 采用 2-3 个大尺寸不等宽卡片（bento grid 布局），每个卡片包含：标题 + 一句话描述 + 产品局部截图或示意图
- 三个支柱：`Agent-native workspace` / `Local-first AI notes` / `Publishable knowledge`
- hover 时可有轻微缩放或阴影变化，不做翻转等重动效

3. How It Works
- 线性四步视觉流程（collect context → run agent tasks → capture outputs → publish），每步配简约 icon 或迷你示意图
- 不用时间线式设计，用 Notion 式水平或错落卡片

4. Use Cases
- Research workflows / Writing and drafting / Personal knowledge base / Digital garden publishing
- 每个场景一个小卡片，链向 `/use-cases` 对应锚点

5. Social Proof（新增，预留位置）
- 如果有数据：下载量 / 用户数 / Product Hunt 评分
- 如果暂无数据：预留组件位置，初版可用 "Join early adopters" 或简短用户引用
- 此 section 放在 Use Cases 之后，形成 "功能 → 场景 → 信任" 叙事闭环

6. Publishing
- notes to website 作为能力延伸，单独一个横幅式 section

7. Final CTA
- 再次收敛到桌面端下载，参考 Notion 首页底部的三列产品下载区风格
- 同样根据 OS 自动检测主按钮文案

注意：首页不设对比区。Agent 平台对比（Manus / Cowork / OpenClaw）和知识工具对比（Notion / Obsidian）均放到独立 compare 页和 `/features` 页面，避免首页叙事分裂。

页面取舍：

- `/`：重写为 Agent-first 首页
- `/download`：保留，但文案围绕桌面端安装与系统要求重写
- `/features`：重构为更聚焦的产品能力总览页
- `/use-cases`：新增，聚合使用场景（Research / Writing / PKM / Digital garden），兼做 SEO 内链枢纽
- `/pricing`：弱化，不进入主导航，但保留 footer 链接供用户按需查阅
- `/about`、`/privacy`、`/terms`：保留

### 视觉方向

参考 Notion 官网的克制、可信、强排版路线，但保留 Moryflow 品牌色和自身个性。

色彩体系（基于现有 `globals.css` 的 `@theme inline` token）：
- 背景：`--color-mory-bg: #f7f7f5`（主背景），`--color-mory-paper: #ffffff`（卡片/内容区）
- 品牌色：`--color-mory-orange: #ff9f1c` 仅用于 CTA 按钮、少量强调、icon 点缀，不做大面积填充
- 文字：`--color-mory-text-primary: #1a1a1a`（标题/正文），`--color-mory-text-secondary: #666666`（副文案），`--color-mory-text-tertiary: #999999`（辅助说明）
- 边框：`--color-mory-border: #e5e5e5`，弱化不抢视觉

排版：
- 标题：保留现有 `font-serif`（衬线体），这是与 Notion（全站无衬线）的差异化
- 正文：系统无衬线字体栈（Inter / system-ui），14-16px
- Section 间距：section 之间 120-160px（`py-[120px]` 或 `py-32 sm:py-40`）
- 卡片间距：24-32px（`gap-6` 到 `gap-8`）

圆角（已有 token）：
- 卡片/大容器：`--radius-mory-xl: 24px`（对应 `rounded-3xl`）
- 按钮：`--radius-mory-md: 12px`（对应 `rounded-xl`）
- 小元素：`--radius-mory-sm: 8px`

动效白名单：
- 允许：scroll-triggered fade-in（`animate-fade-in`）、hover 时轻微 scale/shadow 变化
- 删除：`animate-float`（持续漂浮发光球）、背景 ambient light blur、glow 渐变
- 不引入：翻转卡片、粒子效果、持续运行的 CSS 动画

视觉元素：
- 弱化聊天气泡式 demo（删除当前 Hero 的场景轮播动画），强化 workspace / notes / publish 的静态产品截图
- 卡片不用 `backdrop-blur` 和 `bg-white/60` 半透明效果（当前 footer 有此问题），改为实色背景 + 细边框
- 不使用 emoji 作为 section icon，改用 lucide-react 统一风格

移动端适配原则：
- 导航折叠为汉堡菜单，右侧 Download 按钮保持可见
- Bento grid 在移动端降级为单列堆叠，卡片 100% 宽度
- Hero 产品截图在移动端缩放至全宽，不裁切
- 考虑移动端底部 sticky CTA bar（可选，视首屏转化率决定是否启用）

### SEO 架构

SEO 页面不采用博客模型，而采用高转化落地页模型：

1. 核心关键词页
- `/agent-workspace`
- `/ai-note-taking-app`
- `/local-first-ai-notes`
- `/second-brain-app`
- `/digital-garden-app`

2. 次级能力页
- `/notes-to-website`（合并 "publish notes as website" 和 "content publishing for notes" 意图，后两者 slug 不单独建页，避免关键词自蚕食）
- `/telegram-ai-agent`（合并 "telegram ai assistant" 长尾词，在 H2/FAQ 中覆盖，不单独建页）
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
- Registry 每条记录至少包含：slug/path、page type、title、description、keyword cluster、canonical path、schema mode、sitemap priority/changefreq、`lastModified`（构建时生成或手动维护，禁止使用 `new Date()` 运行时生成）、`ogImage`（允许 per-page 覆盖，至少 compare 页和主关键词页应有差异化 OG 图）、`locale`（支持 i18n 扩展）、`redirects`（登记旧路径 -> 新路径的 301 映射）
- `sitemap.xml` 从 registry 动态生成，包含所有语言版本的 URL
- 首页与产品页补齐 `SoftwareApplication` / `WebPage` / `FAQPage` 等结构化数据
- canonical、Open Graph、Twitter meta、`hreflang` 统一生成
- 每个页面输出 `hreflang` 标签，指向对应语言版本（`x-default` 指向英文版）

### 趋势截流与流量策略

这次官网和 SEO 不是只做“品牌页”，还要主动承接已经被市场教育过的需求。围绕 OpenClaw 热度，建议补三条流量线：

1. 替代词截流
- 目标：承接 “OpenClaw alternative / OpenClaw vs ...” 需求
- 动作：
- 增加 `/compare/openclaw`
- 在页面中明确对比两种路径：
- OpenClaw：开源 self-hosted、多渠道 gateway（WhatsApp/Telegram/Slack/邮件）、浏览器自动化、13,700+ 社区 skills、配置能力强
- Moryflow：桌面端即开即用、knowledge-native、local-first、Telegram 接入（当前唯一外部消息渠道，未来拓展更多）、内容沉淀与发布
- 页面标题建议用 "Moryflow vs OpenClaw: Different approaches to personal AI agents" 而不是 "OpenClaw Alternative"，降低用户预期偏差导致的高跳出率
- 原则：只做能力与上手路径对比，不写不可证实的能力声明，用"适合谁"而不是"谁更强"组织比较
- 风险提醒：通过 "OpenClaw alternative" 吸引的用户预期多渠道 + 自主执行 + 可编程 skill 生态，若落地页不能清晰说明差异，跳出率会很高

2. Telegram 需求承接
- 目标：承接 “Telegram AI agent / Telegram AI assistant” 搜索和社媒讨论流量
- 动作：
- 增加 `/telegram-ai-agent`（单页覆盖 "telegram ai assistant" 长尾词，在 H2/FAQ 中自然包含，不单独建页避免自蚕食）
- 诚实说明当前仅支持 Telegram，未来将拓展更多消息渠道
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

### SEO 内容规范要求

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
- 对比页硬约束：所有 compare 页关于竞品的能力描述必须有公开资料可查证；Cowork（Claude Cowork）为 Anthropic 旗下产品，需审慎措辞避免品牌风险；禁止使用"替代品/更好/更强"等攻击性表述，统一用"适合谁 / 不同路径"框架
- Codex 输入输出契约

### 验收标准

- 首屏 5 秒内能理解 Moryflow 是一个什么产品
- 用户能明确知道主 CTA 是下载桌面端
- 首页能回答"它和 OpenClaw / Manus / Cowork / Notion / Obsidian 有什么不同"（OpenClaw 流量最大，需与其他竞品同等对待）
- compare 页能进一步展开各竞品的路径差异，尤其是 `/compare/openclaw` 需说清为什么即开即用的桌面 Agent 工作流是不同路径
- 建立一批围绕主关键词簇的专门 SEO 页面
- 建立一批用于承接趋势流量的页面：OpenClaw 替代词、Telegram AI agent 词、local-first agent 词
- SEO 技术设施升级为 registry 驱动
- 文案口径统一为 Agent-first + local-first + knowledge-native
- 官网支持英文（默认）和中文两种语言，URL 结构为 `/` 和 `/zh/` 前缀
- 所有页面输出 `hreflang` 标签
- DownloadCTA 点击事件可追踪（至少预留 `data-*` attribute 或 event hook），为后续接入 analytics 做准备
- 对比页关于竞品的能力描述均有公开资料支撑

## 执行说明

- 本计划按 TDD 和最小闭环拆分，但当前仓库规则禁止未授权的 `git commit` / `git push`，因此所有“提交”步骤默认替换为“整理 diff 并等待用户授权”。
- 这是官网重构，不要求兼容旧营销叙事；失真的旧文案、旧 section、旧视觉样式允许直接删除。
- 风险级别整体按 L1 处理；若变更扩大到 shared SEO 工具或 SSR 头信息逻辑，按 L2 补充验证。

### 任务 0：前置 i18n 路由骨架与 locale layout route

**涉及文件：**
- 新建： `apps/moryflow/www/src/routes/{-$locale}/route.tsx`（locale layout route）
- 新建： `apps/moryflow/www/src/lib/i18n.ts`（locale 常量、校验函数、路径生成工具）
- 迁移： 现有 `routes/*.tsx`（index / features / download / pricing / about / privacy / terms）→ `routes/{-$locale}/*.tsx`
- 修改： `apps/moryflow/www/src/routes/__root.tsx`

**目的：** 在所有 UI 改动之前建立 `{-$locale}` 可选参数路由目录结构，使后续任务 1-6 创建或修改的路由文件都直接在此结构下工作，避免二次迁移。

**步骤 1：创建 locale 基础设施**

在 `src/lib/i18n.ts` 中定义：

- 支持的 locale 列表（`['en', 'zh'] as const`）和类型
- 默认 locale（`'en'`）
- `isValidLocale()` 校验函数
- `localePath(path, locale)` 路径生成工具（英文无前缀，中文加 `/zh`）

一期不引入重量级 i18n 框架，保持轻量。

**步骤 2：创建 locale layout route**

新建 `routes/{-$locale}/route.tsx` 作为 locale layout route：

- 在 `beforeLoad` 中校验 `$locale` 参数：无参数视为英文（默认），`zh` 为中文，其他值重定向到默认语言或返回 404
- 通过 React Context 向下传递当前 locale，供子路由和组件消费

**步骤 3：迁移现有路由文件**

将 `routes/` 根目录下的 7 个现有页面路由（`index.tsx`、`features.tsx`、`download.tsx`、`pricing.tsx`、`about.tsx`、`privacy.tsx`、`terms.tsx`）移动到 `routes/{-$locale}/` 下。确保 `/features` 和 `/zh/features` 都能正常访问。`__root.tsx` 保留在 `routes/` 根目录（它是全局 layout，不参与 locale 参数）。

**步骤 4：验证**

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

运行：`pnpm --filter @moryflow/www build`
预期：通过

手工确认 `/features` 和 `/zh/features` 都能正确渲染（内容暂时相同，翻译在任务 8 补充）。

**步骤 5：Diff 检查点**

整理本任务 diff，等待用户授权后再决定是否提交。

### 任务 1：锁定范围与共享文案契约

**涉及文件：**
- 修改： `apps/moryflow/www/CLAUDE.md`
- 修改： `apps/moryflow/www/src/lib/seo.ts`
- 检查： `apps/moryflow/www/src/components/seo/JsonLd.tsx`

**步骤 1：在 UI 改动前更新本地事实文件**

记录官网新的职责与页面体系，确保 `apps/moryflow/www/CLAUDE.md` 不再描述旧的 landing-only 结构，而是明确：

- 官网主定位为 Moryflow Agent-first product site
- 存在产品页、SEO 落地页、legal 页三类页面
- SEO registry 是后续单一事实源

**步骤 2：统一全站 SEO 文案源**

在 `apps/moryflow/www/src/lib/seo.ts` 中重写 `siteConfig.title`、`siteConfig.description` 等默认口径，使全站基础 meta 与新的 Agent-first 定位一致。

**步骤 3：确定结构化数据覆盖范围**

检查 `apps/moryflow/www/src/components/seo/JsonLd.tsx` 现有 schema 类型，并列出需要补充的类型：

- `WebPage`
- `FAQPage`
- 可能的 compare/use-case page schema

同时修复现有 `productSchema.operatingSystem`：当前值为 `'macOS, Windows, iOS, Android'`，但 Moryflow 当前仅支持桌面端（macOS、Windows），声明 iOS/Android 属于虚假结构化数据。改为 `'macOS, Windows'`。

**步骤 4：验证**

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

**步骤 5：Diff 检查点**

整理本任务 diff，等待用户授权后再决定是否提交。

### 任务 2：重建全局布局与导航

**涉及文件：**
- 修改： `apps/moryflow/www/src/components/layout/Header.tsx`
- 修改： `apps/moryflow/www/src/components/layout/Footer.tsx`
- 修改： `apps/moryflow/www/src/routes/__root.tsx`
- 修改： `apps/moryflow/www/src/styles/globals.css`

**步骤 1：按需编写或更新布局相关测试**

如果当前布局逻辑抽离出可测试的配置数据，优先为导航/footer link config 增加简单单元测试；若仍为纯展示组件，则记录为手工验证项。

**步骤 2：替换旧导航模型**

将头部导航从 `Docs + Download` 最小模式改为 Notion 式左右分区结构：

左侧（品牌 + 导航链接）：
- Logo + Moryflow → `/`
- Product → `/features`
- Use Cases → `/use-cases`
- Docs → `docs.moryflow.com`（外部链接，`target="_blank"`）

右侧（CTA 区，始终可见）：
- Download（primary button，链接 `/download`）

Compare 不进入顶级导航，通过 footer 和页面内链覆盖。移动端左侧折叠为汉堡菜单（使用 `@moryflow/ui` 的 `Sheet` 组件），右侧 Download 按钮（使用 `@moryflow/ui` 的 `Button` 组件）保持可见。所有导航链接需支持 i18n 路径前缀。

技术选型：桌面端导航继续使用原生 `<nav>` + TanStack `<Link>`，不引入 `@moryflow/ui` 的 `NavigationMenu`（Radix NavigationMenu 在 SSR + React 19 下存在已知 hydration 问题，且官网导航结构简单无需 dropdown viewport）。

**步骤 3：重建 footer 链接分组**

把 footer 从旧的 `Product / Company` 调整为更适合 SEO 内链的分组：

- Product（Features / Use Cases / Download / Pricing）
- Compare（Notion / Obsidian / Manus / Cowork / OpenClaw）—— Compare 的 SEO 入口在这里
- Resources（Docs / Blog（预留）/ Telegram AI Agent / Notes to Website）
- Company（About / Privacy / Terms / Contact）

同时清理现有 footer 的装饰性视觉（`backdrop-blur`、gradient blurs、半透明卡片），改为 Notion 式的简洁实色背景 + 文字链接。删除 "Not a chatbot, a thinking companion" 等旧文案。修复底部版权年份：当前硬编码 `© 2025`，改为动态生成当前年份（`new Date().getFullYear()`）或更新为 `© 2026`。

**步骤 4：校准根级文档元信息**

在 `__root.tsx` 中校准 theme-color、通用 meta、可能的字体/preload 策略，去除与新视觉方向不一致的遗留设置。

**步骤 5：重置视觉 token**

在 `globals.css` 中：

- 删除 `animate-float` keyframe 和 `.animate-float` 类（持续漂浮发光球，全站不再使用）
- 保留 `animate-fade-in`（scroll-triggered 进入动效）
- 保留现有 `@theme inline` 中的设计 token（色彩、圆角、阴影），这些已经符合 Notion 式克制风格
- 如需新增 token（如 section 间距变量），在 `@theme inline` 中追加

**步骤 6：添加转化追踪钩子**

为所有 DownloadCTA 和主要 CTA 按钮预留 `data-track-*` attribute，方便后续接入 analytics。不要求这一步接入具体 analytics SDK，但事件标记必须到位。

**步骤 7：验证**

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 3：将首页重建为 Agent-first 产品叙事

**涉及文件：**
- 修改： `apps/moryflow/www/src/routes/{-$locale}/index.tsx`（已在任务 0 迁移）
- 新建： `apps/moryflow/www/src/components/landing/AgentFirstHero.tsx`
- 新建： `apps/moryflow/www/src/components/landing/CorePillarsSection.tsx`
- 新建： `apps/moryflow/www/src/components/landing/WorkflowLoopSection.tsx`
- 新建： `apps/moryflow/www/src/components/landing/UseCasesSection.tsx`
- 新建： `apps/moryflow/www/src/components/landing/SocialProofSection.tsx`
- 新建： `apps/moryflow/www/src/components/landing/PublishingSection.tsx`
- 修改： `apps/moryflow/www/src/components/landing/index.ts`
- 删除或停用： `apps/moryflow/www/src/components/landing/Hero.tsx`
- 删除或停用： `apps/moryflow/www/src/components/landing/AgentShowcase.tsx`
- 删除或停用： `apps/moryflow/www/src/components/landing/CapabilitiesSection.tsx`
- 删除或停用： `apps/moryflow/www/src/components/landing/WhyLocalSection.tsx`
- 修改： `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`

**步骤 1：为首页元信息编写聚焦回归测试**

扩展 `apps/moryflow/www/src/lib/__tests__/seo.spec.ts` 或新增首页相关测试，确保首页 title/description/canonical 反映新的 Agent-first 文案。

**步骤 2：替换 Hero 区域**

用新的 `AgentFirstHero` 取代现有会话式 demo hero（删除场景轮播动画、emoji、背景发光球），首屏必须包含：

- 标题：一句话说清 Moryflow 是 Agent workspace
- 副标题：一行解释 local-first + knowledge-native 差异
- 主 CTA：单个按钮，基于 `useDownload.ts` 扩展 OS 自动检测（当前 hook 仅有 manifest 拉取和手动平台选择，需新增 `detectPlatform()` 函数通过 `navigator.userAgent` / `navigator.platform` 判断当前 OS），根据检测结果自动展示对应文案（"Download for macOS" / "Download for Windows"），下方小字链接其他平台
- 产品截图：标题 + CTA 下方展示桌面端界面截图或静态 mockup（Agent workspace + Notes 界面），作为视觉证据让用户首屏理解产品形态。初版可用设计稿 mockup，后续替换为真实截图

**步骤 3：构建核心叙事 section**

新增核心价值、工作流闭环、场景、社会证明、发布能力五个 section（不含对比区），确保首页从"功能堆砌"变成"结构化产品叙事"：

- `CorePillarsSection`：Notion-style bento grid（2-3 个大尺寸不等宽卡片），每卡含标题 + 描述 + 产品局部截图
- `WorkflowLoopSection`：线性四步流程，水平或错落卡片布局
- `UseCasesSection`：场景卡片网格，每个链向 `/use-cases` 锚点
- `SocialProofSection`（新增）：预留社会证明（下载量/用户数/引用），初版可用 "Join early adopters" 占位
- `PublishingSection`：notes to website 横幅 section

注意：删除原计划中的 `CompareSection.tsx`，首页不设对比区。

**步骤 4：移除过时文案与清理旧 export**

删除或停用旧的 "thinking companion / not a chatbot" 等文案与演示逻辑，避免新旧叙事并存。同时更新 `landing/index.ts` 的 re-export：移除 `Hero`、`AgentShowcase`、`CapabilitiesSection`、`WhyLocalSection` 的导出，替换为新组件的导出（`AgentFirstHero`、`CorePillarsSection`、`WorkflowLoopSection`、`UseCasesSection`、`SocialProofSection`、`PublishingSection`）。

**步骤 5：收紧 CTA 流程并重写 DownloadCTA**

首页所有主 CTA 统一跳转到 `/download`，不要引入额外主转化入口。

`DownloadCTA.tsx` 需要大幅重写（不是简单 Modify）：
- 删除装饰性视觉（`bg-gradient-to-b`、`blur-3xl` 发光球、`backdrop-blur` 半透明卡片），改为实色背景 + 简洁布局
- 删除旧文案（"Ready to meet Mory?" / "From today, you have a thinking companion."），替换为 Agent-first 口径
- 引入 `detectPlatform()` 实现 OS 自动检测，主按钮自动展示当前平台文案，下方小字链接其他平台
- 使用 `@moryflow/ui` 的 `Button` 组件替换原生 `<button>`，通过 className 覆盖品牌风格

**步骤 6：验证**

运行：`pnpm --filter @moryflow/www test:unit`
预期：通过

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 4：重构现有产品页并新增使用场景页

**涉及文件：**
- 修改： `apps/moryflow/www/src/routes/{-$locale}/features.tsx`（已在任务 0 迁移）
- 修改： `apps/moryflow/www/src/routes/{-$locale}/download.tsx`（已在任务 0 迁移）
- 修改： `apps/moryflow/www/src/routes/{-$locale}/pricing.tsx`（已在任务 0 迁移）
- 修改： `apps/moryflow/www/src/routes/{-$locale}/about.tsx`（已在任务 0 迁移）
- 新建： `apps/moryflow/www/src/routes/{-$locale}/use-cases.tsx`

**步骤 1：将 `/features` 重写为产品能力页**

把 `/features` 从泛功能九宫格改成围绕 Agent workflow、knowledge memory、local-first notes、publishing 的能力页。页面底部新增"与其他工具的路径差异"区域，以卡片形式链向各 compare 页（`/compare/notion`、`/compare/obsidian` 等），不在 `/features` 自身展开详细对比表格。这样 `/features` 职责是"展示自身能力"，compare 页职责是"展开竞品差异"，两者不重叠。

**步骤 2：创建 `/use-cases` 页面**

新增使用场景聚合页，覆盖 Research workflows / Writing and drafting / Personal knowledge base / Digital garden publishing 等场景。此页面同时作为 SEO 内链枢纽，链向对应的 SEO 落地页。

**步骤 3：面向转化重写 `/download`**

把下载页聚焦到安装、系统要求、平台说明和下载引导，减少空泛品牌形容词。

**步骤 4：弱化 `/pricing`**

保留 Beta 免费信息，但不要让 `pricing` 与首页形成新的主叙事中心；必要时把它改成 `Beta access / availability` 型页面。从主导航移除，但保留 footer 链接。

**步骤 5：对齐 `/about` 页面**

让关于页与官网新定位一致，避免出现偏品牌故事或泛 AI 描述。

**步骤 6：验证**

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 5：引入 SEO 页面 registry 与动态 sitemap 数据源

**涉及文件：**
- 新建： `apps/moryflow/www/src/lib/seo-pages.ts`
- 修改： `apps/moryflow/www/src/lib/seo.ts`
- 修改： `apps/moryflow/www/server/routes/sitemap.xml.ts`
- 修改： `apps/moryflow/www/server/routes/__tests__/sitemap.spec.ts`
- 修改： `apps/moryflow/www/src/components/seo/JsonLd.tsx`

**步骤 1：编写 sitemap/registry 的失败测试**

先为 `sitemap.xml` 和 SEO registry 行为补测试，至少覆盖：

- 核心静态产品页存在
- 第一批 SEO 落地页存在
- compare 页存在

**步骤 2：创建 registry**

在 `src/lib/seo-pages.ts` 中定义统一数据源，每条记录至少包含：

- slug/path
- page type
- title
- description
- keyword cluster
- canonical path
- schema mode
- sitemap priority / changefreq
- `lastModified`（构建时生成或手动维护，禁止 `new Date()` 运行时生成）
- `ogImage`（允许 per-page 覆盖，默认回退全站 OG 图）
- `locale`（支持 `en` / `zh`，为 i18n 扩展预留）
- `redirects`（可选，登记旧路径 -> 新路径的 301 映射）
- `hreflang` 对应语言版本路径（如 `/agent-workspace` ↔ `/zh/agent-workspace`）

注意：`{-$locale}` 路由骨架和 locale layout route 已在任务 0 中建立，此处 registry 只需与其保持一致即可。

**步骤 3：重构 sitemap 生成逻辑**

让 `server/routes/sitemap.xml.ts` 从 registry 读取页面，而不是维护单独的硬编码数组。同时必须修复当前的 `lastmod` 生成方式：现有代码使用 `new Date().toISOString()` 在每次请求时动态生成当天日期，违反 SEO 技术原则。改为从 registry 的 `lastModified` 字段读取（构建时生成或手动维护）。

**步骤 4：扩展 schema 支持**

让 `JsonLd.tsx` 支持首页、产品页、FAQ 页、对比页等所需 schema，避免后续每个页面重复造 schema。

**步骤 5：验证**

运行：`pnpm --filter @moryflow/www test:unit`
预期：通过

### 任务 6a：构建可复用 SEO 页面组件与核心关键词页

**涉及文件：**
- 新建： `apps/moryflow/www/src/components/seo-pages/SeoLandingPage.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/agent-workspace.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/ai-note-taking-app.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/local-first-ai-notes.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/second-brain-app.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/digital-garden-app.tsx`

注意：所有页面路由统一放在 `routes/{-$locale}/` 下，利用 TanStack Start 可选参数路由支持 i18n（详见"技术决策"段落）。

**步骤 1：定义可复用的 SeoLandingPage 组件**

设计 `SeoLandingPage` 的最小 props，确保页面可通过 registry 数据驱动，而不是为每个 route 复制一套 JSX。

**步骤 2：实现 5 个核心关键词簇路由**

创建主关键词簇的 5 个页面（agent-workspace / ai-note-taking-app / local-first-ai-notes / second-brain-app / digital-garden-app），每个页面都具备：

- 唯一 title/H1
- 结构化 section（Hero → Problem framing → Why Moryflow → Workflow → FAQ → CTA）
- 下载 CTA
- FAQ（覆盖相关长尾词）
- schema

**步骤 3：验证**

运行：`pnpm --filter @moryflow/www test:unit && pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 6b：新增次级能力页与趋势截流页

**涉及文件：**
- 新建： `apps/moryflow/www/src/routes/{-$locale}/notes-to-website.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/telegram-ai-agent.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/local-first-ai-agent.tsx`

**步骤 1：实现次级页面**

- `/notes-to-website`：合并 "publish notes as website" 和 "content publishing for notes" 意图，在 H2/FAQ 中覆盖长尾词，不单独建页避免自蚕食
- `/telegram-ai-agent`：合并 "telegram ai assistant" 长尾词，在 H2/FAQ 中覆盖。诚实说明当前仅支持 Telegram，未来拓展更多渠道
- `/local-first-ai-agent`：承接同时在看 OpenClaw/Manus/Cowork 的用户

**步骤 2：验证**

运行：`pnpm --filter @moryflow/www test:unit && pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 6c：新增对比页（需事实核查）

**涉及文件：**
- 新建： `apps/moryflow/www/src/components/seo-pages/ComparePage.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/compare/notion.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/compare/obsidian.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/compare/manus.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/compare/cowork.tsx`
- 新建： `apps/moryflow/www/src/routes/{-$locale}/compare/openclaw.tsx`

**前置要求：** 每个对比页的竞品能力描述必须有公开资料可查证。实施前需先整理事实清单。

**步骤 1：定义 ComparePage 组件**

设计 `ComparePage` 复用组件，统一用"适合谁"框架组织比较，禁止"谁更强"叙事。

**步骤 2：实现 5 个对比页路由**

注意事项：

- `/compare/openclaw`：标题用 "Moryflow vs OpenClaw: Different approaches to personal AI agents"。不否认 OpenClaw 的多渠道能力与 self-hosted 价值
- `/compare/cowork`：Cowork（Claude Cowork）是 Anthropic 旗下产品，措辞需审慎
- 所有对比页禁止使用"替代品/更好/更强"等攻击性表述

**步骤 3：页面内链建设**

从首页、features、use-cases、footer 与各 SEO 页之间补足内链：

- 首页可通过文案中的文本链接或 footer 链向 `/telegram-ai-agent` 与 `/compare/openclaw`（注意：这是内链，不是在首页新增对比 section，首页不设对比区的原则不变）
- `/compare/openclaw` 回链到 `/agent-workspace`、`/local-first-ai-notes`、`/download`
- `/use-cases` 链向对应的 SEO 落地页

**步骤 4：验证**

运行：`pnpm --filter @moryflow/www test:unit && pnpm --filter @moryflow/www typecheck`
预期：通过

### 任务 7：新增 SEO 内容生成规范（供 Codex 工作流）

**涉及文件：**
- 新建： `docs/reference/moryflow-www-seo-content-guidelines.md`
- 修改： `docs/index.md`

**步骤 1：将规范写为稳定参考文档**

文档必须覆盖：

- 页面类型
- 关键词输入格式
- slug 规则
- title/H1/meta 模板
- section 模板（特别是 Problem framing 段：必须基于具体用户痛点和真实场景，禁止"你是否曾经..."等 AI 模板句式开头，禁止空泛描述）
- FAQ 模板
- schema 规则
- internal linking 规则
- CTA 规则
- 禁止项

**步骤 2：新增面向 Codex 的生产契约**

给出适合 Codex App 批量生成的输入输出契约，例如：

- 输入字段：primary keyword, secondary keywords, intent, audience, competitors, CTA
- 输出字段：meta, route slug, page outline, FAQ, schema payload

**步骤 3：确保文档导航保持准确**

若新增参考文档使 `docs/index.md` 或相关索引失真，补最小必要导航修正。

**步骤 4：验证**

用人工走读确认该文档能直接作为后续 AI 生成页面的规范输入，不依赖上下文脑补。

### 任务 8：国际化基础设施（英文 + 中文）

**前置依赖：** 任务 0 已建立 `{-$locale}` 路由骨架、`i18n.ts` 基础设施（locale 常量、校验、路径生成）。本任务在此基础上补充翻译内容和 hreflang 注入。

**涉及文件：**
- 修改： `apps/moryflow/www/src/lib/i18n.ts`（补充翻译 dict）
- 修改： `apps/moryflow/www/src/routes/__root.tsx`
- 修改： `apps/moryflow/www/src/lib/seo.ts`
- 修改： `apps/moryflow/www/src/lib/seo-pages.ts`
- 修改： `apps/moryflow/www/server/routes/sitemap.xml.ts`

**步骤 1：实现翻译文本管理**

在 `src/lib/i18n.ts` 中补充翻译 dict（键值对形式），至少覆盖首页、download、features、use-cases 的用户可见文案。一期以轻量 dict + locale context 实现，不引入重量级 i18n 框架。

**步骤 2：添加 hreflang 与语言感知 meta**

在 `__root.tsx` 或 `seo.ts` 中注入 `hreflang` 标签，每个页面指向对应语言版本。`x-default` 指向英文版。

技术注意：`hreflang` 是 `<link>` 标签（`<link rel="alternate" hreflang="zh" href="..." />`），不是 `<meta>` 标签。当前 `generateMeta()` 只返回 meta 数组，需要同时在 TanStack Start 的 `head()` 中返回 `links` 数组来注入 hreflang。建议扩展 `generateMeta` 或新增 `generateHreflangLinks()` 函数，由 `head()` 同时使用。

**步骤 3：更新 sitemap 以支持多语言**

`sitemap.xml` 从 registry 生成时，为每个页面输出所有语言版本的 URL（使用 `xhtml:link rel="alternate" hreflang="..."` 扩展）。

**步骤 4：创建中文路由变体**

为首页、产品页和主要 SEO 页创建中文版本。SEO 落地页中文版可在二期补全，但首页、download、features、use-cases 的中文版应在一期完成。

**步骤 5：验证**

运行：`pnpm --filter @moryflow/www test:unit && pnpm --filter @moryflow/www typecheck`
预期：通过

手工检查 `/` 和 `/zh/` 的 `hreflang` 输出是否正确互指。

### 任务 9：最终验证与交付

**涉及文件：**
- 检查： `apps/moryflow/www/src/routes/*`
- 检查： `apps/moryflow/www/server/routes/*`
- 检查： `docs/reference/moryflow-www-seo-content-guidelines.md`

**步骤 1：运行最小影响范围验证集**

运行：`pnpm --filter @moryflow/www test:unit`
预期：通过

运行：`pnpm --filter @moryflow/www typecheck`
预期：通过

运行：`pnpm --filter @moryflow/www build`
预期：通过

**步骤 2：手工路由检查**

手工检查以下页面的标题、首屏和 CTA：

- `/`（英文首页）
- `/zh/`（中文首页）
- `/download`
- `/zh/download`
- `/features`
- `/zh/features`
- `/use-cases`
- `/zh/use-cases`
- `/agent-workspace`
- `/local-first-ai-notes`
- `/compare/notion`
- `/compare/openclaw`
- `/notes-to-website`
- `/telegram-ai-agent`

并确认：
- `sitemap.xml` 包含所有语言版本 URL
- `robots.txt` 输出与预期一致
- 每个页面的 `hreflang` 标签正确互指
- DownloadCTA 的 `data-track-*` attribute 存在

**步骤 3：总结剩余风险**

记录未覆盖项，例如：

- 文案是否仍有 AI 模板味
- 对比页是否需要法律/品牌用语复核
- 是否需要后续补真实截图或产品画面

**步骤 4：交付**

整理 diff、验证结果与剩余风险，等待用户决定是否进入实现。

---

## 技术决策与待定项

### 已决策

1. **i18n 路由方案：采用 TanStack Start 可选参数路由 `{-$locale}`**

   TanStack Start 支持 `{-$locale}` 可选路径参数语法（参考 lingo.dev/tanstack-start-i18n），路由文件统一放在 `routes/{-$locale}/` 目录下。英文（默认语言）匹配无前缀路径 `/about`，中文匹配 `/zh/about`。在 layout route 的 `beforeLoad` 中验证 locale 参数合法性（仅允许已注册的 locale），非法 locale 重定向到默认语言或 404。

   这意味着任务 6 创建的所有路由文件都应放在 `routes/{-$locale}/` 下，而非 `routes/` 根目录。

2. **导航组件：不使用 `@moryflow/ui` 的 NavigationMenu，继续用原生 JSX + 语义化 HTML**

   调研确认 Radix NavigationMenu 在 SSR + React 19 下存在已知 hydration mismatch 问题（radix-ui/primitives#3786、#3700），涉及 `data-state` 属性缺失和 `useId` 生成的 id/aria-controls 不一致。官网导航结构简单（4 个链接 + 1 个 CTA），不需要 Radix 的 dropdown viewport 能力。任务 2 继续用原生 `<nav>` + `<a>` + TanStack `<Link>` 构建导航，移动端汉堡菜单使用 `@moryflow/ui` 的 `Sheet` 组件（Sheet 基于 Radix Dialog，SSR 兼容性良好）。

### 待定

3. **首页产品截图/mockup 资源：** 任务 3 Hero 区域强依赖桌面端界面截图或 mockup。初版使用带品牌色边框的灰色 placeholder 容器占位（标注 "Product screenshot coming soon"），不因此 block 任务 3 实施。后续设计资源就绪后替换为真实截图。
