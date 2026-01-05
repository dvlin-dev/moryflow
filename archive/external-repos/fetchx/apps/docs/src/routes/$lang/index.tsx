import { createFileRoute, Link, useParams } from '@tanstack/react-router'

// @ts-expect-error - Route path is generated at build time
export const Route = createFileRoute('/$lang/')({
  head: ({ params }: { params: { lang: string } }) => {
    const isZh = params.lang === 'zh'
    return {
      meta: [
        {
          title: isZh ? 'AIGet - 网页截图 API' : 'AIGet - Web Screenshot API',
        },
        {
          name: 'description',
          content: isZh
            ? '使用简单的 REST API 即时捕获任意网页的截图。专为开发者打造。'
            : 'Capture screenshots of any webpage instantly with our simple REST API. Built for developers.',
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
      getStarted: isZh ? '开始使用' : 'Get Started',
    },
    hero: {
      title1: isZh ? '网页截图 API' : 'Web Screenshot API',
      title2: isZh ? '为开发者打造' : 'for Developers',
      description: isZh
        ? '使用简单的 REST API 捕获任意网页的高质量截图。快速、可靠、实惠。'
        : 'Capture high-quality screenshots of any webpage with a simple REST API. Fast, reliable, and affordable.',
      readDocs: isZh ? '阅读文档' : 'Read the Docs',
      tryFree: isZh ? '免费试用 →' : 'Try it Free →',
    },
    features: {
      fast: {
        title: isZh ? '⚡ 快速' : '⚡ Fast',
        description: isZh
          ? '通过 Cloudflare 全球 CDN，截图在 3 秒内完成。'
          : "Screenshots delivered in under 3 seconds via Cloudflare's global CDN.",
      },
      secure: {
        title: isZh ? '🔒 安全' : '🔒 Secure',
        description: isZh
          ? 'SSRF 防护、私有 IP 屏蔽、默认加密存储。'
          : 'SSRF protection, private IP blocking, and encrypted storage by default.',
      },
      affordable: {
        title: isZh ? '💰 实惠' : '💰 Affordable',
        description: isZh
          ? '每月 100 次免费截图。付费计划仅需 $9/月起。'
          : '100 free screenshots/month. Paid plans start at just $9/month.',
      },
    },
    footer: isZh ? '© {year} AIGet. 保留所有权利。' : '© {year} AIGet. All rights reserved.',
  }

  // Build correct paths based on current language
  const docsPath = isZh ? `/${lang}/docs` : '/docs'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold text-xl">AIGet</span>
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
              href="https://console.aiget.dev"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              {t.nav.getStarted}
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
            className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            {t.hero.readDocs}
          </a>
          <a
            href="https://console.aiget.dev"
            className="border px-6 py-3 font-medium hover:bg-muted transition-colors"
          >
            {t.hero.tryFree}
          </a>
        </div>

        {/* Code Example */}
        <div className="mt-16 max-w-2xl mx-auto text-left">
          <div className="bg-card border overflow-hidden shadow-lg">
            <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm text-muted-foreground">Terminal</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-green-600 dark:text-green-400">{`curl -X POST https://api.aiget.dev/v1/screenshots \\
  -H "Authorization: Bearer lk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}</code>
            </pre>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.fast.title}</h3>
            <p className="text-muted-foreground">{t.features.fast.description}</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.secure.title}</h3>
            <p className="text-muted-foreground">{t.features.secure.description}</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.affordable.title}</h3>
            <p className="text-muted-foreground">{t.features.affordable.description}</p>
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
