import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Bot, NotebookPen, Search } from 'lucide-react';
import { SeoLandingPage, type SeoLandingContent } from '@/components/seo-pages/SeoLandingPage';

const whyIcons = [Bot, NotebookPen, Search];

const content: Record<Locale, SeoLandingContent> = {
  en: {
    title: 'AI Note-Taking App',
    description:
      'Moryflow combines AI agents with a local-first knowledge base. Your notes become the context for autonomous agents.',
    headline: 'Note-taking powered by AI agents',
    subheadline:
      "Your notes aren't just text files — they're context for AI agents that research, draft, and organize alongside you. All stored locally on your device.",
    problemTitle: "What's missing from note-taking apps",
    problemPoints: [
      {
        title: 'Notes sit unused after you write them',
        description:
          'You capture information, then rarely revisit or build on it. Without a way to actively use your notes, they become a graveyard of forgotten ideas.',
      },
      {
        title: "AI chat doesn't know your context",
        description:
          "When you switch to an AI tool for help, you start from zero. The AI has no access to the research, notes, or thinking you've already done.",
      },
      {
        title: 'Scattered tools, scattered knowledge',
        description:
          "Note-taking in one app, AI in another, publishing somewhere else. Your workflow is fragmented across tools that don't talk to each other.",
      },
      {
        title: "Cloud-first means your notes aren't really yours",
        description:
          'Most note-taking apps store your data on their servers. If the service shuts down or changes terms, your notes are at risk.',
      },
    ],
    whyTitle: 'How Moryflow reimagines note-taking',
    whyPoints: [
      {
        title: 'AI agents use your notes as context',
        description:
          'Agents read your existing notes when you give them tasks. Your accumulated knowledge makes every agent interaction more useful.',
      },
      {
        title: 'Agent outputs become notes',
        description:
          'Research, summaries, and drafts produced by agents are saved as structured notes — not lost in chat history.',
      },
      {
        title: 'Connected knowledge graph',
        description:
          'Notes link to each other naturally. As your knowledge base grows, connections emerge and agents get smarter context.',
      },
    ],
    workflowSteps: [
      {
        step: 'Capture',
        title: 'Write and collect notes',
        description:
          'Capture your thoughts, research, and ideas in a local-first editor. Your notes stay on your device.',
      },
      {
        step: 'Connect',
        title: 'Let agents work with your notes',
        description:
          "Give agents tasks and they'll use your notes as context — summarizing, drafting, researching, and organizing.",
      },
      {
        step: 'Grow',
        title: 'Build knowledge over time',
        description:
          'Agent outputs become new notes that connect to existing ones. Your knowledge base compounds.',
      },
      {
        step: 'Share',
        title: 'Publish selected notes',
        description:
          'Turn any note into a published page. Share your thinking as a digital garden, portfolio, or knowledge base.',
      },
    ],
    faqs: [
      {
        question: 'How does AI work with my notes?',
        answer:
          'When you run an agent task, Moryflow gives the AI access to relevant notes from your workspace as context. This means agents can reference your existing research, follow up on previous work, and produce outputs that fit naturally into your knowledge base.',
      },
      {
        question: 'What makes this different from Notion AI or Obsidian plugins?',
        answer:
          'Notion AI operates on cloud-stored data and focuses on inline text completion. Obsidian AI plugins add chat interfaces to a file-based system. Moryflow treats AI agents as first-class workspace members that read your notes, produce structured outputs, and grow your knowledge base — all while keeping data local on your device.',
      },
      {
        question: 'Are my notes stored in the cloud?',
        answer:
          'No. Moryflow is local-first — your notes are stored on your device. You control your data completely. Publishing is opt-in and only shares the specific notes you choose.',
      },
      {
        question: 'Can I import notes from other apps?',
        answer:
          'Moryflow works with standard file formats. You can bring in your existing notes and start using them as context for AI agents right away.',
      },
      {
        question: 'Is Moryflow free?',
        answer:
          'Moryflow is free to start with all features included. Download the desktop app for macOS.',
      },
    ],
    ctaTitle: 'Upgrade your note-taking',
    ctaDescription:
      'Download Moryflow and give your notes the power of AI agents. Free to start · Open Source.',
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Second Brain App', href: '/second-brain-app' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Moryflow vs Obsidian', href: '/compare/obsidian' },
    ],
  },
  zh: {
    title: 'AI 笔记应用',
    description: 'Moryflow 将 AI 智能体与本地优先知识库结合。你的笔记成为自主智能体的上下文。',
    headline: '由 AI 智能体驱动的笔记',
    subheadline:
      '你的笔记不只是文本文件——它们是 AI 智能体调研、起草和整理时的上下文。全部存储在你的本地设备上。',
    problemTitle: '笔记应用缺少了什么',
    problemPoints: [
      {
        title: '写完的笔记就被遗忘了',
        description:
          '你记录了信息，却很少回顾或在此基础上构建。没有主动利用笔记的方式，它们就成了被遗忘想法的坟场。',
      },
      {
        title: 'AI 聊天不了解你的上下文',
        description:
          '当你切换到 AI 工具寻求帮助时，一切从零开始。AI 无法访问你已有的调研、笔记或思考。',
      },
      {
        title: '工具分散，知识碎片化',
        description:
          '笔记在一个应用，AI 在另一个，发布又在别处。你的工作流被割裂在互不相通的工具之间。',
      },
      {
        title: '云端优先意味着笔记不真正属于你',
        description:
          '大多数笔记应用将你的数据存储在他们的服务器上。如果服务关闭或条款变更，你的笔记就面临风险。',
      },
    ],
    whyTitle: 'Moryflow 如何重新定义笔记',
    whyPoints: [
      {
        title: 'AI 智能体以你的笔记为上下文',
        description:
          '当你给智能体分配任务时，它们会读取你现有的笔记。你积累的知识让每次智能体交互更有价值。',
      },
      {
        title: '智能体产出变成笔记',
        description: '智能体产出的调研、摘要和草稿被保存为结构化笔记——不会丢失在聊天记录中。',
      },
      {
        title: '关联知识图谱',
        description:
          '笔记之间自然形成链接。随着知识库的增长，连接自然浮现，智能体获得更丰富的上下文。',
      },
    ],
    workflowSteps: [
      {
        step: '记录',
        title: '书写和收集笔记',
        description: '在本地优先编辑器中记录你的想法、调研和灵感。你的笔记留在你的设备上。',
      },
      {
        step: '连接',
        title: '让智能体处理你的笔记',
        description: '给智能体分配任务，它们会以你的笔记为上下文——总结、起草、调研和整理。',
      },
      {
        step: '积累',
        title: '随时间构建知识',
        description: '智能体的产出成为与现有笔记相连的新笔记。你的知识库不断增长。',
      },
      {
        step: '分享',
        title: '发布选定的笔记',
        description: '将任何笔记变成已发布的页面。以数字花园、作品集或知识库的形式分享你的思考。',
      },
    ],
    faqs: [
      {
        question: 'AI 如何与我的笔记协作？',
        answer:
          '当你运行智能体任务时，Moryflow 会让 AI 访问你工作空间中的相关笔记作为上下文。这意味着智能体可以引用你已有的调研、跟进之前的工作，并产出自然融入你知识库的内容。',
      },
      {
        question: '这和 Notion AI 或 Obsidian 插件有什么不同？',
        answer:
          'Notion AI 在云端数据上运行，侧重行内文本补全。Obsidian AI 插件为文件系统添加聊天界面。Moryflow 将 AI 智能体视为一等工作空间成员，它们读取你的笔记、产出结构化内容、并帮助知识库成长——同时数据始终保存在你的本地设备上。',
      },
      {
        question: '我的笔记存储在云端吗？',
        answer:
          '不。Moryflow 是本地优先的——你的笔记存储在你的设备上。你完全掌控自己的数据。发布是可选的，且只会分享你选择的特定笔记。',
      },
      {
        question: '我能从其他应用导入笔记吗？',
        answer:
          'Moryflow 支持标准文件格式。你可以导入现有笔记，立即将它们作为 AI 智能体的上下文使用。',
      },
      {
        question: 'Moryflow 免费吗？',
        answer: 'Moryflow 免费开始使用，包含所有功能。下载 macOS 桌面应用即可体验。',
      },
    ],
    ctaTitle: '升级你的笔记方式',
    ctaDescription: '下载 Moryflow，赋予你的笔记 AI 智能体的力量。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '第二大脑应用', href: '/second-brain-app' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: 'Moryflow 对比 Obsidian', href: '/compare/obsidian' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/ai-note-taking-app')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'ai-note-taking-app',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: AiNoteTakingPage,
});

function AiNoteTakingPage() {
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
