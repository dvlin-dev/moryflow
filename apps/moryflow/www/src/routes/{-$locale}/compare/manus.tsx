import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { ComparePage } from '@/components/seo-pages/ComparePage';

export const Route = createFileRoute('/{-$locale}/compare/manus')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'compare-manus',
      locale: params.locale,
      title: 'Moryflow vs Manus',
      description:
        'How Moryflow and Manus compare: different paths to AI agent workflows and knowledge work.',
    }),
  component: CompareManusPage,
});

function CompareManusPage() {
  return (
    <ComparePage
      competitor="Manus"
      headline="Moryflow vs Manus"
      subheadline="Both use AI agents to help you get work done. They approach the problem differently — autonomous cloud execution vs knowledge-integrated desktop workspace."
      dimensions={[
        {
          label: 'Architecture',
          moryflow: 'Local-first desktop app',
          competitor: 'Cloud-based autonomous agent platform',
        },
        {
          label: 'Agent model',
          moryflow: 'Knowledge-grounded, user-directed',
          competitor: 'Autonomous multi-step execution',
        },
        {
          label: 'Data storage',
          moryflow: 'On your device',
          competitor: 'Cloud infrastructure',
        },
        {
          label: 'Knowledge persistence',
          moryflow: 'Notes and knowledge base',
          competitor: 'Task-scoped outputs',
        },
        {
          label: 'Use case focus',
          moryflow: 'Knowledge work: research, writing, organizing',
          competitor: 'General-purpose task automation',
        },
        {
          label: 'Pricing',
          moryflow: 'Free during beta',
          competitor: 'Usage-based pricing',
        },
      ]}
      moryflowFit={{
        title: 'Moryflow may be a better fit if you…',
        points: [
          'Want agent outputs to become durable knowledge you can build on over time',
          'Prefer your data stored locally on your own device',
          'Focus on knowledge work — research, writing, note-taking, publishing',
          'Want agents grounded in your accumulated context, not starting from scratch',
          'Value a desktop workspace where agents and notes live together',
        ],
      }}
      competitorFit={{
        title: 'Manus may be a better fit if you…',
        points: [
          'Need autonomous agents that execute complex multi-step tasks independently',
          'Want agents that browse the web, run code, and interact with online services',
          'Focus on task completion rather than knowledge accumulation',
          'Prefer a cloud-based platform accessible from any browser',
          'Need agents for general-purpose automation beyond knowledge work',
        ],
      }}
      differences={[
        {
          area: 'Agent philosophy',
          description:
            'Manus emphasizes autonomous execution — agents that independently browse, code, and complete complex tasks. Moryflow emphasizes knowledge-grounded agents — agents that work with your accumulated notes and context to research, draft, and organize, producing outputs that become part of your knowledge base.',
        },
        {
          area: 'Knowledge persistence',
          description:
            'Manus produces task outputs — reports, code, deliverables. Moryflow produces knowledge — notes that connect to your existing knowledge base, grow over time, and serve as context for future agent tasks. The difference is between one-off deliverables and compounding knowledge.',
        },
        {
          area: 'Data model',
          description:
            'Manus runs agents in cloud sandboxes with access to web resources. Moryflow runs agents on your desktop with access to your local files and notes. Different architectures optimized for different workflows.',
        },
        {
          area: 'Scope',
          description:
            'Manus aims to be a general-purpose AI agent platform for diverse tasks. Moryflow is focused specifically on knowledge work — the intersection of AI agents, note-taking, and publishing.',
        },
      ]}
      faqs={[
        {
          question: 'Can Moryflow agents browse the web like Manus?',
          answer:
            "Moryflow agents focus on working with your local knowledge base — notes, files, and accumulated context. They're designed for research, writing, and organizing rather than autonomous web browsing and code execution. The two tools optimize for different workflows.",
        },
        {
          question: 'Which is better for research tasks?',
          answer:
            'It depends on the type of research. Manus excels at autonomous web research — gathering information from multiple online sources. Moryflow excels at knowledge-grounded research — synthesizing information across your existing notes and building on your accumulated understanding.',
        },
        {
          question: 'Can I use both tools?',
          answer:
            'Yes. Some workflows benefit from using Manus for broad information gathering and Moryflow for organizing, connecting, and building on the results within your personal knowledge base.',
        },
        {
          question: 'Is Moryflow planning to add autonomous agent capabilities?',
          answer:
            "Moryflow's focus is on knowledge-integrated agents rather than fully autonomous execution. The roadmap prioritizes deeper knowledge context, better agent-note integration, and more publishing capabilities.",
        },
      ]}
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
        { label: 'Moryflow vs OpenClaw', href: '/compare/openclaw' },
        { label: 'Download', href: '/download' },
      ]}
    />
  );
}
