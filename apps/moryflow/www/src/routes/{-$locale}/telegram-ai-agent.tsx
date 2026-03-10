import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { MessageCircle, Brain, Shield } from 'lucide-react';
import { SeoLandingPage, type SeoLandingContent } from '@/components/seo-pages/SeoLandingPage';

const content: Record<Locale, SeoLandingContent> = {
  en: {
    title: 'Telegram AI Agent',
    description:
      'Connect your AI agent to Telegram. Moryflow lets you interact with agents via chat while keeping knowledge local.',
    headline: 'Your AI agent, accessible from Telegram',
    subheadline:
      'Interact with your Moryflow agent through Telegram. Ask questions, run tasks, and capture knowledge — all from the chat app you already use.',
    problemTitle: 'The gap between AI agents and daily communication',
    problemPoints: [
      {
        title: 'AI tools live in separate apps',
        description:
          'To use AI, you open a dedicated app, switch context, type a prompt, and copy the result back to wherever you were working. The friction adds up throughout the day.',
      },
      {
        title: 'Chat-based AI has no persistent memory',
        description:
          "Telegram bots and AI chat tools start fresh each conversation. They don't know what you worked on yesterday, what notes you've taken, or what context matters to you.",
      },
      {
        title: 'Quick questions deserve quick answers grounded in your knowledge',
        description:
          "Sometimes you need a fast lookup, a summary, or a draft while you're on the go. Without access to your knowledge base, AI gives generic responses instead of personalized ones.",
      },
      {
        title: 'Mobile AI tools lack desktop knowledge',
        description:
          "Your knowledge base lives on your desktop. Mobile AI tools can't access your notes, research, or accumulated context when you're away from your computer.",
      },
    ],
    whyTitle: 'Telegram as a window into your knowledge',
    whyPoints: [
      {
        title: 'Chat with your agent on Telegram',
        description:
          'Send messages to your Moryflow agent through Telegram. Ask questions, request summaries, or run tasks — the agent responds with knowledge-grounded answers.',
      },
      {
        title: 'Grounded in your local knowledge',
        description:
          'Your Telegram agent draws on the notes and knowledge in your Moryflow workspace. Responses reflect your accumulated context, not just generic AI output.',
      },
      {
        title: 'Knowledge stays local',
        description:
          'Your notes remain on your device. The Telegram integration enables agent interaction without moving your knowledge base to the cloud.',
      },
    ],
    workflowSteps: [
      {
        step: 'Connect',
        title: 'Link Telegram to your workspace',
        description:
          'Set up the Telegram integration in Moryflow. Your agent becomes available as a Telegram contact.',
      },
      {
        step: 'Ask',
        title: 'Send messages from anywhere',
        description:
          'Message your agent from Telegram on any device. Ask questions, request information, or start tasks.',
      },
      {
        step: 'Respond',
        title: 'Get knowledge-grounded answers',
        description:
          'Your agent responds using your notes and knowledge as context. Answers are relevant to your specific work and accumulated knowledge.',
      },
      {
        step: 'Capture',
        title: 'Results flow back to your workspace',
        description:
          'Agent outputs from Telegram conversations are captured in your Moryflow workspace as notes — accessible and organized alongside your other knowledge.',
      },
    ],
    faqs: [
      {
        question: 'How does the Telegram AI agent work?',
        answer:
          'Moryflow connects to Telegram through a bot integration. When you send a message to your agent on Telegram, it processes your request using your local knowledge base as context and responds directly in the chat. Currently Telegram is the supported messaging channel, with more channels planned.',
      },
      {
        question: 'Can the Telegram agent access all my notes?',
        answer:
          'The agent can reference notes in your Moryflow workspace to provide context-aware responses. You control which parts of your knowledge base are available to the agent. Your notes themselves remain stored locally on your device.',
      },
      {
        question: 'Does this work on mobile?',
        answer:
          'Yes. Since the interaction happens through Telegram, you can message your agent from any device where Telegram is installed — phone, tablet, or another computer. Your Moryflow desktop app needs to be running to process requests.',
      },
      {
        question: 'What messaging platforms are supported?',
        answer:
          'Currently, Moryflow supports Telegram as the messaging channel for agent interaction. Support for additional platforms is planned for future releases.',
      },
      {
        question: 'Is my data sent to Telegram?',
        answer:
          "Your notes stay on your device. When the agent responds to Telegram messages, it sends the response text through Telegram's messaging infrastructure, but your underlying knowledge base is not uploaded or stored on Telegram's servers.",
      },
    ],
    ctaTitle: 'Connect your agent to Telegram',
    ctaDescription:
      'Download Moryflow and interact with your AI agent from anywhere via Telegram. Free to start · Open Source.',
    relatedPages: [
      { label: 'Agent Workspace', href: '/agent-workspace' },
      { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
    ],
  },
  zh: {
    title: 'Telegram AI 智能体',
    description:
      '将你的 AI 智能体连接到 Telegram。Moryflow 让你通过聊天与智能体互动，同时知识保留在本地。',
    headline: '你的 AI 智能体，通过 Telegram 随时访问',
    subheadline:
      '通过 Telegram 与你的 Moryflow 智能体互动。提问、执行任务、捕获知识——全部在你已经使用的聊天应用中完成。',
    problemTitle: 'AI 智能体与日常沟通之间的鸿沟',
    problemPoints: [
      {
        title: 'AI 工具分散在不同的应用中',
        description:
          '使用 AI 时，你要打开专门的应用、切换上下文、输入提示词，然后把结果复制回你正在工作的地方。这种摩擦在一天中不断累积。',
      },
      {
        title: '基于聊天的 AI 没有持久记忆',
        description:
          'Telegram 机器人和 AI 聊天工具每次对话都从零开始。它们不知道你昨天做了什么、记了什么笔记，也不知道哪些上下文对你重要。',
      },
      {
        title: '快速问题值得基于你知识的快速回答',
        description:
          '有时你在外出时需要快速查找、摘要或草稿。没有知识库的支持，AI 只能给出通用回答，而不是个性化的结果。',
      },
      {
        title: '移动端 AI 工具无法获取桌面知识',
        description:
          '你的知识库在桌面上。当你不在电脑旁时，移动端 AI 工具无法访问你的笔记、调研和积累的上下文。',
      },
    ],
    whyTitle: 'Telegram 作为通往你知识的窗口',
    whyPoints: [
      {
        title: '在 Telegram 上与你的智能体对话',
        description:
          '通过 Telegram 向你的 Moryflow 智能体发送消息。提问、请求摘要或执行任务——智能体基于你的知识给出回答。',
      },
      {
        title: '基于你的本地知识',
        description:
          '你的 Telegram 智能体利用 Moryflow 工作空间中的笔记和知识。回答反映你积累的上下文，而不只是通用的 AI 输出。',
      },
      {
        title: '知识留在本地',
        description:
          '你的笔记仍在你的设备上。Telegram 集成使智能体交互成为可能，而无需将知识库迁移到云端。',
      },
    ],
    workflowSteps: [
      {
        step: '连接',
        title: '将 Telegram 关联到你的工作空间',
        description: '在 Moryflow 中设置 Telegram 集成。你的智能体会变成一个 Telegram 联系人。',
      },
      {
        step: '提问',
        title: '从任何地方发送消息',
        description: '在任何设备上通过 Telegram 给你的智能体发消息。提问、请求信息或启动任务。',
      },
      {
        step: '回答',
        title: '获取基于知识的回答',
        description:
          '你的智能体以你的笔记和知识作为上下文进行回答。答案与你的具体工作和积累的知识相关。',
      },
      {
        step: '捕获',
        title: '结果回流到你的工作空间',
        description:
          'Telegram 对话中的智能体输出会被捕获到你的 Moryflow 工作空间中，作为笔记存储——与你的其他知识一起，可访问且有组织。',
      },
    ],
    faqs: [
      {
        question: 'Telegram AI 智能体是如何工作的？',
        answer:
          'Moryflow 通过机器人集成连接到 Telegram。当你在 Telegram 上向你的智能体发送消息时，它会使用你的本地知识库作为上下文处理请求，并直接在聊天中回复。目前 Telegram 是支持的消息通道，更多通道已在计划中。',
      },
      {
        question: 'Telegram 智能体能访问我所有的笔记吗？',
        answer:
          '智能体可以引用你 Moryflow 工作空间中的笔记来提供上下文感知的回答。你可以控制知识库的哪些部分对智能体可用。你的笔记本身仍然存储在你的本地设备上。',
      },
      {
        question: '在手机上也能用吗？',
        answer:
          '可以。由于交互通过 Telegram 进行，你可以从安装了 Telegram 的任何设备——手机、平板或另一台电脑——给你的智能体发消息。你的 Moryflow 桌面应用需要保持运行以处理请求。',
      },
      {
        question: '支持哪些消息平台？',
        answer:
          '目前，Moryflow 支持 Telegram 作为智能体交互的消息通道。对更多平台的支持已在计划中。',
      },
      {
        question: '我的数据会发送到 Telegram 吗？',
        answer:
          '你的笔记留在你的设备上。当智能体回复 Telegram 消息时，它通过 Telegram 的消息基础设施发送回复文本，但你的底层知识库不会被上传或存储在 Telegram 的服务器上。',
      },
    ],
    ctaTitle: '将你的智能体连接到 Telegram',
    ctaDescription: '下载 Moryflow，通过 Telegram 随时随地与你的 AI 智能体互动。免费开始 · 开源。',
    relatedPages: [
      { label: 'AI 智能体工作空间', href: '/agent-workspace' },
      { label: '本地优先 AI 智能体', href: '/local-first-ai-agent' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
    ],
  },
};

const whyIcons = [MessageCircle, Brain, Shield];

export const Route = createFileRoute('/{-$locale}/telegram-ai-agent')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'telegram-ai-agent',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: TelegramAiAgentPage,
});

function TelegramAiAgentPage() {
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
