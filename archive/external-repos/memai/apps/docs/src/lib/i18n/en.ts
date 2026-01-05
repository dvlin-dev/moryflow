/** English translations */
export const en = {
  // Fumadocs UI (required fields)
  search: 'Search',
  searchNoResult: 'No results found',
  toc: 'On this page',
  tocNoHeadings: 'No headings',
  lastUpdate: 'Last updated',
  chooseTheme: 'Choose theme',
  nextPage: 'Next',
  previousPage: 'Previous',
  chooseLanguage: 'Change language',
  editOnGithub: 'Edit on GitHub',

  // Site meta
  siteTitle: 'Memai - Memory as a Service for AI',
  siteDescription:
    'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',

  // Navigation
  navDocs: 'Documentation',
  navConsole: 'Console',
  navApiReference: 'API Reference',
  navStatus: 'Status',

  // Home page - Hero
  heroTitle1: 'Memory as a Service',
  heroTitle2: 'for AI Applications',
  heroDescription:
    'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
  getStarted: 'Get Started',
  viewApi: 'View API',

  // Home page - Sidebar
  sidebarBanner: 'Memory API for AI',

  // Home page - Features
  featureSemanticTitle: 'Semantic Search',
  featureSemanticDesc:
    'Find relevant memories using natural language queries powered by vector embeddings.',
  featureKnowledgeTitle: 'Knowledge Graph',
  featureKnowledgeDesc:
    'Automatically extract entities and relationships to build a connected knowledge base.',
  featureMultiTenantTitle: 'Multi-tenant',
  featureMultiTenantDesc:
    'Isolate memories by user, session, or agent with built-in scoping and access control.',
  featureWebhooksTitle: 'Real-time Webhooks',
  featureWebhooksDesc:
    'Get notified instantly when memories are created, updated, or deleted.',

  // Footer
  footerCopyright: 'All rights reserved.',
} as const

export type TranslationKeys = keyof typeof en
