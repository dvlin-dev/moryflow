/**
 * EmbeddingService 单元测试
 *
 * 测试向量嵌入服务的核心功能：
 * - 单文本向量生成
 * - 批量向量生成
 * - 余弦相似度计算
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';

// Mock OpenAI - 需要在测试中动态设置
const mockEmbeddingsCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    embeddings = {
      create: mockEmbeddingsCreate,
    };
  },
}));

describe('EmbeddingService', () => {
  let EmbeddingServiceClass: typeof import('../embedding.service').EmbeddingService;
  let service: import('../embedding.service').EmbeddingService;

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

  beforeEach(async () => {
    // 确保每个测试都使用已 mock 的 OpenAI 依赖
    vi.resetModules();
    ({ EmbeddingService: EmbeddingServiceClass } =
      await import('../embedding.service'));

    // 重置 mock
    mockEmbeddingsCreate.mockReset();

    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          OPENAI_API_KEY: 'test-api-key',
          EMBEDDING_API_URL: '',
          EMBEDDING_MODEL: 'text-embedding-3-small',
        };
        return config[key] ?? defaultValue;
      }),
    };

    service = new EmbeddingServiceClass(
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for single text', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        model: 'text-embedding-3-small',
      });

      const result = await service.generateEmbedding('test text');

      expect(result).toEqual({
        embedding: mockEmbedding,
        model: 'text-embedding-3-small',
        dimensions: 5,
      });
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: 'test text',
        model: 'text-embedding-3-small',
      });
    });

    it('should throw error when OpenAI API fails', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));

      await expect(service.generateEmbedding('test text')).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.generateBatchEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should call single method for single text', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        model: 'text-embedding-3-small',
      });

      const result = await service.generateBatchEmbeddings(['single text']);

      expect(result).toHaveLength(1);
      expect(result[0].embedding).toEqual(mockEmbedding);
      // 验证是通过 single 方法调用的（input 是字符串而非数组）
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: 'single text',
        model: 'text-embedding-3-small',
      });
    });

    it('should batch generate embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];

      mockEmbeddingsCreate.mockResolvedValue({
        data: mockEmbeddings.map((embedding) => ({ embedding })),
        model: 'text-embedding-3-small',
      });

      const texts = ['text1', 'text2', 'text3'];
      const result = await service.generateBatchEmbeddings(texts);

      expect(result).toHaveLength(3);
      expect(result[0].embedding).toEqual(mockEmbeddings[0]);
      expect(result[1].embedding).toEqual(mockEmbeddings[1]);
      expect(result[2].embedding).toEqual(mockEmbeddings[2]);

      // 验证是批量调用（input 是数组）
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: texts,
        model: 'text-embedding-3-small',
      });
    });

    it('should throw error when batch API fails', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('Batch API Error'));

      await expect(
        service.generateBatchEmbeddings(['text1', 'text2']),
      ).rejects.toThrow('Batch API Error');
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];

      // 相同向量，相似度为 1
      expect(service.cosineSimilarity(a, b)).toBe(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];

      // 正交向量，相似度为 0
      expect(service.cosineSimilarity(a, b)).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];

      // 相反向量，相似度为 -1
      expect(service.cosineSimilarity(a, b)).toBe(-1);
    });

    it('should calculate similarity for non-unit vectors', () => {
      const a = [3, 4];
      const b = [4, 3];

      // (3*4 + 4*3) / (5 * 5) = 24/25 = 0.96
      const result = service.cosineSimilarity(a, b);
      expect(result).toBeCloseTo(0.96, 2);
    });

    it('should throw error for vectors with different dimensions', () => {
      const a = [1, 2, 3];
      const b = [1, 2];

      expect(() => service.cosineSimilarity(a, b)).toThrow(
        'Vector dimensions must match',
      );
    });

    it('should handle high-dimensional vectors', () => {
      // 模拟真实的 embedding 向量（1536 维）
      const dimensions = 1536;
      const a = Array.from({ length: dimensions }, () => Math.random());
      const b = [...a]; // 相同向量

      expect(service.cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });
  });

  describe('configuration', () => {
    it('should use default model when not configured', async () => {
      const mockConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'EMBEDDING_MODEL') return defaultValue;
          if (key === 'OPENAI_API_KEY') return 'test-key';
          return '';
        }),
      };

      const svc = new EmbeddingServiceClass(
        mockConfigService as unknown as ConfigService,
      );

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1] }],
        model: 'text-embedding-3-small',
      });

      await svc.generateEmbedding('test');

      // 通过行为验证：检查 API 调用使用的模型
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: 'test',
        model: 'text-embedding-3-small',
      });
    });

    it('should use custom model when configured', async () => {
      const mockConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'EMBEDDING_MODEL') return 'text-embedding-ada-002';
          if (key === 'OPENAI_API_KEY') return 'test-key';
          return '';
        }),
      };

      const svc = new EmbeddingServiceClass(
        mockConfigService as unknown as ConfigService,
      );

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1] }],
        model: 'text-embedding-ada-002',
      });

      await svc.generateEmbedding('test');

      // 通过行为验证：检查 API 调用使用的模型
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        input: 'test',
        model: 'text-embedding-ada-002',
      });
    });
  });
});
