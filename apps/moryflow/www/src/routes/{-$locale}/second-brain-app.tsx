import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Brain, Bot, Network } from 'lucide-react';
import { SeoLandingPage, type SeoLandingContent } from '@/components/seo-pages/SeoLandingPage';

const whyIcons = [Brain, Bot, Network];

const content: Record<Locale, SeoLandingContent> = {
  en: {
    title: 'Second Brain App',
    description:
      'Build a second brain with AI agents. Moryflow captures, organizes, and grows your knowledge over time.',
    headline: 'Your second brain, powered by AI agents',
    subheadline:
      'Build a personal knowledge base that grows smarter over time. AI agents help you capture, organize, and surface knowledge when you need it.',
    problemTitle: 'Why building a second brain is harder than it should be',
    problemPoints: [
      {
        title: 'Capture is easy, retrieval is hard',
        description:
          'You save articles, take notes, and clip ideas — but finding what you need months later is nearly impossible. Your second brain collects dust.',
      },
      {
        title: 'Organization requires constant maintenance',
        description:
          "Tagging, filing, and linking notes takes discipline most people can't sustain. Without active curation, your knowledge base becomes a disorganized dump.",
      },
      {
        title: "Knowledge doesn't compound on its own",
        description:
          "Traditional note apps store information passively. Notes don't connect to each other, insights don't surface, and your collected knowledge doesn't become more valuable over time.",
      },
      {
        title: 'AI tools create outputs but not knowledge',
        description:
          'Chat-based AI produces useful responses, but those responses disappear in conversation history. They never become part of your organized knowledge system.',
      },
    ],
    whyTitle: 'A second brain with AI that does the work',
    whyPoints: [
      {
        title: 'Knowledge that compounds',
        description:
          'Every note and every agent output connects to your existing knowledge. Your second brain grows more valuable with each interaction.',
      },
      {
        title: 'Agents that organize for you',
        description:
          "AI agents help you process raw captures into structured knowledge — summarizing, linking, and filing notes so you don't have to.",
      },
      {
        title: 'Connections emerge naturally',
        description:
          'As your knowledge base grows, agents surface relevant connections between notes you might have missed. Ideas build on each other.',
      },
    ],
    workflowSteps: [
      {
        step: 'Capture',
        title: 'Collect information from anywhere',
        description:
          'Save notes, ideas, research findings, and agent outputs in one local workspace. Everything goes into your second brain.',
      },
      {
        step: 'Process',
        title: 'Let agents organize your knowledge',
        description:
          'AI agents summarize, tag, and connect your notes. Raw captures become structured knowledge without manual filing.',
      },
      {
        step: 'Retrieve',
        title: 'Find knowledge when you need it',
        description:
          'Search your knowledge base and let agents surface relevant notes based on context, connections, and meaning — not just keywords.',
      },
      {
        step: 'Create',
        title: 'Build on what you know',
        description:
          'Use your accumulated knowledge as context for new work. Agents draft documents, research topics, and create outputs grounded in your existing knowledge.',
      },
    ],
    faqs: [
      {
        question: 'What is a second brain app?',
        answer:
          'A second brain app is a personal knowledge management tool that helps you capture, organize, and retrieve information. The goal is to externalize your memory — storing knowledge outside your head so you can find and use it reliably. Moryflow adds AI agents that actively help you build and maintain this system.',
      },
      {
        question: 'How is Moryflow different from Notion or Evernote for building a second brain?',
        answer:
          'Notion and Evernote are cloud-based and rely on manual organization. Moryflow is local-first and uses AI agents to help you process, connect, and build on your knowledge. Agents turn raw captures into structured notes, surface connections, and help you create new work grounded in existing knowledge.',
      },
      {
        question: 'Do I need to follow a specific method like PARA or Zettelkasten?',
        answer:
          'No. Moryflow works with your natural workflow. You can adopt any organizational method you prefer, or let AI agents help you develop a system that works for you. The tool adapts to your approach, not the other way around.',
      },
      {
        question: 'Can AI agents actually help organize my notes?',
        answer:
          'Yes. Agents can summarize long notes, suggest connections between related ideas, help you tag and categorize captures, and draft new notes that synthesize information from across your knowledge base. They work with your existing context to make organization less manual.',
      },
      {
        question: 'Is my data private?',
        answer:
          'Moryflow is local-first — your notes are stored on your device, not on our servers. AI agent features connect to language model APIs to process tasks, but your knowledge base stays local. Publishing is opt-in.',
      },
    ],
    ctaTitle: 'Start building your second brain',
    ctaDescription:
      'Download Moryflow and let AI agents help you build a knowledge base that grows smarter over time. Free to start · Open Source.',
    relatedPages: [
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Digital Garden App', href: '/digital-garden-app' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      { label: 'Agent Workspace', href: '/agent-workspace' },
    ],
  },
  zh: {
    title: '第二大脑应用',
    description: '用 AI 智能体构建你的第二大脑。Moryflow 帮你捕获、整理知识，并让它随时间增长。',
    headline: '由 AI 智能体驱动的第二大脑',
    subheadline:
      '构建一个随时间变得更聪明的个人知识库。AI 智能体帮你捕获、整理，并在需要时呈现知识。',
    problemTitle: '为什么构建第二大脑比想象中更难',
    problemPoints: [
      {
        title: '捕获容易，检索困难',
        description:
          '你保存文章、做笔记、收藏想法——但几个月后要找到需要的内容几乎不可能。你的第二大脑积满了灰尘。',
      },
      {
        title: '组织需要持续维护',
        description:
          '打标签、归档、建立笔记链接需要大多数人难以持续的自律。没有主动整理，你的知识库就变成了杂乱的堆积。',
      },
      {
        title: '知识不会自动复利增长',
        description:
          '传统笔记应用被动地存储信息。笔记之间没有连接，洞见不会浮现，你收集的知识也不会随时间变得更有价值。',
      },
      {
        title: 'AI 工具产出内容，但不产出知识',
        description:
          '基于聊天的 AI 能产出有用的回复，但这些回复消失在对话历史中。它们永远不会成为你有组织的知识体系的一部分。',
      },
    ],
    whyTitle: '一个有 AI 帮你做事的第二大脑',
    whyPoints: [
      {
        title: '知识的复利效应',
        description:
          '每条笔记、每个智能体产出都与你现有的知识相连。你的第二大脑随每次交互变得更有价值。',
      },
      {
        title: '智能体帮你整理',
        description:
          'AI 智能体帮你将原始捕获整理为结构化知识——总结、链接和归档笔记，让你无需亲力亲为。',
      },
      {
        title: '连接自然涌现',
        description: '随着知识库的增长，智能体会呈现你可能遗漏的笔记之间的关联。想法相互叠加。',
      },
    ],
    workflowSteps: [
      {
        step: '捕获',
        title: '从各处收集信息',
        description:
          '将笔记、想法、调研发现和智能体产出保存在一个本地工作空间中。一切都汇入你的第二大脑。',
      },
      {
        step: '处理',
        title: '让智能体整理你的知识',
        description: 'AI 智能体总结、打标签并关联你的笔记。原始捕获变成结构化知识，无需手动归档。',
      },
      {
        step: '检索',
        title: '需要时找到知识',
        description:
          '搜索你的知识库，让智能体根据上下文、关联和语义呈现相关笔记——不仅仅是关键词匹配。',
      },
      {
        step: '创造',
        title: '在已有知识上构建',
        description:
          '以你积累的知识为上下文进行新工作。智能体起草文档、调研主题，并基于你现有的知识产出内容。',
      },
    ],
    faqs: [
      {
        question: '什么是第二大脑应用？',
        answer:
          '第二大脑应用是一种个人知识管理工具，帮助你捕获、整理和检索信息。目标是将记忆外化——把知识存储在大脑之外，以便你能可靠地找到和使用它。Moryflow 加入了 AI 智能体来主动帮你构建和维护这个系统。',
      },
      {
        question: '用 Moryflow 构建第二大脑和 Notion 或 Evernote 有什么不同？',
        answer:
          'Notion 和 Evernote 是云端的，依赖手动组织。Moryflow 是本地优先的，使用 AI 智能体帮你处理、连接和构建知识。智能体将原始捕获转化为结构化笔记、浮现关联，并帮助你基于已有知识创作新内容。',
      },
      {
        question: '我需要遵循 PARA 或 Zettelkasten 等特定方法吗？',
        answer:
          '不需要。Moryflow 适应你的自然工作流。你可以采用任何你喜欢的组织方法，或者让 AI 智能体帮你找到适合你的体系。工具适应你的方式，而不是反过来。',
      },
      {
        question: 'AI 智能体真的能帮我整理笔记吗？',
        answer:
          '是的。智能体可以总结长笔记、建议相关想法之间的关联、帮你打标签和分类捕获内容，以及起草综合知识库中跨领域信息的新笔记。它们利用你现有的上下文让组织工作更自动化。',
      },
      {
        question: '我的数据是私密的吗？',
        answer:
          'Moryflow 是本地优先的——你的笔记存储在你的设备上，不在我们的服务器上。AI 智能体功能连接语言模型 API 来处理任务，但你的知识库保持在本地。发布是可选的。',
      },
    ],
    ctaTitle: '开始构建你的第二大脑',
    ctaDescription:
      '下载 Moryflow，让 AI 智能体帮你构建一个随时间变得更聪明的知识库。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '数字花园应用', href: '/digital-garden-app' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
    ],
  },
};

export const Route = createFileRoute('/{-$locale}/second-brain-app')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'second-brain-app',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: SecondBrainPage,
});

function SecondBrainPage() {
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
