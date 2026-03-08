import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { Globe, NotebookPen, Zap } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

export const Route = createFileRoute('/{-$locale}/notes-to-website')({
  head: ({ params }) =>
    getPageMeta({
      pageId: 'notes-to-website',
      locale: params.locale,
      title: 'Notes to Website',
      description:
        'Turn your notes into a website with Moryflow. Publish notes as a digital garden, portfolio, or knowledge base.',
    }),
  component: NotesToWebsitePage,
});

function NotesToWebsitePage() {
  return (
    <SeoLandingPage
      headline="Publish your notes as a website"
      subheadline="Write locally, publish globally. Moryflow turns your notes into a living website — no static site generators, no deployment pipelines, no coding required."
      problemTitle="Publishing notes shouldn't require a tech stack"
      problemPoints={[
        {
          title: 'Static site generators need engineering skills',
          description:
            "Jekyll, Hugo, Astro — they produce great sites, but require Git, CLI tools, template languages, and deployment configuration. Most knowledge workers shouldn't need a build pipeline to share their thinking.",
        },
        {
          title: 'Note apps and publishing tools are separate worlds',
          description:
            'You write in Obsidian or Notion, then copy content into WordPress, Ghost, or a CMS. Every update means repeating the process. Your published site drifts from your actual notes.',
        },
        {
          title: 'Blogs expect finished articles',
          description:
            'Traditional publishing formats demand polished, complete pieces. But much of your most valuable thinking — research notes, evolving ideas, connected observations — never fits the blog format.',
        },
        {
          title: 'Hosted platforms own your content',
          description:
            "Medium, Substack, and similar platforms store your content on their servers. You're building on rented land with someone else's design choices and business model.",
        },
      ]}
      whyTitle="From notes to website in one click"
      whyPoints={[
        {
          icon: NotebookPen,
          title: 'Write once, publish from your workspace',
          description:
            'Your notes are the source of truth. Select which notes to publish and they become web pages — no copying, no exporting, no separate CMS.',
        },
        {
          icon: Globe,
          title: 'A website that grows with your knowledge',
          description:
            'Published notes link to each other automatically. Your site evolves as you write, creating a navigable knowledge base or digital garden.',
        },
        {
          icon: Zap,
          title: 'AI agents help you prepare content',
          description:
            'Use agents to expand notes, improve clarity, add context, and develop rough ideas into publishable pages — all within the same workspace.',
        },
      ]}
      workflowSteps={[
        {
          step: 'Write',
          title: 'Create notes in your local workspace',
          description:
            'Write notes naturally — research, ideas, drafts, observations. No special formatting or front matter required.',
        },
        {
          step: 'Refine',
          title: 'Use AI agents to develop content',
          description:
            'Agents can expand short notes, improve writing, add structure, and suggest connections. Your notes become richer with less effort.',
        },
        {
          step: 'Publish',
          title: 'Share with one click',
          description:
            'Mark any note for publishing. It becomes a page on your website instantly — clean design, proper formatting, linked to related pages.',
        },
        {
          step: 'Update',
          title: 'Edit anytime, changes go live',
          description:
            'Update the note in your workspace and the published page reflects the change. Your website stays in sync with your thinking.',
        },
      ]}
      faqs={[
        {
          question: 'How do I turn my notes into a website?',
          answer:
            'In Moryflow, you select which notes to publish and they become web pages at a public URL. The published site automatically links related notes together, creating a navigable website. No coding, templates, or deployment steps needed.',
        },
        {
          question: 'What kind of website can I create from my notes?',
          answer:
            'You can publish a digital garden (interconnected notes and ideas), a knowledge base (organized reference material), a portfolio (curated work samples), or any combination. The format adapts to how you organize your notes.',
        },
        {
          question: 'Do I need to know HTML, CSS, or any programming?',
          answer:
            'No. Moryflow handles all the presentation. You write notes in the editor and publish them. The resulting website has clean typography, responsive design, and navigation — all handled automatically.',
        },
        {
          question: 'Can I use a custom domain?',
          answer:
            'Custom domain support is on our roadmap. Currently, published sites are available at a Moryflow-hosted URL.',
        },
        {
          question: 'How is this different from Notion or Obsidian publishing?',
          answer:
            'Notion pages are cloud-stored and expose your Notion workspace structure. Obsidian Publish shares your vault but requires a separate subscription. Moryflow integrates local-first note-taking, AI agent workflows, and publishing in one desktop app — your notes stay on your device and publishing is built into the same tool you write in.',
        },
      ]}
      ctaTitle="Start publishing your notes"
      ctaDescription="Download Moryflow and turn your knowledge into a website. Free during beta."
      relatedPages={[
        { label: 'Digital Garden App', href: '/digital-garden-app' },
        { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
        { label: 'Use Cases', href: '/use-cases' },
        { label: 'Features', href: '/features' },
      ]}
    />
  );
}
