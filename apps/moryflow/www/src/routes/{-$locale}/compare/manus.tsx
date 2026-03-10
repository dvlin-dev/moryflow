import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { ComparePage, type ComparePageContent } from '@/components/seo-pages/ComparePage';

const content: Record<Locale, ComparePageContent> = {
  en: {
    title: 'Moryflow vs Manus — Open Source AI Agent Workspace Alternative',
    description:
      'How Moryflow and Manus compare: different paths to autonomous AI agents and knowledge work.',
    headline: 'Moryflow vs Manus',
    subheadline:
      'Both use AI agents to help you get work done. They approach the problem differently — autonomous cloud execution vs knowledge-integrated desktop workspace.',
    dimensions: [
      {
        label: 'Architecture',
        moryflow: 'Local-first desktop app',
        competitor: 'Cloud-based autonomous agent platform',
      },
      {
        label: 'Agent model',
        moryflow: 'Knowledge-grounded, user-directed',
        competitor: 'Autonomous multi-step execution',
      },
      {
        label: 'Data storage',
        moryflow: 'On your device',
        competitor: 'Cloud infrastructure',
      },
      {
        label: 'Knowledge persistence',
        moryflow: 'Notes and knowledge base',
        competitor: 'Task-scoped outputs',
      },
      {
        label: 'Use case focus',
        moryflow: 'Knowledge work: research, writing, organizing',
        competitor: 'General-purpose task automation',
      },
      {
        label: 'Pricing',
        moryflow: 'Free tier + paid plans · Open source',
        competitor: 'Usage-based pricing',
      },
    ],
    moryflowFit: {
      title: 'Moryflow may be a better fit if you…',
      points: [
        'Want agent outputs to become durable knowledge you can build on over time',
        'Prefer your data stored locally on your own device',
        'Focus on knowledge work — research, writing, note-taking, publishing',
        'Want agents grounded in your accumulated context, not starting from scratch',
        'Value a desktop workspace where agents and notes live together',
      ],
    },
    competitorFit: {
      title: 'Manus may be a better fit if you…',
      points: [
        'Need autonomous agents that execute complex multi-step tasks independently',
        'Want agents that browse the web, run code, and interact with online services',
        'Focus on task completion rather than knowledge accumulation',
        'Prefer a cloud-based platform accessible from any browser',
        'Need agents for general-purpose automation beyond knowledge work',
      ],
    },
    differences: [
      {
        area: 'Agent philosophy',
        description:
          'Manus emphasizes autonomous execution — agents that independently browse, code, and complete complex tasks. Moryflow emphasizes knowledge-grounded agents — agents that work with your accumulated notes and context to research, draft, and organize, producing outputs that become part of your knowledge base.',
      },
      {
        area: 'Knowledge persistence',
        description:
          'Manus produces task outputs — reports, code, deliverables. Moryflow produces knowledge — notes that connect to your existing knowledge base, grow over time, and serve as context for future agent tasks. The difference is between one-off deliverables and compounding knowledge.',
      },
      {
        area: 'Data model',
        description:
          'Manus runs agents in cloud sandboxes with access to web resources. Moryflow runs agents on your desktop with access to your local files and notes. Different architectures optimized for different workflows.',
      },
      {
        area: 'Scope',
        description:
          'Manus aims to be a general-purpose AI agent platform for diverse tasks. Moryflow is focused specifically on knowledge work — the intersection of AI agents, note-taking, and publishing.',
      },
    ],
    faqs: [
      {
        question: 'Can Moryflow agents browse the web like Manus?',
        answer:
          "Moryflow agents focus on working with your local knowledge base — notes, files, and accumulated context. They're designed for research, writing, and organizing rather than autonomous web browsing and code execution. The two tools optimize for different workflows.",
      },
      {
        question: 'Which is better for research tasks?',
        answer:
          'It depends on the type of research. Manus excels at autonomous web research — gathering information from multiple online sources. Moryflow excels at knowledge-grounded research — synthesizing information across your existing notes and building on your accumulated understanding.',
      },
      {
        question: 'Can I use both tools?',
        answer:
          'Yes. Some workflows benefit from using Manus for broad information gathering and Moryflow for organizing, connecting, and building on the results within your personal knowledge base.',
      },
      {
        question: 'Is Moryflow planning to add autonomous agent capabilities?',
        answer:
          "Moryflow's focus is on knowledge-integrated agents rather than fully autonomous execution. The roadmap prioritizes deeper knowledge context, better agent-note integration, and more publishing capabilities.",
      },
    ],
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Moryflow vs OpenClaw', href: '/compare/openclaw' },
      { label: 'Download', href: '/download' },
    ],
  },
  zh: {
    title: 'Moryflow 对比 Manus — 开源 AI 智能体工作空间替代方案',
    description: 'Moryflow 与 Manus 的对比：通往自主 AI 智能体和知识工作的不同路径。',
    headline: 'Moryflow 对比 Manus',
    subheadline:
      '两者都使用 AI 智能体帮你完成工作。它们以不同方式解决问题 —— 云端自主执行 vs 知识集成的桌面工作空间。',
    dimensions: [
      {
        label: '架构',
        moryflow: '本地优先桌面应用',
        competitor: '云端自主智能体平台',
      },
      {
        label: '智能体模式',
        moryflow: '基于知识、用户引导',
        competitor: '自主多步执行',
      },
      {
        label: '数据存储',
        moryflow: '在你的设备上',
        competitor: '云基础设施',
      },
      {
        label: '知识持久化',
        moryflow: '笔记和知识库',
        competitor: '任务范围的输出',
      },
      {
        label: '使用场景',
        moryflow: '知识工作：调研、写作、整理',
        competitor: '通用任务自动化',
      },
      {
        label: '定价',
        moryflow: '免费版 + 付费方案 · 开源',
        competitor: '按用量计费',
      },
    ],
    moryflowFit: {
      title: '如果你符合以下情况，Moryflow 可能更适合…',
      points: [
        '希望智能体输出成为可长期积累的持久知识',
        '偏好数据存储在自己的本地设备上',
        '专注于知识工作 —— 调研、写作、笔记、发布',
        '想要基于你的积累上下文工作的智能体，而非从零开始',
        '看重智能体和笔记共存的桌面工作空间',
      ],
    },
    competitorFit: {
      title: '如果你符合以下情况，Manus 可能更适合…',
      points: [
        '需要能独立执行复杂多步任务的自主智能体',
        '想要能浏览网页、运行代码、与在线服务交互的智能体',
        '侧重任务完成而非知识积累',
        '偏好可从任意浏览器访问的云端平台',
        '需要超越知识工作范畴的通用自动化智能体',
      ],
    },
    differences: [
      {
        area: '智能体理念',
        description:
          'Manus 强调自主执行 —— 智能体独立浏览网页、编写代码并完成复杂任务。Moryflow 强调基于知识的智能体 —— 智能体利用你的笔记和上下文进行调研、起草和整理，产出成为你知识库的一部分。',
      },
      {
        area: '知识持久化',
        description:
          'Manus 产出任务成果 —— 报告、代码、交付物。Moryflow 产出知识 —— 与现有知识库关联的笔记，随时间增长，并作为未来智能体任务的上下文。区别在于一次性交付物和持续增值的知识。',
      },
      {
        area: '数据模型',
        description:
          'Manus 在云沙箱中运行智能体，可访问网络资源。Moryflow 在桌面端运行智能体，可访问你的本地文件和笔记。不同的架构为不同的工作流优化。',
      },
      {
        area: '定位',
        description:
          'Manus 旨在成为面向多样任务的通用 AI 智能体平台。Moryflow 专注于知识工作 —— AI 智能体、笔记和发布的交汇点。',
      },
    ],
    faqs: [
      {
        question: 'Moryflow 的智能体能像 Manus 一样浏览网页吗？',
        answer:
          'Moryflow 的智能体专注于与你的本地知识库协作 —— 笔记、文件和积累的上下文。它们为调研、写作和整理而设计，而非自主浏览网页和执行代码。两者为不同的工作流优化。',
      },
      {
        question: '哪个更适合调研任务？',
        answer:
          '取决于调研类型。Manus 擅长自主网络调研 —— 从多个在线来源收集信息。Moryflow 擅长基于知识的调研 —— 跨现有笔记综合信息，在你的积累理解之上深入。',
      },
      {
        question: '可以同时使用两个工具吗？',
        answer:
          '可以。一些工作流受益于使用 Manus 进行广泛信息收集，然后用 Moryflow 在个人知识库中整理、关联和深化成果。',
      },
      {
        question: 'Moryflow 计划添加自主智能体能力吗？',
        answer:
          'Moryflow 专注于知识集成的智能体，而非完全自主执行。路线图优先考虑更深的知识上下文、更好的智能体-笔记集成和更多发布能力。',
      },
    ],
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: 'Moryflow 对比 OpenClaw', href: '/compare/openclaw' },
      { label: '下载', href: '/download' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/compare/manus')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'compare-manus',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: CompareManusPage,
});

function CompareManusPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <ComparePage
      competitor="Manus"
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
