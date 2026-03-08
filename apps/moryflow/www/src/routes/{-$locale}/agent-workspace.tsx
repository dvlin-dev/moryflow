import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Bot, Brain, Shield } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/agent-workspace')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'agent-workspace',
      locale: params.locale,
      title: 'AI Agent Workspace',
      description:
        'Moryflow is a local-first AI agent workspace. Agents work with your knowledge to research, draft, organize, and publish.',
    }),
  component: AgentWorkspacePage,
});

function AgentWorkspacePage() {
  return (
    <SeoLandingPage
      headline="An AI agent workspace built for knowledge work"
      subheadline="Run AI agents that work with your notes, files, and accumulated context — not just a blank prompt. Results stay as durable knowledge you own."
      problemTitle="Why most AI agent tools fall short"
      problemPoints={[
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
            'When your agent workflows depend entirely on cloud services, you lose control over your data, your prompts, and your intellectual property.',
        },
        {
          title: 'Isolated tools, fragmented workflows',
          description:
            'Switching between AI chat, note-taking, file management, and publishing tools creates friction and breaks your flow.',
        },
      ]}
      whyTitle="Why Moryflow works differently"
      whyPoints={[
        {
          icon: Bot,
          title: 'Agent-native workspace',
          description:
            'AI agents are first-class citizens. They read your notes, access your files, and produce outputs that integrate directly into your knowledge base.',
        },
        {
          icon: Brain,
          title: 'Knowledge memory',
          description:
            'Every agent interaction can create or update notes. Your knowledge grows over time, giving agents richer context with each use.',
        },
        {
          icon: Shield,
          title: 'Local-first architecture',
          description:
            'Your data stays on your device. Agents work with local files and context without requiring cloud storage or third-party access.',
        },
      ]}
      workflowSteps={[
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
      ]}
      faqs={[
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
            'Moryflow is free during beta with all features included — AI agent workflows, local-first notes, knowledge memory, and publishing. Download the desktop app for macOS or Windows.',
        },
        {
          question: 'Does Moryflow require an internet connection?',
          answer:
            'Your notes and files are stored locally and accessible offline. AI agent features require an internet connection to communicate with language model providers, but your data never leaves your device without your explicit action.',
        },
      ]}
      ctaTitle="Try the agent workspace"
      ctaDescription="Download Moryflow and let AI agents work with your knowledge. Free during beta."
      relatedPages={[
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
        { label: 'Features', href: '/features' },
        { label: 'Moryflow vs Notion', href: '/compare/notion' },
      ]}
    />
  );
}
