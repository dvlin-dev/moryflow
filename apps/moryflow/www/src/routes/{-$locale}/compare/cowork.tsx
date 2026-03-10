import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { ComparePage } from '@/components/seo-pages/ComparePage';

export const Route = createFileRoute('/{-$locale}/compare/cowork')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare-cowork',
      locale: params.locale,
      title: 'Moryflow vs Cowork — Open Source AI Agent Workspace Alternative',
      description:
        'How Moryflow and Cowork compare: different approaches to AI-assisted work and knowledge ownership.',
    }),
  component: CompareCoworkPage,
});

function CompareCoworkPage() {
  return (
    <ComparePage
      competitor="Cowork"
      headline="Moryflow vs Cowork"
      subheadline="Both bring AI into your workflow. Cowork integrates Claude into collaborative work, while Moryflow builds a local-first workspace around AI agents and personal knowledge."
      dimensions={[
        {
          label: 'Architecture',
          moryflow: 'Local-first desktop app',
          competitor: 'Cloud-based collaborative AI workspace',
        },
        {
          label: 'AI model',
          moryflow: 'Multi-provider (OpenAI, Anthropic, etc.)',
          competitor: 'Claude (Anthropic)',
        },
        {
          label: 'Data storage',
          moryflow: 'On your device',
          competitor: 'Anthropic cloud',
        },
        {
          label: 'Focus',
          moryflow: 'Personal knowledge work + agents',
          competitor: 'Team AI collaboration',
        },
        {
          label: 'Knowledge persistence',
          moryflow: 'Local notes and knowledge base',
          competitor: 'Project-scoped artifacts and conversations',
        },
        {
          label: 'Pricing',
          moryflow: 'Free tier + paid plans · Open source',
          competitor: 'Included with Claude subscription plans',
        },
      ]}
      moryflowFit={{
        title: 'Moryflow may be a better fit if you…',
        points: [
          'Want your data stored locally rather than in cloud infrastructure',
          'Need a personal knowledge workspace rather than a team collaboration tool',
          'Want to use multiple AI providers, not just one',
          'Value long-term knowledge accumulation over project-scoped work',
          'Want built-in publishing to turn notes into a website',
        ],
      }}
      competitorFit={{
        title: 'Cowork may be a better fit if you…',
        points: [
          'Want Claude deeply integrated into collaborative workflows',
          'Need shared AI workspaces for team projects',
          "Prefer Anthropic's approach to AI safety and capabilities",
          'Work primarily within the Anthropic/Claude ecosystem',
          'Need project-based AI assistance with rich artifact support',
        ],
      }}
      differences={[
        {
          area: 'Personal vs collaborative',
          description:
            'Cowork is designed around team collaboration with shared AI workspaces. Moryflow is designed for individual knowledge workers who want a personal workspace where AI agents help them build and maintain their own knowledge base.',
        },
        {
          area: 'Data philosophy',
          description:
            "Cowork operates within Anthropic's cloud infrastructure. Moryflow stores your data locally on your device. This reflects different philosophies — integrated cloud experience vs local-first data ownership.",
        },
        {
          area: 'AI model flexibility',
          description:
            'Cowork provides deep integration with Claude. Moryflow connects to multiple AI providers, letting you choose the model that works best for each task. Different approaches to the build-vs-buy spectrum.',
        },
        {
          area: 'Knowledge model',
          description:
            'Cowork organizes work around projects with conversations and artifacts. Moryflow organizes work around a persistent knowledge base — notes that accumulate over time, connect to each other, and serve as context for future agent tasks.',
        },
      ]}
      faqs={[
        {
          question: 'What is Cowork?',
          answer:
            'Cowork is a collaborative AI workspace from Anthropic that integrates Claude into team workflows. It provides shared workspaces where teams can work with Claude on projects, creating artifacts and managing AI-assisted work together.',
        },
        {
          question: 'Can I use Claude with Moryflow?',
          answer:
            "Yes. Moryflow supports multiple AI providers including Anthropic's Claude. You can use Claude as your preferred model within Moryflow's autonomous agent system.",
        },
        {
          question: 'Which is better for individual use?',
          answer:
            'Moryflow is designed specifically for individual knowledge workers — personal knowledge base, local data storage, AI agents that work with your accumulated context. Cowork is primarily designed for team collaboration, though it can be used individually.',
        },
        {
          question: 'Can I use both?',
          answer:
            'Yes. You might use Cowork for team projects where Claude collaboration is needed, and Moryflow as your personal knowledge workspace where you build long-term understanding with local data ownership.',
        },
      ]}
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
        { label: 'Moryflow vs Manus', href: '/compare/manus' },
        { label: 'Download', href: '/download' },
      ]}
    />
  );
}
