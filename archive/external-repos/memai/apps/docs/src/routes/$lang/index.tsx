import { createFileRoute, Link, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/$lang/')({
  head: ({ params }: { params: { lang: string } }) => {
    const isZh = params.lang === 'zh'
    return {
      meta: [
        {
          title: isZh ? 'Memai - AI 应用的记忆即服务' : 'Memai - Memory as a Service for AI',
        },
        {
          name: 'description',
          content: isZh
            ? '为您的 AI 应用构建持久记忆层。通过简单的 REST API 存储、搜索和管理记忆。'
            : 'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
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
      title1: isZh ? '记忆即服务' : 'Memory as a Service',
      title2: isZh ? '为 AI 应用构建' : 'for AI Applications',
      description: isZh
        ? '为您的 AI 应用构建持久记忆层。通过简单的 REST API 存储、搜索和管理记忆。'
        : 'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
      readDocs: isZh ? '快速开始' : 'Get Started',
      viewApi: isZh ? '查看 API' : 'View API',
    },
    features: {
      semantic: {
        title: isZh ? '语义搜索' : 'Semantic Search',
        description: isZh
          ? '使用向量嵌入技术，通过自然语言查询找到相关记忆。'
          : 'Find relevant memories using natural language queries powered by vector embeddings.',
      },
      knowledge: {
        title: isZh ? '知识图谱' : 'Knowledge Graph',
        description: isZh
          ? '自动提取实体和关系，构建互联的知识库。'
          : 'Automatically extract entities and relationships to build connected knowledge.',
      },
      multiTenant: {
        title: isZh ? '多租户支持' : 'Multi-tenant',
        description: isZh
          ? '通过内置的作用域和访问控制，按用户、会话或代理隔离记忆。'
          : 'Isolate memories by user, session, or agent with built-in scoping and access control.',
      },
      webhooks: {
        title: isZh ? '实时 Webhooks' : 'Real-time Webhooks',
        description: isZh
          ? '当记忆被创建、更新或删除时立即获得通知。'
          : 'Get notified instantly when memories are created, updated, or deleted.',
      },
    },
    footer: isZh ? '保留所有权利。' : 'All rights reserved.',
  }

  const docsPath = isZh ? `/${lang}/docs` : '/docs'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold text-xl">Memai</span>
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
              href="https://console.memai.dev"
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
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">{t.hero.description}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href={docsPath}
            className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            {t.hero.readDocs}
          </a>
          <a
            href={`${docsPath}/api-reference`}
            className="border px-6 py-3 font-medium hover:bg-muted transition-colors"
          >
            {t.hero.viewApi}
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
              <code className="text-green-600 dark:text-green-400">{`curl -X POST https://api.memai.dev/v1/memories \\
  -H "Authorization: Bearer mm_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode",
    "user_id": "user_123"
  }'`}</code>
            </pre>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.semantic.title}</h3>
            <p className="text-muted-foreground">{t.features.semantic.description}</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.knowledge.title}</h3>
            <p className="text-muted-foreground">{t.features.knowledge.description}</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.multiTenant.title}</h3>
            <p className="text-muted-foreground">{t.features.multiTenant.description}</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">{t.features.webhooks.title}</h3>
            <p className="text-muted-foreground">{t.features.webhooks.description}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Memai. {t.footer}
        </div>
      </footer>
    </div>
  )
}
