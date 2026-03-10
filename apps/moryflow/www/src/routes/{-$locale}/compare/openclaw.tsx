import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { ComparePage } from '@/components/seo-pages/ComparePage';

export const Route = createFileRoute('/{-$locale}/compare/openclaw')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare-openclaw',
      locale: params.locale,
      title: 'Moryflow vs OpenClaw — Open Source AI Agent Workspace Alternative',
      description:
        'How Moryflow and OpenClaw compare: desktop-first knowledge workspace vs self-hosted multi-channel agent gateway.',
    }),
  component: CompareOpenClawPage,
});

function CompareOpenClawPage() {
  return (
    <ComparePage
      competitor="OpenClaw"
      headline="Moryflow vs OpenClaw: Different approaches to personal AI agents"
      subheadline="Both put AI agents in your hands. OpenClaw gives you a self-hosted multi-channel gateway. Moryflow gives you a desktop knowledge workspace. Different architectures for different goals."
      dimensions={[
        {
          label: 'Architecture',
          moryflow: 'Local-first desktop app',
          competitor: 'Self-hosted agent gateway (Docker/cloud)',
        },
        {
          label: 'Channels',
          moryflow: 'Desktop + Telegram',
          competitor: 'Multi-channel (Telegram, Discord, Slack, WeChat, etc.)',
        },
        {
          label: 'Setup',
          moryflow: 'Download and run',
          competitor: 'Docker deployment + configuration',
        },
        {
          label: 'Focus',
          moryflow: 'Knowledge work + notes + publishing',
          competitor: 'Multi-channel agent routing + conversational AI',
        },
        {
          label: 'Data model',
          moryflow: 'Local notes and knowledge base',
          competitor: 'Conversation-based with plugin integrations',
        },
        {
          label: 'Open source',
          moryflow: 'Open source · Free tier + paid plans',
          competitor: 'Open source (self-hosted)',
        },
      ]}
      moryflowFit={{
        title: 'Moryflow may be a better fit if you…',
        points: [
          'Want a desktop app for knowledge work — research, writing, note-taking',
          'Need AI agent outputs to become organized, persistent notes',
          'Prefer downloading an app over deploying Docker containers',
          'Want built-in publishing to share your knowledge as a website',
          'Focus on personal knowledge management over multi-channel agent deployment',
        ],
      }}
      competitorFit={{
        title: 'OpenClaw may be a better fit if you…',
        points: [
          'Want AI agents accessible across multiple messaging platforms simultaneously',
          'Need a self-hosted solution with full infrastructure control',
          'Value open source and the ability to audit and modify the codebase',
          'Want to route different agent capabilities across Discord, Slack, WeChat, and other channels',
          'Have the technical skills to deploy and maintain Docker-based services',
        ],
      }}
      differences={[
        {
          area: 'What they solve',
          description:
            'OpenClaw solves multi-channel agent deployment — making AI accessible across messaging platforms you already use. Moryflow solves knowledge work — giving AI agents a workspace where they work with your notes and produce durable, organized knowledge.',
        },
        {
          area: 'Channel breadth vs knowledge depth',
          description:
            'OpenClaw excels at reaching users across many channels — Telegram, Discord, Slack, WeChat, and more. Moryflow excels at depth within one workspace — agents that understand your accumulated knowledge and produce outputs that connect to your existing notes.',
        },
        {
          area: 'Deployment model',
          description:
            'OpenClaw is self-hosted, typically deployed via Docker, giving you full control over infrastructure. Moryflow is a desktop application you download and run — no server setup, no Docker, no infrastructure management.',
        },
        {
          area: 'Open source vs integrated product',
          description:
            'Both projects are open source. OpenClaw emphasizes self-hosted deployment with full infrastructure control. Moryflow is an open-source desktop app focused on a polished, cohesive experience for knowledge workers.',
        },
      ]}
      faqs={[
        {
          question: 'What is OpenClaw?',
          answer:
            'OpenClaw is an open source, self-hosted AI agent gateway that lets you deploy AI agents across multiple messaging channels — Telegram, Discord, Slack, WeChat, and others. It focuses on multi-channel routing and conversational AI with plugin-based extensibility.',
        },
        {
          question: 'Can I use OpenClaw and Moryflow together?',
          answer:
            'They serve different purposes and can complement each other. You might use OpenClaw for multi-channel agent access across your messaging platforms, and Moryflow for personal knowledge work where you need agents to work with your notes and produce organized knowledge.',
        },
        {
          question: 'Does Moryflow support as many channels as OpenClaw?',
          answer:
            'No. Moryflow currently supports desktop and Telegram. OpenClaw supports a wider range of messaging platforms. If multi-channel agent access is your primary need, OpenClaw covers more ground.',
        },
        {
          question: 'Is OpenClaw harder to set up?',
          answer:
            'OpenClaw requires Docker deployment and configuration, which assumes some technical infrastructure knowledge. Moryflow is a desktop app you download and run. The setup complexity reflects their different architectures — server-based gateway vs desktop application.',
        },
      ]}
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
        { label: 'Download', href: '/download' },
      ]}
    />
  );
}
