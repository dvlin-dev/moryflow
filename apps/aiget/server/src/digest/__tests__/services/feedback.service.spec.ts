/**
 * Digest Feedback Service Tests
 *
 * [PROVIDES]: DigestFeedbackService 单元测试
 * [POS]: 测试反馈记录与学习建议逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestFeedbackService } from '../../services/feedback.service';
import { createMockPrisma, type MockPrismaDigest } from '../mocks';
import { FEEDBACK_LEARNING } from '../../digest.constants';

describe('DigestFeedbackService', () => {
  let service: DigestFeedbackService;
  let mockPrisma: MockPrismaDigest;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestFeedbackService(mockPrisma as any);
  });

  // ========== recordFeedback ==========

  describe('recordFeedback', () => {
    const content = {
      url: 'https://example.com/article',
      title: 'AI News: Latest Developments',
      description: 'Machine learning advances in 2024',
      author: 'John Doe',
    };

    it('should create new feedback patterns', async () => {
      mockPrisma.digestFeedbackPattern.findUnique.mockResolvedValue(null);
      mockPrisma.digestFeedbackPattern.create.mockResolvedValue({});

      await service.recordFeedback('sub-1', content, 'positive');

      expect(mockPrisma.digestFeedbackPattern.create).toHaveBeenCalled();
    });

    it('should update existing feedback pattern with positive signal', async () => {
      mockPrisma.digestFeedbackPattern.findUnique.mockResolvedValue({
        id: 'pattern-1',
        positiveCount: 5,
        negativeCount: 2,
      });
      mockPrisma.digestFeedbackPattern.update.mockResolvedValue({});

      await service.recordFeedback('sub-1', content, 'positive');

      expect(mockPrisma.digestFeedbackPattern.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pattern-1' },
          data: expect.objectContaining({
            positiveCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should update existing feedback pattern with negative signal', async () => {
      mockPrisma.digestFeedbackPattern.findUnique.mockResolvedValue({
        id: 'pattern-1',
        positiveCount: 3,
        negativeCount: 1,
      });
      mockPrisma.digestFeedbackPattern.update.mockResolvedValue({});

      await service.recordFeedback('sub-1', content, 'negative');

      expect(mockPrisma.digestFeedbackPattern.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            negativeCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should not fail when pattern extraction fails', async () => {
      mockPrisma.digestFeedbackPattern.findUnique.mockRejectedValue(
        new Error('DB error'),
      );

      // Should not throw
      await expect(
        service.recordFeedback('sub-1', content, 'positive'),
      ).resolves.not.toThrow();
    });

    it('should handle content with no extractable patterns', async () => {
      const emptyContent = {
        url: 'invalid-url',
        title: '', // Empty title
      };

      await service.recordFeedback('sub-1', emptyContent, 'positive');

      // Should not call create since no patterns extracted
      expect(mockPrisma.digestFeedbackPattern.create).not.toHaveBeenCalled();
    });
  });

  // ========== extractPatterns ==========

  describe('extractPatterns', () => {
    it('should extract domain from URL', () => {
      const patterns = service.extractPatterns({
        url: 'https://www.example.com/article',
        title: 'Test',
      });

      const domainPattern = patterns.find((p) => p.patternType === 'DOMAIN');
      expect(domainPattern).toBeDefined();
      expect(domainPattern?.value).toBe('www.example.com');
    });

    it('should extract author', () => {
      const patterns = service.extractPatterns({
        url: 'https://example.com',
        title: 'Test',
        author: 'Jane Smith',
      });

      const authorPattern = patterns.find((p) => p.patternType === 'AUTHOR');
      expect(authorPattern).toBeDefined();
      expect(authorPattern?.value).toBe('jane smith');
    });

    it('should extract keywords from title', () => {
      const patterns = service.extractPatterns({
        url: 'https://example.com',
        title: 'Machine Learning Advances in AI Research',
      });

      const keywords = patterns
        .filter((p) => p.patternType === 'KEYWORD')
        .map((p) => p.value);

      expect(keywords).toContain('machine');
      expect(keywords).toContain('learning');
      expect(keywords).toContain('advances');
      expect(keywords).toContain('research');
    });

    it('should filter out stop words', () => {
      const patterns = service.extractPatterns({
        url: 'https://example.com',
        title: 'The New Way to Build AI Systems',
      });

      const keywords = patterns
        .filter((p) => p.patternType === 'KEYWORD')
        .map((p) => p.value);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('to');
      expect(keywords).toContain('build');
      expect(keywords).toContain('systems');
    });

    it('should limit keywords per content', () => {
      const patterns = service.extractPatterns({
        url: 'https://example.com',
        title: 'Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10',
      });

      const keywords = patterns.filter((p) => p.patternType === 'KEYWORD');
      expect(keywords.length).toBeLessThanOrEqual(
        FEEDBACK_LEARNING.maxKeywordsPerContent,
      );
    });

    it('should handle Chinese text', () => {
      const patterns = service.extractPatterns({
        url: 'https://example.com',
        title: '人工智能新进展',
      });

      const keywords = patterns
        .filter((p) => p.patternType === 'KEYWORD')
        .map((p) => p.value);

      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should handle empty or missing URL', () => {
      const patterns = service.extractPatterns({
        url: '',
        title: 'Test Article',
      });

      const domainPattern = patterns.find((p) => p.patternType === 'DOMAIN');
      expect(domainPattern).toBeUndefined();
    });
  });

  // ========== getSuggestions ==========

  describe('getSuggestions', () => {
    it('should return suggestions for strong positive patterns', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'KEYWORD',
          value: 'ai',
          positiveCount: 5,
          negativeCount: 0,
        },
      ]);

      const suggestions = await service.getSuggestions('sub-1');

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('add_interest');
      expect(suggestions[0].value).toBe('ai');
    });

    it('should return suggestions for strong negative patterns', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'DOMAIN',
          value: 'spam.com',
          positiveCount: 0,
          negativeCount: 3,
        },
      ]);

      const suggestions = await service.getSuggestions('sub-1');

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('add_negative');
      expect(suggestions[0].value).toBe('spam.com');
    });

    it('should not suggest patterns with insufficient signals', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'KEYWORD',
          value: 'test',
          positiveCount: 1, // Below minSignalsForSuggestion
          negativeCount: 0,
        },
      ]);

      const suggestions = await service.getSuggestions('sub-1');

      expect(suggestions).toHaveLength(0);
    });

    it('should sort suggestions by confidence', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'KEYWORD',
          value: 'ai',
          positiveCount: 3,
          negativeCount: 1,
        },
        {
          patternType: 'KEYWORD',
          value: 'ml',
          positiveCount: 8,
          negativeCount: 0,
        },
      ]);

      const suggestions = await service.getSuggestions('sub-1');

      expect(suggestions[0].value).toBe('ml');
    });

    it('should limit suggestions to maxSuggestions', async () => {
      const manyPatterns = Array.from({ length: 30 }, (_, i) => ({
        patternType: 'KEYWORD',
        value: `keyword${i}`,
        positiveCount: 5,
        negativeCount: 0,
      }));

      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue(manyPatterns);

      const suggestions = await service.getSuggestions('sub-1');

      expect(suggestions.length).toBeLessThanOrEqual(
        FEEDBACK_LEARNING.maxSuggestions,
      );
    });
  });

  // ========== applySuggestions ==========

  describe('applySuggestions', () => {
    it('should add keyword to interests', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        interests: ['existing'],
        negativeInterests: [],
      });
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'KEYWORD',
          value: 'ai',
          positiveCount: 5,
          negativeCount: 0,
        },
      ]);
      mockPrisma.digestSubscription.update.mockResolvedValue({});

      const result = await service.applySuggestions('sub-1', ['KEYWORD:ai']);

      expect(result.applied).toBe(1);
      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interests: { push: ['ai'] },
          }),
        }),
      );
    });

    it('should add domain to negative interests', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        interests: [],
        negativeInterests: [],
      });
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'DOMAIN',
          value: 'spam.com',
          positiveCount: 0,
          negativeCount: 5,
        },
      ]);
      mockPrisma.digestSubscription.update.mockResolvedValue({});

      const result = await service.applySuggestions('sub-1', [
        'DOMAIN:spam.com',
      ]);

      expect(result.applied).toBe(1);
      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            negativeInterests: { push: ['spam.com'] },
          }),
        }),
      );
    });

    it('should skip already existing interests', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        interests: ['ai'],
        negativeInterests: [],
      });
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        {
          patternType: 'KEYWORD',
          value: 'ai',
          positiveCount: 5,
          negativeCount: 0,
        },
      ]);

      const result = await service.applySuggestions('sub-1', ['KEYWORD:ai']);

      expect(result.skipped).toBe(1);
      expect(result.applied).toBe(0);
    });

    it('should return zeros when subscription not found', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      const result = await service.applySuggestions('sub-1', ['KEYWORD:ai']);

      expect(result.applied).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  // ========== getStats ==========

  describe('getStats', () => {
    it('should return feedback statistics', async () => {
      mockPrisma.digestFeedbackPattern.aggregate.mockResolvedValue({
        _sum: { positiveCount: 50, negativeCount: 10 },
      });
      mockPrisma.digestFeedbackPattern.findMany
        .mockResolvedValueOnce([
          { value: 'ai', patternType: 'KEYWORD', positiveCount: 20 },
          { value: 'ml', patternType: 'KEYWORD', positiveCount: 15 },
        ])
        .mockResolvedValueOnce([
          { value: 'spam.com', patternType: 'DOMAIN', negativeCount: 5 },
        ]);

      const stats = await service.getStats('sub-1');

      expect(stats.totalPositive).toBe(50);
      expect(stats.totalNegative).toBe(10);
      expect(stats.topPositiveTerms).toHaveLength(2);
      expect(stats.topNegativeTerms).toHaveLength(1);
    });

    it('should handle null sums', async () => {
      mockPrisma.digestFeedbackPattern.aggregate.mockResolvedValue({
        _sum: { positiveCount: null, negativeCount: null },
      });
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([]);

      const stats = await service.getStats('sub-1');

      expect(stats.totalPositive).toBe(0);
      expect(stats.totalNegative).toBe(0);
    });
  });

  // ========== getPatterns ==========

  describe('getPatterns', () => {
    it('should return paginated patterns', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([
        { patternType: 'KEYWORD', value: 'ai' },
      ]);

      const patterns = await service.getPatterns('sub-1', {
        page: 1,
        limit: 10,
      });

      expect(patterns).toHaveLength(1);
      expect(mockPrisma.digestFeedbackPattern.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should filter by pattern type', async () => {
      mockPrisma.digestFeedbackPattern.findMany.mockResolvedValue([]);

      await service.getPatterns('sub-1', { patternType: 'DOMAIN' });

      expect(mockPrisma.digestFeedbackPattern.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patternType: 'DOMAIN',
          }),
        }),
      );
    });
  });

  // ========== clearPatterns ==========

  describe('clearPatterns', () => {
    it('should delete all patterns for subscription', async () => {
      mockPrisma.digestFeedbackPattern.deleteMany.mockResolvedValue({
        count: 15,
      });

      const result = await service.clearPatterns('sub-1');

      expect(result).toBe(15);
      expect(mockPrisma.digestFeedbackPattern.deleteMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub-1' },
      });
    });
  });
});
