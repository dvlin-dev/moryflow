import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { HardDrive, Bot, Lock } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

const content: Record<
  Locale,
  {
    title: string;
    description: string;
    headline: string;
    subheadline: string;
    problemTitle: string;
    problemPoints: { title: string; description: string }[];
    whyTitle: string;
    whyPoints: { title: string; description: string }[];
    workflowSteps: { step: string; title: string; description: string }[];
    faqs: { question: string; answer: string }[];
    ctaTitle: string;
    ctaDescription: string;
    relatedPages: { label: string; href: string }[];
  }
> = {
  en: {
    title: 'Local-first AI Agent',
    description:
      'A local-first approach to AI agents. Your data, your device, your knowledge — agents that work without cloud dependency.',
    headline: 'AI agents that put your data first',
    subheadline:
      'Run AI agents on your desktop with local-first architecture. Your knowledge stays on your device — agents work with your data without cloud storage dependencies.',
    problemTitle: 'The trust problem with cloud-based AI agents',
    problemPoints: [
      {
        title: 'Cloud agents need your data on their servers',
        description:
          "Most AI agent platforms require uploading your documents, notes, and files to process them. Your intellectual property lives on infrastructure you don't control.",
      },
      {
        title: 'Agent memory is stored remotely',
        description:
          'When AI agents remember context between sessions, that memory typically lives in a cloud database. Your accumulated knowledge and interaction history belongs to the platform.',
      },
      {
        title: 'Offline means no agents',
        description:
          "Cloud-dependent agent platforms stop working entirely without internet access. Your productivity depends on connectivity and the platform's uptime.",
      },
      {
        title: 'Platform risk is real',
        description:
          'If a cloud AI agent service changes pricing, terms, or shuts down, you lose access to your agents, accumulated context, and possibly your data.',
      },
    ],
    whyTitle: 'Local-first: a different approach to AI agents',
    whyPoints: [
      {
        title: 'Your data stays on your device',
        description:
          'Notes, files, and agent outputs are stored locally. No cloud storage required. Your knowledge base lives on hardware you own.',
      },
      {
        title: 'Agents work with local context',
        description:
          'AI agents read your local files and notes as context. They produce outputs that save directly to your local workspace — no round-trip through cloud storage.',
      },
      {
        title: 'You control the boundaries',
        description:
          'AI features connect to language model APIs when needed, but your underlying knowledge stays local. Publishing is explicit and opt-in.',
      },
    ],
    workflowSteps: [
      {
        step: 'Install',
        title: 'Desktop app, local storage',
        description:
          'Download Moryflow for macOS. Your workspace lives on your device from the start — no account creation required to begin.',
      },
      {
        step: 'Build',
        title: 'Grow your local knowledge base',
        description:
          'Create notes, import files, and build your knowledge base locally. Everything is stored on your device in standard formats.',
      },
      {
        step: 'Deploy',
        title: 'Run agents with local context',
        description:
          'Give agents tasks and they work with your local knowledge as context. Research, draft, organize, and analyze — grounded in your accumulated information.',
      },
      {
        step: 'Own',
        title: 'Keep full control',
        description:
          'Agent outputs save locally. Your knowledge base grows on your device. If you ever stop using Moryflow, your data is already on your machine.',
      },
    ],
    faqs: [
      {
        question: 'What does "local-first AI agent" mean?',
        answer:
          'A local-first AI agent runs on your desktop computer with your data stored locally on your device. The agent reads your local files and notes as context, and saves outputs back to your local storage. AI inference still uses cloud language model APIs (like OpenAI or Anthropic), but your knowledge base never leaves your device.',
      },
      {
        question: 'How is this different from Manus or OpenClaw?',
        answer:
          'Manus is a cloud-based AI agent platform focused on autonomous task execution. OpenClaw is a self-hosted multi-channel agent gateway. Moryflow takes a different approach: a desktop application where AI agents work with your local knowledge base. The focus is on knowledge work — research, writing, organizing — with results captured as durable notes you own.',
      },
      {
        question: 'Does "local-first" mean fully offline?',
        answer:
          'Your notes and files work fully offline. AI agent features require an internet connection to reach language model APIs for inference. But your data stays local — the AI processes your prompts and returns results without storing your knowledge base remotely.',
      },
      {
        question: 'Can I self-host the AI models?',
        answer:
          "Moryflow currently connects to cloud language model providers for AI inference. Support for local/self-hosted models is something we're exploring for future releases.",
      },
      {
        question: 'What platforms does Moryflow support?',
        answer:
          'Moryflow is free to start with all features included — autonomous AI agents, local-first knowledge base, adaptive memory, and publishing. Download the desktop app for macOS.',
      },
    ],
    ctaTitle: 'Try local-first AI agents',
    ctaDescription:
      'Download Moryflow and run AI agents that respect your data. Free to start · Open Source.',
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Telegram AI Agent', href: '/telegram-ai-agent' },
      { label: 'Moryflow vs Manus', href: '/compare/manus' },
      { label: 'Moryflow vs OpenClaw', href: '/compare/openclaw' },
    ],
  },
  zh: {
    title: '本地优先 AI 智能体',
    description: '本地优先的 AI 智能体方案。你的数据、你的设备、你的知识——无需依赖云端的智能体。',
    headline: '把你的数据放在第一位的 AI 智能体',
    subheadline:
      '在桌面端以本地优先架构运行 AI 智能体。你的知识留在你的设备上——智能体无需依赖云端存储即可使用你的数据。',
    problemTitle: '云端 AI 智能体的信任问题',
    problemPoints: [
      {
        title: '云端智能体需要你的数据上传到他们的服务器',
        description:
          '大多数 AI 智能体平台要求上传你的文档、笔记和文件才能处理。你的知识资产存放在你无法掌控的基础设施上。',
      },
      {
        title: '智能体记忆存储在远端',
        description:
          '当 AI 智能体在会话之间记住上下文时，这些记忆通常存在云端数据库中。你积累的知识和交互历史属于平台。',
      },
      {
        title: '离线意味着没有智能体',
        description:
          '依赖云端的智能体平台在没有网络时完全停止工作。你的生产力取决于网络连接和平台的可用性。',
      },
      {
        title: '平台风险是真实的',
        description:
          '如果一个云端 AI 智能体服务改变定价、条款或关闭，你将失去对智能体、积累的上下文，甚至可能是数据的访问权。',
      },
    ],
    whyTitle: '本地优先：AI 智能体的不同方案',
    whyPoints: [
      {
        title: '数据留在你的设备上',
        description:
          '笔记、文件和智能体输出存储在本地。无需云存储。你的知识库运行在你拥有的硬件上。',
      },
      {
        title: '智能体使用本地上下文工作',
        description:
          'AI 智能体读取你的本地文件和笔记作为上下文。产出直接保存到你的本地工作空间——无需经过云存储中转。',
      },
      {
        title: '你控制边界',
        description:
          'AI 功能在需要时连接语言模型 API，但你的底层知识保留在本地。发布是显式的、可选的。',
      },
    ],
    workflowSteps: [
      {
        step: '安装',
        title: '桌面应用，本地存储',
        description:
          '下载适用于 macOS 的 Moryflow。你的工作空间从一开始就在你的设备上——无需创建账户即可开始。',
      },
      {
        step: '构建',
        title: '增长你的本地知识库',
        description:
          '创建笔记、导入文件，在本地构建你的知识库。所有内容以标准格式存储在你的设备上。',
      },
      {
        step: '部署',
        title: '用本地上下文运行智能体',
        description:
          '交给智能体任务，它们以你的本地知识作为上下文工作。调研、起草、整理、分析——基于你积累的信息。',
      },
      {
        step: '掌控',
        title: '保持完全控制',
        description:
          '智能体输出保存在本地。你的知识库在你的设备上增长。即使你不再使用 Moryflow，数据已经在你的机器上。',
      },
    ],
    faqs: [
      {
        question: '"本地优先 AI 智能体"是什么意思？',
        answer:
          '本地优先 AI 智能体运行在你的桌面电脑上，数据存储在你的本地设备上。智能体读取你的本地文件和笔记作为上下文，并将输出保存回本地存储。AI 推理仍使用云端语言模型 API（如 OpenAI 或 Anthropic），但你的知识库永远不会离开你的设备。',
      },
      {
        question: '这和 Manus 或 OpenClaw 有什么不同？',
        answer:
          'Manus 是一个专注于自主任务执行的云端 AI 智能体平台。OpenClaw 是一个自托管的多渠道智能体网关。Moryflow 采取不同的方案：一个桌面应用，AI 智能体在你的本地知识库上工作。重点是知识工作——调研、写作、整理——成果作为你拥有的持久笔记被捕获。',
      },
      {
        question: '"本地优先"意味着完全离线吗？',
        answer:
          '你的笔记和文件完全支持离线使用。AI 智能体功能需要网络连接来访问语言模型 API 进行推理。但你的数据保留在本地——AI 处理你的提示并返回结果，不会远程存储你的知识库。',
      },
      {
        question: '我可以自托管 AI 模型吗？',
        answer:
          'Moryflow 目前连接云端语言模型提供商进行 AI 推理。对本地/自托管模型的支持是我们正在探索的未来方向。',
      },
      {
        question: 'Moryflow 支持哪些平台？',
        answer:
          'Moryflow 免费开始，包含所有功能——自主 AI 智能体、本地优先知识库、自适应记忆和发布。下载适用于 macOS 的桌面应用。',
      },
    ],
    ctaTitle: '体验本地优先 AI 智能体',
    ctaDescription: '下载 Moryflow，运行尊重你数据的 AI 智能体。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: 'Telegram AI 智能体', href: '/telegram-ai-agent' },
      { label: 'Moryflow 对比 Manus', href: '/compare/manus' },
      { label: 'Moryflow 对比 OpenClaw', href: '/compare/openclaw' },
    ],
  },
};

const whyIcons = [HardDrive, Bot, Lock];

export const Route = createFileRoute('/{-$locale}/local-first-ai-agent')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'local-first-ai-agent',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: LocalFirstAiAgentPage,
});

function LocalFirstAiAgentPage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <SeoLandingPage
      headline={c.headline}
      subheadline={c.subheadline}
      problemTitle={c.problemTitle}
      problemPoints={c.problemPoints}
      whyTitle={c.whyTitle}
      whyPoints={c.whyPoints.map((p, i) => ({ ...p, icon: whyIcons[i]! }))}
      workflowSteps={c.workflowSteps}
      faqs={c.faqs}
      ctaTitle={c.ctaTitle}
      ctaDescription={c.ctaDescription}
      relatedPages={c.relatedPages}
    />
  );
}
