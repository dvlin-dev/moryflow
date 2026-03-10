import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Sprout, NotebookPen, Share2 } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/digital-garden-app')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'digital-garden-app',
      locale: params.locale,
      title: 'Digital Garden App',
      description:
        'Publish your notes as a digital garden. Moryflow turns your knowledge base into a living website.',
    }),
  component: DigitalGardenPage,
});

function DigitalGardenPage() {
  return (
    <SeoLandingPage
      headline="Turn your notes into a digital garden"
      subheadline="Publish your knowledge base as a living website. Write locally, grow your ideas with AI agents, and share your thinking with the world."
      problemTitle="Publishing your thinking shouldn't be this hard"
      problemPoints={[
        {
          title: 'Blogs demand finished products',
          description:
            'Traditional blogging expects polished articles. Most of your thinking — research notes, drafts, evolving ideas — never gets shared because it doesn\'t feel "ready."',
        },
        {
          title: 'Static site generators need engineering',
          description:
            'Jekyll, Hugo, and similar tools require Git workflows, command-line tools, and template customization. Publishing should be simpler than deploying code.',
        },
        {
          title: 'Note apps and publishing apps are separate',
          description:
            'You write in one tool and publish from another. Copy-pasting between systems creates friction and disconnects your published content from your knowledge base.',
        },
        {
          title: 'Gardens need tending',
          description:
            "A digital garden is most useful when it's maintained — updating links, expanding stubs, connecting new ideas to old ones. Doing this manually is time-consuming.",
        },
      ]}
      whyTitle="Your garden, grown with AI agents"
      whyPoints={[
        {
          icon: Sprout,
          title: 'Publish from your notes',
          description:
            'Select any note and publish it with one click. Your digital garden grows directly from your knowledge base — no separate publishing workflow.',
        },
        {
          icon: NotebookPen,
          title: 'AI agents help you cultivate',
          description:
            'Agents can expand stubs, suggest connections, draft related notes, and help you develop ideas into published pages.',
        },
        {
          icon: Share2,
          title: 'Living, connected pages',
          description:
            'Published notes link to each other naturally. Your digital garden reflects the real connections in your thinking.',
        },
      ]}
      workflowSteps={[
        {
          step: 'Write',
          title: 'Start with your notes',
          description:
            'Write notes in your local workspace. Capture ideas, research, and thinking at any stage of development.',
        },
        {
          step: 'Develop',
          title: 'Grow ideas with AI agents',
          description:
            'Agents help you expand notes, add context, and develop rough ideas into more complete pieces.',
        },
        {
          step: 'Publish',
          title: 'Share with one click',
          description:
            'Choose which notes to publish. They become pages in your digital garden — a living website that grows with your knowledge.',
        },
        {
          step: 'Evolve',
          title: 'Update as you learn',
          description:
            'Edit published notes anytime. Your digital garden is never "done" — it evolves as your understanding deepens.',
        },
      ]}
      faqs={[
        {
          question: 'What is a digital garden?',
          answer:
            "A digital garden is a personal website where you publish notes and ideas at various stages of development. Unlike a blog (which expects finished articles in reverse chronological order), a garden encourages work-in-progress thinking, evolving ideas, and interconnected notes. It's a way to learn and think in public.",
        },
        {
          question: 'How does Moryflow publish notes as a website?',
          answer:
            "Moryflow includes built-in publishing. You select which notes to share, and they become web pages accessible at a public URL. Notes can link to each other, creating a navigable knowledge site. You control what's published and what stays private.",
        },
        {
          question: 'Do I need to know HTML or CSS?',
          answer:
            'No. Moryflow handles the presentation. You write notes in the editor, and when you publish, they become clean, readable web pages. No coding, templates, or static site generators required.',
        },
        {
          question: 'Can AI agents help me write for my digital garden?',
          answer:
            'Yes. Agents can expand short notes into fuller pieces, suggest connections between ideas, draft related pages, and help you organize your garden. They work with your existing notes as context, so their output fits naturally into your knowledge base.',
        },
        {
          question: 'How is this different from Notion or Obsidian Publish?',
          answer:
            'Notion Publish exposes your cloud-stored pages. Obsidian Publish shares your vault. Moryflow combines a local-first knowledge base, autonomous AI agents, and publishing in one tool — your notes stay on your device, agents help you develop ideas, and publishing is integrated into the same workspace.',
        },
      ]}
      ctaTitle="Start your digital garden"
      ctaDescription="Download Moryflow and publish your knowledge as a living website. Free to start · Open Source."
      relatedPages={[
        { label: 'Notes to Website', href: '/notes-to-website' },
        { label: 'Second Brain App', href: '/second-brain-app' },
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
      ]}
    />
  );
}
