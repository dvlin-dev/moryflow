import type { Locale } from './i18n';

export interface UseCaseCardLink {
  label: string;
  href: string;
  description: string;
}

export interface UseCaseSection {
  title: string;
  description: string;
  links: UseCaseCardLink[];
}

export interface UseCasesPageContent {
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  featuredTitle: string;
  featuredDescription: string;
  featuredLinks: UseCaseCardLink[];
  sections: UseCaseSection[];
  ctaTitle: string;
  ctaDescription: string;
}

export const useCasesPageContent: Record<Locale, UseCasesPageContent> = {
  en: {
    title: 'AI Agent Use Cases',
    description:
      'Browse the main workflows Moryflow supports: AI note-taking, second brain workflows, digital gardens, local-first agents, and note publishing.',
    eyebrow: 'Use Cases',
    headline: 'Pick the workflow you want to improve',
    subheadline:
      'Start from the job to be done, not from feature lists. These pages group the main ways people use Moryflow to capture knowledge, run agents, and publish notes.',
    featuredTitle: 'Popular starting points',
    featuredDescription:
      'These are the highest-priority workflows for people evaluating Moryflow as a local-first AI workspace.',
    featuredLinks: [
      {
        label: 'AI Note-Taking App',
        href: '/ai-note-taking-app',
        description: 'Turn notes into agent-ready context instead of passive storage.',
      },
      {
        label: 'Second Brain App',
        href: '/second-brain-app',
        description: 'Capture, connect, and retrieve knowledge with help from AI agents.',
      },
      {
        label: 'Notes to Website',
        href: '/notes-to-website',
        description: 'Publish selected notes as a website without a separate CMS or pipeline.',
      },
      {
        label: 'Digital Garden App',
        href: '/digital-garden-app',
        description: 'Grow a public knowledge garden directly from your workspace.',
      },
      {
        label: 'Telegram AI Agent',
        href: '/telegram-ai-agent',
        description:
          'Talk to your workspace agent through Telegram while your knowledge stays local.',
      },
      {
        label: 'Local-first AI Notes',
        href: '/local-first-ai-notes',
        description: 'Keep notes on your device while still using AI to organize and draft.',
      },
      {
        label: 'Local-first AI Agent',
        href: '/local-first-ai-agent',
        description:
          'Run agents against your local knowledge base instead of uploading it to a platform.',
      },
    ],
    sections: [
      {
        title: 'Build a local-first knowledge system',
        description:
          'These pages focus on capturing, organizing, and reusing knowledge inside a desktop workspace.',
        links: [
          {
            label: 'Agent Workspace',
            href: '/agent-workspace',
            description: 'See how notes, files, and agents work inside one workspace.',
          },
          {
            label: 'AI Note-Taking App',
            href: '/ai-note-taking-app',
            description: 'Start with notes that become useful context for future work.',
          },
          {
            label: 'Second Brain App',
            href: '/second-brain-app',
            description: 'Build a knowledge base that compounds instead of collecting dust.',
          },
          {
            label: 'Local-first AI Notes',
            href: '/local-first-ai-notes',
            description: 'Keep ownership of your notes while adding AI help.',
          },
        ],
      },
      {
        title: 'Run agents across your work',
        description:
          'These workflows are for people who want agents that stay grounded in durable knowledge.',
        links: [
          {
            label: 'Telegram AI Agent',
            href: '/telegram-ai-agent',
            description: 'Use Telegram as a lightweight interface for your workspace agent.',
          },
          {
            label: 'Local-first AI Agent',
            href: '/local-first-ai-agent',
            description: 'Keep agent context on your device instead of in a hosted memory store.',
          },
          {
            label: 'Compare Moryflow vs Manus',
            href: '/compare/manus',
            description:
              'Contrast local-first knowledge work with cloud-first autonomous execution.',
          },
          {
            label: 'Compare Moryflow vs OpenClaw',
            href: '/compare/openclaw',
            description: 'Compare a desktop knowledge workspace with a self-hosted agent gateway.',
          },
        ],
      },
      {
        title: 'Publish notes as a website',
        description:
          'These pages focus on turning notes into public pages, gardens, and documentation sites.',
        links: [
          {
            label: 'Notes to Website',
            href: '/notes-to-website',
            description: 'Go from local note to public page without leaving the editor.',
          },
          {
            label: 'Digital Garden App',
            href: '/digital-garden-app',
            description: 'Publish linked notes as a living site instead of isolated blog posts.',
          },
          {
            label: 'Blog',
            href: '/blog',
            description:
              'Read longer guides about AI note-taking, agents, and local-first workflows.',
          },
          {
            label: 'Compare All Alternatives',
            href: '/compare',
            description: 'Review the main comparisons before choosing a migration path.',
          },
        ],
      },
    ],
    ctaTitle: 'Start with the workflow that fits your work',
    ctaDescription:
      'Download Moryflow and try the use case that matches your current bottleneck. Free to start · Open Source.',
  },
  zh: {
    title: 'AI 智能体使用场景',
    description:
      '浏览 Moryflow 的主要工作流：AI 笔记、第二大脑、数字花园、本地优先智能体，以及笔记发布。',
    eyebrow: '使用场景',
    headline: '从你要解决的工作流开始',
    subheadline:
      '不要先看功能清单，先看你要完成的任务。这些页面把 Moryflow 最核心的使用方式整理成了可直接进入的入口。',
    featuredTitle: '常见起点',
    featuredDescription:
      '这些是当前最值得优先强化发现链路的核心场景，也是用户评估 Moryflow 时最常进入的入口。',
    featuredLinks: [
      {
        label: 'AI 笔记应用',
        href: '/ai-note-taking-app',
        description: '让笔记成为智能体上下文，而不是被动存档。',
      },
      {
        label: '第二大脑应用',
        href: '/second-brain-app',
        description: '用 AI 智能体帮助你捕获、连接和检索知识。',
      },
      {
        label: '笔记变网站',
        href: '/notes-to-website',
        description: '无需独立 CMS 或部署流程，直接把笔记发布成网站。',
      },
      {
        label: '数字花园应用',
        href: '/digital-garden-app',
        description: '从工作空间直接长出一个公开的知识花园。',
      },
      {
        label: 'Telegram AI 智能体',
        href: '/telegram-ai-agent',
        description: '通过 Telegram 与智能体互动，同时让知识保持在本地。',
      },
      {
        label: '本地优先 AI 笔记',
        href: '/local-first-ai-notes',
        description: '笔记保存在你的设备上，同时获得 AI 的整理与写作能力。',
      },
      {
        label: '本地优先 AI 智能体',
        href: '/local-first-ai-agent',
        description: '让智能体直接工作在你的本地知识库上，而不是上传到平台。',
      },
    ],
    sections: [
      {
        title: '构建本地优先知识系统',
        description: '这些页面聚焦于如何在桌面工作空间中捕获、整理和复用知识。',
        links: [
          {
            label: 'AI 智能体工作空间',
            href: '/agent-workspace',
            description: '先看笔记、文件和智能体如何在一个工作空间里协同。',
          },
          {
            label: 'AI 笔记应用',
            href: '/ai-note-taking-app',
            description: '从让笔记变成未来工作上下文开始。',
          },
          {
            label: '第二大脑应用',
            href: '/second-brain-app',
            description: '构建一个会复利增长，而不是只会积灰的知识库。',
          },
          {
            label: '本地优先 AI 笔记',
            href: '/local-first-ai-notes',
            description: '在保留数据所有权的前提下获得 AI 能力。',
          },
        ],
      },
      {
        title: '让智能体参与真实工作',
        description: '这些页面适合想让智能体建立在长期知识之上，而不是一次性对话之上的用户。',
        links: [
          {
            label: 'Telegram AI 智能体',
            href: '/telegram-ai-agent',
            description: '把 Telegram 作为你的工作空间智能体入口。',
          },
          {
            label: '本地优先 AI 智能体',
            href: '/local-first-ai-agent',
            description: '把智能体上下文保留在你的设备上，而不是托管记忆库里。',
          },
          {
            label: 'Moryflow 对比 Manus',
            href: '/compare/manus',
            description: '对比本地优先知识工作流与云端自主执行平台。',
          },
          {
            label: 'Moryflow 对比 OpenClaw',
            href: '/compare/openclaw',
            description: '对比桌面知识工作空间与自托管智能体网关。',
          },
        ],
      },
      {
        title: '把笔记发布成网站',
        description: '这些页面聚焦于如何把笔记变成公开页面、数字花园和知识站点。',
        links: [
          {
            label: '笔记变网站',
            href: '/notes-to-website',
            description: '从本地笔记直接发布成网页，无需离开编辑器。',
          },
          {
            label: '数字花园应用',
            href: '/digital-garden-app',
            description: '把关联笔记发布成持续生长的网站，而不是孤立文章。',
          },
          {
            label: '博客',
            href: '/blog',
            description: '阅读关于 AI 笔记、智能体和本地优先工作流的长文指南。',
          },
          {
            label: '查看所有对比',
            href: '/compare',
            description: '在决定迁移路径前，先看主要竞品对比。',
          },
        ],
      },
    ],
    ctaTitle: '从最适合你的工作流开始',
    ctaDescription: '下载 Moryflow，先解决当前最卡住你的那个场景。免费开始 · 开源。',
  },
};
