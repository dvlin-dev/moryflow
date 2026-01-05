import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { DownloadButtons } from '@/components/download-buttons'

// @ts-expect-error - Route path is generated at build time
export const Route = createFileRoute('/$lang/')({
  head: ({ params }: { params: { lang: string } }) => {
    const isZh = params.lang === 'zh'
    return {
      meta: [
        {
          title: isZh ? 'MoryFlow - 会思考的 AI 笔记伙伴' : 'MoryFlow - Your AI Note-Taking Companion',
        },
        {
          name: 'description',
          content: isZh
            ? 'MoryFlow 是一款笔记应用，内置名为 Mory 的 AI 助手。它能读你的笔记、记住你说过的话、帮你把事情搞定。'
            : 'MoryFlow is a note-taking app with a built-in AI assistant that reads your notes, remembers what you\'ve said, and helps you get things done.',
        },
      ],
    }
  },
  component: HomePage,
})

function HomePage() {
  const { lang } = useParams({ from: '/$lang/' })
  const isZh = lang === 'zh'

  const t = {
    nav: {
      docs: isZh ? '文档' : 'Documentation',
      download: isZh ? '下载' : 'Download',
    },
    hero: {
      title1: isZh ? '会思考的 AI' : 'Your AI Note-Taking',
      title2: isZh ? '笔记伙伴' : 'Companion',
      description: isZh
        ? 'MoryFlow 是一款笔记应用，内置名为 Mory 的 AI 助手。它能读你的笔记、记住你说过的话、帮你把事情搞定。'
        : 'MoryFlow is a note-taking app with a built-in AI assistant called Mory. It reads your notes, remembers what you\'ve said, and helps you get things done.',
      getStarted: isZh ? '开始使用' : 'Get Started',
      exploreFeatures: isZh ? '探索功能' : 'Explore Features',
    },
    features: {
      remembers: {
        title: isZh ? '记得住你说过的话' : 'Remembers What You\'ve Said',
        description: isZh
          ? 'Mory 会读你的笔记，了解你的习惯和偏好。聊得越多，越懂你想要什么。'
          : 'Mory reads your notes and learns your habits and preferences. The more you chat, the better it understands you.',
      },
      local: {
        title: isZh ? '笔记存在你电脑上' : 'Notes Stay on Your Computer',
        description: isZh
          ? '所有内容都是普通文件，存在你自己的电脑里。不上传、不分享，断网也能用。'
          : 'All your content is stored as regular files on your own computer. Nothing uploaded, nothing shared, works offline too.',
      },
      done: {
        title: isZh ? '能帮你把事情搞定' : 'Actually Gets Things Done',
        description: isZh
          ? '不只是聊天，还能帮你准备考试、策划活动、规划旅行、写工作总结。'
          : 'Not just chat—helps you prep for exams, plan events, organize trips, and write work summaries.',
      },
      write: {
        title: isZh ? '写起来很顺手' : 'Feels Natural to Write',
        description: isZh
          ? '熟悉的编辑体验，支持 Markdown、代码块、表格。想到什么直接写。'
          : 'Familiar editing experience with Markdown, code blocks, and tables. Just write what comes to mind.',
      },
      ai: {
        title: isZh ? '想用什么 AI 都行' : 'Use Any AI You Want',
        description: isZh
          ? '支持 OpenAI、Claude、DeepSeek 等 20+ 服务商，也可以跑本地模型，完全离线。'
          : 'Supports OpenAI, Claude, DeepSeek, and 20+ providers. Or run local models completely offline.',
      },
      better: {
        title: isZh ? '一直在变得更好' : 'Always Getting Better',
        description: isZh
          ? '我们会持续更新，加入更多好用的功能。现在免费下载，一起成长。'
          : 'We\'re constantly improving and adding new features. Download free now and grow with us.',
      },
    },
    footer: isZh ? '© {year} MoryFlow. 保留所有权利。' : '© {year} MoryFlow. All rights reserved.',
  }

  const docsPath = isZh ? `/${lang}/docs` : '/docs'
  const featuresPath = isZh ? `/${lang}/docs/features` : '/docs/features'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold text-xl">MoryFlow</span>
          <nav className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                to="/"
                className={`hover:text-foreground transition-colors ${!isZh ? 'text-foreground font-medium' : ''}`}
              >
                EN
              </Link>
              <Link
                to="/$lang"
                params={{ lang: 'zh' }}
                className={`hover:text-foreground transition-colors ${isZh ? 'text-foreground font-medium' : ''}`}
              >
                中文
              </Link>
            </div>
            <a
              href={docsPath}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.nav.docs}
            </a>
            <a
              href="https://moryflow.com/download"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t.nav.download}
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          {t.hero.title1}
          <br />
          <span className="text-primary">{t.hero.title2}</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {t.hero.description}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href={docsPath}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t.hero.getStarted}
          </a>
          <a
            href={featuresPath}
            className="border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            {t.hero.exploreFeatures}
          </a>
        </div>

        {/* Download Buttons */}
        <div className="mt-12 flex justify-center">
          <DownloadButtons locale={isZh ? 'zh' : 'en'} />
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.remembers.title}</h3>
            <p className="text-muted-foreground">{t.features.remembers.description}</p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.local.title}</h3>
            <p className="text-muted-foreground">{t.features.local.description}</p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.done.title}</h3>
            <p className="text-muted-foreground">{t.features.done.description}</p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.write.title}</h3>
            <p className="text-muted-foreground">{t.features.write.description}</p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.ai.title}</h3>
            <p className="text-muted-foreground">{t.features.ai.description}</p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t.features.better.title}</h3>
            <p className="text-muted-foreground">{t.features.better.description}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t.footer.replace('{year}', new Date().getFullYear().toString())}
        </div>
      </footer>
    </div>
  )
}
