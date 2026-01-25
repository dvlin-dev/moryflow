/**
 * OembedService 单元测试
 *
 * 测试 oEmbed 服务的核心功能：
 * - 获取 oEmbed 数据
 * - Provider 匹配
 * - 缓存机制
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { OembedService } from '../oembed.service';
import { UnsupportedProviderError } from '../oembed.errors';

// Mock 类型定义
type MockProviderFactory = {
  getProvider: Mock;
};

type MockRedisService = {
  get: Mock;
  set: Mock;
};

type MockProvider = {
  name: string;
  urlPattern: RegExp;
  cacheTtlSeconds: number;
  fetch: Mock;
};

describe('OembedService', () => {
  let service: OembedService;
  let mockProviderFactory: MockProviderFactory;
  let mockRedis: MockRedisService;
  let mockProvider: MockProvider;

  const mockOembedData = {
    type: 'video',
    version: '1.0',
    title: 'Test Video',
    author_name: 'Test Author',
    provider_name: 'YouTube',
    thumbnail_url: 'https://example.com/thumb.jpg',
    html: '<iframe src="..."></iframe>',
    width: 560,
    height: 315,
  };

  beforeEach(() => {
    mockProvider = {
      name: 'youtube',
      urlPattern: /youtube\.com/,
      cacheTtlSeconds: 3600,
      fetch: vi.fn(),
    };

    mockProviderFactory = {
      getProvider: vi.fn(),
    };

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new OembedService(mockProviderFactory as any, mockRedis as any);
  });

  describe('fetch', () => {
    it('should throw UnsupportedProviderError for unknown URL', async () => {
      mockProviderFactory.getProvider.mockReturnValue(null);

      await expect(
        service.fetch({ url: 'https://unknown-site.com/video' }),
      ).rejects.toThrow(UnsupportedProviderError);
    });

    it('should return cached data when available', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockOembedData));

      const result = await service.fetch({
        url: 'https://youtube.com/watch?v=123',
      });

      expect(result).toMatchObject({
        data: mockOembedData,
        meta: {
          provider: 'youtube',
          cached: true,
        },
      });
      expect(mockProvider.fetch).not.toHaveBeenCalled();
    });

    it('should fetch from provider on cache miss', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      const result = await service.fetch({
        url: 'https://youtube.com/watch?v=123',
      });

      expect(mockProvider.fetch).toHaveBeenCalledWith(
        'https://youtube.com/watch?v=123',
        { maxwidth: undefined, maxheight: undefined, theme: undefined },
      );
      expect(result).toMatchObject({
        data: mockOembedData,
        meta: {
          provider: 'youtube',
          cached: false,
        },
      });
    });

    it('should cache fetched data', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      await service.fetch({ url: 'https://youtube.com/watch?v=123' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^oembed:/),
        JSON.stringify(mockOembedData),
        3600,
      );
    });

    it('should pass options to provider', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      await service.fetch({
        url: 'https://youtube.com/watch?v=123',
        maxwidth: 800,
        maxheight: 600,
        theme: 'dark',
      });

      expect(mockProvider.fetch).toHaveBeenCalledWith(
        'https://youtube.com/watch?v=123',
        { maxwidth: 800, maxheight: 600, theme: 'dark' },
      );
    });

    it('should handle cache read errors gracefully', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      const result = await service.fetch({
        url: 'https://youtube.com/watch?v=123',
      });

      // 应该继续从 provider 获取数据
      expect(mockProvider.fetch).toHaveBeenCalled();
      expect(result.meta.cached).toBe(false);
      expect(result.data).toEqual(mockOembedData);
    });

    it('should handle cache write errors gracefully', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'));

      // 不应该抛出错误
      const result = await service.fetch({
        url: 'https://youtube.com/watch?v=123',
      });

      expect(result.data).toEqual(mockOembedData);
      expect(result.meta.cached).toBe(false);
    });
  });

  describe('cache key generation', () => {
    it('should generate different cache keys for different options', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      await service.fetch({
        url: 'https://youtube.com/watch?v=123',
        maxwidth: 800,
      });
      await service.fetch({
        url: 'https://youtube.com/watch?v=123',
        maxwidth: 600,
      });

      // 验证两次调用使用了不同的缓存 key
      const firstKey = mockRedis.get.mock.calls[0][0];
      const secondKey = mockRedis.get.mock.calls[1][0];
      expect(firstKey).not.toBe(secondKey);
    });

    it('should generate same cache key for same URL and options', async () => {
      mockProviderFactory.getProvider.mockReturnValue(mockProvider);
      mockRedis.get.mockResolvedValue(null);
      mockProvider.fetch.mockResolvedValue(mockOembedData);

      await service.fetch({
        url: 'https://youtube.com/watch?v=123',
        maxwidth: 800,
      });
      await service.fetch({
        url: 'https://youtube.com/watch?v=123',
        maxwidth: 800,
      });

      const firstKey = mockRedis.get.mock.calls[0][0];
      const secondKey = mockRedis.get.mock.calls[1][0];
      expect(firstKey).toBe(secondKey);
    });
  });
});
