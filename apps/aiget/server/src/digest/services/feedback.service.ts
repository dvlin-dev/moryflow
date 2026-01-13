/**
 * Digest Feedback Service
 *
 * [INPUT]: 用户反馈信号（save/notInterested）、内容元数据
 * [OUTPUT]: 反馈模式、学习建议、调整后的订阅配置
 * [POS]: 个性化反馈学习系统，分析用户行为并生成优化建议
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DigestFeedbackTermType,
  DigestFeedbackPattern,
} from '../../../generated/prisma-main/client';
import { FEEDBACK_LEARNING } from '../digest.constants';

/**
 * 反馈类型
 */
export type FeedbackType = 'positive' | 'negative';

/**
 * 内容元数据（用于提取模式）
 */
export interface ContentMetadata {
  url: string;
  title: string;
  description?: string;
  siteName?: string;
  author?: string;
  aiSummary?: string;
}

/**
 * 提取的模式
 */
export interface ExtractedPattern {
  patternType: DigestFeedbackTermType;
  value: string;
}

/**
 * 学习建议
 */
export interface LearningSuggestion {
  id: string; // 格式：patternType:value
  type: 'add_interest' | 'remove_interest' | 'add_negative' | 'adjust_score';
  patternType: DigestFeedbackTermType;
  value: string;
  confidence: number; // 0-1
  reason: string;
  positiveCount: number;
  negativeCount: number;
}

/**
 * 反馈统计
 */
export interface FeedbackStats {
  totalPositive: number;
  totalNegative: number;
  topPositiveTerms: Array<{
    value: string;
    patternType: DigestFeedbackTermType;
    count: number;
  }>;
  topNegativeTerms: Array<{
    value: string;
    patternType: DigestFeedbackTermType;
    count: number;
  }>;
}

@Injectable()
export class DigestFeedbackService {
  private readonly logger = new Logger(DigestFeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录反馈信号
   * 当用户 save 或 notInterested 时调用
   */
  async recordFeedback(
    subscriptionId: string,
    content: ContentMetadata,
    feedbackType: FeedbackType,
  ): Promise<void> {
    this.logger.debug(
      `Recording ${feedbackType} feedback for subscription ${subscriptionId}, content: ${content.url}`,
    );

    // 1. 提取模式
    const patterns = this.extractPatterns(content);

    if (patterns.length === 0) {
      this.logger.debug('No patterns extracted from content');
      return;
    }

    // 2. 更新反馈模式
    const now = new Date();
    for (const pattern of patterns) {
      try {
        // 查找现有模式
        const existing = await this.prisma.digestFeedbackPattern.findUnique({
          where: {
            subscriptionId_patternType_value: {
              subscriptionId,
              patternType: pattern.patternType,
              value: pattern.value,
            },
          },
        });

        if (existing) {
          await this.prisma.digestFeedbackPattern.update({
            where: { id: existing.id },
            data: {
              positiveCount:
                feedbackType === 'positive' ? { increment: 1 } : undefined,
              negativeCount:
                feedbackType === 'negative' ? { increment: 1 } : undefined,
              confidence: this.calculateConfidence(
                feedbackType === 'positive'
                  ? existing.positiveCount + 1
                  : existing.positiveCount,
                feedbackType === 'negative'
                  ? existing.negativeCount + 1
                  : existing.negativeCount,
              ),
              lastContentUrl: content.url,
              lastTriggeredAt: now,
            },
          });
        } else {
          await this.prisma.digestFeedbackPattern.create({
            data: {
              subscriptionId,
              patternType: pattern.patternType,
              value: pattern.value,
              positiveCount: feedbackType === 'positive' ? 1 : 0,
              negativeCount: feedbackType === 'negative' ? 1 : 0,
              confidence: 0.5, // 初始置信度
              lastContentUrl: content.url,
              lastTriggeredAt: now,
            },
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to upsert feedback pattern ${pattern.patternType}:${pattern.value}`,
          error,
        );
      }
    }

    this.logger.debug(
      `Recorded ${patterns.length} patterns for ${feedbackType} feedback`,
    );
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    positiveCount: number,
    negativeCount: number,
  ): number {
    const total = positiveCount + negativeCount;
    if (total < 2) return 0.5;

    // 使用 Wilson Score 的简化版本
    const ratio = Math.max(positiveCount, negativeCount) / total;
    const signalStrength = Math.min(1, Math.log10(total + 1) / Math.log10(11));

    return ratio * signalStrength;
  }

  /**
   * 从内容中提取模式
   */
  extractPatterns(content: ContentMetadata): ExtractedPattern[] {
    const patterns: ExtractedPattern[] = [];

    // 1. 提取域名
    if (content.url) {
      try {
        const domain = new URL(content.url).hostname.toLowerCase();
        patterns.push({
          patternType: 'DOMAIN',
          value: domain,
        });
      } catch {
        // 忽略无效 URL
      }
    }

    // 2. 提取作者
    if (content.author && content.author.trim()) {
      patterns.push({
        patternType: 'AUTHOR',
        value: content.author.trim().toLowerCase(),
      });
    }

    // 3. 提取关键词（从标题和描述）
    const text = [content.title, content.description || ''].join(' ');
    const keywords = this.extractKeywords(text);

    for (const keyword of keywords) {
      patterns.push({
        patternType: 'KEYWORD',
        value: keyword,
      });
    }

    return patterns;
  }

  /**
   * 从文本中提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 移除常见停用词
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'it',
      'its',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'we',
      'they',
      'what',
      'which',
      'who',
      'whom',
      'how',
      'when',
      'where',
      'why',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'new',
      'now',
      '的',
      '是',
      '在',
      '有',
      '和',
      '与',
      '了',
      '也',
      '等',
      '这',
      '那',
    ]);

    // 分词并过滤
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中英文和数字
      .split(/\s+/)
      .filter((word) => {
        return word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word);
      });

    // 去重并限制数量
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, FEEDBACK_LEARNING.maxKeywordsPerContent);
  }

  /**
   * 获取学习建议
   */
  async getSuggestions(subscriptionId: string): Promise<LearningSuggestion[]> {
    // 获取反馈模式
    const patterns = await this.prisma.digestFeedbackPattern.findMany({
      where: { subscriptionId },
      orderBy: [{ positiveCount: 'desc' }, { negativeCount: 'desc' }],
      take: 100,
    });

    const suggestions: LearningSuggestion[] = [];

    for (const pattern of patterns) {
      const total = pattern.positiveCount + pattern.negativeCount;
      if (total < FEEDBACK_LEARNING.minSignalsForSuggestion) {
        continue;
      }

      const positiveRatio = pattern.positiveCount / total;
      const negativeRatio = pattern.negativeCount / total;

      // 强正向信号：添加到 interests
      if (
        positiveRatio >= FEEDBACK_LEARNING.positiveThreshold &&
        pattern.positiveCount >= FEEDBACK_LEARNING.minPositiveForInterest
      ) {
        suggestions.push({
          id: `${pattern.patternType}:${pattern.value}`,
          type: 'add_interest',
          patternType: pattern.patternType,
          value: pattern.value,
          confidence: positiveRatio,
          reason: `Saved ${pattern.positiveCount} times (${Math.round(positiveRatio * 100)}% positive)`,
          positiveCount: pattern.positiveCount,
          negativeCount: pattern.negativeCount,
        });
      }

      // 强负向信号：添加到 negativeInterests
      if (
        negativeRatio >= FEEDBACK_LEARNING.negativeThreshold &&
        pattern.negativeCount >= FEEDBACK_LEARNING.minNegativeForBlock
      ) {
        suggestions.push({
          id: `${pattern.patternType}:${pattern.value}`,
          type: 'add_negative',
          patternType: pattern.patternType,
          value: pattern.value,
          confidence: negativeRatio,
          reason: `Marked not interested ${pattern.negativeCount} times (${Math.round(negativeRatio * 100)}% negative)`,
          positiveCount: pattern.positiveCount,
          negativeCount: pattern.negativeCount,
        });
      }
    }

    // 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, FEEDBACK_LEARNING.maxSuggestions);
  }

  /**
   * 应用学习建议到订阅
   */
  async applySuggestions(
    subscriptionId: string,
    suggestionIds: string[], // 格式：patternType:value
  ): Promise<{ applied: number; skipped: number }> {
    // 获取订阅
    const subscription = await this.prisma.digestSubscription.findFirst({
      where: {
        id: subscriptionId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      return { applied: 0, skipped: 0 };
    }

    // 获取所有建议
    const allSuggestions = await this.getSuggestions(subscriptionId);

    // 过滤选中的建议
    const selectedSuggestions = allSuggestions.filter((s) =>
      suggestionIds.includes(s.id),
    );

    let applied = 0;
    let skipped = 0;

    const currentInterests = new Set(
      subscription.interests.map((i: string) => i.toLowerCase()),
    );
    const currentNegative = new Set(
      subscription.negativeInterests.map((i: string) => i.toLowerCase()),
    );

    const newInterests: string[] = [];
    const newNegative: string[] = [];

    for (const suggestion of selectedSuggestions) {
      const valueLower = suggestion.value.toLowerCase();

      if (suggestion.type === 'add_interest') {
        // 只添加 KEYWORD 类型到 interests
        if (
          suggestion.patternType === 'KEYWORD' &&
          !currentInterests.has(valueLower)
        ) {
          newInterests.push(suggestion.value);
          applied++;
        } else {
          skipped++;
        }
      } else if (suggestion.type === 'add_negative') {
        if (!currentNegative.has(valueLower)) {
          newNegative.push(suggestion.value);
          applied++;
        } else {
          skipped++;
        }
      }
    }

    // 更新订阅
    if (newInterests.length > 0 || newNegative.length > 0) {
      await this.prisma.digestSubscription.update({
        where: { id: subscriptionId },
        data: {
          interests: {
            push: newInterests,
          },
          negativeInterests: {
            push: newNegative,
          },
        },
      });
    }

    this.logger.log(
      `Applied ${applied} suggestions to subscription ${subscriptionId}`,
    );

    return { applied, skipped };
  }

  /**
   * 获取反馈统计
   */
  async getStats(subscriptionId: string): Promise<FeedbackStats> {
    // 总计
    const totals = await this.prisma.digestFeedbackPattern.aggregate({
      where: { subscriptionId },
      _sum: {
        positiveCount: true,
        negativeCount: true,
      },
    });

    // Top 正向
    const topPositive = await this.prisma.digestFeedbackPattern.findMany({
      where: {
        subscriptionId,
        positiveCount: { gt: 0 },
      },
      orderBy: { positiveCount: 'desc' },
      take: 10,
      select: {
        value: true,
        patternType: true,
        positiveCount: true,
      },
    });

    // Top 负向
    const topNegative = await this.prisma.digestFeedbackPattern.findMany({
      where: {
        subscriptionId,
        negativeCount: { gt: 0 },
      },
      orderBy: { negativeCount: 'desc' },
      take: 10,
      select: {
        value: true,
        patternType: true,
        negativeCount: true,
      },
    });

    return {
      totalPositive: totals._sum.positiveCount || 0,
      totalNegative: totals._sum.negativeCount || 0,
      topPositiveTerms: topPositive.map((p) => ({
        value: p.value,
        patternType: p.patternType,
        count: p.positiveCount,
      })),
      topNegativeTerms: topNegative.map((p) => ({
        value: p.value,
        patternType: p.patternType,
        count: p.negativeCount,
      })),
    };
  }

  /**
   * 获取订阅的所有反馈模式
   */
  async getPatterns(
    subscriptionId: string,
    options?: {
      patternType?: DigestFeedbackTermType;
      limit?: number;
      offset?: number;
    },
  ): Promise<DigestFeedbackPattern[]> {
    const { patternType, limit = 50, offset = 0 } = options || {};

    return this.prisma.digestFeedbackPattern.findMany({
      where: {
        subscriptionId,
        ...(patternType ? { patternType } : {}),
      },
      orderBy: [{ positiveCount: 'desc' }, { negativeCount: 'desc' }],
      take: limit,
      skip: offset,
    });
  }

  /**
   * 清理订阅反馈数据
   */
  async clearPatterns(subscriptionId: string): Promise<number> {
    const result = await this.prisma.digestFeedbackPattern.deleteMany({
      where: { subscriptionId },
    });

    this.logger.log(
      `Cleared ${result.count} feedback patterns for subscription ${subscriptionId}`,
    );

    return result.count;
  }
}
