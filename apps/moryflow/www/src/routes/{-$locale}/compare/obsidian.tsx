import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { ComparePage } from '@/components/seo-pages/ComparePage';

const content: Record<
  Locale,
  {
    title: string;
    description: string;
    headline: string;
    subheadline: string;
    dimensions: { label: string; moryflow: string; competitor: string }[];
    moryflowFit: { title: string; points: string[] };
    competitorFit: { title: string; points: string[] };
    differences: { area: string; description: string }[];
    faqs: { question: string; answer: string }[];
    relatedPages: { label: string; href: string }[];
  }
> = {
  en: {
    title: 'Moryflow vs Obsidian — Open Source AI Agent Workspace Alternative',
    description:
      'How Moryflow and Obsidian compare: both local-first, different approaches to AI and publishing.',
    headline: 'Moryflow vs Obsidian',
    subheadline:
      'Both are local-first and file-based. They differ in how they approach AI integration, publishing, and the role of agents in knowledge work.',
    dimensions: [
      {
        label: 'Architecture',
        moryflow: 'Local-first desktop app',
        competitor: 'Local-first desktop app',
      },
      {
        label: 'AI approach',
        moryflow: 'Native autonomous agents',
        competitor: 'Community plugins (Copilot, Smart Connections, etc.)',
      },
      {
        label: 'Data format',
        moryflow: 'Local files',
        competitor: 'Markdown files in a vault',
      },
      {
        label: 'Publishing',
        moryflow: 'Built-in notes to website',
        competitor: 'Obsidian Publish (paid add-on)',
      },
      {
        label: 'Extensibility',
        moryflow: 'Focused feature set',
        competitor: 'Large plugin ecosystem (1000+ plugins)',
      },
      {
        label: 'Pricing',
        moryflow: 'Free tier + paid plans · Open source',
        competitor: 'Free for personal use, paid Sync & Publish',
      },
    ],
    moryflowFit: {
      title: 'Moryflow may be a better fit if you…',
      points: [
        'Want AI agents as native workspace members, not bolt-on plugins',
        'Need built-in publishing without a separate paid add-on',
        'Prefer autonomous agents that produce structured knowledge outputs',
        'Want a focused tool that works well out of the box without plugin configuration',
        'Care about AI agents that grow smarter with your accumulated knowledge',
      ],
    },
    competitorFit: {
      title: 'Obsidian may be a better fit if you…',
      points: [
        'Want a mature, battle-tested note-taking tool with a proven track record',
        'Need extensive customization through a large plugin ecosystem',
        'Prefer pure Markdown files with full filesystem control',
        'Want a mobile app alongside the desktop experience',
        'Value community-built extensions for niche workflows',
      ],
    },
    differences: [
      {
        area: 'AI integration depth',
        description:
          'Obsidian offers AI through community plugins like Copilot and Smart Connections, which add chat interfaces and semantic search. Moryflow builds AI agents into the core experience — agents read your notes as context, execute multi-step tasks, and save results as structured notes in your workspace.',
      },
      {
        area: 'Publishing model',
        description:
          'Obsidian Publish is a paid service ($8/mo) that shares your vault as a website. Moryflow includes publishing as a core feature — select notes and publish them as a digital garden or knowledge site, included in the free tier.',
      },
      {
        area: 'Philosophy: plugins vs integrated features',
        description:
          "Obsidian's strength is extensibility — the plugin ecosystem lets you build almost any workflow. Moryflow takes the opposite approach: a focused feature set where AI agents, notes, and publishing are deeply integrated and work together without configuration.",
      },
      {
        area: 'Knowledge growth model',
        description:
          'Both tools support linked notes and knowledge graphs. Moryflow adds an active layer: AI agents that help you process raw captures, connect ideas, expand stubs, and grow your knowledge base over time — not just store it.',
      },
    ],
    faqs: [
      {
        question: 'Can I use my Obsidian vault with Moryflow?',
        answer:
          "Moryflow works with local files. You can bring your existing notes into Moryflow and use them as context for AI agents. The transition doesn't require abandoning your existing knowledge.",
      },
      {
        question: 'Does Moryflow support plugins like Obsidian?',
        answer:
          "Moryflow focuses on an integrated experience rather than a plugin ecosystem. AI agents, notes, and publishing are built into the core product. This means less configuration but also less customization compared to Obsidian's plugin model.",
      },
      {
        question: 'Is Moryflow open source like Obsidian?',
        answer:
          "Obsidian is not open source — it's a proprietary app with an open plugin API. Moryflow is fully open source with a free tier and paid plans.",
      },
      {
        question: 'Which has better graph/linking features?',
        answer:
          'Obsidian has a mature graph view and extensive backlink support refined over years. Moryflow supports note linking and connections, with AI agents that actively help you discover and build connections between ideas.',
      },
    ],
    relatedPages: [
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Digital Garden App', href: '/digital-garden-app' },
      { label: 'Second Brain App', href: '/second-brain-app' },
      { label: 'Download', href: '/download' },
    ],
  },
  zh: {
    title: 'Moryflow 对比 Obsidian — 开源 AI 智能体工作空间替代方案',
    description: 'Moryflow 与 Obsidian 的对比：同为本地优先，在 AI 和发布上走了不同的路。',
    headline: 'Moryflow 对比 Obsidian',
    subheadline:
      '两者都是本地优先、基于文件的工具。区别在于 AI 集成、发布和智能体在知识工作中扮演的角色。',
    dimensions: [
      {
        label: '架构',
        moryflow: '本地优先桌面应用',
        competitor: '本地优先桌面应用',
      },
      {
        label: 'AI 方式',
        moryflow: '原生自主智能体',
        competitor: '社区插件（Copilot、Smart Connections 等）',
      },
      {
        label: '数据格式',
        moryflow: '本地文件',
        competitor: 'Vault 中的 Markdown 文件',
      },
      {
        label: '发布',
        moryflow: '内置笔记变网站',
        competitor: 'Obsidian Publish（付费附加功能）',
      },
      {
        label: '可扩展性',
        moryflow: '专注的功能集',
        competitor: '庞大的插件生态（1000+ 插件）',
      },
      {
        label: '定价',
        moryflow: '免费版 + 付费方案 · 开源',
        competitor: '个人免费，Sync 与 Publish 付费',
      },
    ],
    moryflowFit: {
      title: '如果你符合以下情况，Moryflow 可能更适合…',
      points: [
        '希望 AI 智能体是原生工作空间成员，而非后装插件',
        '需要内置发布功能，无需单独付费附加组件',
        '偏好能产出结构化知识的自主智能体',
        '想要一个开箱即用的专注工具，无需配置插件',
        '看重 AI 智能体随你的知识积累而变得更智能',
      ],
    },
    competitorFit: {
      title: '如果你符合以下情况，Obsidian 可能更适合…',
      points: [
        '想要一个成熟且久经考验的笔记工具',
        '需要通过庞大的插件生态进行深度定制',
        '偏好纯 Markdown 文件并完全掌控文件系统',
        '希望桌面端之外还有移动端应用',
        '重视社区构建的扩展以满足小众工作流',
      ],
    },
    differences: [
      {
        area: 'AI 集成深度',
        description:
          'Obsidian 通过 Copilot、Smart Connections 等社区插件提供 AI 功能，增加聊天界面和语义搜索。Moryflow 将 AI 智能体内建于核心体验 —— 智能体读取你的笔记作为上下文，执行多步任务，并将结果保存为工作空间中的结构化笔记。',
      },
      {
        area: '发布模式',
        description:
          'Obsidian Publish 是一项付费服务（$8/月），将你的 Vault 分享为网站。Moryflow 将发布作为核心功能 —— 选择笔记并发布为数字花园或知识站点，包含在免费版中。',
      },
      {
        area: '理念：插件 vs 集成功能',
        description:
          'Obsidian 的优势在于可扩展性 —— 插件生态让你构建几乎任何工作流。Moryflow 采取相反的路线：专注的功能集，AI 智能体、笔记和发布深度集成，无需配置即可协同工作。',
      },
      {
        area: '知识增长模式',
        description:
          '两者都支持链接笔记和知识图谱。Moryflow 增加了一个主动层：AI 智能体帮你处理原始记录、连接想法、扩展草稿，随时间推移让知识库真正成长 —— 而不仅仅是存储。',
      },
    ],
    faqs: [
      {
        question: '我可以在 Moryflow 中使用 Obsidian Vault 吗？',
        answer:
          'Moryflow 支持本地文件。你可以将现有笔记导入 Moryflow，作为 AI 智能体的上下文使用。迁移过程不需要放弃你已有的知识。',
      },
      {
        question: 'Moryflow 支持像 Obsidian 那样的插件吗？',
        answer:
          'Moryflow 专注于一体化体验而非插件生态。AI 智能体、笔记和发布内建于核心产品中。这意味着更少的配置，但相比 Obsidian 的插件模式定制性也更少。',
      },
      {
        question: 'Moryflow 像 Obsidian 一样开源吗？',
        answer:
          'Obsidian 并非开源 —— 它是一个拥有开放插件 API 的闭源应用。Moryflow 完全开源，提供免费版和付费方案。',
      },
      {
        question: '哪个的图谱/链接功能更好？',
        answer:
          'Obsidian 拥有经过多年打磨的成熟图谱视图和丰富的反向链接支持。Moryflow 支持笔记链接和关联，配合 AI 智能体主动帮你发现和建立想法之间的联系。',
      },
    ],
    relatedPages: [
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: '数字花园应用', href: '/digital-garden-app' },
      { label: '第二大脑应用', href: '/second-brain-app' },
      { label: '下载', href: '/download' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/compare/obsidian')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'compare-obsidian',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: CompareObsidianPage,
});

function CompareObsidianPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <ComparePage
      competitor="Obsidian"
      headline={c.headline}
      subheadline={c.subheadline}
      dimensions={c.dimensions}
      moryflowFit={c.moryflowFit}
      competitorFit={c.competitorFit}
      differences={c.differences}
      faqs={c.faqs}
      relatedPages={c.relatedPages}
    />
  );
}
