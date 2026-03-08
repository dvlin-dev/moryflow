import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Bot, NotebookPen, Search } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/ai-note-taking-app')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'ai-note-taking-app',
      locale: params.locale,
      title: 'AI Note-Taking App',
      description:
        'Moryflow combines AI agents with local-first note-taking. Your notes become the context for intelligent workflows.',
    }),
  component: AiNoteTakingPage,
});

function AiNoteTakingPage() {
  return (
    <SeoLandingPage
      headline="Note-taking powered by AI agents"
      subheadline="Your notes aren't just text files — they're context for AI agents that research, draft, and organize alongside you. All stored locally on your device."
      problemTitle="What's missing from note-taking apps"
      problemPoints={[
        {
          title: 'Notes sit unused after you write them',
          description:
            'You capture information, then rarely revisit or build on it. Without a way to actively use your notes, they become a graveyard of forgotten ideas.',
        },
        {
          title: "AI chat doesn't know your context",
          description:
            "When you switch to an AI tool for help, you start from zero. The AI has no access to the research, notes, or thinking you've already done.",
        },
        {
          title: 'Scattered tools, scattered knowledge',
          description:
            "Note-taking in one app, AI in another, publishing somewhere else. Your workflow is fragmented across tools that don't talk to each other.",
        },
        {
          title: "Cloud-first means your notes aren't really yours",
          description:
            'Most note-taking apps store your data on their servers. If the service shuts down or changes terms, your notes are at risk.',
        },
      ]}
      whyTitle="How Moryflow reimagines note-taking"
      whyPoints={[
        {
          icon: Bot,
          title: 'AI agents use your notes as context',
          description:
            'Agents read your existing notes when you give them tasks. Your accumulated knowledge makes every agent interaction more useful.',
        },
        {
          icon: NotebookPen,
          title: 'Agent outputs become notes',
          description:
            'Research, summaries, and drafts produced by agents are saved as structured notes — not lost in chat history.',
        },
        {
          icon: Search,
          title: 'Connected knowledge graph',
          description:
            'Notes link to each other naturally. As your knowledge base grows, connections emerge and agents get smarter context.',
        },
      ]}
      workflowSteps={[
        {
          step: 'Capture',
          title: 'Write and collect notes',
          description:
            'Capture your thoughts, research, and ideas in a local-first editor. Your notes stay on your device.',
        },
        {
          step: 'Connect',
          title: 'Let agents work with your notes',
          description:
            "Give agents tasks and they'll use your notes as context — summarizing, drafting, researching, and organizing.",
        },
        {
          step: 'Grow',
          title: 'Build knowledge over time',
          description:
            'Agent outputs become new notes that connect to existing ones. Your knowledge base compounds.',
        },
        {
          step: 'Share',
          title: 'Publish selected notes',
          description:
            'Turn any note into a published page. Share your thinking as a digital garden, portfolio, or knowledge base.',
        },
      ]}
      faqs={[
        {
          question: 'How does AI work with my notes?',
          answer:
            'When you run an agent task, Moryflow gives the AI access to relevant notes from your workspace as context. This means agents can reference your existing research, follow up on previous work, and produce outputs that fit naturally into your knowledge base.',
        },
        {
          question: 'What makes this different from Notion AI or Obsidian plugins?',
          answer:
            'Notion AI operates on cloud-stored data and focuses on inline text completion. Obsidian AI plugins add chat interfaces to a file-based system. Moryflow treats AI agents as first-class workspace members that read your notes, produce structured outputs, and grow your knowledge base — all while keeping data local on your device.',
        },
        {
          question: 'Are my notes stored in the cloud?',
          answer:
            'No. Moryflow is local-first — your notes are stored on your device. You control your data completely. Publishing is opt-in and only shares the specific notes you choose.',
        },
        {
          question: 'Can I import notes from other apps?',
          answer:
            'Moryflow works with standard file formats. You can bring in your existing notes and start using them as context for AI agents right away.',
        },
        {
          question: 'Is Moryflow free?',
          answer:
            'Moryflow is free during beta with all features included. Download the desktop app for macOS or Windows.',
        },
      ]}
      ctaTitle="Upgrade your note-taking"
      ctaDescription="Download Moryflow and give your notes the power of AI agents. Free during beta."
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Second Brain App', href: '/second-brain-app' },
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
        { label: 'Moryflow vs Obsidian', href: '/compare/obsidian' },
      ]}
    />
  );
}
