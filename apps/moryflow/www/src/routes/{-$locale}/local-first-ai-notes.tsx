import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Shield, HardDrive, Bot } from 'lucide-react';
import { SeoLandingPage, type SeoLandingContent } from '@/components/seo-pages/SeoLandingPage';

const whyIcons = [HardDrive, Bot, Shield];

const content: Record<Locale, SeoLandingContent> = {
  en: {
    title: 'Local-first AI Notes',
    description:
      'Notes that stay on your device with AI that works alongside you. No cloud dependency, full ownership.',
    headline: 'Local-first notes with AI that respects your privacy',
    subheadline:
      'Your notes stay on your device. AI agents work with your knowledge locally — no cloud storage, no data lock-in, full ownership.',
    problemTitle: 'The cloud dependency problem',
    problemPoints: [
      {
        title: "Your notes live on someone else's server",
        description:
          "Cloud-first note apps store your data remotely. If the service goes down, changes pricing, or gets acquired, your notes are at the mercy of a company's business decisions.",
      },
      {
        title: 'AI features require sending your data to the cloud',
        description:
          "Most AI-enhanced note apps process your notes on remote servers. Your private thoughts, research, and intellectual property travel through infrastructure you don't control.",
      },
      {
        title: 'Offline means limited functionality',
        description:
          "Cloud-dependent apps degrade when you're offline. On a plane, in a cafe with bad WiFi, or just disconnected — your note-taking experience suffers.",
      },
      {
        title: "Export doesn't mean ownership",
        description:
          "Being able to export data isn't the same as owning it. If your daily workflow depends on proprietary cloud features, you're effectively locked in regardless of export options.",
      },
    ],
    whyTitle: 'Local-first with AI that works for you',
    whyPoints: [
      {
        title: 'Data stays on your device',
        description:
          'Notes are stored locally on your machine. No cloud sync required. You have complete control over where your data lives.',
      },
      {
        title: 'AI agents with local context',
        description:
          'Agents work with your local notes as context. They read your files and knowledge base without uploading your data to storage servers.',
      },
      {
        title: 'Privacy by architecture',
        description:
          "Local-first isn't a feature toggle — it's the architecture. Your notes never leave your device unless you explicitly choose to publish.",
      },
    ],
    workflowSteps: [
      {
        step: 'Store',
        title: 'Notes live on your device',
        description:
          'Create and organize notes with a local-first editor. No account required, no cloud sync, instant access.',
      },
      {
        step: 'Enhance',
        title: 'AI agents work locally',
        description:
          'Run agents that reference your local notes. AI features use your knowledge as context while respecting your data boundaries.',
      },
      {
        step: 'Build',
        title: 'Grow your knowledge base',
        description:
          'Agent outputs become local notes that link to your existing knowledge. Your personal knowledge base compounds over time.',
      },
      {
        step: 'Publish',
        title: 'Share on your terms',
        description:
          'Optionally publish selected notes to the web. You choose what to share — everything else stays private and local.',
      },
    ],
    faqs: [
      {
        question: 'What does "local-first" mean?',
        answer:
          'Local-first means your data is stored on your own device as the primary copy, not on a remote server. The app works fully offline, and you maintain complete ownership and control over your files. Cloud features like publishing are optional and explicit.',
      },
      {
        question: 'How does AI work if notes are local?',
        answer:
          'AI agent features connect to language model APIs (like OpenAI or Anthropic) to process tasks, but your notes themselves are read locally. The agent reads your files on your device, constructs prompts locally, and saves results back to your local storage.',
      },
      {
        question: 'Can I sync notes across devices?',
        answer:
          'Moryflow currently focuses on the desktop experience with local storage. You can use your own sync solution (like Dropbox or iCloud Drive) to keep files accessible across devices.',
      },
      {
        question: 'How is this different from Obsidian?',
        answer:
          "Both Moryflow and Obsidian are local-first. The key difference is Moryflow's native AI agent integration — agents are first-class workspace members that read your notes, execute tasks, and produce structured outputs. Moryflow also includes built-in publishing to turn notes into websites.",
      },
      {
        question: 'Is Moryflow free?',
        answer:
          'Moryflow is free to start with all features included. Download the desktop app for macOS.',
      },
    ],
    ctaTitle: 'Own your notes, powered by AI',
    ctaDescription:
      'Download Moryflow and keep your knowledge local while leveraging AI agents. Free to start · Open Source.',
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Moryflow vs Obsidian', href: '/compare/obsidian' },
    ],
  },
  zh: {
    title: '本地优先 AI 笔记',
    description: '笔记留在你的设备上，AI 与你并肩工作。无云端依赖，完全自主。',
    headline: '本地优先的笔记，尊重你隐私的 AI',
    subheadline:
      '你的笔记留在你的设备上。AI 智能体在本地与你的知识协同工作——无云存储、无数据锁定、完全自主。',
    problemTitle: '云端依赖的问题',
    problemPoints: [
      {
        title: '你的笔记存在别人的服务器上',
        description:
          '云端优先的笔记应用将你的数据存储在远端。如果服务宕机、变更定价或被收购，你的笔记就受制于公司的商业决策。',
      },
      {
        title: 'AI 功能需要把数据发送到云端',
        description:
          '大多数 AI 增强笔记应用在远程服务器上处理你的笔记。你的私人想法、调研和知识产权流经你无法掌控的基础设施。',
      },
      {
        title: '离线意味着功能受限',
        description:
          '依赖云端的应用在离线时会降级。在飞机上、在 WiFi 差的咖啡馆、或者只是断网——你的笔记体验就会打折。',
      },
      {
        title: '能导出不等于拥有',
        description:
          '能导出数据并不等于拥有它。如果你的日常工作流依赖专有的云端功能，无论有没有导出选项，你实际上都被锁定了。',
      },
    ],
    whyTitle: '本地优先，AI 为你服务',
    whyPoints: [
      {
        title: '数据留在你的设备上',
        description: '笔记存储在你的本地设备上。无需云同步。你完全掌控数据的存储位置。',
      },
      {
        title: '拥有本地上下文的 AI 智能体',
        description:
          '智能体以你的本地笔记为上下文工作。它们读取你的文件和知识库，无需将数据上传到存储服务器。',
      },
      {
        title: '架构级隐私保护',
        description:
          '本地优先不是一个功能开关——而是架构本身。除非你明确选择发布，你的笔记永远不会离开你的设备。',
      },
    ],
    workflowSteps: [
      {
        step: '存储',
        title: '笔记存在你的设备上',
        description: '使用本地优先编辑器创建和整理笔记。无需注册、无需云同步、即时访问。',
      },
      {
        step: '增强',
        title: 'AI 智能体在本地工作',
        description:
          '运行引用你本地笔记的智能体。AI 功能以你的知识为上下文，同时尊重你的数据边界。',
      },
      {
        step: '构建',
        title: '扩充你的知识库',
        description: '智能体产出成为与你现有知识相连的本地笔记。你的个人知识库随时间不断增长。',
      },
      {
        step: '发布',
        title: '按你的意愿分享',
        description: '可选地将选定笔记发布到网络。你决定分享什么——其余一切保持私密和本地。',
      },
    ],
    faqs: [
      {
        question: '"本地优先"是什么意思？',
        answer:
          '本地优先意味着你的数据以你自己设备上的副本为主，而非远程服务器。应用完全支持离线工作，你对文件拥有完全的所有权和控制权。发布等云功能是可选且需明确操作的。',
      },
      {
        question: '笔记是本地的，AI 怎么工作？',
        answer:
          'AI 智能体功能连接语言模型 API（如 OpenAI 或 Anthropic）来处理任务，但你的笔记本身在本地读取。智能体在你的设备上读取文件、在本地构建提示词，并将结果保存回你的本地存储。',
      },
      {
        question: '我能跨设备同步笔记吗？',
        answer:
          'Moryflow 当前专注于本地存储的桌面体验。你可以使用自己的同步方案（如 Dropbox 或 iCloud Drive）来跨设备访问文件。',
      },
      {
        question: '这和 Obsidian 有什么不同？',
        answer:
          'Moryflow 和 Obsidian 都是本地优先的。关键区别在于 Moryflow 原生的 AI 智能体集成——智能体是一等工作空间成员，可以读取你的笔记、执行任务并产出结构化内容。Moryflow 还内置了将笔记变为网站的发布功能。',
      },
      {
        question: 'Moryflow 免费吗？',
        answer: 'Moryflow 免费开始使用，包含所有功能。下载 macOS 桌面应用即可体验。',
      },
    ],
    ctaTitle: '拥有你的笔记，由 AI 驱动',
    ctaDescription: '下载 Moryflow，让知识留在本地的同时享受 AI 智能体的力量。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: 'Moryflow 对比 Obsidian', href: '/compare/obsidian' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/local-first-ai-notes')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'local-first-ai-notes',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: LocalFirstAiNotesPage,
});

function LocalFirstAiNotesPage() {
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
