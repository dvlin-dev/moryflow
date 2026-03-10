import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Shield, HardDrive, Bot } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/local-first-ai-notes')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'local-first-ai-notes',
      locale: params.locale,
      title: 'Local-first AI Notes',
      description:
        'Notes that stay on your device with AI that works alongside you. No cloud dependency, full ownership.',
    }),
  component: LocalFirstAiNotesPage,
});

function LocalFirstAiNotesPage() {
  return (
    <SeoLandingPage
      headline="Local-first notes with AI that respects your privacy"
      subheadline="Your notes stay on your device. AI agents work with your knowledge locally — no cloud storage, no data lock-in, full ownership."
      problemTitle="The cloud dependency problem"
      problemPoints={[
        {
          title: "Your notes live on someone else's server",
          description:
            "Cloud-first note apps store your data remotely. If the service goes down, changes pricing, or gets acquired, your notes are at the mercy of a company's business decisions.",
        },
        {
          title: 'AI features require sending your data to the cloud',
          description:
            "Most AI-enhanced note apps process your notes on remote servers. Your private thoughts, research, and intellectual property travel through infrastructure you don't control.",
        },
        {
          title: 'Offline means limited functionality',
          description:
            "Cloud-dependent apps degrade when you're offline. On a plane, in a cafe with bad WiFi, or just disconnected — your note-taking experience suffers.",
        },
        {
          title: "Export doesn't mean ownership",
          description:
            "Being able to export data isn't the same as owning it. If your daily workflow depends on proprietary cloud features, you're effectively locked in regardless of export options.",
        },
      ]}
      whyTitle="Local-first with AI that works for you"
      whyPoints={[
        {
          icon: HardDrive,
          title: 'Data stays on your device',
          description:
            'Notes are stored locally on your machine. No cloud sync required. You have complete control over where your data lives.',
        },
        {
          icon: Bot,
          title: 'AI agents with local context',
          description:
            'Agents work with your local notes as context. They read your files and knowledge base without uploading your data to storage servers.',
        },
        {
          icon: Shield,
          title: 'Privacy by architecture',
          description:
            "Local-first isn't a feature toggle — it's the architecture. Your notes never leave your device unless you explicitly choose to publish.",
        },
      ]}
      workflowSteps={[
        {
          step: 'Store',
          title: 'Notes live on your device',
          description:
            'Create and organize notes with a local-first editor. No account required, no cloud sync, instant access.',
        },
        {
          step: 'Enhance',
          title: 'AI agents work locally',
          description:
            'Run agents that reference your local notes. AI features use your knowledge as context while respecting your data boundaries.',
        },
        {
          step: 'Build',
          title: 'Grow your knowledge base',
          description:
            'Agent outputs become local notes that link to your existing knowledge. Your personal knowledge base compounds over time.',
        },
        {
          step: 'Publish',
          title: 'Share on your terms',
          description:
            'Optionally publish selected notes to the web. You choose what to share — everything else stays private and local.',
        },
      ]}
      faqs={[
        {
          question: 'What does "local-first" mean?',
          answer:
            'Local-first means your data is stored on your own device as the primary copy, not on a remote server. The app works fully offline, and you maintain complete ownership and control over your files. Cloud features like publishing are optional and explicit.',
        },
        {
          question: 'How does AI work if notes are local?',
          answer:
            'AI agent features connect to language model APIs (like OpenAI or Anthropic) to process tasks, but your notes themselves are read locally. The agent reads your files on your device, constructs prompts locally, and saves results back to your local storage.',
        },
        {
          question: 'Can I sync notes across devices?',
          answer:
            'Moryflow currently focuses on the desktop experience with local storage. You can use your own sync solution (like Dropbox or iCloud Drive) to keep files accessible across devices.',
        },
        {
          question: 'How is this different from Obsidian?',
          answer:
            "Both Moryflow and Obsidian are local-first. The key difference is Moryflow's native AI agent integration — agents are first-class workspace members that read your notes, execute tasks, and produce structured outputs. Moryflow also includes built-in publishing to turn notes into websites.",
        },
        {
          question: 'Is Moryflow free?',
          answer:
            'Moryflow is free to start with all features included. Download the desktop app for macOS.',
        },
      ]}
      ctaTitle="Own your notes, powered by AI"
      ctaDescription="Download Moryflow and keep your knowledge local while leveraging AI agents. Free to start · Open Source."
      relatedPages={[
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Local-first AI Agent', href: '/local-first-ai-agent' },
        { label: 'Moryflow vs Obsidian', href: '/compare/obsidian' },
      ]}
    />
  );
}
