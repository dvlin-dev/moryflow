import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Bot, Brain, Shield } from 'lucide-react';
import { SeoLandingPage, type SeoLandingContent } from '@/components/seo-pages/SeoLandingPage';

const whyIcons = [Bot, Brain, Shield];

const content: Record<Locale, SeoLandingContent> = {
  en: {
    title: 'AI Agent Workspace',
    description:
      'Moryflow is a local-first AI agent workspace. Agents work with your knowledge to research, draft, organize, and publish.',
    headline: 'An AI agent workspace built for knowledge work',
    subheadline:
      'Run AI agents that work with your notes, files, and accumulated context — not just a blank prompt. Results stay as durable knowledge you own.',
    problemTitle: 'Why most AI agent tools fall short',
    problemPoints: [
      {
        title: 'Agents without memory',
        description:
          'Most AI agent platforms start from scratch every session. Without access to your existing knowledge, agents repeat work and miss context.',
      },
      {
        title: 'Results that disappear',
        description:
          'Chat-based AI tools produce outputs that vanish in conversation history. Research, drafts, and analysis become impossible to find or reuse.',
      },
      {
        title: 'Cloud-only means someone else controls your data',
        description:
          'When your AI agents depend entirely on cloud services, you lose control over your data, your prompts, and your intellectual property.',
      },
      {
        title: 'Isolated tools, fragmented workflows',
        description:
          'Switching between AI chat, note-taking, file management, and publishing tools creates friction and breaks your flow.',
      },
    ],
    whyTitle: 'Why Moryflow works differently',
    whyPoints: [
      {
        title: 'Agent-native workspace',
        description:
          'AI agents are first-class citizens. They read your notes, access your files, and produce outputs that integrate directly into your knowledge base.',
      },
      {
        title: 'Adaptive memory',
        description:
          'Every agent interaction can create or update notes. Your knowledge grows over time, giving agents richer context with each use.',
      },
      {
        title: 'Local-first architecture',
        description:
          'Your data stays on your device. Agents work with local files and context without requiring cloud storage or third-party access.',
      },
    ],
    workflowSteps: [
      {
        step: 'Context',
        title: 'Start with your knowledge',
        description:
          'Agents access your existing notes, research, and files as context — no manual copy-pasting into prompts.',
      },
      {
        step: 'Execute',
        title: 'Run agent tasks',
        description:
          'Research topics, draft documents, summarize sources, organize information. Agents handle the heavy lifting.',
      },
      {
        step: 'Capture',
        title: 'Save results as notes',
        description:
          'Agent outputs become structured notes in your workspace — searchable, editable, and connected to your existing knowledge.',
      },
      {
        step: 'Publish',
        title: 'Share to the web',
        description:
          'Turn any note into a published page. Your research, writing, and knowledge become a living digital presence.',
      },
    ],
    faqs: [
      {
        question: 'What is an AI agent workspace?',
        answer:
          'An AI agent workspace is a desktop application where AI agents work alongside your existing knowledge. Unlike standalone chat interfaces, agents in a workspace can read your notes, access your files, and produce outputs that become part of your organized knowledge base.',
      },
      {
        question: 'How is Moryflow different from ChatGPT or Claude?',
        answer:
          'ChatGPT and Claude are conversation interfaces — you type prompts and get responses. Moryflow is a workspace where agents work with your accumulated knowledge. Outputs are captured as notes you own, not lost in chat history. Your data stays local on your device.',
      },
      {
        question: 'What can AI agents do in Moryflow?',
        answer:
          'Agents can research topics using your notes as context, draft documents, summarize sources, organize information across your knowledge base, and help you publish content to the web. They work with your existing context rather than starting from scratch.',
      },
      {
        question: 'Is Moryflow free?',
        answer:
          'Moryflow is free to start with all features included — autonomous AI agents, local-first knowledge base, adaptive memory, and publishing. Download the desktop app for macOS.',
      },
      {
        question: 'Does Moryflow require an internet connection?',
        answer:
          'Your notes and files are stored locally and accessible offline. AI agent features require an internet connection to communicate with language model providers, but your data never leaves your device without your explicit action.',
      },
    ],
    ctaTitle: 'Try the agent workspace',
    ctaDescription:
      'Download Moryflow and let AI agents work with your knowledge. Free to start · Open Source.',
    relatedPages: [
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Moryflow vs Notion', href: '/compare/notion' },
    ],
  },
  zh: {
    title: 'AI 智能体工作空间',
    description:
      'Moryflow 是一个本地优先的 AI 智能体工作空间。智能体利用你的知识进行调研、起草、整理和发布。',
    headline: '为知识工作而生的 AI 智能体工作空间',
    subheadline:
      '运行能够处理你的笔记、文件和积累上下文的 AI 智能体——不只是空白提示词。成果作为你拥有的持久知识沉淀下来。',
    problemTitle: '为什么大多数 AI 智能体工具不够好',
    problemPoints: [
      {
        title: '没有记忆的智能体',
        description:
          '大多数 AI 智能体平台每次会话都从零开始。没有你现有知识的支撑，智能体会重复工作、遗漏上下文。',
      },
      {
        title: '成果会消失',
        description:
          '基于聊天的 AI 工具产出的内容淹没在对话历史中。调研、草稿和分析变得难以找到或复用。',
      },
      {
        title: '纯云端意味着别人掌控你的数据',
        description:
          '当你的 AI 智能体完全依赖云服务时，你对数据、提示词和知识产权的控制权就旁落了。',
      },
      {
        title: '工具割裂，工作流碎片化',
        description: '在 AI 聊天、笔记、文件管理和发布工具之间来回切换会带来摩擦，打断你的工作流。',
      },
    ],
    whyTitle: 'Moryflow 为什么不一样',
    whyPoints: [
      {
        title: '智能体原生工作空间',
        description:
          'AI 智能体是一等公民。它们读取你的笔记、访问你的文件，并将产出直接整合到你的知识库中。',
      },
      {
        title: '自适应记忆',
        description:
          '每次智能体交互都能创建或更新笔记。你的知识随时间增长，为智能体提供越来越丰富的上下文。',
      },
      {
        title: '本地优先架构',
        description:
          '你的数据留在你的设备上。智能体使用本地文件和上下文工作，无需云存储或第三方访问。',
      },
    ],
    workflowSteps: [
      {
        step: '上下文',
        title: '从你的知识开始',
        description: '智能体访问你现有的笔记、调研和文件作为上下文——无需手动复制粘贴到提示词中。',
      },
      {
        step: '执行',
        title: '运行智能体任务',
        description: '调研主题、起草文档、总结来源、整理信息。智能体完成繁重的工作。',
      },
      {
        step: '沉淀',
        title: '将结果保存为笔记',
        description:
          '智能体的产出成为工作空间中的结构化笔记——可搜索、可编辑，并与你现有的知识相连。',
      },
      {
        step: '发布',
        title: '分享到网络',
        description: '将任何笔记变成已发布的页面。你的调研、写作和知识将成为活跃的数字存在。',
      },
    ],
    faqs: [
      {
        question: '什么是 AI 智能体工作空间？',
        answer:
          'AI 智能体工作空间是一个桌面应用，AI 智能体在其中与你现有的知识协同工作。不同于独立的聊天界面，工作空间中的智能体可以读取你的笔记、访问你的文件，并将产出纳入你有组织的知识库。',
      },
      {
        question: 'Moryflow 与 ChatGPT 或 Claude 有什么不同？',
        answer:
          'ChatGPT 和 Claude 是对话界面——你输入提示词，获得回复。Moryflow 是一个让智能体与你积累的知识协同工作的工作空间。产出以你拥有的笔记形式沉淀，不会丢失在聊天记录中。你的数据保存在本地设备上。',
      },
      {
        question: 'AI 智能体在 Moryflow 中能做什么？',
        answer:
          '智能体可以利用你的笔记作为上下文调研主题、起草文档、总结来源、在知识库中整理信息，并帮助你将内容发布到网络。它们基于你现有的上下文工作，而非从零开始。',
      },
      {
        question: 'Moryflow 免费吗？',
        answer:
          'Moryflow 免费开始使用，包含所有功能——自主 AI 智能体、本地优先知识库、自适应记忆和发布。下载 macOS 桌面应用即可体验。',
      },
      {
        question: 'Moryflow 需要联网吗？',
        answer:
          '你的笔记和文件存储在本地，离线也可以访问。AI 智能体功能需要联网以与语言模型提供商通信，但未经你的明确操作，你的数据不会离开你的设备。',
      },
    ],
    ctaTitle: '试试智能体工作空间',
    ctaDescription: '下载 Moryflow，让 AI 智能体与你的知识协同工作。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: 'Moryflow 对比 Notion', href: '/compare/notion' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/agent-workspace')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'agent-workspace',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: AgentWorkspacePage,
});

function AgentWorkspacePage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <SeoLandingPage
      headline={c.headline}
      subheadline={c.subheadline}
      problemTitle={c.problemTitle}
      problemPoints={c.problemPoints}
      whyTitle={c.whyTitle}
      whyPoints={c.whyPoints.map((p, i) => ({ ...p, icon: whyIcons[i % whyIcons.length]! }))}
      workflowSteps={c.workflowSteps}
      faqs={c.faqs}
      ctaTitle={c.ctaTitle}
      ctaDescription={c.ctaDescription}
      relatedPages={c.relatedPages}
    />
  );
}
