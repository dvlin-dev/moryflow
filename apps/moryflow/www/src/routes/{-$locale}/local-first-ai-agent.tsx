import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { HardDrive, Bot, Lock } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/local-first-ai-agent')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'local-first-ai-agent',
      locale: params.locale,
      title: 'Local-first AI Agent',
      description:
        'A local-first approach to AI agents. Your data, your device, your knowledge — agents that work without cloud dependency.',
    }),
  component: LocalFirstAiAgentPage,
});

function LocalFirstAiAgentPage() {
  return (
    <SeoLandingPage
      headline="AI agents that put your data first"
      subheadline="Run AI agents on your desktop with local-first architecture. Your knowledge stays on your device — agents work with your data without cloud storage dependencies."
      problemTitle="The trust problem with cloud-based AI agents"
      problemPoints={[
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
            'If a cloud AI agent service changes pricing, terms, or shuts down, you lose access to your agent workflows, accumulated context, and possibly your data.',
        },
      ]}
      whyTitle="Local-first: a different approach to AI agents"
      whyPoints={[
        {
          icon: HardDrive,
          title: 'Your data stays on your device',
          description:
            'Notes, files, and agent outputs are stored locally. No cloud storage required. Your knowledge base lives on hardware you own.',
        },
        {
          icon: Bot,
          title: 'Agents work with local context',
          description:
            'AI agents read your local files and notes as context. They produce outputs that save directly to your local workspace — no round-trip through cloud storage.',
        },
        {
          icon: Lock,
          title: 'You control the boundaries',
          description:
            'AI features connect to language model APIs when needed, but your underlying knowledge stays local. Publishing is explicit and opt-in.',
        },
      ]}
      workflowSteps={[
        {
          step: 'Install',
          title: 'Desktop app, local storage',
          description:
            'Download Moryflow for macOS or Windows. Your workspace lives on your device from the start — no account creation required to begin.',
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
      ]}
      faqs={[
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
            "Moryflow currently ships public desktop builds for macOS. Windows is coming soon. It's free during beta with all features included.",
        },
      ]}
      ctaTitle="Try local-first AI agents"
      ctaDescription="Download Moryflow and run AI agents that respect your data. Free during beta."
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
        { label: 'Telegram AI Agent', href: '/telegram-ai-agent' },
        { label: 'Moryflow vs Manus', href: '/compare/manus' },
        { label: 'Moryflow vs OpenClaw', href: '/compare/openclaw' },
      ]}
    />
  );
}
