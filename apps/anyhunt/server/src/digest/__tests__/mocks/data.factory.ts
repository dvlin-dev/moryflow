/**
 * Digest Test Data Factory
 *
 * [PROVIDES]: 测试数据工厂函数
 * [POS]: 为 Digest 模块测试提供可复用的测试数据
 */

import type {
  DigestSubscription,
  DigestRun,
  DigestRunItem,
  ContentItem,
  ContentItemEnrichment,
  UserContentState,
  DigestTopic,
  DigestSource,
} from '../../../../generated/prisma-main/client';

// ========== Subscription ==========

export function createSubscription(
  overrides: Partial<DigestSubscription> = {},
): DigestSubscription {
  const now = new Date();
  return {
    id: 'sub-1',
    userId: 'user-1',
    name: 'Test Subscription',
    topic: 'AI news',
    interests: ['machine learning', 'llm'],
    negativeInterests: [],
    searchLimit: 60,
    scrapeLimit: 20,
    minItems: 5,
    minScore: 70,
    contentWindowHours: 168,
    redeliveryPolicy: 'COOLDOWN',
    redeliveryCooldownDays: 7,
    followedTopicId: null,
    cron: '0 9 * * *',
    timezone: 'Asia/Shanghai',
    languageMode: 'FOLLOW_UI',
    outputLocale: null,
    inboxEnabled: true,
    emailEnabled: false,
    emailTo: null,
    emailSubjectTemplate: null,
    webhookUrl: null,
    webhookEnabled: false,
    webhookSecret: null,
    generateItemSummaries: true,
    composeNarrative: true,
    tone: 'neutral',
    enabled: true,
    nextRunAt: new Date(now.getTime() + 86400000),
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

// ========== Run ==========

export function createRun(overrides: Partial<DigestRun> = {}): DigestRun {
  const now = new Date();
  return {
    id: 'run-1',
    subscriptionId: 'sub-1',
    userId: 'user-1',
    status: 'PENDING',
    source: 'SCHEDULED',
    scheduledAt: now,
    startedAt: null,
    finishedAt: null,
    outputLocale: 'en',
    narrativeMarkdown: null,
    billing: null,
    quotaTransactionId: null,
    result: null,
    error: null,
    emailSubject: null,
    emailDeliveredAt: null,
    emailError: null,
    webhookDeliveredAt: null,
    webhookError: null,
    webhookStatusCode: null,
    webhookLatencyMs: null,
    createdAt: now,
    ...overrides,
  };
}

// ========== RunItem ==========

export function createRunItem(
  overrides: Partial<DigestRunItem> = {},
): DigestRunItem {
  const now = new Date();
  return {
    id: 'item-1',
    runId: 'run-1',
    subscriptionId: 'sub-1',
    userId: 'user-1',
    contentId: 'content-1',
    canonicalUrlHash: 'hash-1',
    scoreRelevance: 80,
    scoreOverall: 72,
    scoringReason: 'Matched: AI, machine learning',
    rank: 1,
    titleSnapshot: 'Test Article Title',
    urlSnapshot: 'https://example.com/article',
    aiSummarySnapshot: 'This is a test summary.',
    deliveredAt: null,
    createdAt: now,
    ...overrides,
  };
}

// ========== ContentItem ==========

export function createContentItem(
  overrides: Partial<ContentItem> = {},
): ContentItem {
  const now = new Date();
  return {
    id: 'content-1',
    canonicalUrl: 'https://example.com/article',
    canonicalUrlHash: 'hash-1',
    title: 'Test Article Title',
    description: 'This is a test article description.',
    author: null,
    publishedAt: null,
    language: 'en',
    siteName: 'Example',
    favicon: 'https://example.com/favicon.ico',
    contentHash: null,
    scoreImpact: 60,
    scoreQuality: 70,
    scoreUpdatedAt: now,
    firstSeenAt: now,
    lastSeenAt: now,
    lastAnalyzedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ========== ContentItemEnrichment ==========

export function createEnrichment(
  overrides: Partial<ContentItemEnrichment> = {},
): ContentItemEnrichment {
  const now = new Date();
  return {
    id: 'enrichment-1',
    contentId: 'content-1',
    canonicalUrlHash: 'hash-1',
    locale: 'en',
    promptVersion: 'v1.0.0',
    aiSummary: 'This is an AI-generated summary.',
    aiTags: ['AI', 'technology'],
    contentType: 'news',
    keyEntities: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ========== UserContentState ==========

export function createUserContentState(
  overrides: Partial<UserContentState> = {},
): UserContentState {
  const now = new Date();
  return {
    id: 'state-1',
    userId: 'user-1',
    canonicalUrlHash: 'hash-1',
    firstDeliveredAt: now,
    lastDeliveredAt: now,
    deliveredCount: 1,
    lastOpenedAt: null,
    readAt: null,
    savedAt: null,
    notInterestedAt: null,
    lastDeliveredContentHash: null,
    lastDeliveredRunId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ========== Topic ==========

// Note: DigestTopic has many fields - using partial type for flexibility
export function createTopic(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'topic-1',
    slug: 'test-topic',
    title: 'Test Topic',
    description: 'A test topic for unit tests.',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    sourceSubscriptionId: 'sub-1',
    topic: 'AI News',
    interests: ['machine learning'],
    searchLimit: 60,
    scrapeLimit: 20,
    minItems: 5,
    minScore: 70,
    redeliveryPolicy: 'COOLDOWN',
    redeliveryCooldownDays: 7,
    cron: '0 9 * * *',
    timezone: 'UTC',
    locale: 'en',
    subscriberCount: 0,
    lastEditionAt: null,
    nextEditionAt: null,
    featured: false,
    featuredOrder: null,
    featuredAt: null,
    featuredByUserId: null,
    createdByUserId: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ========== Source ==========

// Note: DigestSource uses many-to-many via DigestSubscriptionSource
export function createSource(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'source-1',
    type: 'rss',
    refreshMode: 'SCHEDULED',
    config: { feedUrl: 'https://example.com/feed.xml' },
    configHash: 'config-hash-1',
    refreshCron: '0 */6 * * *',
    timezone: 'UTC',
    nextRefreshAt: new Date(now.getTime() + 3600000),
    lastRefreshAt: null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    subscriptionSources: [], // Many-to-many relation
    ...overrides,
  };
}

// ========== Scoring Test Data ==========

export function createContentForScoring(overrides = {}) {
  return {
    title: 'Introduction to Machine Learning',
    description: 'A comprehensive guide to ML basics.',
    fulltext: 'Machine learning is a subset of artificial intelligence...',
    url: 'https://example.com/ml-guide',
    ...overrides,
  };
}

export function createSubscriptionConfig(overrides = {}) {
  return {
    topic: 'machine learning AI',
    interests: ['deep learning', 'neural networks', 'pytorch'],
    negativeInterests: [] as string[],
    ...overrides,
  };
}

export function createFeedbackPattern(overrides = {}) {
  return {
    patternType: 'KEYWORD' as const,
    value: 'machine learning',
    positiveCount: 5,
    negativeCount: 1,
    confidence: 0.8,
    ...overrides,
  };
}

// ========== Billing Data ==========

export function createBillingData(overrides = {}) {
  return {
    model: 'FETCHX_ACTUAL',
    totalCredits: 23,
    breakdown: [
      { key: 'fetchx.search', count: 1, cost: 1 },
      { key: 'fetchx.scrape', count: 20, cost: 20 },
      { key: 'ai.narrative', count: 1, cost: 2 },
    ],
    ...overrides,
  };
}

// ========== RSS Data ==========

export function createRssItem(overrides = {}) {
  return {
    title: 'RSS Article Title',
    link: 'https://example.com/rss-article',
    description: 'RSS article description.',
    pubDate: new Date().toISOString(),
    author: 'Test Author',
    guid: 'unique-guid-1',
    ...overrides,
  };
}

export function createRssFeedMeta(overrides = {}) {
  return {
    title: 'Example Feed',
    link: 'https://example.com',
    description: 'An example RSS feed.',
    language: 'en',
    ...overrides,
  };
}
