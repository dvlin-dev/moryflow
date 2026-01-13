/**
 * Scoring Utilities
 *
 * [PROVIDES]: 三维评分计算工具
 * [POS]: 内容排序和筛选的核心算法
 */

import { SCORE_WEIGHTS } from '../digest.constants';

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
 */
export function calculateRelevanceScore(
  content: {
    title: string;
    description?: string;
    fulltext?: string;
  },
  subscription: {
    topic: string;
    interests: string[];
  },
): { score: number; reason: string } {
  const searchText = [
    content.title,
    content.description || '',
    content.fulltext || '',
  ]
    .join(' ')
    .toLowerCase();

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

  const score =
    totalWeight > 0 ? Math.min(100, (matchedWeight / totalWeight) * 100) : 0;

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
