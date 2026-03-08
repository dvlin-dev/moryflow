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
    'meta.features.title': 'Features',
    'meta.features.description':
      'Explore Moryflow capabilities — AI agent workflows, local-first notes, knowledge memory, and one-click publishing.',
    'meta.download.title': 'Download',
    'meta.download.description':
      'Download Moryflow for macOS. Apple Silicon and Intel builds are publicly available now; Windows is coming soon.',
    'meta.pricing.title': 'Pricing',
    'meta.pricing.description':
      'Moryflow is free during beta. All features included — AI agents, local-first notes, and publishing.',
    'meta.useCases.title': 'Use Cases',
    'meta.useCases.description':
      'How people use Moryflow — research workflows, writing, personal knowledge bases, and digital garden publishing.',

    // Nav
    'nav.product': 'Product',
    'nav.features': 'Features',
    'nav.useCases': 'Use Cases',
    'nav.download': 'Download',
    'nav.docs': 'Docs',

    // Homepage Hero (split for accent styling)
    'home.hero.titlePrefix': 'Your AI agents,',
    'home.hero.titleAccent': 'your knowledge',
    'home.hero.subtitle':
      'A local-first workspace where AI agents work with your notes, files, and context — then capture results as durable, publishable knowledge.',
    'home.hero.cta': 'Download',
    'home.hero.ctaMac': 'Download for macOS',
    'home.hero.altMac': 'Also available for macOS',
    'home.hero.altWinSoon': 'Windows coming soon',
    'home.hero.freeBeta': 'Free during beta',
    'home.hero.screenshotPlaceholder': 'Product screenshot coming soon',

    // Homepage Pillars
    'home.pillars.title': 'Why Moryflow',
    'home.pillars.agentTitle': 'Agent-native workspace',
    'home.pillars.agentDesc':
      'AI agents that read your notes, execute tasks, and produce outputs you keep. Not another chat window.',
    'home.pillars.notesTitle': 'Local-first AI notes',
    'home.pillars.notesDesc':
      'Your notes stay on your device. Agents work with local context — no cloud dependency.',
    'home.pillars.publishTitle': 'Publishable knowledge',
    'home.pillars.publishDesc':
      'Turn any note into a web page. Your knowledge becomes a living digital presence.',
    'home.pillars.screenshotPlaceholder': 'Screenshot',

    // Homepage Workflow
    'home.workflow.title': 'How it works',
    'home.workflow.step1': 'Collect context',
    'home.workflow.step1Desc': 'Gather notes, files, and references in your workspace.',
    'home.workflow.step2': 'Run agent tasks',
    'home.workflow.step2Desc':
      'Agents research, draft, summarize, and organize using your context.',
    'home.workflow.step3': 'Capture outputs',
    'home.workflow.step3Desc': 'Results become structured notes — searchable and connected.',
    'home.workflow.step4': 'Publish',
    'home.workflow.step4Desc': 'Share your knowledge as a website with one click.',

    // Homepage Use Cases Section
    'home.useCases.title': 'Built for how you work',
    'home.useCases.researchTitle': 'Research workflows',
    'home.useCases.researchDesc':
      'Collect, analyze, and synthesize sources with AI agents that remember your prior research.',
    'home.useCases.writingTitle': 'Writing and drafting',
    'home.useCases.writingDesc':
      'From rough notes to polished output — agents help you outline, draft, and refine.',
    'home.useCases.pkmTitle': 'Personal knowledge base',
    'home.useCases.pkmDesc':
      'A second brain that AI can actually use. Knowledge compounds over time.',
    'home.useCases.gardenTitle': 'Digital garden',
    'home.useCases.gardenDesc':
      'Turn your notes into a living website. Update by editing your notes.',

    // Homepage Social Proof
    'home.socialProof.title': 'Join early adopters',
    'home.socialProof.subtitle':
      'Moryflow is in beta. Join the community shaping the future of knowledge work.',
    'home.socialProof.beta': 'Moryflow is in beta',

    // Homepage Publishing
    'home.publishing.title': 'Notes to website, instantly',
    'home.publishing.desc':
      'Publish any note or collection as a clean, fast website. Custom domains supported. Update by editing your notes — no CMS, no deploy pipeline.',
    'home.publishing.learnMore': 'Learn more',

    // Download Page
    'download.title': 'Download Moryflow',
    'download.subtitle':
      'Install the desktop app from GitHub Releases and use download.moryflow.com for in-app updates.',
    'download.button': 'Download',
    'download.macAppleSilicon': 'macOS (Apple Silicon)',
    'download.macAppleSiliconSub': 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    'download.macIntel': 'macOS (Intel)',
    'download.macIntelSub': 'Intel-based Macs running a supported version of macOS',
    'download.windowsSoon': 'Windows coming soon',
    'download.windowsSoonDesc':
      'Windows downloads are temporarily offline while signing and release packaging are being finalized.',
    'download.freeBeta': 'Free during beta',
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
    'download.requirements.win.os': 'Windows release is coming soon',
    'download.requirements.win.chip': 'Not publicly available yet',
    'download.requirements.win.ram': 'Signing pipeline is being restored',
    'download.requirements.win.disk': 'Check GitHub Releases later',

    // Download CTA (homepage bottom)
    'downloadCta.title': 'Start building your knowledge',
    'downloadCta.desc':
      'Free during beta. Public downloads currently ship for macOS Apple Silicon and Intel.',
    'downloadCta.freeForever': 'Free during beta',

    // Features Page
    'features.title': 'Built for knowledge work',
    'features.subtitle':
      'AI agents, local-first notes, and publishing — integrated into one workspace.',
    'features.agentTitle': 'Agent workflows',
    'features.agentDesc':
      'AI agents that understand your full context. Run research, drafting, and organization tasks that persist across sessions.',
    'features.memoryTitle': 'Knowledge memory',
    'features.memoryDesc':
      'A knowledge base that grows with every interaction. Agents reference your past work so you never start from scratch.',
    'features.notesTitle': 'Local-first notes',
    'features.notesDesc':
      'Your data stays on your device by default. Rich note-taking with full ownership and no cloud dependency.',
    'features.publishTitle': 'One-click publishing',
    'features.publishDesc':
      'Turn any note or collection into a live website. Digital gardens, portfolios, and knowledge bases — without a separate CMS.',
    'features.compareTitle': 'Different tools, different paths',
    'features.compareDesc': 'See how Moryflow compares to other tools you may be considering.',
    'features.ctaTitle': 'Ready to try?',
    'features.ctaDesc':
      'Download Moryflow for free and see how AI agents can work with your knowledge.',
    'features.ctaButton': 'Download Now',
    'features.agentDetail1': 'Agents work with your notes, files, and conversation history',
    'features.agentDetail2': 'Results flow back as structured, editable notes',
    'features.agentDetail3': 'Telegram integration for chat-first agent access',
    'features.memoryDetail1': 'Long-term memory across conversations',
    'features.memoryDetail2': 'Automatic context from your note library',
    'features.memoryDetail3': 'Connections surface as you work',
    'features.notesDetail1': 'Offline-capable — no internet required for local work',
    'features.notesDetail2': 'Optional sync when you choose',
    'features.notesDetail3': 'No vendor lock-in — your files, your formats',
    'features.publishDetail1': 'Publish notes as clean, fast websites',
    'features.publishDetail2': 'Custom domains supported',
    'features.publishDetail3': 'Update content by editing your notes',

    // Use Cases Page
    'useCases.title': 'Built for how you work',
    'useCases.subtitle':
      "Whether you're researching, writing, or building a knowledge base — Moryflow adapts to your workflow.",
    'useCases.howItWorks': 'How it works',
    'useCases.ctaTitle': 'See it in action',
    'useCases.ctaDesc': 'Download Moryflow and try these workflows yourself.',
    'useCases.research.title': 'Research workflows',
    'useCases.research.headline': 'From scattered sources to structured insight',
    'useCases.research.description':
      'Collect references, run AI-powered queries across your notes, and synthesize findings into structured documents. Your agent remembers prior research so each session builds on the last.',
    'useCases.research.step1': 'Gather sources and reference materials into your workspace',
    'useCases.research.step2': 'Ask agents to analyze, compare, and summarize across sources',
    'useCases.research.step3': 'Capture findings as structured notes you can revisit and publish',
    'useCases.writing.title': 'Writing and drafting',
    'useCases.writing.headline': 'From rough notes to polished output',
    'useCases.writing.description':
      'Start with raw ideas, let agents help you outline, draft, and refine. Your writing context stays local — no uploading documents to third-party services.',
    'useCases.writing.step1': 'Capture rough ideas and outlines in your notes',
    'useCases.writing.step2': 'Use agents to expand, restructure, and polish drafts',
    'useCases.writing.step3': 'Publish finished pieces directly as web pages',
    'useCases.pkm.title': 'Personal knowledge base',
    'useCases.pkm.headline': 'A second brain that AI can actually use',
    'useCases.pkm.description':
      'Build a living knowledge base where AI agents reference your accumulated notes, not just the current conversation. Every interaction adds to a growing context that makes agents more useful over time.',
    'useCases.pkm.step1': 'Organize notes by topic, project, or interest area',
    'useCases.pkm.step2': 'Agents automatically reference relevant past notes',
    'useCases.pkm.step3': 'Knowledge compounds — agents get more useful as your library grows',
    'useCases.garden.title': 'Digital garden publishing',
    'useCases.garden.headline': 'Turn your notes into a living website',
    'useCases.garden.description':
      'Publish your notes as a clean, navigable website. Update by editing your notes — no CMS, no deploy pipeline. Share your thinking publicly or with a specific audience.',
    'useCases.garden.step1': 'Write and organize notes as you normally would',
    'useCases.garden.step2': 'Select which notes or collections to publish',
    'useCases.garden.step3': 'Your site updates when you update your notes',

    // Pricing Page
    'pricing.title': 'Beta access',
    'pricing.subtitle': 'Moryflow is free during beta. Everything included, no limitations.',
    'pricing.priceNote': 'Free during beta \u00b7 No credit card',
    'pricing.downloadFree': 'Download Free',
    'pricing.faqTitle': 'Common questions',
    'pricing.faqAlwaysFree': 'Will it always be free?',
    'pricing.faqAlwaysFreeAnswer':
      "Core features will remain free. We may introduce optional premium capabilities in the future, but your current experience won't be limited.",
    'pricing.faqData': 'What happens to my data after beta?',
    'pricing.faqDataAnswer':
      'Your data is stored locally on your device. It stays yours regardless of what happens with the service.',
    'pricing.faqPlatforms': 'What platforms are supported?',
    'pricing.faqPlatformsAnswer':
      'Public builds are currently available for macOS on Apple Silicon and Intel. Windows is coming soon.',
    'pricing.included.agent': 'AI agent workflows',
    'pricing.included.notes': 'Local-first notes with full ownership',
    'pricing.included.memory': 'Knowledge memory across sessions',
    'pricing.included.search': 'Web search integration',
    'pricing.included.telegram': 'Telegram agent access',
    'pricing.included.publishing': 'One-click publishing',
    'pricing.included.desktop': 'macOS desktop app (Windows coming soon)',
    'pricing.included.updates': 'Regular updates',

    // Shared / CTA
    'cta.startBuilding': 'Start building your knowledge',
    'cta.downloadFree': 'Download Free',
    'cta.downloadMoryflow': 'Download Moryflow',
    'cta.freeBeta': 'Free during beta',
    'cta.freeBetaFull': 'Free during beta \u00b7 macOS available now',
    'cta.macAndWindows': 'macOS now \u00b7 Windows soon',

    // Shared / Structural
    'shared.howItWorks': 'How it works',
    'shared.faqTitle': 'Frequently asked questions',
    'shared.learnMore': 'Learn more',

    // Compare Page Structural
    'compare.label': 'Compare',
    'compare.atAGlance': 'At a glance',
    'compare.differentTools': 'Different tools for different needs',
    'compare.keyDifferences': 'Key differences',
    'compare.summaryPrefix': 'Moryflow vs',
    'compare.tryTitle': 'Try Moryflow for yourself',
    'compare.tryDesc':
      'The best way to compare is to try it. Download Moryflow and see how it fits your workflow.',

    // Page labels
    'page.agentWorkspace': 'Agent Workspace',
    'page.aiNoteTakingApp': 'AI Note-Taking App',
    'page.localFirstAiNotes': 'Local-first AI Notes',
    'page.localFirstAiAgent': 'Local-first AI Agent',
    'page.secondBrainApp': 'Second Brain App',
    'page.digitalGardenApp': 'Digital Garden App',
    'page.notesToWebsite': 'Notes to Website',
    'page.telegramAiAgent': 'Telegram AI Agent',

    // Footer
    'footer.tagline': 'Local-first AI agent workspace.',
    'footer.product': 'Product',
    'footer.compare': 'Compare',
    'footer.resources': 'Resources',
    'footer.company': 'Company',
    'footer.pricing': 'Pricing',
    'footer.about': 'About',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.contact': 'Contact',
  },
  zh: {
    // Meta
    'meta.home.title': '本地优先的 AI 智能体工作空间',
    'meta.home.description':
      '让 AI 智能体在你的知识、笔记和文件上下文中工作，把结果沉淀为可长期管理并可发布的知识资产。',
    'meta.features.title': '功能',
    'meta.features.description':
      '探索 Moryflow 的能力：AI 智能体工作流、本地优先笔记、知识记忆与一键发布。',
    'meta.download.title': '下载',
    'meta.download.description':
      '下载适用于 macOS 的 Moryflow。当前公开提供 Apple Silicon 与 Intel 版本，Windows 即将恢复。',
    'meta.pricing.title': '定价',
    'meta.pricing.description':
      'Moryflow 在 Beta 期间免费。AI 智能体、本地优先笔记与发布能力全部开放。',
    'meta.useCases.title': '使用场景',
    'meta.useCases.description':
      '看看大家如何使用 Moryflow：研究工作流、写作、个人知识库与数字花园发布。',

    // Nav
    'nav.product': '产品',
    'nav.features': '功能',
    'nav.useCases': '使用场景',
    'nav.download': '下载',
    'nav.docs': '文档',

    // Homepage Hero
    'home.hero.titlePrefix': '你的 AI 智能体，',
    'home.hero.titleAccent': '你的知识',
    'home.hero.subtitle':
      '本地优先的工作空间，AI 智能体与你的笔记、文件和上下文协同工作 —— 将成果沉淀为持久、可发布的知识。',
    'home.hero.cta': '下载',
    'home.hero.ctaMac': '下载 macOS 版',
    'home.hero.altMac': '也提供 macOS 版',
    'home.hero.altWinSoon': 'Windows 即将恢复',
    'home.hero.freeBeta': 'Beta 期间免费',
    'home.hero.screenshotPlaceholder': '产品截图即将上线',

    // Homepage Pillars
    'home.pillars.title': '为什么选 Moryflow',
    'home.pillars.agentTitle': '智能体原生工作空间',
    'home.pillars.agentDesc':
      'AI 智能体读取你的笔记、执行任务、输出你可留存的成果。不是又一个聊天窗口。',
    'home.pillars.notesTitle': '本地优先的 AI 笔记',
    'home.pillars.notesDesc': '笔记存储在你的设备上。智能体在本地上下文中工作 —— 无需云端依赖。',
    'home.pillars.publishTitle': '可发布的知识',
    'home.pillars.publishDesc': '任何笔记一键发布为网页。让你的知识成为活的数字资产。',
    'home.pillars.screenshotPlaceholder': '截图',

    // Homepage Workflow
    'home.workflow.title': '工作流程',
    'home.workflow.step1': '收集上下文',
    'home.workflow.step1Desc': '在工作空间中汇聚笔记、文件和参考资料。',
    'home.workflow.step2': '运行智能体任务',
    'home.workflow.step2Desc': '智能体利用你的上下文进行研究、起草、总结和整理。',
    'home.workflow.step3': '沉淀产出',
    'home.workflow.step3Desc': '成果变为结构化笔记 —— 可搜索、可关联。',
    'home.workflow.step4': '发布',
    'home.workflow.step4Desc': '一键将知识分享为网站。',

    // Homepage Use Cases Section
    'home.useCases.title': '为你的工作方式而生',
    'home.useCases.researchTitle': '研究工作流',
    'home.useCases.researchDesc': '收集、分析和综合资料，AI 智能体记住你之前的研究。',
    'home.useCases.writingTitle': '写作与起草',
    'home.useCases.writingDesc': '从零散笔记到精炼输出 —— 智能体帮你构思、起草和打磨。',
    'home.useCases.pkmTitle': '个人知识库',
    'home.useCases.pkmDesc': 'AI 真正能用的第二大脑。知识随时间复利增长。',
    'home.useCases.gardenTitle': '数字花园',
    'home.useCases.gardenDesc': '将笔记变为活的网站。编辑笔记即更新网站。',

    // Homepage Social Proof
    'home.socialProof.title': '加入早期用户',
    'home.socialProof.subtitle': 'Moryflow 正在 Beta 测试。加入正在塑造知识工作未来的社区。',
    'home.socialProof.beta': 'Moryflow 正在 Beta 测试',

    // Homepage Publishing
    'home.publishing.title': '笔记秒变网站',
    'home.publishing.desc':
      '任何笔记或合集一键发布为简洁、快速的网站。支持自定义域名。编辑笔记即可更新 —— 无需 CMS，无需部署流水线。',
    'home.publishing.learnMore': '了解更多',

    // Download Page
    'download.title': '下载 Moryflow',
    'download.subtitle': '手动下载使用 GitHub Releases，应用内更新使用 download.moryflow.com。',
    'download.button': '下载',
    'download.macAppleSilicon': 'macOS（Apple Silicon）',
    'download.macAppleSiliconSub': '适用于 M1、M2、M3、M4 及更新的 Apple Silicon Mac',
    'download.macIntel': 'macOS（Intel）',
    'download.macIntelSub': '适用于受支持 macOS 版本的 Intel Mac',
    'download.windowsSoon': 'Windows 即将恢复',
    'download.windowsSoonDesc': 'Windows 下载当前暂时下线，正在收口签名与发布链路。',
    'download.freeBeta': 'Beta 期间免费',
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
    'download.requirements.win.os': 'Windows 版本即将恢复',
    'download.requirements.win.chip': '当前未公开发布',
    'download.requirements.win.ram': '签名与发布流程正在恢复',
    'download.requirements.win.disk': '后续请关注 GitHub Releases',

    // Download CTA (homepage bottom)
    'downloadCta.title': '开始构建你的知识',
    'downloadCta.desc': 'Beta 期间免费。当前公开提供 macOS Apple Silicon 与 Intel 版本。',
    'downloadCta.freeForever': 'Beta 期间免费',

    // Features Page
    'features.title': '为知识工作而生',
    'features.subtitle': 'AI 智能体、本地优先笔记和一键发布 —— 集成在一个工作空间中。',
    'features.agentTitle': '智能体工作流',
    'features.agentDesc': '理解你完整上下文的 AI 智能体。运行研究、起草和整理任务，跨会话持久化。',
    'features.memoryTitle': '知识记忆',
    'features.memoryDesc': '随每次交互成长的知识库。智能体引用你过去的工作，让你不必从零开始。',
    'features.notesTitle': '本地优先笔记',
    'features.notesDesc': '数据默认存储在你的设备上。完全自主的富文本笔记，无需云端依赖。',
    'features.publishTitle': '一键发布',
    'features.publishDesc':
      '将任何笔记或合集变为线上网站。数字花园、作品集和知识库 —— 无需单独的 CMS。',
    'features.compareTitle': '不同工具，不同路径',
    'features.compareDesc': '看看 Moryflow 与你正在考虑的其他工具有何不同。',
    'features.ctaTitle': '准备好了吗？',
    'features.ctaDesc': '免费下载 Moryflow，看看 AI 智能体如何与你的知识协同工作。',
    'features.ctaButton': '立即下载',
    'features.agentDetail1': '智能体可读取你的笔记、文件和会话历史',
    'features.agentDetail2': '结果会回流为结构化、可编辑的笔记',
    'features.agentDetail3': '支持 Telegram 接入，适合 chat-first 的智能体使用方式',
    'features.memoryDetail1': '跨会话的长期记忆',
    'features.memoryDetail2': '自动从你的笔记库补全上下文',
    'features.memoryDetail3': '随着使用，知识连接自然浮现',
    'features.notesDetail1': '支持离线工作，本地场景无需联网',
    'features.notesDetail2': '在你选择时再启用同步',
    'features.notesDetail3': '无厂商锁定，你的文件由你掌控',
    'features.publishDetail1': '将笔记发布为简洁、快速的网站',
    'features.publishDetail2': '支持自定义域名',
    'features.publishDetail3': '编辑笔记即可更新网站内容',

    // Use Cases Page
    'useCases.title': '为你的工作方式而生',
    'useCases.subtitle': '无论你在做研究、写作还是构建知识库 —— Moryflow 都能适配你的工作流。',
    'useCases.howItWorks': '工作流程',
    'useCases.ctaTitle': '亲自体验',
    'useCases.ctaDesc': '下载 Moryflow，亲自试试这些工作流。',
    'useCases.research.title': '研究工作流',
    'useCases.research.headline': '从零散资料到结构化洞见',
    'useCases.research.description':
      '收集参考资料，在你的笔记上运行 AI 查询，并把结果整理成结构化文档。智能体会记住你之前的研究，让每次会话都能继续推进。',
    'useCases.research.step1': '把来源和参考材料汇聚到你的工作空间',
    'useCases.research.step2': '让智能体跨来源分析、比较并总结',
    'useCases.research.step3': '把研究结论沉淀为可回看、可发布的结构化笔记',
    'useCases.writing.title': '写作与起草',
    'useCases.writing.headline': '从粗糙想法到成型内容',
    'useCases.writing.description':
      '从零散想法开始，让智能体帮你梳理结构、起草内容并持续润色。写作上下文始终保留在本地，无需把文档上传到第三方服务。',
    'useCases.writing.step1': '在笔记中记录草稿、提纲和想法',
    'useCases.writing.step2': '让智能体扩写、重组并打磨草稿',
    'useCases.writing.step3': '把完成的内容直接发布为网页',
    'useCases.pkm.title': '个人知识库',
    'useCases.pkm.headline': 'AI 真正能利用的第二大脑',
    'useCases.pkm.description':
      '构建一个会持续生长的知识库，让 AI 智能体读取你积累的笔记，而不是只看当前对话。每一次交互都会增强上下文，让智能体越来越有用。',
    'useCases.pkm.step1': '按主题、项目或兴趣组织笔记',
    'useCases.pkm.step2': '智能体自动引用相关历史笔记',
    'useCases.pkm.step3': '知识持续复利增长，智能体也随之更强',
    'useCases.garden.title': '数字花园发布',
    'useCases.garden.headline': '把你的笔记变成活的网站',
    'useCases.garden.description':
      '将笔记发布为清晰、可导航的网站。编辑笔记即可更新内容，无需 CMS，也无需部署流水线。你可以公开分享自己的思考，或面向特定受众发布。',
    'useCases.garden.step1': '像平时一样写作和整理笔记',
    'useCases.garden.step2': '选择要发布的笔记或合集',
    'useCases.garden.step3': '当你更新笔记时，网站也会同步更新',

    // Pricing Page
    'pricing.title': 'Beta 体验',
    'pricing.subtitle': 'Moryflow 在 Beta 期间免费。全部功能开放，无任何限制。',
    'pricing.priceNote': 'Beta 期间免费 \u00b7 无需信用卡',
    'pricing.downloadFree': '免费下载',
    'pricing.faqTitle': '常见问题',
    'pricing.faqAlwaysFree': '会一直免费吗？',
    'pricing.faqAlwaysFreeAnswer':
      '核心功能将保持免费。未来可能推出可选的高级功能，但不会限制你现有的使用体验。',
    'pricing.faqData': 'Beta 结束后我的数据怎么办？',
    'pricing.faqDataAnswer': '你的数据存储在本地设备上。无论服务如何变化，数据始终属于你。',
    'pricing.faqPlatforms': '支持哪些平台？',
    'pricing.faqPlatformsAnswer':
      '当前公开提供 macOS（Apple Silicon 与 Intel）桌面版本，Windows 即将恢复。',
    'pricing.included.agent': 'AI 智能体工作流',
    'pricing.included.notes': '完全由你掌控的本地优先笔记',
    'pricing.included.memory': '跨会话知识记忆',
    'pricing.included.search': '网页搜索集成',
    'pricing.included.telegram': 'Telegram 智能体接入',
    'pricing.included.publishing': '一键发布能力',
    'pricing.included.desktop': 'macOS 桌面应用（Windows 即将恢复）',
    'pricing.included.updates': '持续更新',

    // Shared / CTA
    'cta.startBuilding': '开始构建你的知识',
    'cta.downloadFree': '免费下载',
    'cta.downloadMoryflow': '下载 Moryflow',
    'cta.freeBeta': 'Beta 期间免费',
    'cta.freeBetaFull': 'Beta 期间免费 \u00b7 当前提供 macOS',
    'cta.macAndWindows': '当前提供 macOS \u00b7 Windows 即将恢复',

    // Shared / Structural
    'shared.howItWorks': '工作流程',
    'shared.faqTitle': '常见问题',
    'shared.learnMore': '了解更多',

    // Compare Page Structural
    'compare.label': '对比',
    'compare.atAGlance': '一览',
    'compare.differentTools': '不同工具，不同需求',
    'compare.keyDifferences': '关键差异',
    'compare.summaryPrefix': 'Moryflow 对比',
    'compare.tryTitle': '亲自试试 Moryflow',
    'compare.tryDesc': '最好的对比方式是亲自体验。下载 Moryflow，看看它是否适合你的工作流。',

    // Page labels
    'page.agentWorkspace': '智能体工作空间',
    'page.aiNoteTakingApp': 'AI 笔记应用',
    'page.localFirstAiNotes': '本地优先 AI 笔记',
    'page.localFirstAiAgent': '本地优先 AI 智能体',
    'page.secondBrainApp': '第二大脑应用',
    'page.digitalGardenApp': '数字花园应用',
    'page.notesToWebsite': '笔记发布网站',
    'page.telegramAiAgent': 'Telegram AI 智能体',

    // Footer
    'footer.tagline': '本地优先的 AI 智能体工作空间。',
    'footer.product': '产品',
    'footer.compare': '对比',
    'footer.resources': '资源',
    'footer.company': '关于',
    'footer.pricing': '定价',
    'footer.about': '关于',
    'footer.privacy': '隐私',
    'footer.terms': '条款',
    'footer.contact': '联系',
  },
};

/** Get a translated string by key. Falls back to English if key not found. */
export function t(key: string, locale: Locale): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
