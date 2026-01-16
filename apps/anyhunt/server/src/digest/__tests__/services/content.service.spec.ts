/**
 * Digest Content Service Tests
 *
 * [PROVIDES]: DigestContentService 单元测试
 * [POS]: 测试全局内容池管理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestContentService } from '../../services/content.service';
import {
  createMockPrisma,
  createMockRedisService,
  createMockConfigService,
  createContentItem,
  createEnrichment,
  type MockPrismaDigest,
  type MockRedisService,
  type MockConfigService,
} from '../mocks';
import { FULLTEXT_CACHE, PROMPT_VERSIONS } from '../../digest.constants';

describe('DigestContentService', () => {
  let service: DigestContentService;
  let mockPrisma: MockPrismaDigest;
  let mockRedis: MockRedisService;
  let mockConfig: MockConfigService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRedis = createMockRedisService();
    mockConfig = createMockConfigService();
    service = new DigestContentService(
      mockPrisma as any,
      mockRedis as any,
      mockConfig as any,
    );
  });

  // ========== ingestContent ==========

  describe('ingestContent', () => {
    it('should create new content when not exists', async () => {
      mockPrisma.contentItem.findUnique.mockResolvedValue(null);
      const newContent = createContentItem();
      mockPrisma.contentItem.create.mockResolvedValue(newContent);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.ingestContent({
        url: 'https://example.com/article',
        title: 'Test Article',
        description: 'Test description',
        fulltext: 'Full article text here',
      });

      expect(mockPrisma.contentItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          canonicalUrl: 'https://example.com/article',
          title: 'Test Article',
        }),
      });
      expect(result).toEqual(newContent);
    });

    it('should update existing content when title/description changed', async () => {
      const existing = createContentItem();
      mockPrisma.contentItem.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, title: 'Updated Title' };
      mockPrisma.contentItem.update.mockResolvedValue(updated);

      const result = await service.ingestContent({
        url: 'https://example.com/article',
        title: 'Updated Title',
        description: existing.description ?? undefined,
      });

      expect(mockPrisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: expect.objectContaining({
          title: 'Updated Title',
          lastSeenAt: expect.any(Date),
        }),
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should only update lastSeenAt when content unchanged', async () => {
      const existing = createContentItem({
        title: 'Same Title',
        description: 'Same Description',
      });
      mockPrisma.contentItem.findUnique.mockResolvedValue(existing);
      mockPrisma.contentItem.update.mockResolvedValue(existing);

      await service.ingestContent({
        url: 'https://example.com/article',
        title: 'Same Title',
        description: 'Same Description',
      });

      expect(mockPrisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: { lastSeenAt: expect.any(Date) },
      });
    });

    it('should cache fulltext to Redis when provided', async () => {
      mockPrisma.contentItem.findUnique.mockResolvedValue(null);
      mockPrisma.contentItem.create.mockResolvedValue(createContentItem());
      mockRedis.set.mockResolvedValue('OK');

      await service.ingestContent({
        url: 'https://example.com/article',
        title: 'Test',
        fulltext: 'A'.repeat(500),
      });

      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should normalize URL before storing', async () => {
      mockPrisma.contentItem.findUnique.mockResolvedValue(null);
      mockPrisma.contentItem.create.mockResolvedValue(createContentItem());

      await service.ingestContent({
        url: 'http://www.example.com/article?utm_source=test',
        title: 'Test',
      });

      expect(mockPrisma.contentItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          canonicalUrl: 'https://example.com/article',
        }),
      });
    });
  });

  // ========== cacheFulltext ==========

  describe('cacheFulltext', () => {
    it('should cache small content without compression', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const smallContent = 'Small text';

      await service.cacheFulltext('content-1', smallContent);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `${FULLTEXT_CACHE.keyPrefix}content-1`,
        expect.any(String),
        FULLTEXT_CACHE.ttlSeconds,
      );

      const calledPayload = JSON.parse(mockRedis.set.mock.calls[0][1]);
      expect(calledPayload.compressed).toBe(false);
    });

    it('should compress large content', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const largeContent = 'A'.repeat(
        FULLTEXT_CACHE.compressThresholdBytes + 1000,
      );

      await service.cacheFulltext('content-1', largeContent);

      const calledPayload = JSON.parse(mockRedis.set.mock.calls[0][1]);
      expect(calledPayload.compressed).toBe(true);
    });

    it('should truncate content exceeding max size', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const hugeContent = 'A'.repeat(FULLTEXT_CACHE.maxSizeBytes + 10000);

      await service.cacheFulltext('content-1', hugeContent);

      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  // ========== getFulltext ==========

  describe('getFulltext', () => {
    it('should return null when not cached', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getFulltext('content-1');

      expect(result).toBeNull();
    });

    it('should return uncompressed content', async () => {
      const payload = JSON.stringify({
        compressed: false,
        data: Buffer.from('Test content').toString('base64'),
      });
      mockRedis.get.mockResolvedValue(payload);

      const result = await service.getFulltext('content-1');

      expect(result).toBe('Test content');
    });

    it('should decompress compressed content', async () => {
      // First cache some content to get the compressed format
      mockRedis.set.mockResolvedValue('OK');
      const originalContent = 'B'.repeat(
        FULLTEXT_CACHE.compressThresholdBytes + 100,
      );
      await service.cacheFulltext('content-1', originalContent);

      // Get the cached payload
      const cachedPayload = mockRedis.set.mock.calls[0][1];
      mockRedis.get.mockResolvedValue(cachedPayload);

      const result = await service.getFulltext('content-1');

      expect(result).toBe(originalContent);
    });

    it('should return null on parse error', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.getFulltext('content-1');

      expect(result).toBeNull();
    });
  });

  // ========== createEnrichment ==========

  describe('createEnrichment', () => {
    it('should create new enrichment when not exists', async () => {
      mockPrisma.contentItemEnrichment.findUnique.mockResolvedValue(null);
      const enrichment = createEnrichment();
      mockPrisma.contentItemEnrichment.create.mockResolvedValue(enrichment);

      const result = await service.createEnrichment(
        'content-1',
        'hash-1',
        'en',
        'AI summary text',
      );

      expect(mockPrisma.contentItemEnrichment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentId: 'content-1',
          canonicalUrlHash: 'hash-1',
          locale: 'en',
          promptVersion: PROMPT_VERSIONS.contentSummary,
          aiSummary: 'AI summary text',
        }),
      });
      expect(result).toEqual(enrichment);
    });

    it('should update existing enrichment', async () => {
      const existing = createEnrichment();
      mockPrisma.contentItemEnrichment.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, aiSummary: 'Updated summary' };
      mockPrisma.contentItemEnrichment.update.mockResolvedValue(updated);

      const result = await service.createEnrichment(
        'content-1',
        'hash-1',
        'en',
        'Updated summary',
      );

      expect(mockPrisma.contentItemEnrichment.update).toHaveBeenCalledWith({
        where: { id: existing.id },
        data: { aiSummary: 'Updated summary' },
      });
      expect(result.aiSummary).toBe('Updated summary');
    });
  });

  // ========== getEnrichment ==========

  describe('getEnrichment', () => {
    it('should find enrichment by hash and locale', async () => {
      const enrichment = createEnrichment();
      mockPrisma.contentItemEnrichment.findFirst.mockResolvedValue(enrichment);

      const result = await service.getEnrichment('hash-1', 'en');

      expect(mockPrisma.contentItemEnrichment.findFirst).toHaveBeenCalledWith({
        where: { canonicalUrlHash: 'hash-1', locale: 'en' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(enrichment);
    });

    it('should return null when not found', async () => {
      mockPrisma.contentItemEnrichment.findFirst.mockResolvedValue(null);

      const result = await service.getEnrichment('hash-not-exist', 'en');

      expect(result).toBeNull();
    });
  });

  // ========== findByIds ==========

  describe('findByIds', () => {
    it('should find multiple contents by ids', async () => {
      const contents = [
        createContentItem(),
        createContentItem({ id: 'content-2' }),
      ];
      mockPrisma.contentItem.findMany.mockResolvedValue(contents);

      const result = await service.findByIds(['content-1', 'content-2']);

      expect(mockPrisma.contentItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['content-1', 'content-2'] } },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ========== findByUrlHash ==========

  describe('findByUrlHash', () => {
    it('should find content by canonical URL hash', async () => {
      const content = createContentItem();
      mockPrisma.contentItem.findUnique.mockResolvedValue(content);

      const result = await service.findByUrlHash('hash-1');

      expect(mockPrisma.contentItem.findUnique).toHaveBeenCalledWith({
        where: { canonicalUrlHash: 'hash-1' },
      });
      expect(result).toEqual(content);
    });

    it('should return null when not found', async () => {
      mockPrisma.contentItem.findUnique.mockResolvedValue(null);

      const result = await service.findByUrlHash('hash-not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== findByUrlHashes ==========

  describe('findByUrlHashes', () => {
    it('should find multiple contents by URL hashes', async () => {
      const contents = [createContentItem(), createContentItem({ id: 'c2' })];
      mockPrisma.contentItem.findMany.mockResolvedValue(contents);

      const result = await service.findByUrlHashes(['h1', 'h2']);

      expect(mockPrisma.contentItem.findMany).toHaveBeenCalledWith({
        where: { canonicalUrlHash: { in: ['h1', 'h2'] } },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ========== findWithEnrichment ==========

  describe('findWithEnrichment', () => {
    it('should return content with enrichment', async () => {
      const content = {
        ...createContentItem(),
        enrichments: [createEnrichment()],
      };
      mockPrisma.contentItem.findUnique.mockResolvedValue(content);

      const result = await service.findWithEnrichment('hash-1', 'en');

      expect(result).toBeDefined();
      expect(result?.enrichment).toBeDefined();
    });

    it('should return content with null enrichment when none exists', async () => {
      const content = {
        ...createContentItem(),
        enrichments: [],
      };
      mockPrisma.contentItem.findUnique.mockResolvedValue(content);

      const result = await service.findWithEnrichment('hash-1', 'en');

      expect(result).toBeDefined();
      expect(result?.enrichment).toBeNull();
    });

    it('should return null when content not found', async () => {
      mockPrisma.contentItem.findUnique.mockResolvedValue(null);

      const result = await service.findWithEnrichment('hash-not-exist', 'en');

      expect(result).toBeNull();
    });
  });
});
