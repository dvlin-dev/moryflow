/**
 * Scoring Utils Tests
 *
 * [PROVIDES]: 评分工具函数测试
 * [POS]: 测试三维评分计算逻辑
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOverallScore,
  calculateRelevanceScore,
  calculateImpactScore,
  calculateQualityScore,
  scoreAndRank,
  filterByMinScore,
  type SubscriptionConfig,
  type ContentForScoring,
  type FeedbackPatternForScoring,
} from '../../utils/scoring.utils';
import { SCORE_WEIGHTS } from '../../digest.constants';

describe('Scoring Utils', () => {
  // ========== calculateOverallScore ==========

  describe('calculateOverallScore', () => {
    it('should calculate weighted average with default weights (50/30/20)', () => {
      const result = calculateOverallScore({
        relevance: 100,
        impact: 100,
        quality: 100,
      });

      // 100 * 0.5 + 100 * 0.3 + 100 * 0.2 = 100
      expect(result).toBe(100);
    });

    it('should handle zero scores', () => {
      const result = calculateOverallScore({
        relevance: 0,
        impact: 0,
        quality: 0,
      });

      expect(result).toBe(0);
    });

    it('should calculate mixed scores correctly', () => {
      const result = calculateOverallScore({
        relevance: 80,
        impact: 60,
        quality: 40,
      });

      // 80 * 0.5 + 60 * 0.3 + 40 * 0.2 = 40 + 18 + 8 = 66
      expect(result).toBe(66);
    });

    it('should round to two decimal places', () => {
      const result = calculateOverallScore({
        relevance: 33,
        impact: 33,
        quality: 33,
      });

      // 33 * 0.5 + 33 * 0.3 + 33 * 0.2 = 16.5 + 9.9 + 6.6 = 33
      expect(result).toBe(33);
    });

    it('should use correct weights from constants', () => {
      expect(SCORE_WEIGHTS.relevance).toBe(0.5);
      expect(SCORE_WEIGHTS.impact).toBe(0.3);
      expect(SCORE_WEIGHTS.quality).toBe(0.2);
    });

    it('should handle boundary values', () => {
      expect(
        calculateOverallScore({
          relevance: 100,
          impact: 0,
          quality: 0,
        }),
      ).toBe(50);

      expect(
        calculateOverallScore({
          relevance: 0,
          impact: 100,
          quality: 0,
        }),
      ).toBe(30);

      expect(
        calculateOverallScore({
          relevance: 0,
          impact: 0,
          quality: 100,
        }),
      ).toBe(20);
    });
  });

  // ========== calculateRelevanceScore ==========

  describe('calculateRelevanceScore', () => {
    const baseSubscription: SubscriptionConfig = {
      topic: 'machine learning AI',
      interests: ['deep learning', 'neural networks'],
    };

    it('should match topic keywords', () => {
      const content: ContentForScoring = {
        title: 'Introduction to Machine Learning',
        description: 'Learn about AI and ML basics',
      };

      const result = calculateRelevanceScore(content, baseSubscription);

      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain('Matched');
    });

    it('should match interest keywords', () => {
      const content: ContentForScoring = {
        title: 'Deep Learning Tutorial',
        description: 'Understanding neural networks',
      };

      const result = calculateRelevanceScore(content, baseSubscription);

      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toContain('deep learning');
    });

    it('should return zero for negative interests (blocked)', () => {
      const subscription: SubscriptionConfig = {
        topic: 'programming',
        interests: ['javascript'],
        negativeInterests: ['spam', 'advertisement'],
      };

      const content: ContentForScoring = {
        title: 'Great Programming Tips',
        description: 'This is spam content',
      };

      const result = calculateRelevanceScore(content, subscription);

      expect(result.score).toBe(0);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Blocked by negative interest');
    });

    it('should be case-insensitive', () => {
      const content: ContentForScoring = {
        title: 'MACHINE LEARNING Advances',
        description: 'AI TECHNOLOGY',
      };

      const result = calculateRelevanceScore(content, baseSubscription);

      expect(result.score).toBeGreaterThan(0);
    });

    it('should return zero score with no matches', () => {
      const content: ContentForScoring = {
        title: 'Cooking Recipes',
        description: 'How to make pasta',
      };

      const result = calculateRelevanceScore(content, baseSubscription);

      expect(result.score).toBe(0);
      expect(result.reason).toBe('No keyword matches');
    });

    it('should use fulltext in matching', () => {
      const content: ContentForScoring = {
        title: 'Tech News',
        description: 'Latest updates',
        fulltext:
          'This article discusses machine learning and deep learning techniques.',
      };

      const result = calculateRelevanceScore(content, baseSubscription);

      expect(result.score).toBeGreaterThan(0);
    });

    it('should handle subscription without interests', () => {
      const subscription: SubscriptionConfig = {
        topic: 'machine learning',
        interests: [],
      };

      const content: ContentForScoring = {
        title: 'Machine Learning Guide',
        description: 'Complete tutorial',
      };

      const result = calculateRelevanceScore(content, subscription);

      expect(result.score).toBeGreaterThan(0);
    });

    // 反馈模式测试
    describe('with feedback patterns', () => {
      it('should increase score for positive patterns', () => {
        const content: ContentForScoring = {
          title: 'Machine Learning Article',
          url: 'https://trusted.com/article',
        };

        const patterns: FeedbackPatternForScoring[] = [
          {
            patternType: 'KEYWORD',
            value: 'machine',
            positiveCount: 10,
            negativeCount: 1,
            confidence: 0.8,
          },
        ];

        const withPatterns = calculateRelevanceScore(
          content,
          baseSubscription,
          patterns,
        );
        const withoutPatterns = calculateRelevanceScore(
          content,
          baseSubscription,
        );

        expect(withPatterns.score).toBeGreaterThan(withoutPatterns.score);
      });

      it('should decrease score for negative patterns', () => {
        const content: ContentForScoring = {
          title: 'Machine Learning with Clickbait',
          description: 'Something about AI',
        };

        const patterns: FeedbackPatternForScoring[] = [
          {
            patternType: 'KEYWORD',
            value: 'clickbait',
            positiveCount: 1,
            negativeCount: 10,
            confidence: 0.8,
          },
        ];

        const withPatterns = calculateRelevanceScore(
          content,
          baseSubscription,
          patterns,
        );
        const withoutPatterns = calculateRelevanceScore(
          content,
          baseSubscription,
        );

        expect(withPatterns.score).toBeLessThan(withoutPatterns.score);
      });

      it('should match DOMAIN patterns', () => {
        const content: ContentForScoring = {
          title: 'Machine Learning',
          url: 'https://trusted-source.com/article',
        };

        const patterns: FeedbackPatternForScoring[] = [
          {
            patternType: 'DOMAIN',
            value: 'trusted-source.com',
            positiveCount: 20,
            negativeCount: 0,
            confidence: 0.9,
          },
        ];

        const result = calculateRelevanceScore(
          content,
          baseSubscription,
          patterns,
        );

        expect(result.reason).toContain('DOMAIN:trusted-source.com');
      });
    });
  });

  // ========== calculateImpactScore ==========

  describe('calculateImpactScore', () => {
    it('should return base score of 50 for empty content', () => {
      const result = calculateImpactScore({});

      expect(result).toBe(50);
    });

    it('should add points for trusted domains', () => {
      const result = calculateImpactScore({ domain: 'trusted.com' }, [
        'trusted.com',
        'reliable.com',
      ]);

      expect(result).toBe(70); // 50 + 20
    });

    it('should add points for known sites', () => {
      const knownSites = [
        'github.com',
        'stackoverflow.com',
        'medium.com',
        'techcrunch.com',
      ];

      for (const site of knownSites) {
        const result = calculateImpactScore({ domain: site });
        expect(result).toBeGreaterThan(50);
      }
    });

    it('should add points for high social signals', () => {
      const result = calculateImpactScore({
        socialSignals: {
          likes: 500,
          shares: 200,
          comments: 100,
        },
      });

      // engagement = 500 + 200*2 + 100*3 = 500 + 400 + 300 = 1200 > 1000
      expect(result).toBe(70); // 50 + 20
    });

    it('should add medium points for medium social signals', () => {
      const result = calculateImpactScore({
        socialSignals: {
          likes: 50,
          shares: 20,
          comments: 10,
        },
      });

      // engagement = 50 + 20*2 + 10*3 = 50 + 40 + 30 = 120 > 100
      expect(result).toBe(60); // 50 + 10
    });

    it('should add low points for low social signals', () => {
      const result = calculateImpactScore({
        socialSignals: {
          likes: 11,
          shares: 0,
          comments: 0,
        },
      });

      // engagement = 11 + 0 + 0 = 11 > 10
      expect(result).toBe(55); // 50 + 5
    });

    it('should not add points for engagement exactly at threshold', () => {
      const result = calculateImpactScore({
        socialSignals: {
          likes: 10,
          shares: 0,
          comments: 0,
        },
      });

      // engagement = 10 + 0 + 0 = 10, threshold is > 10 (not >=)
      expect(result).toBe(50); // no bonus
    });

    it('should cap score at 100', () => {
      const result = calculateImpactScore(
        {
          domain: 'github.com',
          socialSignals: { likes: 10000, shares: 5000, comments: 2000 },
        },
        ['github.com'],
      );

      expect(result).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      // 当前实现不会减分，但测试边界
      const result = calculateImpactScore({});

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== calculateQualityScore ==========

  describe('calculateQualityScore', () => {
    it('should return base score of 50 for minimal content', () => {
      const result = calculateQualityScore({
        title: 'Short', // 短标题会减分
      });

      expect(result).toBe(40); // 50 - 10
    });

    it('should add points for good title length (20-100)', () => {
      const result = calculateQualityScore({
        title: 'This is a well-written title that is informative',
      });

      expect(result).toBe(60); // 50 + 10
    });

    it('should deduct points for very short titles', () => {
      const result = calculateQualityScore({
        title: 'Hi', // < 10 chars
      });

      expect(result).toBe(40); // 50 - 10
    });

    it('should deduct points for very long titles', () => {
      const result = calculateQualityScore({
        title: 'A'.repeat(250), // > 200 chars
      });

      expect(result).toBe(40); // 50 - 10
    });

    it('should add points for good description length (50-300)', () => {
      const result = calculateQualityScore({
        title: 'Good Title Here',
        description: 'A'.repeat(100), // 50-300 chars
      });

      expect(result).toBe(60); // 50 + 10
    });

    it('should add points for good fulltext word count (300-5000)', () => {
      const words = Array(500).fill('word').join(' ');
      const result = calculateQualityScore({
        title: 'Good Title Here',
        fulltext: words,
      });

      // 500 words = +15 points
      expect(result).toBe(65); // 50 + 15
    });

    it('should deduct points for too short fulltext', () => {
      const words = Array(50).fill('word').join(' ');
      const result = calculateQualityScore({
        title: 'Good Title Here',
        fulltext: words,
      });

      // < 100 words = -10 points
      expect(result).toBe(40); // 50 - 10
    });

    it('should add points for paragraph structure', () => {
      const fulltext = `First paragraph here.

Second paragraph here.

Third paragraph here.`;

      const result = calculateQualityScore({
        title: 'Good Title Here',
        fulltext,
      });

      // 3+ paragraphs = +5 points (but fulltext is short, so -10)
      expect(result).toBe(45); // 50 - 10 (short) + 5 (paragraphs)
    });

    it('should add points for images', () => {
      const result = calculateQualityScore({
        title: 'Good Title Here',
        hasImages: true,
      });

      expect(result).toBe(55); // 50 + 5
    });

    it('should add points for code', () => {
      const result = calculateQualityScore({
        title: 'Good Title Here',
        hasCode: true,
      });

      expect(result).toBe(55); // 50 + 5
    });

    it('should cap score at 100', () => {
      const words = Array(1000).fill('word').join(' ');
      const result = calculateQualityScore({
        title: 'A well-written and informative title here',
        description: 'A'.repeat(150),
        fulltext: `${words}

${words}

${words}`,
        hasImages: true,
        hasCode: true,
      });

      expect(result).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const result = calculateQualityScore({
        title: 'x', // very short
        fulltext: 'tiny', // very short
      });

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== scoreAndRank ==========

  describe('scoreAndRank', () => {
    it('should calculate overall scores and rank in descending order', () => {
      const items = [
        { id: 'a', relevance: 50, impact: 50, quality: 50 },
        { id: 'b', relevance: 100, impact: 100, quality: 100 },
        { id: 'c', relevance: 70, impact: 60, quality: 80 },
      ];

      const result = scoreAndRank(items);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('b');
      expect(result[0].rank).toBe(1);
      expect(result[0].score).toBe(100);

      expect(result[2].id).toBe('a');
      expect(result[2].rank).toBe(3);
      expect(result[2].score).toBe(50);
    });

    it('should handle empty array', () => {
      const result = scoreAndRank([]);

      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const items = [{ id: 'only', relevance: 80, impact: 60, quality: 40 }];

      const result = scoreAndRank(items);

      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it('should handle items with same score', () => {
      const items = [
        { id: 'a', relevance: 50, impact: 50, quality: 50 },
        { id: 'b', relevance: 50, impact: 50, quality: 50 },
      ];

      const result = scoreAndRank(items);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });
  });

  // ========== filterByMinScore ==========

  describe('filterByMinScore', () => {
    it('should filter items below minimum score', () => {
      const items = [
        { id: 'a', score: 30 },
        { id: 'b', score: 70 },
        { id: 'c', score: 90 },
      ];

      const result = filterByMinScore(items, 50);

      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['b', 'c']);
    });

    it('should include items at exactly minimum score', () => {
      const items = [
        { id: 'a', score: 50 },
        { id: 'b', score: 49 },
      ];

      const result = filterByMinScore(items, 50);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('should return empty array when all below minimum', () => {
      const items = [
        { id: 'a', score: 10 },
        { id: 'b', score: 20 },
      ];

      const result = filterByMinScore(items, 50);

      expect(result).toEqual([]);
    });

    it('should return all items when all above minimum', () => {
      const items = [
        { id: 'a', score: 60 },
        { id: 'b', score: 80 },
      ];

      const result = filterByMinScore(items, 50);

      expect(result).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = filterByMinScore([], 50);

      expect(result).toEqual([]);
    });

    it('should handle zero minimum', () => {
      const items = [
        { id: 'a', score: 0 },
        { id: 'b', score: 10 },
      ];

      const result = filterByMinScore(items, 0);

      expect(result).toHaveLength(2);
    });
  });
});
