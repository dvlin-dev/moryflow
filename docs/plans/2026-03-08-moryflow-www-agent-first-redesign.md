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

---

## 终极方案：Locale-First SEO 与内容架构（长期维护版）

这一节不是对当前实现的局部修补，而是定义 `apps/moryflow/www` 的长期目标架构。假设允许重构、不考虑历史兼容和一次性工作量，目标是从根本上解决以下问题：

- 路由、文案、canonical、hreflang、内链和 schema 各自维护，容易失真
- “页面支持 zh 路由” 与 “页面真的有 zh 正文” 之间没有强约束
- SEO registry 只覆盖部分能力，不能成为真正的单一事实源
- 复用组件默认写英文文案或英文路径，导致每次扩展都重复出错

### 外部最佳实践基线

以下结论来自 Google Search Central 与 schema.org 的公开规范，应视为本方案的外部约束：

1. 不同语言版本应使用稳定且可区分的 URL，而不是靠 `lang` 或 `hreflang` 猜测语言。
2. 每个可索引语言版本都应输出自己的 canonical URL；不要让中文页 canonical 到英文页。
3. `hreflang` 必须双向互指，并只声明真实存在、允许索引的语言版本。
4. Google 主要根据可见正文判断页面语言，不会因为 `lang="zh-CN"` 或 `hreflang="zh-Hans"` 自动把英文正文视为中文页。
5. sitemap 只应包含你真正希望被索引的 canonical URL；未发布语言版本、占位页、重复页不应进入 sitemap。
6. 结构化数据应与页面内容一致，FAQ / WebPage / SoftwareApplication 不能脱离实际正文独立演进。

### 核心原则

1. **Locale 不是附属状态，而是页面模型的一部分**

- 一个页面是否支持 `zh`，必须在单一数据源里声明。
- 未声明的 locale 不生成路由、不生成 sitemap、不生成 hreflang、不渲染导航入口。

2. **页面是否发布，按“locale 版本”控制，而不是按“route 文件是否存在”控制**

- 一个 page 可以是：
- `en: published`
- `zh: draft`
- 只有 `published` 的 locale 才能被访问和索引。

3. **SEO 不是页面自己拼 meta，而是从 page model 派生**

- canonical
- hreflang
- og:url
- og:locale
- JSON-LD
- sitemap
- robots/indexability

以上全部都必须来自同一个 locale-aware page registry。

4. **正文与 SEO 必须共用同一份 locale 内容源**

- H1、subheadline、problem points、FAQ、CTA、meta title、meta description 必须在同一套 locale content data 中维护。
- 禁止 route 文件里同时写 JSX 结构和大段英文内容对象。

5. **组件层不允许知道默认语言路径**

- 复用组件只能接收：
- 已 locale 化的 `href`
- 已 locale 化的文案
- 或 page id + locale
- 禁止在组件内部写 `/download`、`/compare/notion` 这类裸路径。

### 最终目标架构

推荐收敛为五层：

#### 第一层：Locale Policy

文件建议：

- `src/lib/i18n/config.ts`

职责：

- `SUPPORTED_LOCALES`
- `DEFAULT_LOCALE`
- `LOCALE_HTML_LANG`
- `LOCALE_HREFLANG`
- locale 校验与解析

这里不放业务文案，只放语言规则。

#### 第二层：Page Registry

文件建议：

- `src/lib/site-pages.ts`

这是官网唯一页面注册表，替代当前分散的 `seo-pages.ts` + 各 route 手写配置。

每个 page entry 至少包含：

```ts
type LocaleState = 'published' | 'draft' | 'disabled';

interface SitePageDefinition {
  id: string;
  path: string;
  kind: 'home' | 'product' | 'seo-landing' | 'compare' | 'legal';
  indexable: boolean;
  locales: Record<Locale, LocaleState>;
  schema: 'SoftwareApplication' | 'WebPage' | 'FAQPage' | 'none';
  ogImage?: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: '1.0' | '0.9' | '0.8' | '0.7' | '0.5' | '0.3';
}
```

强约束：

- route 是否存在，不由文件多少决定，而由 `page.id + locale state` 决定
- sitemap/hreflang/canonical 全部从这里派生
- legal 页如果只允许英文，则 `zh: disabled`

#### 第三层：Localized Content Registry

文件建议：

- `src/content/pages/home.ts`
- `src/content/pages/features.ts`
- `src/content/pages/agent-workspace.ts`
- `src/content/pages/compare/openclaw.ts`
- `src/content/pages/legal/privacy.en.ts`

不要再把内容塞在 route 文件里。每个页面一个内容模块，按 locale 提供完整内容：

```ts
interface LocalizedPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  hero?: { ... };
  sections: { ... };
  faq?: { question: string; answer: string }[];
  cta?: { title: string; description: string; buttonLabel: string };
}

type PageContentMap = Partial<Record<Locale, LocalizedPageContent>>;
```

强约束：

- 若 `page.locales.zh === 'published'`，则必须存在完整 `zh` 内容
- 若没有完整 `zh` 内容，则该页面不能发布 `/zh/...`

#### 第四层：SEO Derivation Layer

文件建议：

- `src/lib/seo.ts`
- `src/lib/seo-runtime.ts`

职责：

- `getCanonicalUrl(pageId, locale)`
- `getAlternateLinks(pageId)`
- `getOgLocale(locale)`
- `getPageMeta(pageId, locale)`
- `getIndexability(pageId, locale)`
- `getJsonLd(pageId, locale)`

这里不能再接受松散的 `path + title + description` 调用方式。正确姿势是：

```ts
const seo = getPageSeo('agent-workspace', locale);
```

然后 route 只消费 `seo.meta`、`seo.links`、`seo.schema`。

#### 第五层：Presentation Layer

文件建议：

- `src/routes/{-$locale}/*.tsx`
- `src/components/**/*`

职责：

- route 只取 `locale`
- route 只取 `page content + seo payload`
- component 只负责渲染

不再在 route 中定义大段页面内容对象，不再在 component 中拼 SEO，不再在 component 中猜 locale path。

### 路由模型

保留 `/{-$locale}` 方案是可以接受的，但必须加上发布约束：

1. 英文默认语言：

- `/`
- `/features`
- `/agent-workspace`

2. 中文发布版本：

- `/zh`
- `/zh/features`
- `/zh/agent-workspace`

3. 访问策略：

- `published`：正常渲染并可索引
- `draft`：可选两种策略
- 开发环境允许访问
- 生产环境直接 404 或 noindex
- `disabled`：不生成路由或统一 404

最佳实践建议：

- 对生产站点，只暴露 `published` locale
- 不要让 `draft` locale 出现在 sitemap、hreflang、footer、related pages 中

### 索引策略

按页面类型定义：

1. 首页、产品页、核心 SEO 页、对比页

- `index, follow`
- 自指 canonical
- locale 完整时输出 hreflang

2. legal 页

- 可以 `index, follow`
- 但默认只发英文正式文本
- 若没有经过法律审核，不发布中文版本

3. 草稿页/未翻译页

- 不进入 sitemap
- 不出现在 hreflang
- 不出现在导航和站内推荐
- 最安全做法是生产环境直接不可访问

### 结构化数据策略

当前最大问题不是 schema 类型不够，而是 schema 没有被统一调度。

终极方案要求：

1. 首页和下载页

- `SoftwareApplication`

2. 一般产品页和 legal 页

- `WebPage`

3. SEO landing / compare 页

- `WebPage + FAQPage`
- 若页面正文没有 FAQ，则禁止输出 FAQ schema

4. 结构化数据内容来源

- FAQ schema 必须直接从 locale FAQ 内容派生
- WebPage name/description/url 必须直接从当前 locale 的 meta 派生

5. 渲染方式

- 允许继续使用 JSON-LD
- 但统一通过 `getJsonLd(pageId, locale)` 生成

### 导航与内链策略

导航、footer、related pages 必须统一改成 locale-aware config：

文件建议：

- `src/lib/navigation.ts`

职责：

- 根据 `locale` 返回 nav items
- 根据 `locale` 返回 footer groups
- 自动过滤未发布 locale 的页面

例如：

```ts
getFooterGroups('zh');
```

应只返回：

- 有 zh 发布版本的产品页
- 有 zh 发布版本的 compare 页
- 有 zh 发布版本的资源页

不能把 `/compare/notion` 这种英文页直接扔给中文 footer。

### 组件层规范

为长期维护，组件层必须遵守以下硬规则：

1. 所有站内跳转一律使用 locale-aware Link

- 推荐封装：
- `LocalizedLink`
- `LocalizedButtonLink`

2. 不允许 `<a><Button /></a>`

- `Button` 一律通过 `asChild` 与 `Link`/`a` 组合

3. 复用组件不允许硬编码英文 fallback

- `buttonLabel = 'Download Moryflow'` 这种默认值全部删掉
- 必须由调用方传入，或组件内部通过 locale 内容源取值

4. placeholder 文案也必须 locale-aware

- `Screenshot`
- `Loading...`
- `Preparing...`
- `Download started`

全部进字典或统一内容模块

### i18n 策略

当前轻量 dict 方案可以保留，但要重新分层：

1. **UI chrome 文案**

- 导航
- footer
- CTA 通用文案
- loading / toast / placeholder
- 放在 `ui` 级字典中

2. **页面正文**

- 不进全局平铺 key dict
- 每页独立内容模块

这样做的原因：

- 全局 key dict 适合短 UI 文案，不适合长 landing page/compare page 内容
- 每页独立内容更容易审校、翻译和维护
- SEO 页的 FAQ、标题、段落本身就是内容资产，不应埋在 JSX props 里

### Legal 页面策略

终极方案建议：

- legal 作为单独内容域管理
- 默认只有英文正式版
- 若未来需要中文 legal，必须以“正式文本”方式新增，而不是沿用英文正文加中文 URL

这意味着短期应直接撤销：

- `/zh/privacy`
- `/zh/terms`

直到真正拥有经审校的中文 legal 文本。

### 测试与 CI 门禁

为了避免以后再次回退到“表面双语”，必须新增结构性校验：

#### 单元测试

1. SEO 派生测试

- `zh` 页面 canonical 指向 `/zh/...`
- `en` 页面 canonical 指向 `/...`
- `og:url` 与 canonical 一致
- `og:locale` 与 locale 一致

2. hreflang 测试

- 只包含 `published` locale
- 双向互指
- `x-default` 指向默认语言版本

3. sitemap 测试

- 只输出 canonical URL
- 不输出 `draft/disabled` locale

4. content completeness 测试

- 所有 `published` locale 页面都必须存在内容源
- 所有需要 FAQ schema 的页面都必须存在 FAQ 内容

#### 静态约束测试

建议增加一个轻量 lint/test 脚本，扫描以下反模式：

- `href="/download"` 这类裸站内路径
- `<a><Button /></a>` 嵌套
- locale route 里直接写大段英文正文对象
- 未通过 registry 注册的可索引页面

#### CI 门禁

至少新增：

- `pnpm --filter @moryflow/www test:unit`
- `pnpm --filter @moryflow/www typecheck`
- `pnpm --filter @moryflow/www build`
- 自定义 `content-integrity` 校验脚本

若 `content-integrity` 失败，则禁止合并。

### 建议的重构顺序

如果按终极方案重构，推荐顺序是：

1. 建立 `site-pages.ts`，取代松散的 `seo-pages.ts`
2. 建立每页独立的 locale content modules
3. 重写 `seo.ts` 为 page-id + locale 驱动
4. 封装 locale-aware `LocalizedLink` / `LocalizedButtonLink`
5. 改 Header / Footer / shared CTA / related pages
6. 改 product pages
7. 改 SEO landing / compare pages
8. 移除未正式支持的 locale route，尤其 legal
9. 补 content-integrity 测试和 CI 门禁

### 最终验收标准

达到以下条件，才算从根本解决：

1. 一个页面是否支持某个 locale，只能在一个地方声明。
2. 中文路径不会再回跳到英文路径，除非显式切换语言。
3. 没有完整中文正文的页面，不会出现 `/zh/...` 可索引版本。
4. canonical、hreflang、sitemap、JSON-LD 全部由同一 page model 派生。
5. 新增一个 SEO 页时，开发者只需要：

- 注册 page
- 填内容
- 选择支持的 locale
- 其余 SEO 行为自动正确

6. 新增一个 locale 时，不需要重写组件，只需要补 locale policy 与内容模块。

### 结论

长期维护的最佳实践不是“继续在 route 里补 `t()` 和 `generateHreflangLinks()`”，而是把官网彻底升级为：

**`Locale-first page model + content registry + SEO derivation layer + locale-aware link system`**

这是唯一能同时解决：

- i18n 半成品
- SEO 自相矛盾
- 内链回跳英文
- registry 失真
- 新页面扩展成本高

这套方案一旦落地，后续不管是继续扩展 OpenClaw / Telegram 趋势页，还是增加更多 compare / landing pages，都不会再次把双语和 SEO 做乱。

### 基于 TanStack 官方文档的再校正

在进一步核对 TanStack Router / Start 官方文档后，上述终极方案需要补三点栈内最佳实践，以避免文档只停留在“通用 Web 最佳实践”：

#### 1. `/{-$locale}` 方案本身没有问题，属于 TanStack 官方支持的 i18n 路由模式

TanStack Router 官方 i18n 指南明确将 optional path params 作为 locale-aware routing 的一等方案，示例就是：

```tsx
createFileRoute('/{-$locale}/about');
```

这意味着：

- 当前文档继续采用 `routes/{-$locale}/` 目录组织是合理的
- “是否继续保留 `{-$locale}`” 不是问题核心
- 真正的问题是当前实现没有把 locale 贯穿到 content、SEO 和 link generation

因此，文档不需要推翻 `{-$locale}` 路由策略，但需要明确：

- `/{-$locale}` 是**推荐保留**
- 需要重构的是其上的 content/SEO/link system，而不是换掉路由语法

#### 2. 对于 TanStack Start + SSR，官方更推荐“Router + i18n library”的集成模式；如果追求长期维护，应把 Paraglide 设为目标架构

TanStack 官方 i18n 文档对 Start/SSR 的推荐模式是：

- 使用 TanStack Start
- 结合 Paraglide 一类 i18n 库
- 通过 server middleware、URL localization/rewrite、typed locale runtime 来实现 SSR 级 locale 处理

这比当前文档里的“轻量 dict + 手写 helper”更接近栈内最佳实践，原因是：

- 支持 SSR 和流式渲染下的 locale 一致性
- 支持 locale-aware redirect 与 metadata
- 提供 typed translations
- 能用 rewrite/input/output 做 URL localize / de-localize
- 更适合长期扩展更多语言和更多页面

因此，终极方案应区分两层目标：

1. **短中期重构目标**

- 保留当前轻量 dict，但按 page model 重构，先修正 locale/SEO/link 一致性

2. **长期目标架构**

- 迁移到 TanStack 官方文档明确支持的 `TanStack Start + Paraglide` 模式

这意味着文档需要补一句清晰原则：

- 当前自定义 i18n 层是过渡方案，不应视为最终形态
- 若官网继续扩展多语言 SEO 页面，最终应收敛到 Paraglide 或同等级的 typed i18n runtime

#### 3. 站内链接应以 TanStack `Link` / `linkOptions` 为基础能力，而不是继续散落字符串 href

TanStack 官方文档明确：

- `Link` 是站内导航的一等组件
- `linkOptions()` 可以把导航目标收敛为可复用、类型安全的对象

对当前代码库，这比“封一个 localePath 再塞进 `<a href>`”更符合 TanStack 生态的长期维护方式。

因此，终极方案里的 `LocalizedLink` / `LocalizedButtonLink` 应再进一步收敛为：

- 以 `Link` 为渲染基础
- 以 `linkOptions()` 为数据载体

推荐形态：

```ts
const downloadLink = getLocalizedLinkOptions('download', locale)
return <Link {...downloadLink}>...</Link>
```

而不是：

```ts
<a href={localePath('/download', locale)}>...</a>
```

这样做的收益：

- 类型安全更强
- 更容易复用到 `Link` / `navigate` / `redirect`
- 更符合 TanStack 官方推荐的导航抽象

#### 4. 如果未来要支持“翻译后的 pathname”，应直接使用 route tree 类型约束，而不是手工维护 slug 映射

TanStack 官方文档在 i18n 指南中明确提到：

- 可以从 `routeTree.gen` / `FileRoutesByTo` 推导 translated pathnames
- 这样可以获得“没有遗漏翻译路径”的编译期反馈

这对当前官网尤其重要，因为 compare / landing pages 很多，未来如果要做：

- `/zh/agent-workspace`
- `/zh/ai-note-taking-app`

之外的真正本地化 slug，例如：

- `/zh/ai-agent-gongzuotai`
- `/zh/bendi-youxian-ai-biji`

就不应该手工维护一套 path map。

因此文档应增加约束：

- 当前阶段仅本地化前缀，不本地化 slug
- 若将来要本地化 slug，必须基于 TanStack route tree 类型系统做约束，不允许手写自由映射

#### 5. 测试策略应补充 TanStack route-level 测试，而不仅是 meta/sitemap 文本测试

TanStack 官方测试文档强调：

- 测试 Link navigation
- 测试 programmatic navigation
- 测试 route tree generation / file route conventions

因此，当前终极方案中的测试部分还应补一条：

- 不仅测试 `seo.ts` 和 `sitemap.xml`
- 还要测试 locale route 下的真实导航行为

新增建议：

1. 测试 `/zh/...` 页面点击 CTA 后仍停留在 `/zh/...`
2. 测试 footer/header 在不同 locale 下生成的 link target
3. 测试 route tree 中不存在未发布 locale 的可导航入口

### 对当前文档的最终判断

基于 TanStack 官方最佳实践，当前文档**方向是对的，但还需要口径升级**：

1. **保留**

- `/{-$locale}` optional param 路由策略
- locale-first page model
- registry 驱动 canonical/hreflang/sitemap/schema
- locale-aware link system

2. **需要升级**

- 将“轻量 dict 方案”明确降级为过渡方案
- 将 `TanStack Start + Paraglide` 明确写成长期推荐架构
- 将 `Link/linkOptions` 明确写成站内导航基线
- 将 route-tree type-safe pathname 约束写进未来 slug 本地化策略
- 将 TanStack route-level navigation tests 写入验证基线

### 建议补充的架构决策

若后续继续实施，应在文档中将 i18n 架构明确分为三期：

#### Phase A：立即修复

- 保留 `{-$locale}`
- 修 canonical/hreflang/locale links
- 隐藏未完成翻译页面
- 清理 legal 的假双语

#### Phase B：结构重构

- page registry
- localized content modules
- locale-aware `Link/linkOptions`
- route-level 测试

#### Phase C：TanStack-native 长期方案

- 引入 Paraglide
- 使用 SSR middleware 管理 locale
- 用 rewrite/localizeUrl 统一 URL localize / de-localize
- 若需要翻译 pathname，则从 route tree 类型系统派生

这样文档就会同时满足：

- 眼下可实施
- 长期不走偏
- 和 TanStack 官方推荐模式对齐

---

## 最终实施版本（冻结）

> 本节高于前文所有过渡性讨论与阶段性建议。后续实现、review、验收一律以本节为准。

### 最终目标

将 `apps/moryflow/www` 重构为一个**在当前 TanStack Start / TanStack Router 技术栈下，长期可维护、双语行为严格正确、SEO 结构自洽的 Agent-first 官网**。

本冻结方案只采用一条最终路线：

- 保留 TanStack Router 官方支持的 `/{-$locale}` optional-locale routing
- 不引入 Paraglide rewrite / middleware 路线
- 不为了“理论上更优”增加与当前规模不匹配的新抽象层
- 允许重构现有 route、组件、SEO 工具和页面注册方式，但所有改造都必须服务于当前代码库的长期可维护性

最终交付必须同时满足：

- locale、canonical、hreflang、sitemap、JSON-LD、站内导航由同一套页面定义驱动
- 中文路径绝不再回跳英文路径，除非用户显式切换语言
- 没有完整中文正文的页面，不暴露 `/zh/...` 可索引版本
- 所有站内导航统一使用 TanStack `Link`
- 页面路由层只负责组装，不再分散维护 SEO 或路径逻辑

### 冻结架构

#### 1. 路由架构

保留当前 `routes/{-$locale}/` 目录结构，继续使用 TanStack Router 官方支持的 optional-locale path param 方案：

- 英文默认语言：`/features`
- 中文语言版本：`/zh/features`

约束：

- `DEFAULT_LOCALE` 为无前缀 URL
- 非默认语言使用显式前缀
- `route.tsx` 继续作为 locale context 提供层
- route 文件只负责：
- 读取 locale
- 读取 page definition
- 读取 locale-aware SEO payload
- 渲染页面组件

禁止：

- route 文件自己拼 canonical/hreflang
- route 文件自己决定页面是否支持某个 locale
- route 文件里散落裸站内路径

#### 2. i18n 架构

最终方案继续使用**轻量自定义 i18n 层**，但边界要重新冻结清楚。

职责划分：

- `src/lib/i18n.ts`
- 只负责 locale 常量、校验、`localePath()`、共享 UI 短文案字典

- 页面长正文
- 不进入全局平铺 key dict
- 优先保持与 route 或页面组件同文件/同模块共置，便于理解页面全貌

原则：

- 共享 UI chrome 文案适合放全局字典
- 长篇 landing / compare / FAQ 正文不强行压成大量 key-value
- 当前规模下，内容与页面共置优于人为拆出大量内容模块

#### 3. 页面单一事实源

新增统一页面注册表：

- `src/lib/site-pages.ts`

现有的 `src/lib/seo-pages.ts` 在最终方案中不再保留。执行时应将其职责整体并入 `site-pages.ts`，避免出现“两套 registry 并行维护”的状态。

每个页面至少定义：

```ts
type LocaleState = 'published' | 'disabled';

interface SitePageDefinition {
  id: string;
  path: string;
  kind: 'home' | 'product' | 'seo-landing' | 'compare' | 'legal';
  indexable: boolean;
  locales: Record<Locale, LocaleState>;
  schema: 'SoftwareApplication' | 'WebPage' | 'FAQPage' | 'none';
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: '1.0' | '0.9' | '0.8' | '0.7' | '0.5' | '0.3';
  ogImage?: string;
}
```

强约束：

- 页面支持哪些 locale，只在这里声明
- sitemap、hreflang、canonical、导航过滤都从这里派生
- `legal` 页默认 `zh: disabled`
- 未在 registry 注册的页面，不得视为可索引页面
- `site-pages.ts` 是唯一页面注册表；`seo-pages.ts` 必须删除
- route 层必须消费 registry 的 locale 发布状态；`disabled` locale 页面不能继续被直接访问

#### 4. SEO 运行时

在现有 `src/lib/seo.ts` 基础上升级为 locale-aware SEO runtime，但不再拆出额外的 `seo-runtime.ts` 层。

唯一合法模式：

```ts
getPageMeta({
  pageId: 'features',
  locale,
  title,
  description,
});
```

输出必须包含：

- locale-aware canonical
- locale-aware `og:url`
- locale-aware `og:locale`
- 基于 `site-pages.ts` 的 hreflang alternates
- 与页面 kind/schema 对应的 JSON-LD 配置

禁止：

- `generateMeta({ title, path })` 这种不带 locale 的松散调用
- `generateHreflangLinks('/features')` 这种只看 path 不看 locale/page state 的调用
- 页面手写 canonical/hreflang

#### 5. 站内链接策略

最终方案不引入 `navigation.ts` / `route-links.ts` 这种额外间接层，而是基于两条清晰规则：

1. 站内跳转统一使用 TanStack `Link`
2. 所有目标路径统一通过 `localePath(path, locale)` 生成

推荐模式：

```tsx
<Link to={localePath('/download', locale)}>Download</Link>
```

如需复用，可增加轻量 helper：

```ts
pagePath('download', locale);
```

但不引入额外注册层。

强约束：

- 禁止站内裸 `<a href="/...">`
- 禁止 `<a><Button /></a>`
- 按钮跳转统一 `Button asChild` + `Link`

#### 6. 内容组织策略

最终方案不要求把所有页面正文拆进 `src/content/pages/*`。

冻结规则：

- 页面专属长内容优先与页面文件共置
- 只有当多页共享同一份长内容或同一数据源时，才抽到 `lib` 或 `components`
- 共享 section、FAQ 组件、下载 CTA 组件继续保留为复用组件

这意味着：

- `SeoLandingPage` / `ComparePage` 继续作为结构组件
- 每个 route 可继续定义自己的 `problemPoints`、`faqs`、`relatedPages`
- 但这些内容必须按 locale 分层，不能只写英文单份对象然后直接暴露到 `/zh/*`

#### 7. Legal 策略

legal 页采取严格正式文本策略：

- `/privacy` 和 `/terms` 保留英文正式版
- `/zh/privacy` 和 `/zh/terms` 不发布
- sitemap、hreflang、footer、导航不暴露未发布 legal locale

只有在出现正式审校过的中文文本后，才允许在 `site-pages.ts` 中将其改为 `published`。

#### 8. 当前版本的语言发布范围

为避免执行阶段范围膨胀，当前版本直接冻结发布清单：

双语发布：

- `/`
- `/features`
- `/download`
- `/pricing`
- `/use-cases`

仅英文发布：

- `/about`
- 全部 SEO landing pages
- 全部 compare pages
- `/privacy`
- `/terms`

这意味着：

- 当前版本不发布任何中文 SEO landing page
- 当前版本不发布任何中文 compare page
- 中文站只覆盖核心产品与转化路径，不覆盖全部内容资产
- 若未来需要中文 SEO 流量策略，再单独开启新一轮专题方案

#### 9. 结构化数据策略

JSON-LD 继续使用现有组件层注入，但内容必须由页面类型和实际正文一致地决定：

- 首页、下载页：`SoftwareApplication`
- 一般产品页、legal 页：`WebPage`
- 含 FAQ 的 landing / compare 页：`FAQPage`

强约束：

- 只有页面真实渲染 FAQ，才输出 FAQ schema
- JSON-LD 文案必须和可见正文一致
- schema 类型由 `site-pages.ts` 决定，不由页面随意声明

### 目录目标形态

```text
apps/moryflow/www/src/
├── components/
│   ├── landing/
│   ├── seo-pages/
│   ├── shared/
│   └── layout/
├── lib/
│   ├── i18n.ts
│   ├── site-pages.ts
│   ├── seo.ts
│   └── platform.ts
└── routes/
    └── {-$locale}/...
```

本冻结方案刻意不新增：

- Paraglide runtime
- middleware rewrite 层
- page content registry 层
- navigation registry 层
- route-links 抽象层

因为在当前规模下，这些层的维护成本高于收益。

### 最终约束

1. 所有可索引页面都必须注册到 `site-pages.ts`
2. 所有页面支持的 locale 都必须由 `site-pages.ts` 决定
3. 所有 SEO 输出都必须显式接收 `locale`
4. 所有站内跳转都必须使用 `Link + localePath()`
5. 所有未完整翻译页面不得发布对应 locale
6. legal 默认只发布英文正式版

### 最终执行计划

#### Step 1：重构 `i18n.ts`，冻结 locale-aware path 规则

状态：已完成

目标：

- 让 locale path 生成成为全站统一基础能力

执行：

- 保留并完善 `SUPPORTED_LOCALES`、`DEFAULT_LOCALE`
- 冻结 `localePath(path, locale)` 行为
- 确保它能正确生成：
- `/features`
- `/zh/features`
- `/`
- `/zh`

完成标准：

- 所有页面和组件都可以只通过这一工具生成本地化路径

#### Step 2：建立 `site-pages.ts` 页面注册表

状态：已完成

目标：

- 为页面、locale 发布状态、schema、sitemap 属性提供单一事实源

执行：

- 新建 `src/lib/site-pages.ts`
- 注册首页、产品页、SEO landing 页、compare 页、legal 页
- 明确每个页面的 `locales`
- legal 页设置为 `en: published, zh: disabled`
- 将现有 `src/lib/seo-pages.ts` 的职责迁移到 `site-pages.ts`
- 删除 `src/lib/seo-pages.ts`

完成标准：

- 所有生产页面都存在唯一 page definition
- 页面是否支持中文不再分散在 route 文件和 sitemap 里各自维护
- 仓库中不再存在第二套可索引页面 registry

已完成结果：

- 已新增 `src/lib/site-pages.ts`
- 已删除 `src/lib/seo-pages.ts`
- 已冻结当前版本的 locale 发布范围到 registry

#### Step 3：重写 `seo.ts` 为 locale-aware SEO 工具

状态：已完成

目标：

- 从根本修复 canonical、og:url、og:locale、hreflang 错误

执行：

- 改造 `generateMeta()`，必须显式接收 `locale`
- 让 canonical 和 `og:url` 指向当前 locale URL
- 让 `og:locale` 跟随当前 locale
- 让 `generateHreflangLinks()` 从 `site-pages.ts` 读取已发布 locale

完成标准：

- `/zh/features` 输出中文 canonical
- 英文页面不再错误引用中文 alternates
- 未发布 locale 不出现在 hreflang

已完成结果：

- `src/lib/seo.ts` 已切换为 `site-pages.ts` 驱动
- `generateMeta()` 已强制接收 `locale` 并输出 locale-aware `og:url` / `og:locale`
- `generateHreflangLinks()` 已只根据页面已发布 locale 生成 alternate links
- 所有产品页、SEO 页、compare 页已切换到 `getPageMeta({ pageId, locale })`
- `pnpm --filter @moryflow/www typecheck` 已通过

#### Step 4：重写 sitemap 生成逻辑

状态：已完成

目标：

- 只输出可索引、已发布的 locale 版本

执行：

- `sitemap.xml` 从 `site-pages.ts` 遍历
- 只输出 `indexable + published` 的 page-locale 组合
- 为每个 URL 输出正确的 xhtml alternate links

完成标准：

- sitemap 不再包含未发布 legal locale
- sitemap 与页面实际 canonical/hreflang 一致

已完成结果：

- `server/routes/sitemap.xml.ts` 已改为遍历 `site-pages.ts`
- sitemap 现在只输出 `indexable + published` 的 page-locale 组合
- `server/routes/__tests__/sitemap.spec.ts` 已覆盖 `/zh/privacy` 和 `/zh/agent-workspace` 不应出现
- `pnpm --filter @moryflow/www test:unit -- src/lib/__tests__/seo.spec.ts server/routes/__tests__/sitemap.spec.ts` 已通过

#### Step 5：统一站内导航为 `Link + localePath()`

状态：已完成

目标：

- 从根本消灭中文页回跳英文

执行：

- Header、Footer、首页 CTA、Download CTA、SEO 页面 CTA、related pages、compare links 全部改为 TanStack `Link`
- 所有目标路径都通过 `localePath()` 生成
- 所有按钮跳转改为 `Button asChild`

完成标准：

- 全项目不存在裸站内 `href="/..."`
- 全项目不存在 `<a><Button /></a>`
- 已发布双语页面在 `zh` 下继续保持 `zh` 路径
- 仅英文发布的页面从 `zh` 入口自动回退到正式英文版

已完成结果：

- Header、Footer、首页 CTA、Publishing section、features/use-cases 页、SEO/compare 页 related links 全部改为 TanStack `Link`
- 新增 `getPageHref(path, locale)`，统一通过 registry 判断当前 locale 是否已发布，再决定保留 `zh` 还是回退英文
- 所有按钮式跳转已改成 `Button asChild`
- 已确认项目内不再存在裸站内 `href="/..."`

#### Step 6：补齐页面级 locale 内容

状态：已完成

目标：

- 消灭“中文 URL + 英文正文”的半双语状态

执行：

- 只为以下 5 个双语页面补全中文正文：
- `/`
- `/features`
- `/download`
- `/pricing`
- `/use-cases`
- 将 `/about`、全部 landing pages、全部 compare pages、`/privacy`、`/terms` 的 `zh` 统一标记为 `disabled`
- 对所有 `zh: disabled` 页面，移除中文 hreflang、中文 sitemap 条目和中文站内入口
- 为 `disabled` locale 页面增加 route-level 发布守卫，直接返回 404 或重定向到默认语言正式版本

完成标准：

- 没有任何一个 `/zh/*` 可索引页面仍展示英文正文主体
- 当前版本的中文站范围稳定收敛在 5 个核心产品页
- `disabled` locale 页面不能再通过直接访问 URL 进入可见正文页面

已完成结果：

- 首页、`/features`、`/download`、`/pricing`、`/use-cases` 已补齐中文 meta 与正文主体
- `download` 和首页底部下载区的状态文案、版本文案、系统要求已完成双语化
- `features` 和 `use-cases` 的列表内容已改为翻译 key 驱动，消除了中文页里的英文主体段落
- `site-pages.ts` 已冻结双语范围为 5 个核心产品页，其余页面继续 `zh: disabled`

#### Step 7：收紧 legal 发布范围

状态：已完成

目标：

- 从生产行为层面移除伪双语 legal

执行：

- 停止发布 `/zh/privacy`、`/zh/terms`
- 从导航、footer、sitemap、hreflang 中移除这些链接

完成标准：

- legal 只保留英文正式版

已完成结果：

- `/privacy`、`/terms` 继续保留英文正式版，`site-pages.ts` 中 `zh` 已明确为 `disabled`
- footer 在中文环境下会自动把 legal 链接回退到英文正式版
- 新增 route-level locale 守卫：访问 `/zh/privacy`、`/zh/terms` 等未发布页面时自动重定向到英文正式版

#### Step 8：补齐结构性测试

状态：已完成

目标：

- 把 locale/SEO 约束固化为自动化门禁

执行：

- 测试 `localePath()` 输出
- 测试 locale-aware canonical / og:url / og:locale
- 测试 hreflang 只包含已发布 locale
- 测试 sitemap 不包含 `disabled` locale
- 测试站内链接在已发布 locale 下保留当前语言，未发布 locale 下回退英文正式版

完成标准：

- locale/SEO 错误能够在测试阶段被捕获

已完成结果：

- `src/lib/__tests__/seo.spec.ts` 已覆盖 locale-aware `og:url` / `og:locale`、published locale 的 hreflang、`getPageHref()` 回退逻辑和未发布 locale 的 redirect path
- `server/routes/__tests__/sitemap.spec.ts` 已覆盖 `disabled` locale 不应进入 sitemap
- `pnpm --filter @moryflow/www test:unit` 已通过（4 files / 19 tests）

#### Step 9：最终验证

状态：已完成

执行：

- `pnpm --filter @moryflow/www test:unit`
- `pnpm --filter @moryflow/www typecheck`
- `pnpm --filter @moryflow/www build`
- 手工检查：
- `/`
- `/zh/`
- `/features`
- `/zh/features`
- `/download`
- `/zh/download`
- `/agent-workspace`
- `/zh/agent-workspace`（仅当发布）
- `/compare/openclaw`
- sitemap / hreflang / JSON-LD

完成标准：

- 所有发布页面的语言、canonical、hreflang、schema、内链一致
- 不存在半双语索引页

已完成结果：

- `pnpm --filter @moryflow/www typecheck` 已通过
- `pnpm --filter @moryflow/www test:unit` 已通过（4 files / 19 tests）
- `pnpm --filter @moryflow/www build` 已通过
- 文档中的 Step 1-9 状态已与当前代码实现同步
- 当前构建仍存在上游依赖与 bundler 的 warning（chunk size、Radix `"use client"`、TanStack sitemap plugin 的 `No pages were found to build the sitemap`），但不影响本次 locale / SEO / routing 改造的正确性与交付

### 参考来源（官方/原始规范）

以下来源直接支撑本节的冻结方案：

1. TanStack Router 官方 i18n 指南
   [https://tanstack.com/router/latest/docs/guide/internationalization-i18n](https://tanstack.com/router/latest/docs/guide/internationalization-i18n)

2. TanStack Router 官方 Path Params 指南
   [https://tanstack.com/router/latest/docs/framework/react/guide/path-params](https://tanstack.com/router/latest/docs/framework/react/guide/path-params)

3. TanStack Router 官方 Link Options 指南
   [https://tanstack.com/router/latest/docs/guide/link-options](https://tanstack.com/router/latest/docs/guide/link-options)

4. TanStack Router 官方 Navigation 指南
   [https://tanstack.com/router/latest/docs/guide/navigation](https://tanstack.com/router/latest/docs/guide/navigation)

5. TanStack Router 官方 Document Head Management 指南
   [https://tanstack.com/router/latest/docs/framework/react/guide/document-head-management/](https://tanstack.com/router/latest/docs/framework/react/guide/document-head-management/)

6. TanStack Router 官方 File-Based Routing Testing 指南
   [https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing](https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing)

7. Google Search Central: Localized versions of your pages
   [https://developers.google.com/search/docs/specialty/international/localized-versions](https://developers.google.com/search/docs/specialty/international/localized-versions)

8. Google Search Central: Build and submit a sitemap
   [https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

9. Schema.org FAQPage
   [https://schema.org/FAQPage](https://schema.org/FAQPage)
