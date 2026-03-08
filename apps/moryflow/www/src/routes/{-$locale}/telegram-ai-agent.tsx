import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { MessageCircle, Brain, Shield } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/telegram-ai-agent')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'telegram-ai-agent',
      locale: params.locale,
      title: 'Telegram AI Agent',
      description:
        'Connect your AI agent to Telegram. Moryflow lets you interact with agents via chat while keeping knowledge local.',
    }),
  component: TelegramAiAgentPage,
});

function TelegramAiAgentPage() {
  return (
    <SeoLandingPage
      headline="Your AI agent, accessible from Telegram"
      subheadline="Interact with your Moryflow agent through Telegram. Ask questions, run tasks, and capture knowledge — all from the chat app you already use."
      problemTitle="The gap between AI agents and daily communication"
      problemPoints={[
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
      ]}
      whyTitle="Telegram as a window into your knowledge"
      whyPoints={[
        {
          icon: MessageCircle,
          title: 'Chat with your agent on Telegram',
          description:
            'Send messages to your Moryflow agent through Telegram. Ask questions, request summaries, or run tasks — the agent responds with knowledge-grounded answers.',
        },
        {
          icon: Brain,
          title: 'Grounded in your local knowledge',
          description:
            'Your Telegram agent draws on the notes and knowledge in your Moryflow workspace. Responses reflect your accumulated context, not just generic AI output.',
        },
        {
          icon: Shield,
          title: 'Knowledge stays local',
          description:
            'Your notes remain on your device. The Telegram integration enables agent interaction without moving your knowledge base to the cloud.',
        },
      ]}
      workflowSteps={[
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
      ]}
      faqs={[
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
      ]}
      ctaTitle="Connect your agent to Telegram"
      ctaDescription="Download Moryflow and interact with your AI agent from anywhere via Telegram. Free during beta."
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
        { label: 'Features', href: '/features' },
      ]}
    />
  );
}
