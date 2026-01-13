/**
 * Digest Constants
 *
 * [PROVIDES]: Digest 模块常量、配置、限制
 * [POS]: 常量定义文件
 */

// ========== Prompt 版本管理 ==========

export const PROMPT_VERSIONS = {
  /** ContentItemEnrichment 生成 prompt 版本 */
  contentSummary: 'v1.0.0',
  /** DigestRun.narrativeMarkdown 生成 prompt 版本 */
  runNarrative: 'v1.0.0',
} as const;

// ========== 评分权重 ==========

export const SCORE_WEIGHTS = {
  relevance: 0.5, // 相关性 50%
  impact: 0.3, // 影响力 30%
  quality: 0.2, // 质量 20%
} as const;

// ========== 订阅限制（按 Tier） ==========

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxSubscriptions: 3,
    minCronIntervalMinutes: 60, // 最小 1 小时
    maxPublicTopics: 3,
  },
  BASIC: {
    maxSubscriptions: 20,
    minCronIntervalMinutes: 10,
    maxPublicTopics: 10,
  },
  PRO: {
    maxSubscriptions: 100,
    minCronIntervalMinutes: 1,
    maxPublicTopics: 50,
  },
  TEAM: {
    maxSubscriptions: 500,
    minCronIntervalMinutes: 1,
    maxPublicTopics: 200,
  },
} as const;

// ========== 反 Spam 限制 ==========

export const ANTI_SPAM_LIMITS = {
  /** 免费用户每天 PUBLIC topic 创建/更新次数 */
  freeUserDailyTopicOps: 3,
  /** 单个 PUBLIC topic 最大 sources 数 */
  maxSourcesPerTopic: 5,
  /** 单个 PUBLIC topic 最大来源域名数 */
  maxDomainsPerTopic: 10,
  /** Edition 列表页最多展示期数 */
  maxEditionsDisplay: 30,
  /** RSS 最小刷新间隔（分钟） */
  minRssRefreshIntervalMinutes: 30,
  /** 单用户并发 refresh */
  maxUserConcurrentRefresh: 2,
  /** 单域名并发 */
  maxDomainConcurrent: 2,
} as const;

// ========== 全文缓存配置 ==========

export const FULLTEXT_CACHE = {
  /** Redis 缓存 TTL（秒） */
  ttlSeconds: 3600, // 1 小时
  /** 单条内容最大大小（字节） */
  maxSizeBytes: 500 * 1024, // 500KB
  /** 压缩阈值（字节） */
  compressThresholdBytes: 10 * 1024, // 10KB
  /** Redis key 前缀 */
  keyPrefix: 'content:fulltext:',
} as const;

// ========== AI 摘要配置 ==========

export const AI_SUMMARY = {
  /** 最小字数 */
  minLength: 200,
  /** 最大字数 */
  maxLength: 500,
  /** 默认语言 */
  defaultLocale: 'en',
} as const;

// ========== Topic Edition 配置 ==========

export const TOPIC_EDITION = {
  /** 最大重试次数 */
  maxRetryCount: 3,
  /** 重试间隔（指数退避：1min, 5min, 15min） */
  retryDelaysMinutes: [1, 5, 15],
  /** 连续失败阈值（触发暂停） */
  consecutiveFailureThreshold: 3,
  /** 暂停超过此天数需管理员介入 */
  pauseEscalationDays: 30,
} as const;

// ========== 计费配置 ==========

export const BILLING = {
  /** 计费模型 */
  model: 'FETCHX_ACTUAL',
  /** Fetchx 调用成本（credits per call） */
  costs: {
    'fetchx.search': 1,
    'fetchx.scrape': 1,
    'fetchx.batchScrape': 1,
    'fetchx.crawl': 1,
    'fetchx.map': 1,
    'fetchx.extract': 1,
    // AI 调用成本
    'ai.summary': 0.5, // 单条内容摘要
    'ai.narrative': 2, // 整期叙事稿
    'ai.explainReason': 0.2, // 评分解释增强
  },
} as const;

// ========== AI Prompt 模板 ==========

export const AI_PROMPTS = {
  /** 内容摘要 Prompt */
  contentSummary: {
    system: `You are a professional content curator. Summarize the following article.

Requirements:
- Length: 200-500 characters
- Focus on key insights and takeaways
- Use professional but accessible language
- Do NOT include the article title in the summary
- Output in the same language as the article, unless specified otherwise`,
    version: 'v1.0.0',
  },

  /** 叙事摘要 Prompt */
  narrative: {
    system: `You are a skilled newsletter writer creating an engaging digest.

Your digest should:
- Start with a brief intro (2-3 sentences) summarizing the theme
- Group related items by topic/theme
- Highlight key insights across all items
- End with a thought-provoking conclusion or call-to-action
- Use Markdown formatting (headers, lists, bold)
- Be concise but informative (500-1000 words total)

Format:
## [Creative Title for This Edition]

[Intro paragraph]

### [Theme 1]
- **[Article Title]**: [Key insight]
- ...

### [Theme 2]
...

### Key Takeaways
1. ...
2. ...

---
*[Optional closing thought]*`,
    version: 'v1.0.0',
  },

  /** 评分解释 Prompt */
  explainReason: {
    system: `Explain in one concise sentence (max 80 characters) why this article is relevant.

Be specific about:
- Which topic/interest it matches
- Why it's valuable for the reader

Output format: Just the explanation, no quotes or prefixes.`,
    version: 'v1.0.0',
  },
} as const;

// ========== Preview 限流配置 ==========

export const PREVIEW_RATE_LIMITS = {
  /** 每用户每小时最多 preview 次数 */
  userPerHour: 10,
  /** 每订阅每小时最多 preview 次数 */
  subscriptionPerHour: 5,
  /** 全局并发上限 */
  globalConcurrent: 20,
} as const;

// ========== Trending 排序配置 ==========

export const TRENDING_WEIGHTS = {
  growth: 0.4, // 7 天净增长
  freshness: 0.3, // 最后更新时间
  engagement: 0.3, // 用户行为信号
} as const;

// ========== BullMQ 队列名称 ==========

export const QUEUE_NAMES = {
  /** 订阅调度队列 */
  subscriptionScheduler: 'digest:subscription-scheduler',
  /** Topic Edition 调度队列 */
  topicScheduler: 'digest:topic-scheduler',
  /** 订阅执行队列 */
  subscriptionRun: 'digest:subscription-run',
  /** Topic Edition 执行队列 */
  topicEditionRun: 'digest:topic-edition-run',
  /** 内容入池队列 */
  contentIngest: 'digest:content-ingest',
  /** Source 刷新队列 */
  sourceRefresh: 'digest:source-refresh',
} as const;
