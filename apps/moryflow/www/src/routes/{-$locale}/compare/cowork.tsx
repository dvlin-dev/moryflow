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
    title: 'Moryflow vs Cowork — Open Source AI Agent Workspace Alternative',
    description:
      'How Moryflow and Cowork compare: different approaches to AI-assisted work and knowledge ownership.',
    headline: 'Moryflow vs Cowork',
    subheadline:
      'Both bring AI into your workflow. Cowork integrates Claude into collaborative work, while Moryflow builds a local-first workspace around AI agents and personal knowledge.',
    dimensions: [
      {
        label: 'Architecture',
        moryflow: 'Local-first desktop app',
        competitor: 'Cloud-based collaborative AI workspace',
      },
      {
        label: 'AI model',
        moryflow: 'Multi-provider (OpenAI, Anthropic, etc.)',
        competitor: 'Claude (Anthropic)',
      },
      {
        label: 'Data storage',
        moryflow: 'On your device',
        competitor: 'Anthropic cloud',
      },
      {
        label: 'Focus',
        moryflow: 'Personal knowledge work + agents',
        competitor: 'Team AI collaboration',
      },
      {
        label: 'Knowledge persistence',
        moryflow: 'Local notes and knowledge base',
        competitor: 'Project-scoped artifacts and conversations',
      },
      {
        label: 'Pricing',
        moryflow: 'Free tier + paid plans · Open source',
        competitor: 'Included with Claude subscription plans',
      },
    ],
    moryflowFit: {
      title: 'Moryflow may be a better fit if you…',
      points: [
        'Want your data stored locally rather than in cloud infrastructure',
        'Need a personal knowledge workspace rather than a team collaboration tool',
        'Want to use multiple AI providers, not just one',
        'Value long-term knowledge accumulation over project-scoped work',
        'Want built-in publishing to turn notes into a website',
      ],
    },
    competitorFit: {
      title: 'Cowork may be a better fit if you…',
      points: [
        'Want Claude deeply integrated into collaborative workflows',
        'Need shared AI workspaces for team projects',
        "Prefer Anthropic's approach to AI safety and capabilities",
        'Work primarily within the Anthropic/Claude ecosystem',
        'Need project-based AI assistance with rich artifact support',
      ],
    },
    differences: [
      {
        area: 'Personal vs collaborative',
        description:
          'Cowork is designed around team collaboration with shared AI workspaces. Moryflow is designed for individual knowledge workers who want a personal workspace where AI agents help them build and maintain their own knowledge base.',
      },
      {
        area: 'Data philosophy',
        description:
          "Cowork operates within Anthropic's cloud infrastructure. Moryflow stores your data locally on your device. This reflects different philosophies — integrated cloud experience vs local-first data ownership.",
      },
      {
        area: 'AI model flexibility',
        description:
          'Cowork provides deep integration with Claude. Moryflow connects to multiple AI providers, letting you choose the model that works best for each task. Different approaches to the build-vs-buy spectrum.',
      },
      {
        area: 'Knowledge model',
        description:
          'Cowork organizes work around projects with conversations and artifacts. Moryflow organizes work around a persistent knowledge base — notes that accumulate over time, connect to each other, and serve as context for future agent tasks.',
      },
    ],
    faqs: [
      {
        question: 'What is Cowork?',
        answer:
          'Cowork is a collaborative AI workspace from Anthropic that integrates Claude into team workflows. It provides shared workspaces where teams can work with Claude on projects, creating artifacts and managing AI-assisted work together.',
      },
      {
        question: 'Can I use Claude with Moryflow?',
        answer:
          "Yes. Moryflow supports multiple AI providers including Anthropic's Claude. You can use Claude as your preferred model within Moryflow's autonomous agent system.",
      },
      {
        question: 'Which is better for individual use?',
        answer:
          'Moryflow is designed specifically for individual knowledge workers — personal knowledge base, local data storage, AI agents that work with your accumulated context. Cowork is primarily designed for team collaboration, though it can be used individually.',
      },
      {
        question: 'Can I use both?',
        answer:
          'Yes. You might use Cowork for team projects where Claude collaboration is needed, and Moryflow as your personal knowledge workspace where you build long-term understanding with local data ownership.',
      },
    ],
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Moryflow vs Manus', href: '/compare/manus' },
      { label: 'Download', href: '/download' },
    ],
  },
  zh: {
    title: 'Moryflow 对比 Cowork — 开源 AI 智能体工作空间替代方案',
    description: 'Moryflow 与 Cowork 的对比：在 AI 辅助工作和知识所有权上的不同路径。',
    headline: 'Moryflow 对比 Cowork',
    subheadline:
      '两者都将 AI 融入你的工作流。Cowork 将 Claude 集成到协作工作中，而 Moryflow 围绕 AI 智能体和个人知识构建本地优先工作空间。',
    dimensions: [
      {
        label: '架构',
        moryflow: '本地优先桌面应用',
        competitor: '云端协作 AI 工作空间',
      },
      {
        label: 'AI 模型',
        moryflow: '多供应商（OpenAI、Anthropic 等）',
        competitor: 'Claude（Anthropic）',
      },
      {
        label: '数据存储',
        moryflow: '在你的设备上',
        competitor: 'Anthropic 云端',
      },
      {
        label: '定位',
        moryflow: '个人知识工作 + 智能体',
        competitor: '团队 AI 协作',
      },
      {
        label: '知识持久化',
        moryflow: '本地笔记和知识库',
        competitor: '项目范围的 Artifact 和对话',
      },
      {
        label: '定价',
        moryflow: '免费版 + 付费方案 · 开源',
        competitor: '包含在 Claude 订阅方案中',
      },
    ],
    moryflowFit: {
      title: '如果你符合以下情况，Moryflow 可能更适合…',
      points: [
        '希望数据存储在本地而非云基础设施中',
        '需要个人知识工作空间而非团队协作工具',
        '想使用多个 AI 供应商，而不仅限于一个',
        '重视长期知识积累而非项目范围的工作',
        '想要内置发布功能将笔记变为网站',
      ],
    },
    competitorFit: {
      title: '如果你符合以下情况，Cowork 可能更适合…',
      points: [
        '想要 Claude 深度集成到协作工作流中',
        '需要团队项目的共享 AI 工作空间',
        '偏好 Anthropic 在 AI 安全和能力上的路线',
        '主要在 Anthropic/Claude 生态系统中工作',
        '需要支持丰富 Artifact 的项目制 AI 辅助',
      ],
    },
    differences: [
      {
        area: '个人 vs 协作',
        description:
          'Cowork 围绕团队协作和共享 AI 工作空间设计。Moryflow 为个人知识工作者设计，提供 AI 智能体帮助构建和维护个人知识库的工作空间。',
      },
      {
        area: '数据理念',
        description:
          'Cowork 运行在 Anthropic 的云基础设施上。Moryflow 将数据存储在你的本地设备上。这体现了不同的理念 —— 集成式云体验 vs 本地优先的数据所有权。',
      },
      {
        area: 'AI 模型灵活性',
        description:
          'Cowork 提供与 Claude 的深度集成。Moryflow 连接多个 AI 供应商，让你为每项任务选择最合适的模型。在自建与购买之间的不同取舍。',
      },
      {
        area: '知识模型',
        description:
          'Cowork 围绕项目组织工作，包含对话和 Artifact。Moryflow 围绕持久知识库组织工作 —— 笔记随时间积累、互相关联，并作为未来智能体任务的上下文。',
      },
    ],
    faqs: [
      {
        question: '什么是 Cowork？',
        answer:
          'Cowork 是 Anthropic 推出的协作 AI 工作空间，将 Claude 集成到团队工作流中。它提供共享工作空间，团队可以与 Claude 协作完成项目，创建 Artifact 并共同管理 AI 辅助工作。',
      },
      {
        question: '可以在 Moryflow 中使用 Claude 吗？',
        answer:
          '可以。Moryflow 支持包括 Anthropic Claude 在内的多个 AI 供应商。你可以在 Moryflow 的自主智能体系统中使用 Claude 作为首选模型。',
      },
      {
        question: '哪个更适合个人使用？',
        answer:
          'Moryflow 专为个人知识工作者设计 —— 个人知识库、本地数据存储、基于你积累上下文的 AI 智能体。Cowork 主要为团队协作设计，虽然也可以个人使用。',
      },
      {
        question: '可以同时使用两者吗？',
        answer:
          '可以。你可以用 Cowork 做需要 Claude 协作的团队项目，用 Moryflow 作为个人知识工作空间，在本地数据所有权下积累长期理解。',
      },
    ],
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: 'Moryflow 对比 Manus', href: '/compare/manus' },
      { label: '下载', href: '/download' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/compare/cowork')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'compare-cowork',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: CompareCoworkPage,
});

function CompareCoworkPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <ComparePage
      competitor="Cowork"
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
