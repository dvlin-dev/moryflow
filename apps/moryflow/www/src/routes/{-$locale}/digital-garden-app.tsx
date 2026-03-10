import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';
import { Sprout, NotebookPen, Share2 } from 'lucide-react';
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
    title: 'Digital Garden App',
    description:
      'Publish your notes as a digital garden. Moryflow turns your knowledge base into a living website.',
    headline: 'Turn your notes into a digital garden',
    subheadline:
      'Publish your knowledge base as a living website. Write locally, grow your ideas with AI agents, and share your thinking with the world.',
    problemTitle: "Publishing your thinking shouldn't be this hard",
    problemPoints: [
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
    ],
    whyTitle: 'Your garden, grown with AI agents',
    whyPoints: [
      {
        title: 'Publish from your notes',
        description:
          'Select any note and publish it with one click. Your digital garden grows directly from your knowledge base — no separate publishing workflow.',
      },
      {
        title: 'AI agents help you cultivate',
        description:
          'Agents can expand stubs, suggest connections, draft related notes, and help you develop ideas into published pages.',
      },
      {
        title: 'Living, connected pages',
        description:
          'Published notes link to each other naturally. Your digital garden reflects the real connections in your thinking.',
      },
    ],
    workflowSteps: [
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
    ],
    faqs: [
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
    ],
    ctaTitle: 'Start your digital garden',
    ctaDescription:
      'Download Moryflow and publish your knowledge as a living website. Free to start · Open Source.',
    relatedPages: [
      { label: 'Notes to Website', href: '/notes-to-website' },
      { label: 'Second Brain App', href: '/second-brain-app' },
      { label: 'AI Note-Taking App', href: '/ai-note-taking-app' },
      { label: 'Local-first AI Notes', href: '/local-first-ai-notes' },
    ],
  },
  zh: {
    title: '数字花园应用',
    description: '将你的笔记发布为数字花园。Moryflow 把你的知识库变成一个持续生长的网站。',
    headline: '将笔记变成你的数字花园',
    subheadline:
      '把知识库发布为一个持续生长的网站。在本地写作，借助 AI 智能体发展你的想法，与世界分享你的思考。',
    problemTitle: '发布你的思考不应该这么难',
    problemPoints: [
      {
        title: '博客要求成品文章',
        description:
          '传统博客期望精雕细琢的文章。你大部分的思考——调研笔记、草稿、不断演化的想法——因为觉得"还没准备好"而永远不会被分享。',
      },
      {
        title: '静态站点生成器需要工程能力',
        description:
          'Jekyll、Hugo 等工具需要 Git 工作流、命令行工具和模板定制。发布内容不应该比部署代码更复杂。',
      },
      {
        title: '笔记应用和发布工具是分开的',
        description:
          '你在一个工具里写作，在另一个工具里发布。在系统之间复制粘贴产生摩擦，让你发布的内容与知识库脱节。',
      },
      {
        title: '花园需要持续打理',
        description:
          '数字花园在持续维护时最有价值——更新链接、扩展短文、将新想法与旧内容关联。手动完成这些非常耗时。',
      },
    ],
    whyTitle: '借助 AI 智能体培育你的花园',
    whyPoints: [
      {
        title: '从笔记直接发布',
        description: '选择任意笔记，一键发布。数字花园直接从你的知识库中生长——无需单独的发布流程。',
      },
      {
        title: 'AI 智能体帮你培育内容',
        description: '智能体可以扩展短文、建议关联、起草相关笔记，帮你把想法发展为可发布的页面。',
      },
      {
        title: '有生命力的、互相关联的页面',
        description: '发布的笔记之间自然地互相链接。你的数字花园反映了你思考中真实的关联。',
      },
    ],
    workflowSteps: [
      {
        step: '写作',
        title: '从你的笔记开始',
        description: '在本地工作空间中写笔记。在任何阶段捕捉想法、调研和思考。',
      },
      {
        step: '发展',
        title: '用 AI 智能体发展想法',
        description: '智能体帮你扩展笔记、补充上下文，把粗略的想法发展为更完整的内容。',
      },
      {
        step: '发布',
        title: '一键分享',
        description: '选择要发布的笔记。它们成为数字花园中的页面——一个随知识生长的网站。',
      },
      {
        step: '演化',
        title: '随学习不断更新',
        description: '随时编辑已发布的笔记。你的数字花园永远不会"完成"——它随你的理解不断演化。',
      },
    ],
    faqs: [
      {
        question: '什么是数字花园？',
        answer:
          '数字花园是一个个人网站，你在上面发布处于不同发展阶段的笔记和想法。与博客（期望按时间倒序排列的成品文章）不同，数字花园鼓励进行中的思考、不断演化的想法和互相关联的笔记。这是一种在公开环境中学习和思考的方式。',
      },
      {
        question: 'Moryflow 如何将笔记发布为网站？',
        answer:
          'Moryflow 内置发布功能。你选择要分享的笔记，它们就变成可通过公开 URL 访问的网页。笔记之间可以互相链接，形成一个可导航的知识站点。你可以控制哪些内容发布、哪些保持私密。',
      },
      {
        question: '我需要懂 HTML 或 CSS 吗？',
        answer:
          '不需要。Moryflow 处理所有呈现细节。你在编辑器中写笔记，发布后它们就变成干净、可读的网页。不需要编码、模板或静态站点生成器。',
      },
      {
        question: 'AI 智能体能帮我为数字花园写作吗？',
        answer:
          '可以。智能体可以把短笔记扩展为更完整的内容、建议想法之间的关联、起草相关页面，并帮你组织花园。它们以你现有的笔记作为上下文工作，输出内容自然融入你的知识库。',
      },
      {
        question: '这和 Notion 或 Obsidian Publish 有什么不同？',
        answer:
          'Notion Publish 暴露的是你云端存储的页面。Obsidian Publish 分享的是你的 vault。Moryflow 将本地优先知识库、自主 AI 智能体和发布功能整合在一个工具中——笔记留在你的设备上，智能体帮你发展想法，发布功能集成在同一个工作空间内。',
      },
    ],
    ctaTitle: '开始你的数字花园',
    ctaDescription: '下载 Moryflow，将你的知识发布为一个持续生长的网站。免费开始 · 开源。',
    relatedPages: [
      { label: '笔记变网站', href: '/notes-to-website' },
      { label: '第二大脑应用', href: '/second-brain-app' },
      { label: 'AI 笔记应用', href: '/ai-note-taking-app' },
      { label: '本地优先 AI 笔记', href: '/local-first-ai-notes' },
    ],
  },
};

const whyIcons = [Sprout, NotebookPen, Share2];

export const Route = createFileRoute('/{-$locale}/digital-garden-app')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'digital-garden-app',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: DigitalGardenPage,
});

function DigitalGardenPage() {
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
