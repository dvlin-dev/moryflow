import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { ComparePage, type ComparePageContent } from '@/components/seo-pages/ComparePage';

const content: Record<Locale, ComparePageContent> = {
  en: {
    title: 'Moryflow vs Notion — Open Source AI Agent Workspace Alternative',
    description:
      'How Moryflow and Notion compare: different approaches to notes, AI, and knowledge management.',
    headline: 'Moryflow vs Notion',
    subheadline:
      'Both help you organize knowledge. They take different approaches to AI, data ownership, and how your notes become useful over time.',
    dimensions: [
      {
        label: 'Architecture',
        moryflow: 'Local-first desktop app',
        competitor: 'Cloud-native web app',
      },
      {
        label: 'AI approach',
        moryflow: 'Autonomous agents with knowledge context',
        competitor: 'Inline AI assist and Q&A',
      },
      {
        label: 'Data storage',
        moryflow: 'On your device',
        competitor: 'Notion cloud servers',
      },
      {
        label: 'Publishing',
        moryflow: 'Built-in notes to website',
        competitor: 'Notion Sites / public pages',
      },
      {
        label: 'Collaboration',
        moryflow: 'Individual-focused',
        competitor: 'Team-first with real-time editing',
      },
      {
        label: 'Pricing',
        moryflow: 'Free tier + paid plans · Open source',
        competitor: 'Free tier + paid plans',
      },
    ],
    moryflowFit: {
      title: 'Moryflow may be a better fit if you…',
      points: [
        'Want your notes and knowledge stored locally on your device',
        'Need AI agents that work with your accumulated context, not just inline completions',
        'Prefer a desktop-native experience over browser-based tools',
        'Want to publish notes as a website without a separate tool',
        'Value data ownership and portability over team collaboration features',
      ],
    },
    competitorFit: {
      title: 'Notion may be a better fit if you…',
      points: [
        'Need real-time team collaboration with shared workspaces',
        'Want a comprehensive project management tool with databases and views',
        'Prefer a browser-based app accessible from any device',
        'Need integrations with a large ecosystem of third-party tools',
        'Work in a team that already uses Notion as its knowledge hub',
      ],
    },
    differences: [
      {
        area: 'AI integration philosophy',
        description:
          'Notion AI focuses on inline text completion and Q&A across your workspace pages. Moryflow treats AI agents as workspace members that read your notes, execute multi-step tasks, and produce structured outputs that become part of your knowledge base.',
      },
      {
        area: 'Data ownership',
        description:
          "Notion stores all data on its cloud servers. You can export your data, but your daily workflow depends on Notion's infrastructure. Moryflow stores everything locally on your device — your notes are files on your machine that you fully control.",
      },
      {
        area: 'Individual vs team',
        description:
          'Notion is built team-first with permissions, shared workspaces, and real-time co-editing. Moryflow is designed for individual knowledge workers who want a personal workspace where AI agents help them research, write, and organize.',
      },
      {
        area: 'Publishing approach',
        description:
          'Notion lets you publish pages publicly and recently launched Notion Sites. Moryflow includes built-in publishing that turns your notes into a navigable website — digital garden, knowledge base, or portfolio — directly from the desktop app.',
      },
    ],
    faqs: [
      {
        question: 'Can I import my Notion pages into Moryflow?',
        answer:
          'Moryflow works with standard file formats. You can export your Notion workspace and import the content into Moryflow to use as context for AI agents.',
      },
      {
        question: 'Does Moryflow have databases like Notion?',
        answer:
          'Moryflow focuses on notes, knowledge, and autonomous AI agents rather than structured databases. If you primarily use Notion for project management with tables and kanban boards, Moryflow serves a different use case.',
      },
      {
        question: 'Can I use both Notion and Moryflow?',
        answer:
          'Yes. Some users keep Notion for team collaboration and use Moryflow as their personal knowledge workspace with AI agents. The tools serve different needs and can complement each other.',
      },
      {
        question: 'Is Moryflow available on mobile like Notion?',
        answer:
          'Moryflow is currently a desktop app for macOS. Notion offers web, desktop, and mobile apps. If mobile access is critical for your workflow, Notion provides broader device coverage.',
      },
    ],
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Second Brain App', href: '/second-brain-app' },
      { label: 'Download', href: '/download' },
    ],
  },
  zh: {
    title: 'Moryflow 对比 Notion — 开源 AI 智能体工作空间替代方案',
    description: 'Moryflow 与 Notion 的对比：在笔记、AI 和知识管理上的不同路径。',
    headline: 'Moryflow 对比 Notion',
    subheadline:
      '两者都帮你组织知识，但在 AI、数据所有权以及笔记如何长期发挥价值方面走了不同的路。',
    dimensions: [
      {
        label: '架构',
        moryflow: '本地优先桌面应用',
        competitor: '云原生 Web 应用',
      },
      {
        label: 'AI 方式',
        moryflow: '基于知识上下文的自主智能体',
        competitor: '内联 AI 辅助与问答',
      },
      {
        label: '数据存储',
        moryflow: '在你的设备上',
        competitor: 'Notion 云服务器',
      },
      {
        label: '发布',
        moryflow: '内置笔记变网站',
        competitor: 'Notion Sites / 公开页面',
      },
      {
        label: '协作',
        moryflow: '个人为中心',
        competitor: '团队优先，实时编辑',
      },
      {
        label: '定价',
        moryflow: '免费版 + 付费方案 · 开源',
        competitor: '免费版 + 付费方案',
      },
    ],
    moryflowFit: {
      title: '如果你符合以下情况，Moryflow 可能更适合…',
      points: [
        '希望笔记和知识存储在本地设备上',
        '需要基于你的积累上下文工作的 AI 智能体，而不仅仅是内联补全',
        '偏好桌面原生体验而非浏览器工具',
        '想把笔记发布为网站，无需额外工具',
        '重视数据所有权和可迁移性，而非团队协作功能',
      ],
    },
    competitorFit: {
      title: '如果你符合以下情况，Notion 可能更适合…',
      points: [
        '需要实时团队协作和共享工作空间',
        '想要一个带数据库和视图的综合项目管理工具',
        '偏好可在任意设备访问的浏览器应用',
        '需要与大量第三方工具生态集成',
        '团队已经在使用 Notion 作为知识中心',
      ],
    },
    differences: [
      {
        area: 'AI 集成理念',
        description:
          'Notion AI 侧重于内联文本补全和跨工作空间页面的问答。Moryflow 将 AI 智能体视为工作空间成员，它们读取你的笔记、执行多步任务，并产出结构化内容，成为你知识库的一部分。',
      },
      {
        area: '数据所有权',
        description:
          'Notion 将所有数据存储在其云服务器上。你可以导出数据，但日常工作流依赖 Notion 的基础设施。Moryflow 将一切存储在本地设备上 —— 你的笔记就是你机器上的文件，完全由你掌控。',
      },
      {
        area: '个人 vs 团队',
        description:
          'Notion 以团队优先构建，有权限管理、共享工作空间和实时协同编辑。Moryflow 为个人知识工作者设计，提供 AI 智能体辅助调研、写作和整理的个人工作空间。',
      },
      {
        area: '发布方式',
        description:
          'Notion 支持公开发布页面并推出了 Notion Sites。Moryflow 内置发布功能，直接从桌面应用将笔记变为可导航的网站 —— 数字花园、知识库或作品集。',
      },
    ],
    faqs: [
      {
        question: '我可以将 Notion 页面导入 Moryflow 吗？',
        answer:
          'Moryflow 支持标准文件格式。你可以导出 Notion 工作空间，然后将内容导入 Moryflow 作为 AI 智能体的上下文使用。',
      },
      {
        question: 'Moryflow 有像 Notion 那样的数据库吗？',
        answer:
          'Moryflow 专注于笔记、知识和自主 AI 智能体，而非结构化数据库。如果你主要使用 Notion 的表格和看板进行项目管理，Moryflow 服务的是不同的使用场景。',
      },
      {
        question: '可以同时使用 Notion 和 Moryflow 吗？',
        answer:
          '可以。一些用户用 Notion 做团队协作，用 Moryflow 作为带 AI 智能体的个人知识工作空间。两者满足不同需求，可以互补。',
      },
      {
        question: 'Moryflow 像 Notion 一样支持手机吗？',
        answer:
          'Moryflow 目前是 macOS 桌面应用。Notion 提供 Web、桌面和移动端应用。如果移动端访问对你的工作流至关重要，Notion 在设备覆盖上更广。',
      },
    ],
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '第二大脑应用', href: '/second-brain-app' },
      { label: '下载', href: '/download' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/compare/notion')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'compare-notion',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: CompareNotionPage,
});

function CompareNotionPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <ComparePage
      competitor="Notion"
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
