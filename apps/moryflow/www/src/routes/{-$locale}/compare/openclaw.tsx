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
    title: 'Moryflow vs OpenClaw — Open Source AI Agent Workspace Alternative',
    description:
      'How Moryflow and OpenClaw compare: desktop-first knowledge workspace vs self-hosted multi-channel agent gateway.',
    headline: 'Moryflow vs OpenClaw: Different approaches to personal AI agents',
    subheadline:
      'Both put AI agents in your hands. OpenClaw gives you a self-hosted multi-channel gateway. Moryflow gives you a desktop knowledge workspace. Different architectures for different goals.',
    dimensions: [
      {
        label: 'Architecture',
        moryflow: 'Local-first desktop app',
        competitor: 'Self-hosted agent gateway (Docker/cloud)',
      },
      {
        label: 'Channels',
        moryflow: 'Desktop + Telegram',
        competitor: 'Multi-channel (Telegram, Discord, Slack, WeChat, etc.)',
      },
      {
        label: 'Setup',
        moryflow: 'Download and run',
        competitor: 'Docker deployment + configuration',
      },
      {
        label: 'Focus',
        moryflow: 'Knowledge work + notes + publishing',
        competitor: 'Multi-channel agent routing + conversational AI',
      },
      {
        label: 'Data model',
        moryflow: 'Local notes and knowledge base',
        competitor: 'Conversation-based with plugin integrations',
      },
      {
        label: 'Open source',
        moryflow: 'Open source · Free tier + paid plans',
        competitor: 'Open source (self-hosted)',
      },
    ],
    moryflowFit: {
      title: 'Moryflow may be a better fit if you…',
      points: [
        'Want a desktop app for knowledge work — research, writing, note-taking',
        'Need AI agent outputs to become organized, persistent notes',
        'Prefer downloading an app over deploying Docker containers',
        'Want built-in publishing to share your knowledge as a website',
        'Focus on personal knowledge management over multi-channel agent deployment',
      ],
    },
    competitorFit: {
      title: 'OpenClaw may be a better fit if you…',
      points: [
        'Want AI agents accessible across multiple messaging platforms simultaneously',
        'Need a self-hosted solution with full infrastructure control',
        'Value open source and the ability to audit and modify the codebase',
        'Want to route different agent capabilities across Discord, Slack, WeChat, and other channels',
        'Have the technical skills to deploy and maintain Docker-based services',
      ],
    },
    differences: [
      {
        area: 'What they solve',
        description:
          'OpenClaw solves multi-channel agent deployment — making AI accessible across messaging platforms you already use. Moryflow solves knowledge work — giving AI agents a workspace where they work with your notes and produce durable, organized knowledge.',
      },
      {
        area: 'Channel breadth vs knowledge depth',
        description:
          'OpenClaw excels at reaching users across many channels — Telegram, Discord, Slack, WeChat, and more. Moryflow excels at depth within one workspace — agents that understand your accumulated knowledge and produce outputs that connect to your existing notes.',
      },
      {
        area: 'Deployment model',
        description:
          'OpenClaw is self-hosted, typically deployed via Docker, giving you full control over infrastructure. Moryflow is a desktop application you download and run — no server setup, no Docker, no infrastructure management.',
      },
      {
        area: 'Open source vs integrated product',
        description:
          'Both projects are open source. OpenClaw emphasizes self-hosted deployment with full infrastructure control. Moryflow is an open-source desktop app focused on a polished, cohesive experience for knowledge workers.',
      },
    ],
    faqs: [
      {
        question: 'What is OpenClaw?',
        answer:
          'OpenClaw is an open source, self-hosted AI agent gateway that lets you deploy AI agents across multiple messaging channels — Telegram, Discord, Slack, WeChat, and others. It focuses on multi-channel routing and conversational AI with plugin-based extensibility.',
      },
      {
        question: 'Can I use OpenClaw and Moryflow together?',
        answer:
          'They serve different purposes and can complement each other. You might use OpenClaw for multi-channel agent access across your messaging platforms, and Moryflow for personal knowledge work where you need agents to work with your notes and produce organized knowledge.',
      },
      {
        question: 'Does Moryflow support as many channels as OpenClaw?',
        answer:
          'No. Moryflow currently supports desktop and Telegram. OpenClaw supports a wider range of messaging platforms. If multi-channel agent access is your primary need, OpenClaw covers more ground.',
      },
      {
        question: 'Is OpenClaw harder to set up?',
        answer:
          'OpenClaw requires Docker deployment and configuration, which assumes some technical infrastructure knowledge. Moryflow is a desktop app you download and run. The setup complexity reflects their different architectures — server-based gateway vs desktop application.',
      },
    ],
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Download', href: '/download' },
    ],
  },
  zh: {
    title: 'Moryflow 对比 OpenClaw — 开源 AI 智能体工作空间替代方案',
    description: 'Moryflow 与 OpenClaw 的对比：桌面优先知识工作空间 vs 自托管多渠道智能体网关。',
    headline: 'Moryflow 对比 OpenClaw：个人 AI 智能体的不同路径',
    subheadline:
      '两者都将 AI 智能体交到你手中。OpenClaw 提供自托管的多渠道网关，Moryflow 提供桌面知识工作空间。不同的架构，不同的目标。',
    dimensions: [
      {
        label: '架构',
        moryflow: '本地优先桌面应用',
        competitor: '自托管智能体网关（Docker/云端）',
      },
      {
        label: '渠道',
        moryflow: '桌面 + Telegram',
        competitor: '多渠道（Telegram、Discord、Slack、微信等）',
      },
      {
        label: '部署',
        moryflow: '下载即用',
        competitor: 'Docker 部署 + 配置',
      },
      {
        label: '定位',
        moryflow: '知识工作 + 笔记 + 发布',
        competitor: '多渠道智能体路由 + 对话式 AI',
      },
      {
        label: '数据模型',
        moryflow: '本地笔记和知识库',
        competitor: '基于对话 + 插件集成',
      },
      {
        label: '开源',
        moryflow: '开源 · 免费版 + 付费方案',
        competitor: '开源（自托管）',
      },
    ],
    moryflowFit: {
      title: '如果你符合以下情况，Moryflow 可能更适合…',
      points: [
        '想要一个知识工作桌面应用 —— 调研、写作、笔记',
        '需要 AI 智能体的输出成为有组织的持久笔记',
        '偏好下载应用而非部署 Docker 容器',
        '想要内置发布功能将知识分享为网站',
        '侧重个人知识管理而非多渠道智能体部署',
      ],
    },
    competitorFit: {
      title: '如果你符合以下情况，OpenClaw 可能更适合…',
      points: [
        '想要 AI 智能体同时在多个消息平台上使用',
        '需要完全掌控基础设施的自托管方案',
        '重视开源以及审计和修改代码库的能力',
        '想要将不同的智能体能力路由到 Discord、Slack、微信等各渠道',
        '具备部署和维护 Docker 服务的技术能力',
      ],
    },
    differences: [
      {
        area: '解决的问题',
        description:
          'OpenClaw 解决多渠道智能体部署 —— 让 AI 在你常用的消息平台上可用。Moryflow 解决知识工作 —— 为 AI 智能体提供一个与你的笔记协作、产出持久有序知识的工作空间。',
      },
      {
        area: '渠道广度 vs 知识深度',
        description:
          'OpenClaw 擅长跨多渠道触达用户 —— Telegram、Discord、Slack、微信等。Moryflow 擅长在单一工作空间内的深度 —— 智能体理解你积累的知识，产出与现有笔记关联的内容。',
      },
      {
        area: '部署模式',
        description:
          'OpenClaw 自托管，通常通过 Docker 部署，让你完全掌控基础设施。Moryflow 是下载即运行的桌面应用 —— 无需服务器配置、无需 Docker、无需基础设施管理。',
      },
      {
        area: '开源 vs 集成产品',
        description:
          '两个项目都是开源的。OpenClaw 强调自托管部署和完整的基础设施控制。Moryflow 是一个开源桌面应用，专注于为知识工作者提供精良、一体化的体验。',
      },
    ],
    faqs: [
      {
        question: '什么是 OpenClaw？',
        answer:
          'OpenClaw 是一个开源的自托管 AI 智能体网关，支持跨多个消息渠道部署 AI 智能体 —— Telegram、Discord、Slack、微信等。它专注于多渠道路由和基于插件扩展的对话式 AI。',
      },
      {
        question: '可以同时使用 OpenClaw 和 Moryflow 吗？',
        answer:
          '它们服务于不同目的，可以互补。你可以用 OpenClaw 跨消息平台访问多渠道智能体，用 Moryflow 进行个人知识工作，让智能体与你的笔记协作并产出有组织的知识。',
      },
      {
        question: 'Moryflow 支持的渠道和 OpenClaw 一样多吗？',
        answer:
          '不。Moryflow 目前支持桌面和 Telegram。OpenClaw 支持更广泛的消息平台。如果多渠道智能体访问是你的首要需求，OpenClaw 覆盖面更广。',
      },
      {
        question: 'OpenClaw 部署更难吗？',
        answer:
          'OpenClaw 需要 Docker 部署和配置，对技术基础设施知识有一定要求。Moryflow 是下载即运行的桌面应用。部署复杂度的差异反映了它们不同的架构 —— 服务端网关 vs 桌面应用。',
      },
    ],
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: '下载', href: '/download' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/compare/openclaw')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'compare-openclaw',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: CompareOpenClawPage,
});

function CompareOpenClawPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <ComparePage
      competitor="OpenClaw"
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
