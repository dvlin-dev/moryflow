/**
 * [PROVIDES]: locale 常量、校验函数、路径生成工具、翻译 dict
 * [DEPENDS]: 无
 * [POS]: 官网 i18n 基础设施（轻量 dict + locale context，不引入重量级框架）
 */

export const SUPPORTED_LOCALES = ['en', 'zh'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** HTML lang attribute values */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-CN',
};

/** hreflang values (BCP 47) */
export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-Hans',
};

/** 校验是否为支持的 locale */
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

/**
 * 生成带 locale 前缀的路径。
 * 英文（默认语言）无前缀，中文加 `/zh` 前缀。
 *
 * @example
 * localePath('/about', 'en') // '/about'
 * localePath('/about', 'zh') // '/zh/about'
 * localePath('/', 'zh')      // '/zh'
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) {
    return path;
  }
  if (path === '/') {
    return `/${locale}`;
  }
  return `/${locale}${path}`;
}

/**
 * 从 URL 路径中解析 locale。
 * 返回解析出的 locale 和去除前缀后的路径。
 */
export function parseLocalePath(pathname: string): { locale: Locale; path: string } {
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      const path = pathname.slice(locale.length + 1) || '/';
      return { locale, path };
    }
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** 将可能为空或非法的 route param 收敛为受支持的 locale。 */
export function resolveLocale(value: unknown): Locale {
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

// ─── Translation Dict ───

type TranslationDict = Record<string, string>;

const translations: Record<Locale, TranslationDict> = {
  en: {
    // Meta
    'meta.home.title': 'Local-first AI Agent Workspace',
    'meta.home.description':
      'AI agents that work with your knowledge, notes, and files. Capture outputs as durable knowledge and publish to the web.',
    'meta.download.title': 'Download',
    'meta.download.description':
      'Download Moryflow for macOS. Apple Silicon and Intel builds are publicly available now.',
    'meta.pricing.title': 'Pricing',
    'meta.pricing.description':
      'Moryflow pricing — free tier included. Upgrade for more AI credits, storage, and published sites.',
    // Nav
    'nav.compare': 'Compare',
    'nav.pricing': 'Pricing',
    'nav.download': 'Download',
    'nav.allComparisons': 'All comparisons',
    'nav.docs': 'Docs',
    'nav.github': 'GitHub',

    // Homepage Hero (split for accent styling)
    'home.hero.titlePrefix': 'Your AI agents',
    'home.hero.titleAccent': 'your knowledge',
    'home.hero.subtitle':
      'A local-first workspace where AI agents work with your notes, files, and context — then capture results as durable, publishable knowledge.',
    'home.hero.cta': 'Download',
    'home.hero.ctaMac': 'Download for macOS',
    // Homepage Features (6-card grid)
    'home.features.title': 'Everything you need',
    'home.features.subtitle':
      'Autonomous agents, a local-first knowledge base, and publishing — in one open workspace.',
    'home.features.agentTitle': 'Autonomous AI Agents',
    'home.features.agentDesc':
      'Assign the task, your agent does the work — research, write, organize, and act on your notes and files.',
    'home.features.notesTitle': 'Local-first Knowledge Base',
    'home.features.notesDesc':
      'Your knowledge stays on your device. Full ownership, no cloud lock-in — sync only when you choose.',
    'home.features.memoryTitle': 'Adaptive Memory',
    'home.features.memoryDesc':
      'Agents remember your preferences, projects, and context across every session. The more you use it, the smarter it gets.',
    'home.features.publishTitle': 'One-click Publishing',
    'home.features.publishDesc':
      'Turn any note into a live website. Digital gardens, portfolios — no separate CMS.',
    'home.features.telegramTitle': 'Remote Agent',
    'home.features.telegramDesc':
      'Your agents work wherever you are. Start from Telegram — same context, same memory, always connected.',
    'home.features.openTitle': 'Open & Extensible',
    'home.features.openDesc':
      'Open source, 24+ AI providers with your own keys, and MCP tools for infinite extensibility.',

    // Homepage Compare
    'home.compare.title': 'See how Moryflow compares',
    'home.compare.subtitle':
      'They solve adjacent problems. Moryflow is for people who want local-first knowledge work, autonomous AI agents, and publishing in one desktop workspace.',
    'home.compare.cta': 'See comparison',
    'home.compare.alsoCompare': 'Also compare with',
    'home.compare.scrollHint': 'Swipe to compare more',
    'home.compare.seeFullComparison': 'See full comparison',
    'home.compare.feat.agents': 'Autonomous AI Agents',
    'home.compare.feat.localFirst': 'Local-first Data',
    'home.compare.feat.memory': 'Adaptive Memory',
    'home.compare.feat.publishing': 'Built-in Publishing',
    'home.compare.feat.multiProvider': '24+ AI Providers (BYOK)',
    'home.compare.feat.openSource': 'Open Source',
    'home.compare.feat.desktop': 'Desktop Native',
    'home.compare.feat.remoteAgent': 'Remote Agent (Telegram)',
    'home.compare.feat.freeToStart': 'Free to Start',
    'home.compare.val.selfHosted': 'Self-hosted',
    'home.compare.val.paidAddon': 'Paid add-on',
    'home.compare.val.viaPlugins': 'Via plugins',
    'home.compare.val.partial': 'Partial',
    'home.compare.val.webWrapper': 'Web wrapper',
    'home.compare.openclawDesc':
      'OpenClaw focuses on self-hosted, multi-channel agent operations. Moryflow focuses on a desktop-first workspace where agents work with your notes.',
    'home.compare.coworkDesc':
      'Cowork integrates Claude into collaborative work. Moryflow builds a local-first workspace around AI agents and personal knowledge.',
    'home.compare.obsidianDesc':
      'Obsidian excels at local note-taking and extensibility. Moryflow adds an opinionated AI workflow, persistent knowledge context, and built-in publishing.',
    'home.compare.manusDesc':
      'Manus focuses on cloud-based autonomous agents and web publishing. Moryflow focuses on a local-first desktop workspace where agents work with your private notes.',
    'home.compare.notionDesc':
      'Notion is a cloud-first team workspace with AI add-ons. Moryflow is a local-first personal workspace built around autonomous AI agents and one-click publishing.',
    'home.hero.starOnGithub': 'Star on GitHub',
    'home.hero.freeToStart': 'Free to start \u00b7 Open Source',

    // Trust Strip
    'home.trust.openSource': 'Open Source',
    'home.trust.localFirst': 'Local-first',
    'home.trust.providers': '24+ AI Providers',
    'home.trust.stars': '{count} GitHub Stars',

    // Feature — AI Agents
    'home.agents.title': 'AI agents that actually work with your knowledge',
    'home.agents.desc':
      'Assign tasks to autonomous agents that research, write, and organize \u2014 using your notes and files as context. They remember your preferences across sessions.',
    'home.agents.point1': 'Autonomous task execution across your notes and files',
    'home.agents.point2': 'Cross-session memory that learns your preferences',
    'home.agents.point3': '24+ AI providers \u2014 bring your own API keys',
    'home.agents.subtitle': 'Adaptive Memory',
    'home.agents.memoryDesc':
      'The more you use Moryflow, the smarter your agents get. They remember your writing style, project context, and preferences across every session.',
    'home.agents.screenshotAlt': 'Screenshot: AI Agent working with your notes',

    // Feature — Local-first
    'home.local.title': 'Your data, your rules',
    'home.local.subtitle':
      'Built on principles that put you in control \u2014 local-first storage, bring your own keys, and fully open source.',
    'home.local.dataTitle': 'Local-first',
    'home.local.dataDesc':
      'Your notes and knowledge stay on your device. No cloud dependency, no lock-in \u2014 sync only when you choose.',
    'home.local.byokTitle': 'Bring Your Own Key',
    'home.local.byokDesc':
      '24+ AI providers supported. Use your own API keys \u2014 no middleman, no markup on AI costs.',
    'home.local.ossTitle': 'Open Source',
    'home.local.ossDesc':
      'MIT licensed, fully transparent codebase. Inspect, modify, and self-host \u2014 your workspace, your terms.',

    // Feature — Publishing
    'home.publish.title': 'From notes to published website in one click',
    'home.publish.desc':
      'Your knowledge deserves an audience. Turn any note into a live website, and let your remote agent work while you are away.',
    'home.publish.publishTitle': 'One-click Publishing',
    'home.publish.publishDesc':
      'Turn any note into a live website instantly. Digital gardens, portfolios, documentation \u2014 no separate CMS needed.',
    'home.publish.remoteTitle': 'Remote Agent',
    'home.publish.remoteDesc':
      'Your agents work wherever you are. Start tasks from Telegram \u2014 same context, same memory, always connected.',
    'home.publish.screenshotAlt': 'Screenshot: Note \u2192 Published website',
    'home.publish.subtitle': 'Publish & Extend',

    // Community links (used in DownloadCTA)
    'home.community.joinGithub': 'Star on GitHub',
    'home.community.joinDiscord': 'Join Discord',

    // Download Page
    'download.title': 'Download Moryflow',
    'download.subtitle':
      'Install the desktop app from GitHub Releases and use download.moryflow.com for in-app updates.',
    'download.button': 'Download',
    'download.macAppleSilicon': 'macOS (Apple Silicon)',
    'download.macAppleSiliconSub': 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    'download.macIntel': 'macOS (Intel)',
    'download.macIntelSub': 'Intel-based Macs running a supported version of macOS',
    'download.sysReq': 'System requirements',
    'download.preparing': 'Preparing...',
    'download.started': 'Download started',
    'download.versionPrefix': 'v',
    'download.betaLabel': 'Beta',
    'download.stableLabel': 'Stable',
    'download.currentPublicVersion': 'Current public version',
    'download.channel': 'Channel',
    'download.releaseNotes': 'Release notes',
    'download.allReleases': 'All releases',
    'download.manualVsAuto':
      'Manual downloads and release notes live on GitHub Releases. In-app update checks and package delivery use download.moryflow.com.',
    'download.requirements.mac.os': 'macOS 12.0 (Monterey) or later',
    'download.requirements.mac.chip': 'Apple Silicon or Intel',
    'download.requirements.mac.ram': '4 GB RAM minimum',
    'download.requirements.mac.disk': '500 MB disk space',

    // Download CTA (homepage bottom)
    'downloadCta.title': 'Start building your knowledge',
    'downloadCta.desc':
      'Free to start, open source. Public downloads currently ship for macOS Apple Silicon and Intel.',

    // Pricing Page
    'pricing.title': 'Simple, transparent pricing',
    'pricing.subtitle': 'Start free, upgrade when you need more AI credits and storage.',
    'pricing.monthly': 'Monthly',
    'pricing.yearly': 'Yearly',
    'pricing.yearlySave': 'Save ~17%',
    'pricing.mo': '/mo',
    'pricing.yr': '/yr',
    'pricing.getStarted': 'Get started',
    'pricing.upgrade': 'Upgrade',
    'pricing.recommended': 'Recommended',
    'pricing.unlimited': 'Unlimited',
    'pricing.creditsLabel': 'AI credits',
    'pricing.sitesLabel': 'Published sites',
    'pricing.storageLabel': 'Storage',
    'pricing.fileSizeLabel': 'Max file size',
    'pricing.creditPacksTitle': 'Need more AI credits?',
    'pricing.creditPacksDesc':
      'Buy credit packs anytime. Credits are valid for 1 year from purchase.',
    'pricing.creditPack': 'credits',
    'pricing.faqTitle': 'Common questions',
    'pricing.faqCredits': 'What are AI credits?',
    'pricing.faqCreditsAnswer':
      'AI credits are consumed when you use AI features like autonomous agents, knowledge queries, and other AI-powered tasks. Different actions use different amounts of credits.',
    'pricing.faqData': 'What happens to my data?',
    'pricing.faqDataAnswer':
      'Your data is stored locally on your device. It stays yours regardless of your subscription tier.',
    'pricing.faqPlatforms': 'What platforms are supported?',
    'pricing.faqPlatformsAnswer':
      'Public builds are currently available for macOS on Apple Silicon and Intel.',
    'pricing.faqCancel': 'Can I cancel anytime?',
    'pricing.faqCancelAnswer':
      'Yes, you can cancel your subscription at any time. You will keep access until the end of your billing period.',

    // Shared / CTA
    'cta.downloadMoryflow': 'Download Moryflow',
    'cta.freeToStartFull': 'Free to start \u00b7 macOS available now',

    // Shared / Structural
    'shared.howItWorks': 'How it works',
    'shared.faqTitle': 'Frequently asked questions',
    'shared.learnMore': 'Learn more',

    // Compare Page Structural
    'compare.indexTitle': 'Compare Moryflow',
    'compare.indexSubtitle':
      'See how Moryflow compares to other tools for AI-powered knowledge work.',
    'compare.label': 'Compare',
    'compare.atAGlance': 'At a glance',
    'compare.differentTools': 'Different tools for different needs',
    'compare.keyDifferences': 'Key differences',
    'compare.summaryPrefix': 'Moryflow vs',
    'compare.tryTitle': 'Try Moryflow for yourself',
    'compare.tryDesc':
      'The best way to compare is to try it. Download Moryflow and see how it fits your workflow.',

    // Footer
    'footer.tagline': 'Local-first AI agent workspace.',
    'footer.product': 'Product',
    'footer.compare': 'Compare',
    'footer.resources': 'Resources',
    'footer.legal': 'Legal',
    'footer.pricing': 'Pricing',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.github': 'GitHub',
    'footer.releaseNotes': 'Release Notes',
  },
  zh: {
    // Meta
    'meta.home.title': '本地优先的 AI 智能体工作空间',
    'meta.home.description':
      '让 AI 智能体在你的知识、笔记和文件上下文中工作，把结果沉淀为可长期管理并可发布的知识资产。',
    'meta.download.title': '下载',
    'meta.download.description':
      '下载适用于 macOS 的 Moryflow。当前公开提供 Apple Silicon 与 Intel 版本。',
    'meta.pricing.title': '定价',
    'meta.pricing.description':
      'Moryflow 定价 — 含免费版。升级获得更多 AI 额度、存储空间和发布站点数。',
    // Nav
    'nav.compare': '对比',
    'nav.pricing': '定价',
    'nav.download': '下载',
    'nav.allComparisons': '查看全部对比',
    'nav.docs': '文档',
    'nav.github': 'GitHub',

    // Homepage Hero
    'home.hero.titlePrefix': '你的 AI 智能体',
    'home.hero.titleAccent': '你的知识',
    'home.hero.subtitle':
      '本地优先的工作空间，AI 智能体与你的笔记、文件和上下文协同工作 —— 将成果沉淀为持久、可发布的知识。',
    'home.hero.cta': '下载',
    'home.hero.ctaMac': '下载 macOS 版',
    // Homepage Features (6-card grid)
    'home.features.title': '你需要的一切',
    'home.features.subtitle': '自主智能体、本地优先知识库和一键发布 —— 集成在一个开放工作空间中。',
    'home.features.agentTitle': '自主 AI 智能体',
    'home.features.agentDesc':
      '交给智能体，它来完成 —— 调研、写作、整理，基于你的笔记和文件自主执行。',
    'home.features.notesTitle': '本地优先知识库',
    'home.features.notesDesc': '知识留在你的设备上。完全自主，无云端锁定 —— 按需同步。',
    'home.features.memoryTitle': '自适应记忆',
    'home.features.memoryDesc': '智能体记住你的偏好、项目和上下文，跨会话持久化。越用越懂你。',
    'home.features.publishTitle': '一键发布',
    'home.features.publishDesc': '将任何笔记变为线上网站。数字花园、作品集 —— 无需单独的 CMS。',
    'home.features.telegramTitle': '远程智能体',
    'home.features.telegramDesc':
      '智能体随时随地工作。通过 Telegram 继续 —— 同样的上下文与记忆，始终在线。',
    'home.features.openTitle': '开源 & 可扩展',
    'home.features.openDesc': '完全开源、24+ AI 模型提供商自带 Key、MCP 工具无限扩展。',

    // Homepage Compare
    'home.compare.title': '看看 Moryflow 与它们有何不同',
    'home.compare.subtitle':
      '它们解决的是相邻问题。Moryflow 面向的是本地优先的知识工作，把自主 AI 智能体与发布能力放进同一个桌面工作空间。',
    'home.compare.cta': '查看对比',
    'home.compare.alsoCompare': '还可以对比',
    'home.compare.scrollHint': '左右滑动查看更多',
    'home.compare.seeFullComparison': '查看完整对比',
    'home.compare.feat.agents': '自主 AI 智能体',
    'home.compare.feat.localFirst': '本地优先数据',
    'home.compare.feat.memory': '自适应记忆',
    'home.compare.feat.publishing': '一键发布',
    'home.compare.feat.multiProvider': '24+ AI 供应商 (自带 Key)',
    'home.compare.feat.openSource': '开源',
    'home.compare.feat.desktop': '桌面原生',
    'home.compare.feat.remoteAgent': '远程智能体 (Telegram)',
    'home.compare.feat.freeToStart': '免费开始',
    'home.compare.val.selfHosted': '自托管',
    'home.compare.val.paidAddon': '付费插件',
    'home.compare.val.viaPlugins': '通过插件',
    'home.compare.val.partial': '部分',
    'home.compare.val.webWrapper': 'Web 封装',
    'home.compare.openclawDesc':
      'OpenClaw 偏向 self-hosted、多渠道智能体运行。Moryflow 偏向 desktop-first 的知识工作空间，让智能体围绕你的笔记工作。',
    'home.compare.coworkDesc':
      'Cowork 将 Claude 集成到协作工作中。Moryflow 围绕 AI 智能体和个人知识构建本地优先工作空间。',
    'home.compare.obsidianDesc':
      'Obsidian 擅长本地笔记和插件生态。Moryflow 进一步内建了 AI 工作流、持续知识上下文和一体化发布。',
    'home.compare.manusDesc':
      'Manus 侧重云端自主智能体和网页发布。Moryflow 侧重本地优先的桌面工作空间，让智能体围绕你的私人笔记工作。',
    'home.compare.notionDesc':
      'Notion 是云端优先的团队协作空间，附带 AI 功能。Moryflow 是围绕自主 AI 智能体和一键发布构建的本地优先个人工作空间。',
    'home.hero.starOnGithub': '在 GitHub 上 Star',
    'home.hero.freeToStart': '免费开始 \u00b7 开源项目',

    // Trust Strip
    'home.trust.openSource': '开源',
    'home.trust.localFirst': '本地优先',
    'home.trust.providers': '24+ AI 供应商',
    'home.trust.stars': '{count} GitHub Stars',

    // Feature — AI Agents
    'home.agents.title': '真正理解你知识的 AI 智能体',
    'home.agents.desc':
      '把任务交给自主智能体，它们利用你的笔记和文件作为上下文进行调研、写作和整理 \u2014\u2014 并跨会话记住你的偏好。',
    'home.agents.point1': '基于你的笔记和文件自主执行任务',
    'home.agents.point2': '跨会话记忆，越用越懂你',
    'home.agents.point3': '24+ AI 供应商 \u2014\u2014 自带 API Key',
    'home.agents.subtitle': '自适应记忆',
    'home.agents.memoryDesc':
      '使用 Moryflow 越多，你的智能体就越智能。它们会记住你的写作风格、项目上下文和每次会话中的偏好。',
    'home.agents.screenshotAlt': '截图：AI 智能体与你的笔记协作',

    // Feature — Local-first
    'home.local.title': '你的数据，你做主',
    'home.local.subtitle':
      '基于让你掌控一切的原则构建 \u2014\u2014 本地优先存储、自带密钥、完全开源。',
    'home.local.dataTitle': '本地优先',
    'home.local.dataDesc': '笔记和知识留在你的设备上。无云端依赖、无锁定 \u2014\u2014 按需同步。',
    'home.local.byokTitle': '自带密钥',
    'home.local.byokDesc':
      '支持 24+ AI 供应商。使用你自己的 API Key \u2014\u2014 无中间商、无加价。',
    'home.local.ossTitle': '开源',
    'home.local.ossDesc':
      'MIT 许可，代码完全透明。审查、修改、自托管 \u2014\u2014 你的工作空间，你的规则。',

    // Feature — Publishing
    'home.publish.title': '从笔记到网站，一键发布',
    'home.publish.desc':
      '你的知识值得被看到。将任何笔记变为线上网站，让远程智能体在你离开时继续工作。',
    'home.publish.publishTitle': '一键发布',
    'home.publish.publishDesc':
      '将任何笔记即时发布为网站。数字花园、作品集、文档 \u2014\u2014 无需单独的 CMS。',
    'home.publish.remoteTitle': '远程智能体',
    'home.publish.remoteDesc':
      '智能体随时随地工作。通过 Telegram 启动任务 \u2014\u2014 同样的上下文与记忆，始终在线。',
    'home.publish.screenshotAlt': '截图：笔记 \u2192 已发布网站',
    'home.publish.subtitle': '发布 & 扩展',

    // Community links (used in DownloadCTA)
    'home.community.joinGithub': '在 GitHub 上 Star',
    'home.community.joinDiscord': '加入 Discord',

    // Download Page
    'download.title': '下载 Moryflow',
    'download.subtitle': '手动下载使用 GitHub Releases，应用内更新使用 download.moryflow.com。',
    'download.button': '下载',
    'download.macAppleSilicon': 'macOS（Apple Silicon）',
    'download.macAppleSiliconSub': '适用于 M1、M2、M3、M4 及更新的 Apple Silicon Mac',
    'download.macIntel': 'macOS（Intel）',
    'download.macIntelSub': '适用于受支持 macOS 版本的 Intel Mac',
    'download.sysReq': '系统要求',
    'download.preparing': '准备中...',
    'download.started': '已开始下载',
    'download.versionPrefix': 'v',
    'download.betaLabel': 'Beta',
    'download.stableLabel': 'Stable',
    'download.currentPublicVersion': '当前公开版本',
    'download.channel': '通道',
    'download.releaseNotes': '查看 Release Notes',
    'download.allReleases': '查看所有版本',
    'download.manualVsAuto':
      '手动下载与版本说明以 GitHub Releases 为准；应用内检查更新与安装包分发使用 download.moryflow.com。',
    'download.requirements.mac.os': 'macOS 12.0（Monterey）或更高版本',
    'download.requirements.mac.chip': 'Apple Silicon 或 Intel',
    'download.requirements.mac.ram': '至少 4 GB 内存',
    'download.requirements.mac.disk': '500 MB 磁盘空间',

    // Download CTA (homepage bottom)
    'downloadCta.title': '开始构建你的知识',
    'downloadCta.desc': '免费开始，开源项目。当前公开提供 macOS Apple Silicon 与 Intel 版本。',

    // Pricing Page
    'pricing.title': '简单透明的定价',
    'pricing.subtitle': '免费开始，需要更多 AI 额度和存储时再升级。',
    'pricing.monthly': '月付',
    'pricing.yearly': '年付',
    'pricing.yearlySave': '省 ~17%',
    'pricing.mo': '/月',
    'pricing.yr': '/年',
    'pricing.getStarted': '开始使用',
    'pricing.upgrade': '升级',
    'pricing.recommended': '推荐',
    'pricing.unlimited': '无限',
    'pricing.creditsLabel': 'AI 额度',
    'pricing.sitesLabel': '发布站点',
    'pricing.storageLabel': '存储空间',
    'pricing.fileSizeLabel': '单文件上限',
    'pricing.creditPacksTitle': '需要更多 AI 额度？',
    'pricing.creditPacksDesc': '随时购买额度包。额度自购买起 1 年内有效。',
    'pricing.creditPack': '额度',
    'pricing.faqTitle': '常见问题',
    'pricing.faqCredits': '什么是 AI 额度？',
    'pricing.faqCreditsAnswer':
      'AI 额度在你使用自主智能体、知识查询等 AI 功能时消耗。不同操作消耗不同数量的额度。',
    'pricing.faqData': '我的数据怎么办？',
    'pricing.faqDataAnswer': '你的数据存储在本地设备上。无论订阅等级如何，数据始终属于你。',
    'pricing.faqPlatforms': '支持哪些平台？',
    'pricing.faqPlatformsAnswer': '当前公开提供 macOS（Apple Silicon 与 Intel）桌面版本。',
    'pricing.faqCancel': '可以随时取消吗？',
    'pricing.faqCancelAnswer': '可以，你随时可以取消订阅。取消后你仍然可以使用到当前计费周期结束。',

    // Shared / CTA
    'cta.downloadMoryflow': '下载 Moryflow',
    'cta.freeToStartFull': '免费开始 \u00b7 当前提供 macOS',

    // Shared / Structural
    'shared.howItWorks': '工作流程',
    'shared.faqTitle': '常见问题',
    'shared.learnMore': '了解更多',

    // Compare Page Structural
    'compare.indexTitle': 'Moryflow 对比',
    'compare.indexSubtitle': '看看 Moryflow 与其他 AI 知识工作工具有何不同。',
    'compare.label': '对比',
    'compare.atAGlance': '一览',
    'compare.differentTools': '不同工具，不同需求',
    'compare.keyDifferences': '关键差异',
    'compare.summaryPrefix': 'Moryflow 对比',
    'compare.tryTitle': '亲自试试 Moryflow',
    'compare.tryDesc': '最好的对比方式是亲自体验。下载 Moryflow，看看它是否适合你的工作流。',

    // Footer
    'footer.tagline': '本地优先的 AI 智能体工作空间。',
    'footer.product': '产品',
    'footer.compare': '对比',
    'footer.resources': '资源',
    'footer.legal': '法律',
    'footer.pricing': '定价',
    'footer.privacy': '隐私',
    'footer.terms': '条款',
    'footer.github': 'GitHub',
    'footer.releaseNotes': 'Release Notes',
  },
};

/** Get a translated string by key. Falls back to English if key not found. */
export function t(key: string, locale: Locale): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
