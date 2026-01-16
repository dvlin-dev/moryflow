/**
 * Scoring Utilities
 *
 * [PROVIDES]: 三维评分计算工具
 * [POS]: 内容排序和筛选的核心算法
 */

import { SCORE_WEIGHTS } from '../digest.constants';

/**
 * 订阅配置（扩展版）
 */
export interface SubscriptionConfig {
  topic: string;
  interests: string[];
  negativeInterests?: string[];
}

/**
 * 内容评分输入
 */
export interface ContentForScoring {
  title: string;
  description?: string;
  fulltext?: string;
  url?: string;
}

/**
 * 反馈模式（用于评分调整）
 */
export interface FeedbackPatternForScoring {
  patternType: 'KEYWORD' | 'DOMAIN' | 'AUTHOR';
  value: string;
  positiveCount: number;
  negativeCount: number;
  confidence: number;
}

/**
 * 评分维度
 */
export interface ScoreDimensions {
  /** 相关性分数（0-100，订阅私有） */
  relevance: number;
  /** 影响力分数（0-100，全局共享） */
  impact: number;
  /** 质量分数（0-100，全局共享） */
  quality: number;
}

/**
 * 评分结果
 */
export interface ScoringResult {
  /** 综合分数（0-100） */
  overall: number;
  /** 各维度分数 */
  dimensions: ScoreDimensions;
  /** 评分原因 */
  reason?: string;
}

/**
 * 计算综合评分
 * 使用配置的权重计算加权平均
 */
export function calculateOverallScore(dimensions: ScoreDimensions): number {
  const score =
    dimensions.relevance * SCORE_WEIGHTS.relevance +
    dimensions.impact * SCORE_WEIGHTS.impact +
    dimensions.quality * SCORE_WEIGHTS.quality;

  // 四舍五入到两位小数
  return Math.round(score * 100) / 100;
}

/**
 * 基于关键词匹配计算相关性分数
 * 支持负面兴趣（屏蔽词）和反馈模式调整
 */
export function calculateRelevanceScore(
  content: ContentForScoring,
  subscription: SubscriptionConfig,
  feedbackPatterns?: FeedbackPatternForScoring[],
): { score: number; reason: string; blocked?: boolean } {
  const searchText = [
    content.title,
    content.description || '',
    content.fulltext || '',
  ]
    .join(' ')
    .toLowerCase();

  // 检查负面兴趣（屏蔽词）
  if (
    subscription.negativeInterests &&
    subscription.negativeInterests.length > 0
  ) {
    for (const negative of subscription.negativeInterests) {
      if (searchText.includes(negative.toLowerCase())) {
        return {
          score: 0,
          reason: `Blocked by negative interest: ${negative}`,
          blocked: true,
        };
      }
    }
  }

  const matchedTerms: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  // 主题关键词（权重 50%）
  const topicTerms = subscription.topic.toLowerCase().split(/\s+/);
  for (const term of topicTerms) {
    if (term.length < 2) continue;
    totalWeight += 50 / topicTerms.length;
    if (searchText.includes(term)) {
      matchedWeight += 50 / topicTerms.length;
      matchedTerms.push(term);
    }
  }

  // 兴趣关键词（权重 50%）
  if (subscription.interests.length > 0) {
    const interestWeight = 50 / subscription.interests.length;
    for (const interest of subscription.interests) {
      const interestLower = interest.toLowerCase();
      totalWeight += interestWeight;
      if (searchText.includes(interestLower)) {
        matchedWeight += interestWeight;
        matchedTerms.push(interest);
      }
    }
  } else {
    // 如果没有兴趣词，主题权重提升到 100%
    totalWeight = 100;
    matchedWeight = matchedWeight * 2;
  }

  let score =
    totalWeight > 0 ? Math.min(100, (matchedWeight / totalWeight) * 100) : 0;

  // 应用反馈模式调整
  if (feedbackPatterns && feedbackPatterns.length > 0) {
    const adjustment = applyFeedbackPatterns(content, feedbackPatterns);
    score = Math.max(0, Math.min(100, score + adjustment.delta));
    if (adjustment.matchedPatterns.length > 0) {
      matchedTerms.push(...adjustment.matchedPatterns.map((p) => `[${p}]`));
    }
  }

  const reason =
    matchedTerms.length > 0
      ? `Matched: ${matchedTerms.slice(0, 5).join(', ')}${matchedTerms.length > 5 ? '...' : ''}`
      : 'No keyword matches';

  return {
    score: Math.round(score),
    reason,
  };
}

/**
 * 应用反馈模式调整分数
 */
function applyFeedbackPatterns(
  content: ContentForScoring,
  patterns: FeedbackPatternForScoring[],
): { delta: number; matchedPatterns: string[] } {
  let delta = 0;
  const matchedPatterns: string[] = [];

  const searchText = [
    content.title,
    content.description || '',
    content.fulltext || '',
  ]
    .join(' ')
    .toLowerCase();

  // 提取域名
  let domain: string | undefined;
  if (content.url) {
    try {
      domain = new URL(content.url).hostname.toLowerCase();
    } catch {
      // URL 解析失败，忽略域名模式
    }
  }

  for (const pattern of patterns) {
    let matched = false;

    switch (pattern.patternType) {
      case 'KEYWORD':
        matched = searchText.includes(pattern.value.toLowerCase());
        break;
      case 'DOMAIN':
        matched = domain === pattern.value.toLowerCase();
        break;
      case 'AUTHOR':
        // 简单文本匹配
        matched = searchText.includes(pattern.value.toLowerCase());
        break;
    }

    if (matched) {
      // 计算信号强度（对数缩放）
      const totalSignals = pattern.positiveCount + pattern.negativeCount;
      const signalStrength = Math.log10(totalSignals + 1) / Math.log10(11); // 归一化到 0-1

      // 正向 vs 负向信号比例
      const positiveRatio =
        totalSignals > 0 ? pattern.positiveCount / totalSignals : 0.5;

      // 调整幅度（最大 ±20 分）
      const maxAdjustment = 20 * pattern.confidence * signalStrength;
      const adjustment =
        positiveRatio > 0.5
          ? maxAdjustment * (positiveRatio - 0.5) * 2
          : -maxAdjustment * (0.5 - positiveRatio) * 2;

      delta += adjustment;
      matchedPatterns.push(`${pattern.patternType}:${pattern.value}`);
    }
  }

  return { delta, matchedPatterns };
}

/**
 * 计算内容影响力分数
 * 基于来源可信度、社交信号等
 */
export function calculateImpactScore(
  content: {
    siteName?: string;
    domain?: string;
    socialSignals?: {
      likes?: number;
      shares?: number;
      comments?: number;
    };
  },
  trustedDomains?: string[],
): number {
  let score = 50; // 基础分

  // 可信域名加分
  if (trustedDomains && content.domain) {
    if (trustedDomains.includes(content.domain)) {
      score += 20;
    }
  }

  // 社交信号加分
  if (content.socialSignals) {
    const { likes = 0, shares = 0, comments = 0 } = content.socialSignals;
    const engagement = likes + shares * 2 + comments * 3;

    if (engagement > 1000) score += 20;
    else if (engagement > 100) score += 10;
    else if (engagement > 10) score += 5;
  }

  // 知名站点加分
  const knownSites = [
    'github.com',
    'stackoverflow.com',
    'medium.com',
    'dev.to',
    'hackernews.com',
    'techcrunch.com',
    'wired.com',
    'arstechnica.com',
    'theverge.com',
    'nytimes.com',
    'wsj.com',
    'bbc.com',
    'reuters.com',
    'bloomberg.com',
  ];

  if (content.domain && knownSites.includes(content.domain)) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 计算内容质量分数
 * 基于内容长度、结构、可读性等
 */
export function calculateQualityScore(content: {
  title: string;
  description?: string;
  fulltext?: string;
  hasImages?: boolean;
  hasCode?: boolean;
}): number {
  let score = 50; // 基础分

  // 标题质量
  const titleLength = content.title.length;
  if (titleLength >= 20 && titleLength <= 100) {
    score += 10;
  } else if (titleLength < 10 || titleLength > 200) {
    score -= 10;
  }

  // 描述质量
  if (content.description) {
    const descLength = content.description.length;
    if (descLength >= 50 && descLength <= 300) {
      score += 10;
    }
  }

  // 全文质量
  if (content.fulltext) {
    const wordCount = content.fulltext.split(/\s+/).length;

    if (wordCount >= 300 && wordCount <= 5000) {
      score += 15;
    } else if (wordCount < 100) {
      score -= 10;
    }

    // 段落结构
    const paragraphs = content.fulltext.split(/\n\n+/).length;
    if (paragraphs >= 3) {
      score += 5;
    }
  }

  // 多媒体内容
  if (content.hasImages) {
    score += 5;
  }
  if (content.hasCode) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 批量计算评分并排序
 */
export function scoreAndRank(
  items: Array<{
    id: string;
    relevance: number;
    impact: number;
    quality: number;
  }>,
): Array<{ id: string; score: number; rank: number }> {
  // 计算综合分数
  const scored = items.map((item) => ({
    id: item.id,
    score: calculateOverallScore({
      relevance: item.relevance,
      impact: item.impact,
      quality: item.quality,
    }),
  }));

  // 按分数降序排序
  scored.sort((a, b) => b.score - a.score);

  // 添加排名
  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * 筛选通过最低分数阈值的内容
 */
export function filterByMinScore(
  items: Array<{ id: string; score: number }>,
  minScore: number,
): Array<{ id: string; score: number }> {
  return items.filter((item) => item.score >= minScore);
}
