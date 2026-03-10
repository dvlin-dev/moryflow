import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Globe, NotebookPen, Zap } from 'lucide-react';
import { SeoLandingPage } from '@/components/seo-pages/SeoLandingPage';

const content: Record<
  Locale,
  {
    title: string;
    description: string;
    headline: string;
    subheadline: string;
    problemTitle: string;
    problemPoints: { title: string; description: string }[];
    whyTitle: string;
    whyPoints: { title: string; description: string }[];
    workflowSteps: { step: string; title: string; description: string }[];
    faqs: { question: string; answer: string }[];
    ctaTitle: string;
    ctaDescription: string;
    relatedPages: { label: string; href: string }[];
  }
> = {
  en: {
    title: 'Notes to Website',
    description:
      'Turn your notes into a website with Moryflow. Publish notes as a digital garden, portfolio, or knowledge base.',
    headline: 'Publish your notes as a website',
    subheadline:
      'Write locally, publish globally. Moryflow turns your notes into a living website — no static site generators, no deployment pipelines, no coding required.',
    problemTitle: "Publishing notes shouldn't require a tech stack",
    problemPoints: [
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
    ],
    whyTitle: 'From notes to website in one click',
    whyPoints: [
      {
        title: 'Write once, publish from your workspace',
        description:
          'Your notes are the source of truth. Select which notes to publish and they become web pages — no copying, no exporting, no separate CMS.',
      },
      {
        title: 'A website that grows with your knowledge',
        description:
          'Published notes link to each other automatically. Your site evolves as you write, creating a navigable knowledge base or digital garden.',
      },
      {
        title: 'AI agents help you prepare content',
        description:
          'Use agents to expand notes, improve clarity, add context, and develop rough ideas into publishable pages — all within the same workspace.',
      },
    ],
    workflowSteps: [
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
    ],
    faqs: [
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
          'Notion pages are cloud-stored and expose your Notion workspace structure. Obsidian Publish shares your vault but requires a separate subscription. Moryflow integrates a local-first knowledge base, autonomous AI agents, and publishing in one desktop app — your notes stay on your device and publishing is built into the same tool you write in.',
      },
    ],
    ctaTitle: 'Start publishing your notes',
    ctaDescription:
      'Download Moryflow and turn your knowledge into a website. Free to start · Open Source.',
    relatedPages: [
      { label: 'Digital Garden App', href: '/digital-garden-app' },
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Second Brain App', href: '/second-brain-app' },
      { label: 'Telegram AI Agent', href: '/telegram-ai-agent' },
    ],
  },
  zh: {
    title: '笔记变网站',
    description: '用 Moryflow 将笔记变成网站。把笔记发布为数字花园、作品集或知识库。',
    headline: '将笔记发布为网站',
    subheadline:
      '在本地写作，全球发布。Moryflow 将你的笔记变成一个持续生长的网站——无需静态站点生成器、无需部署流水线、无需编码。',
    problemTitle: '发布笔记不应该需要一整套技术栈',
    problemPoints: [
      {
        title: '静态站点生成器需要工程能力',
        description:
          'Jekyll、Hugo、Astro——它们能生成很好的站点，但需要 Git、命令行工具、模板语言和部署配置。大多数知识工作者不应该需要构建流水线来分享自己的思考。',
      },
      {
        title: '笔记应用和发布工具是两个世界',
        description:
          '你在 Obsidian 或 Notion 里写作，然后把内容复制到 WordPress、Ghost 或 CMS 中。每次更新都要重复这个过程。你发布的网站与实际笔记渐行渐远。',
      },
      {
        title: '博客期望成品文章',
        description:
          '传统发布格式要求精雕细琢的完整文章。但你最有价值的思考——调研笔记、不断演化的想法、关联的观察——往往不适合博客格式。',
      },
      {
        title: '托管平台拥有你的内容',
        description:
          'Medium、Substack 等平台将你的内容存储在他们的服务器上。你是在别人的土地上建设，受制于别人的设计选择和商业模式。',
      },
    ],
    whyTitle: '从笔记到网站，一键完成',
    whyPoints: [
      {
        title: '写一次，从工作空间直接发布',
        description:
          '笔记是唯一的事实源。选择要发布的笔记，它们就变成网页——无需复制、无需导出、无需单独的 CMS。',
      },
      {
        title: '一个随知识生长的网站',
        description:
          '发布的笔记之间自动互相链接。你的网站随你的写作不断演进，形成可导航的知识库或数字花园。',
      },
      {
        title: 'AI 智能体帮你准备内容',
        description:
          '用智能体扩展笔记、提升清晰度、补充上下文，把粗略想法发展为可发布的页面——全部在同一个工作空间内完成。',
      },
    ],
    workflowSteps: [
      {
        step: '写作',
        title: '在本地工作空间中创建笔记',
        description: '自然地写笔记——调研、想法、草稿、观察。无需特殊格式或 front matter。',
      },
      {
        step: '打磨',
        title: '用 AI 智能体发展内容',
        description:
          '智能体可以扩展短笔记、改善写作、增加结构、建议关联。你的笔记以更少的精力变得更丰富。',
      },
      {
        step: '发布',
        title: '一键分享',
        description:
          '标记任意笔记进行发布。它立即变成你网站上的一个页面——简洁的设计、规范的排版、与相关页面互相链接。',
      },
      {
        step: '更新',
        title: '随时编辑，即时生效',
        description: '在工作空间中更新笔记，发布的页面随之更新。你的网站与你的思考保持同步。',
      },
    ],
    faqs: [
      {
        question: '如何将笔记变成网站？',
        answer:
          '在 Moryflow 中，你选择要发布的笔记，它们就变成可通过公开 URL 访问的网页。发布的站点自动将相关笔记链接在一起，形成可导航的网站。不需要编码、模板或部署步骤。',
      },
      {
        question: '我可以用笔记创建什么样的网站？',
        answer:
          '你可以发布数字花园（互相关联的笔记和想法）、知识库（有组织的参考资料）、作品集（精选的作品展示），或任意组合。格式会自适应你的笔记组织方式。',
      },
      {
        question: '我需要懂 HTML、CSS 或任何编程吗？',
        answer:
          '不需要。Moryflow 处理所有呈现细节。你在编辑器中写笔记并发布。生成的网站拥有干净的排版、响应式设计和导航——全部自动处理。',
      },
      {
        question: '可以使用自定义域名吗？',
        answer: '自定义域名支持在我们的路线图上。目前，发布的站点通过 Moryflow 托管的 URL 访问。',
      },
      {
        question: '这和 Notion 或 Obsidian 的发布功能有什么不同？',
        answer:
          'Notion 页面存储在云端，暴露的是你的 Notion 工作空间结构。Obsidian Publish 分享你的 vault，但需要单独订阅。Moryflow 将本地优先知识库、自主 AI 智能体和发布功能整合在一个桌面应用中——笔记留在你的设备上，发布功能内置在你写作的同一个工具中。',
      },
    ],
    ctaTitle: '开始发布你的笔记',
    ctaDescription: '下载 Moryflow，将你的知识变成网站。免费开始 · 开源。',
    relatedPages: [
      { label: '数字花园应用', href: '/digital-garden-app' },
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '第二大脑应用', href: '/second-brain-app' },
      { label: 'Telegram AI 智能体', href: '/telegram-ai-agent' },
    ],
  },
};

const whyIcons = [NotebookPen, Globe, Zap];

export const Route = createFileRoute('/{-$locale}/notes-to-website')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'notes-to-website',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: NotesToWebsitePage,
});

function NotesToWebsitePage() {
  const locale = useLocale();
  const c = content[locale];
  return (
    <SeoLandingPage
      headline={c.headline}
      subheadline={c.subheadline}
      problemTitle={c.problemTitle}
      problemPoints={c.problemPoints}
      whyTitle={c.whyTitle}
      whyPoints={c.whyPoints.map((p, i) => ({ ...p, icon: whyIcons[i]! }))}
      workflowSteps={c.workflowSteps}
      faqs={c.faqs}
      ctaTitle={c.ctaTitle}
      ctaDescription={c.ctaDescription}
      relatedPages={c.relatedPages}
    />
  );
}
