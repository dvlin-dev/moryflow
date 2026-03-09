import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { ComparePage } from '@/components/seo-pages/ComparePage';

export const Route = createFileRoute('/{-$locale}/compare/obsidian')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare-obsidian',
      locale: params.locale,
      title: 'Moryflow vs Obsidian',
      description:
        'How Moryflow and Obsidian compare: both local-first, different approaches to AI and publishing.',
    }),
  component: CompareObsidianPage,
});

function CompareObsidianPage() {
  return (
    <ComparePage
      competitor="Obsidian"
      headline="Moryflow vs Obsidian"
      subheadline="Both are local-first and file-based. They differ in how they approach AI integration, publishing, and the role of agents in knowledge work."
      dimensions={[
        {
          label: 'Architecture',
          moryflow: 'Local-first desktop app',
          competitor: 'Local-first desktop app',
        },
        {
          label: 'AI approach',
          moryflow: 'Native agent workflows',
          competitor: 'Community plugins (Copilot, Smart Connections, etc.)',
        },
        {
          label: 'Data format',
          moryflow: 'Local files',
          competitor: 'Markdown files in a vault',
        },
        {
          label: 'Publishing',
          moryflow: 'Built-in notes to website',
          competitor: 'Obsidian Publish (paid add-on)',
        },
        {
          label: 'Extensibility',
          moryflow: 'Focused feature set',
          competitor: 'Large plugin ecosystem (1000+ plugins)',
        },
        {
          label: 'Pricing',
          moryflow: 'Free during beta',
          competitor: 'Free for personal use, paid Sync & Publish',
        },
      ]}
      moryflowFit={{
        title: 'Moryflow may be a better fit if you…',
        points: [
          'Want AI agents as native workspace members, not bolt-on plugins',
          'Need built-in publishing without a separate paid add-on',
          'Prefer agent workflows that produce structured knowledge outputs',
          'Want a focused tool that works well out of the box without plugin configuration',
          'Care about AI agents that grow smarter with your accumulated knowledge',
        ],
      }}
      competitorFit={{
        title: 'Obsidian may be a better fit if you…',
        points: [
          'Want a mature, battle-tested note-taking tool with a proven track record',
          'Need extensive customization through a large plugin ecosystem',
          'Prefer pure Markdown files with full filesystem control',
          'Want a mobile app alongside the desktop experience',
          'Value community-built extensions for niche workflows',
        ],
      }}
      differences={[
        {
          area: 'AI integration depth',
          description:
            'Obsidian offers AI through community plugins like Copilot and Smart Connections, which add chat interfaces and semantic search. Moryflow builds AI agents into the core experience — agents read your notes as context, execute multi-step tasks, and save results as structured notes in your workspace.',
        },
        {
          area: 'Publishing model',
          description:
            'Obsidian Publish is a paid service ($8/mo) that shares your vault as a website. Moryflow includes publishing as a core feature — select notes and publish them as a digital garden or knowledge site, included in the app at no extra cost during beta.',
        },
        {
          area: 'Philosophy: plugins vs integrated features',
          description:
            "Obsidian's strength is extensibility — the plugin ecosystem lets you build almost any workflow. Moryflow takes the opposite approach: a focused feature set where AI agents, notes, and publishing are deeply integrated and work together without configuration.",
        },
        {
          area: 'Knowledge growth model',
          description:
            'Both tools support linked notes and knowledge graphs. Moryflow adds an active layer: AI agents that help you process raw captures, connect ideas, expand stubs, and grow your knowledge base over time — not just store it.',
        },
      ]}
      faqs={[
        {
          question: 'Can I use my Obsidian vault with Moryflow?',
          answer:
            "Moryflow works with local files. You can bring your existing notes into Moryflow and use them as context for AI agents. The transition doesn't require abandoning your existing knowledge.",
        },
        {
          question: 'Does Moryflow support plugins like Obsidian?',
          answer:
            "Moryflow focuses on an integrated experience rather than a plugin ecosystem. AI agents, notes, and publishing are built into the core product. This means less configuration but also less customization compared to Obsidian's plugin model.",
        },
        {
          question: 'Is Moryflow open source like Obsidian?',
          answer:
            "Obsidian is not open source — it's a proprietary app with an open plugin API. Moryflow is also a proprietary desktop app, currently free during beta.",
        },
        {
          question: 'Which has better graph/linking features?',
          answer:
            'Obsidian has a mature graph view and extensive backlink support refined over years. Moryflow supports note linking and connections, with AI agents that actively help you discover and build connections between ideas.',
        },
      ]}
      relatedPages={[
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
        { label: 'Digital Garden App', href: '/digital-garden-app' },
        { label: 'Second Brain App', href: '/second-brain-app' },
        { label: 'Download', href: '/download' },
      ]}
    />
  );
}
