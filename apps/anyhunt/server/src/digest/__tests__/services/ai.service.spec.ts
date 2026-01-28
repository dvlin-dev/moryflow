/**
 * Digest AI Service Tests
 *
 * [PROVIDES]: DigestAiService 单元测试
 * [POS]: 测试 AI 调用相关逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BILLING, AI_SUMMARY } from '../../digest.constants';
import type { DigestAiService } from '../../services/ai.service';

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}));

describe('DigestAiService', () => {
  let service: DigestAiService;
  let DigestAiServiceRef: typeof import('../../services/ai.service').DigestAiService;
  let mockLlmLanguageModelService: { resolveModel: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGenerateText.mockReset();
    ({ DigestAiService: DigestAiServiceRef } =
      await import('../../services/ai.service'));

    mockLlmLanguageModelService = {
      resolveModel: vi.fn().mockResolvedValue({
        model: {} as any,
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        modelConfig: {
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
        provider: {
          id: 'lp_test',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: null,
        },
      }),
    };

    service = new DigestAiServiceRef(mockLlmLanguageModelService as any);
  });

  // ========== generateSummary ==========

  describe('generateSummary', () => {
    it('should generate summary using LLM', async () => {
      mockGenerateText.mockResolvedValue({ text: 'AI generated summary' });

      const result = await service.generateSummary(
        {
          title: 'Test Article',
          description: 'Article description',
          fulltext: 'A'.repeat(500),
          url: 'https://example.com',
        },
        'en',
      );

      expect(result.result).toBe('AI generated summary');
      expect(result.cost).toBe(BILLING.costs['ai.summary']);
    });

    it('should return fallback when content too short', async () => {
      const result = await service.generateSummary(
        {
          title: 'Short',
          description: 'Short description',
          url: 'https://example.com',
        },
        'en',
      );

      expect(result.result).toBe('Short description');
      expect(result.cost).toBe(0);
    });

    it('should use description as fallback when no fulltext', async () => {
      const result = await service.generateSummary(
        {
          title: 'Title',
          description: 'This is the description text',
          url: 'https://example.com',
        },
        'en',
      );

      expect(result.result).toBe('This is the description text');
      expect(result.cost).toBe(0);
    });

    it('should truncate result to maxLength', async () => {
      const longSummary = 'A'.repeat(1000);
      mockGenerateText.mockResolvedValue({ text: longSummary });

      const result = await service.generateSummary(
        {
          title: 'Test',
          description: 'Desc',
          fulltext: 'B'.repeat(500),
          url: 'https://example.com',
        },
        'en',
      );

      expect(result.result.length).toBeLessThanOrEqual(AI_SUMMARY.maxLength);
    });

    it('should record billing when breakdown provided', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Summary' });
      const billing: Record<string, any> = {};

      await service.generateSummary(
        {
          title: 'Test',
          fulltext: 'C'.repeat(500),
          url: 'https://example.com',
        },
        'en',
        billing,
      );

      expect(billing['ai.summary']).toBeDefined();
      expect(billing['ai.summary'].count).toBe(1);
      expect(billing['ai.summary'].costPerCall).toBe(
        BILLING.costs['ai.summary'],
      );
    });

    it('should return fallback on LLM error', async () => {
      mockGenerateText.mockRejectedValue(new Error('LLM error'));

      const result = await service.generateSummary(
        {
          title: 'Test',
          description: 'Fallback description',
          fulltext: 'D'.repeat(500),
          url: 'https://example.com',
        },
        'en',
      );

      expect(result.result).toBe('Fallback description');
      expect(result.cost).toBe(0);
    });

    it('should add locale instruction for non-English', async () => {
      mockGenerateText.mockResolvedValue({ text: '中文摘要' });

      await service.generateSummary(
        {
          title: 'Test',
          fulltext: 'E'.repeat(500),
          url: 'https://example.com',
        },
        'zh',
      );

      const call = mockGenerateText.mock.calls[0]?.[0] as any;
      const systemMessage = call?.messages?.find(
        (m: any) => m.role === 'system',
      );
      expect(systemMessage?.content).toContain('Output language: zh');
    });
  });

  // ========== generateNarrative ==========

  describe('generateNarrative', () => {
    const items = [
      {
        title: 'Article 1',
        url: 'https://example.com/1',
        aiSummary: 'Summary 1',
        scoreOverall: 80,
        scoringReason: 'Matched AI',
      },
      {
        title: 'Article 2',
        url: 'https://example.com/2',
        aiSummary: 'Summary 2',
        scoreOverall: 70,
      },
    ];

    const subscription = {
      topic: 'AI News',
      interests: ['machine learning', 'llm'],
    };

    it('should generate narrative for multiple items', async () => {
      mockGenerateText.mockResolvedValue({ text: '## AI News Digest' });

      const result = await service.generateNarrative(items, subscription, 'en');

      expect(result.result).toBe('## AI News Digest');
      expect(result.cost).toBe(BILLING.costs['ai.narrative']);
    });

    it('should return empty for no items', async () => {
      const result = await service.generateNarrative([], subscription, 'en');

      expect(result.result).toBe('');
      expect(result.cost).toBe(0);
    });

    it('should include all items in prompt', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Narrative' });

      await service.generateNarrative(items, subscription, 'en');

      const call = mockGenerateText.mock.calls[0]?.[0] as any;
      const userMessage = call?.messages?.find((m: any) => m.role === 'user');
      expect(userMessage?.content).toContain('Article 1');
      expect(userMessage?.content).toContain('Article 2');
    });

    it('should record billing', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Narrative' });
      const billing: Record<string, any> = {};

      await service.generateNarrative(items, subscription, 'en', billing);

      expect(billing['ai.narrative']).toBeDefined();
      expect(billing['ai.narrative'].count).toBe(1);
    });

    it('should return fallback narrative on error', async () => {
      mockGenerateText.mockRejectedValue(new Error('LLM error'));

      const result = await service.generateNarrative(items, subscription, 'en');

      expect(result.result).toContain('## AI News Digest');
      expect(result.result).toContain('Article 1');
      expect(result.cost).toBe(0);
    });
  });

  // ========== generateReason ==========

  describe('generateReason', () => {
    const subscription = {
      topic: 'AI',
      interests: ['machine learning'],
    };

    it('should return existing reason if already good', async () => {
      const result = await service.generateReason(
        {
          title: 'Article',
          heuristicReason: 'Matched: machine learning, AI, neural networks',
        },
        subscription,
      );

      expect(result.result).toBe(
        'Matched: machine learning, AI, neural networks',
      );
      expect(result.cost).toBe(0);
    });

    it('should generate enhanced reason for poor heuristic', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Relevant to AI research' });

      const result = await service.generateReason(
        {
          title: 'Article',
          heuristicReason: 'No keyword matches',
        },
        subscription,
      );

      expect(result.result).toBe('Relevant to AI research');
      expect(result.cost).toBe(BILLING.costs['ai.explainReason']);
    });

    it('should truncate reason to 100 chars', async () => {
      mockGenerateText.mockResolvedValue({ text: 'A'.repeat(200) });

      const result = await service.generateReason(
        {
          title: 'Article',
          heuristicReason: 'Short',
        },
        subscription,
      );

      expect(result.result.length).toBeLessThanOrEqual(100);
    });

    it('should fallback to heuristic on error', async () => {
      mockGenerateText.mockRejectedValue(new Error('LLM error'));

      const result = await service.generateReason(
        {
          title: 'Article',
          heuristicReason: 'No keyword matches',
        },
        subscription,
      );

      expect(result.result).toBe('No keyword matches');
      expect(result.cost).toBe(0);
    });
  });

  // ========== generateSummaryBatch ==========

  describe('generateSummaryBatch', () => {
    it('should process items in batches', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Summary' });

      const inputs = [
        { title: 'A1', fulltext: 'X'.repeat(500), url: 'https://a.com/1' },
        { title: 'A2', fulltext: 'X'.repeat(500), url: 'https://a.com/2' },
        { title: 'A3', fulltext: 'X'.repeat(500), url: 'https://a.com/3' },
        { title: 'A4', fulltext: 'X'.repeat(500), url: 'https://a.com/4' },
        { title: 'A5', fulltext: 'X'.repeat(500), url: 'https://a.com/5' },
      ];

      const result = await service.generateSummaryBatch(
        inputs,
        'en',
        undefined,
        2,
      );

      expect(result.size).toBe(5);
      expect(result.get('https://a.com/1')).toBe('Summary');
    });

    it('should use default concurrency of 3', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Summary' });

      const inputs = [
        { title: 'A1', fulltext: 'Y'.repeat(500), url: 'https://b.com/1' },
        { title: 'A2', fulltext: 'Y'.repeat(500), url: 'https://b.com/2' },
      ];

      const result = await service.generateSummaryBatch(inputs, 'en');

      expect(result.size).toBe(2);
    });

    it('should track billing across batch', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Summary' });
      const billing: Record<string, any> = {};

      const inputs = [
        { title: 'A1', fulltext: 'Z'.repeat(500), url: 'https://c.com/1' },
        { title: 'A2', fulltext: 'Z'.repeat(500), url: 'https://c.com/2' },
        { title: 'A3', fulltext: 'Z'.repeat(500), url: 'https://c.com/3' },
      ];

      await service.generateSummaryBatch(inputs, 'en', billing);

      expect(billing['ai.summary']?.count).toBe(3);
    });

    it('should handle empty input', async () => {
      const result = await service.generateSummaryBatch([], 'en');

      expect(result.size).toBe(0);
    });
  });
});
