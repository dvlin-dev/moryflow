import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Brain, Bot, Network } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/second-brain-app')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'second-brain-app',
      locale: params.locale,
      title: 'Second Brain App',
      description:
        'Build a second brain with AI agents. Moryflow captures, organizes, and grows your knowledge over time.',
    }),
  component: SecondBrainPage,
});

function SecondBrainPage() {
  return (
    <SeoLandingPage
      headline="Your second brain, powered by AI agents"
      subheadline="Build a personal knowledge base that grows smarter over time. AI agents help you capture, organize, and surface knowledge when you need it."
      problemTitle="Why building a second brain is harder than it should be"
      problemPoints={[
        {
          title: 'Capture is easy, retrieval is hard',
          description:
            'You save articles, take notes, and clip ideas — but finding what you need months later is nearly impossible. Your second brain collects dust.',
        },
        {
          title: 'Organization requires constant maintenance',
          description:
            "Tagging, filing, and linking notes takes discipline most people can't sustain. Without active curation, your knowledge base becomes a disorganized dump.",
        },
        {
          title: "Knowledge doesn't compound on its own",
          description:
            "Traditional note apps store information passively. Notes don't connect to each other, insights don't surface, and your collected knowledge doesn't become more valuable over time.",
        },
        {
          title: 'AI tools create outputs but not knowledge',
          description:
            'Chat-based AI produces useful responses, but those responses disappear in conversation history. They never become part of your organized knowledge system.',
        },
      ]}
      whyTitle="A second brain with AI that does the work"
      whyPoints={[
        {
          icon: Brain,
          title: 'Knowledge that compounds',
          description:
            'Every note and every agent output connects to your existing knowledge. Your second brain grows more valuable with each interaction.',
        },
        {
          icon: Bot,
          title: 'Agents that organize for you',
          description:
            "AI agents help you process raw captures into structured knowledge — summarizing, linking, and filing notes so you don't have to.",
        },
        {
          icon: Network,
          title: 'Connections emerge naturally',
          description:
            'As your knowledge base grows, agents surface relevant connections between notes you might have missed. Ideas build on each other.',
        },
      ]}
      workflowSteps={[
        {
          step: 'Capture',
          title: 'Collect information from anywhere',
          description:
            'Save notes, ideas, research findings, and agent outputs in one local workspace. Everything goes into your second brain.',
        },
        {
          step: 'Process',
          title: 'Let agents organize your knowledge',
          description:
            'AI agents summarize, tag, and connect your notes. Raw captures become structured knowledge without manual filing.',
        },
        {
          step: 'Retrieve',
          title: 'Find knowledge when you need it',
          description:
            'Search your knowledge base and let agents surface relevant notes based on context, connections, and meaning — not just keywords.',
        },
        {
          step: 'Create',
          title: 'Build on what you know',
          description:
            'Use your accumulated knowledge as context for new work. Agents draft documents, research topics, and create outputs grounded in your existing knowledge.',
        },
      ]}
      faqs={[
        {
          question: 'What is a second brain app?',
          answer:
            'A second brain app is a personal knowledge management tool that helps you capture, organize, and retrieve information. The goal is to externalize your memory — storing knowledge outside your head so you can find and use it reliably. Moryflow adds AI agents that actively help you build and maintain this system.',
        },
        {
          question:
            'How is Moryflow different from Notion or Evernote for building a second brain?',
          answer:
            'Notion and Evernote are cloud-based and rely on manual organization. Moryflow is local-first and uses AI agents to help you process, connect, and build on your knowledge. Agents turn raw captures into structured notes, surface connections, and help you create new work grounded in existing knowledge.',
        },
        {
          question: 'Do I need to follow a specific method like PARA or Zettelkasten?',
          answer:
            'No. Moryflow works with your natural workflow. You can adopt any organizational method you prefer, or let AI agents help you develop a system that works for you. The tool adapts to your approach, not the other way around.',
        },
        {
          question: 'Can AI agents actually help organize my notes?',
          answer:
            'Yes. Agents can summarize long notes, suggest connections between related ideas, help you tag and categorize captures, and draft new notes that synthesize information from across your knowledge base. They work with your existing context to make organization less manual.',
        },
        {
          question: 'Is my data private?',
          answer:
            'Moryflow is local-first — your notes are stored on your device, not on our servers. AI agent features connect to language model APIs to process tasks, but your knowledge base stays local. Publishing is opt-in.',
        },
      ]}
      ctaTitle="Start building your second brain"
      ctaDescription="Download Moryflow and let AI agents help you build a knowledge base that grows smarter over time."
      relatedPages={[
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Digital Garden App', href: '/digital-garden-app' },
        { label: 'Agent Workspace', href: '/agent-workspace' },
        { label: 'Moryflow vs Notion', href: '/compare/notion' },
      ]}
    />
  );
}
