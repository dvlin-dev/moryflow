import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { ComparePage } from '@/components/seo-pages/ComparePage';

export const Route = createFileRoute('/{-$locale}/compare/notion')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare-notion',
      locale: params.locale,
      title: 'Moryflow vs Notion',
      description:
        'How Moryflow and Notion compare: different approaches to notes, AI, and knowledge management.',
    }),
  component: CompareNotionPage,
});

function CompareNotionPage() {
  return (
    <ComparePage
      competitor="Notion"
      headline="Moryflow vs Notion"
      subheadline="Both help you organize knowledge. They take different approaches to AI, data ownership, and how your notes become useful over time."
      dimensions={[
        {
          label: 'Architecture',
          moryflow: 'Local-first desktop app',
          competitor: 'Cloud-native web app',
        },
        {
          label: 'AI approach',
          moryflow: 'Agent workflows with knowledge context',
          competitor: 'Inline AI assist and Q&A',
        },
        {
          label: 'Data storage',
          moryflow: 'On your device',
          competitor: 'Notion cloud servers',
        },
        {
          label: 'Publishing',
          moryflow: 'Built-in notes to website',
          competitor: 'Notion Sites / public pages',
        },
        {
          label: 'Collaboration',
          moryflow: 'Individual-focused',
          competitor: 'Team-first with real-time editing',
        },
        {
          label: 'Pricing',
          moryflow: 'Free during beta',
          competitor: 'Free tier + paid plans',
        },
      ]}
      moryflowFit={{
        title: 'Moryflow may be a better fit if you…',
        points: [
          'Want your notes and knowledge stored locally on your device',
          'Need AI agents that work with your accumulated context, not just inline completions',
          'Prefer a desktop-native experience over browser-based tools',
          'Want to publish notes as a website without a separate tool',
          'Value data ownership and portability over team collaboration features',
        ],
      }}
      competitorFit={{
        title: 'Notion may be a better fit if you…',
        points: [
          'Need real-time team collaboration with shared workspaces',
          'Want a comprehensive project management tool with databases and views',
          'Prefer a browser-based app accessible from any device',
          'Need integrations with a large ecosystem of third-party tools',
          'Work in a team that already uses Notion as its knowledge hub',
        ],
      }}
      differences={[
        {
          area: 'AI integration philosophy',
          description:
            'Notion AI focuses on inline text completion and Q&A across your workspace pages. Moryflow treats AI agents as workspace members that read your notes, execute multi-step tasks, and produce structured outputs that become part of your knowledge base.',
        },
        {
          area: 'Data ownership',
          description:
            "Notion stores all data on its cloud servers. You can export your data, but your daily workflow depends on Notion's infrastructure. Moryflow stores everything locally on your device — your notes are files on your machine that you fully control.",
        },
        {
          area: 'Individual vs team',
          description:
            'Notion is built team-first with permissions, shared workspaces, and real-time co-editing. Moryflow is designed for individual knowledge workers who want a personal workspace where AI agents help them research, write, and organize.',
        },
        {
          area: 'Publishing approach',
          description:
            'Notion lets you publish pages publicly and recently launched Notion Sites. Moryflow includes built-in publishing that turns your notes into a navigable website — digital garden, knowledge base, or portfolio — directly from the desktop app.',
        },
      ]}
      faqs={[
        {
          question: 'Can I import my Notion pages into Moryflow?',
          answer:
            'Moryflow works with standard file formats. You can export your Notion workspace and import the content into Moryflow to use as context for AI agents.',
        },
        {
          question: 'Does Moryflow have databases like Notion?',
          answer:
            'Moryflow focuses on notes, knowledge, and AI agent workflows rather than structured databases. If you primarily use Notion for project management with tables and kanban boards, Moryflow serves a different use case.',
        },
        {
          question: 'Can I use both Notion and Moryflow?',
          answer:
            'Yes. Some users keep Notion for team collaboration and use Moryflow as their personal knowledge workspace with AI agents. The tools serve different needs and can complement each other.',
        },
        {
          question: 'Is Moryflow available on mobile like Notion?',
          answer:
            'Moryflow is currently a desktop app for macOS and Windows. Notion offers web, desktop, and mobile apps. If mobile access is critical for your workflow, Notion provides broader device coverage.',
        },
      ]}
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Features', href: '/features' },
        { label: 'Download', href: '/download' },
      ]}
    />
  );
}
