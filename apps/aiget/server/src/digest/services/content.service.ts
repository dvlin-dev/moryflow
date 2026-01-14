/**
 * Digest Content Service
 *
 * [INPUT]: URL, 元数据, 全文内容
 * [OUTPUT]: ContentItem, ContentItemEnrichment
 * [POS]: 全局内容池管理，处理去重、入池、AI 摘要
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { FULLTEXT_CACHE, PROMPT_VERSIONS } from '../digest.constants';
import { canonicalizeUrl, computeUrlHash } from '../utils/url.utils';
import type {
  ContentItem,
  ContentItemEnrichment,
} from '../../../generated/prisma-main/client';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface ContentIngestInput {
  url: string;
  title: string;
  description?: string;
  fulltext?: string;
  publishedAt?: Date;
  siteName?: string;
  favicon?: string;
  author?: string;
}

@Injectable()
export class DigestContentService {
  private readonly logger = new Logger(DigestContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 内容入池（去重）
   * 如果内容已存在，返回现有记录；否则创建新记录
   */
  async ingestContent(input: ContentIngestInput): Promise<ContentItem> {
    const canonicalUrl = canonicalizeUrl(input.url);
    const canonicalUrlHash = computeUrlHash(canonicalUrl);

    // 查找现有内容
    const existing = await this.prisma.contentItem.findUnique({
      where: { canonicalUrlHash },
    });

    if (existing) {
      // 更新内容（如果有变化）
      const shouldUpdate =
        existing.title !== input.title ||
        existing.description !== input.description;

      if (shouldUpdate) {
        return this.prisma.contentItem.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            description: input.description,
            siteName: input.siteName,
            favicon: input.favicon,
            author: input.author,
            lastSeenAt: new Date(),
          },
        });
      }

      // 更新 lastSeenAt
      return this.prisma.contentItem.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // 创建新内容
    const content = await this.prisma.contentItem.create({
      data: {
        canonicalUrl,
        canonicalUrlHash,
        title: input.title,
        description: input.description,
        publishedAt: input.publishedAt,
        siteName: input.siteName,
        favicon: input.favicon,
        author: input.author,
      },
    });

    this.logger.debug(`Ingested content: ${content.id} - ${input.title}`);

    // 缓存全文到 Redis（1 小时 TTL）
    if (input.fulltext) {
      await this.cacheFulltext(content.id, input.fulltext);
    }

    return content;
  }

  /**
   * 缓存全文到 Redis
   */
  async cacheFulltext(contentId: string, fulltext: string): Promise<void> {
    const key = `${FULLTEXT_CACHE.keyPrefix}${contentId}`;
    const bytes = Buffer.from(fulltext, 'utf-8');

    // 超过大小限制则截断
    if (bytes.length > FULLTEXT_CACHE.maxSizeBytes) {
      this.logger.warn(
        `Fulltext too large for ${contentId}: ${bytes.length} bytes, truncating`,
      );
      fulltext = fulltext.slice(0, FULLTEXT_CACHE.maxSizeBytes);
    }

    // 压缩（如果超过阈值）
    let data: Buffer;
    let isCompressed = false;

    if (bytes.length > FULLTEXT_CACHE.compressThresholdBytes) {
      data = await gzip(fulltext);
      isCompressed = true;
    } else {
      data = bytes;
    }

    // 存储（带压缩标记）
    const payload = JSON.stringify({
      compressed: isCompressed,
      data: data.toString('base64'),
    });

    await this.redis.set(key, payload, FULLTEXT_CACHE.ttlSeconds);
  }

  /**
   * 获取缓存的全文
   */
  async getFulltext(contentId: string): Promise<string | null> {
    const key = `${FULLTEXT_CACHE.keyPrefix}${contentId}`;
    const payload = await this.redis.get(key);

    if (!payload) {
      return null;
    }

    try {
      const parsed = JSON.parse(payload) as {
        compressed: boolean;
        data: string;
      };
      const buffer = Buffer.from(parsed.data, 'base64');

      if (parsed.compressed) {
        const decompressed = await gunzip(buffer);
        return decompressed.toString('utf-8');
      }

      return buffer.toString('utf-8');
    } catch (error) {
      this.logger.error(`Failed to get fulltext for ${contentId}:`, error);
      return null;
    }
  }

  /**
   * 创建/更新内容增强（AI 摘要）
   */
  async createEnrichment(
    contentId: string,
    canonicalUrlHash: string,
    locale: string,
    aiSummary: string,
  ): Promise<ContentItemEnrichment> {
    const promptVersion = PROMPT_VERSIONS.contentSummary;

    const existing = await this.prisma.contentItemEnrichment.findUnique({
      where: {
        canonicalUrlHash_locale_promptVersion: {
          canonicalUrlHash,
          locale,
          promptVersion,
        },
      },
    });

    if (existing) {
      return this.prisma.contentItemEnrichment.update({
        where: { id: existing.id },
        data: { aiSummary },
      });
    }

    return this.prisma.contentItemEnrichment.create({
      data: {
        contentId,
        canonicalUrlHash,
        locale,
        promptVersion,
        aiSummary,
        aiTags: [],
        keyEntities: [],
      },
    });
  }

  /**
   * 获取内容增强
   */
  async getEnrichment(
    canonicalUrlHash: string,
    locale: string,
  ): Promise<ContentItemEnrichment | null> {
    return this.prisma.contentItemEnrichment.findFirst({
      where: {
        canonicalUrlHash,
        locale,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 批量获取内容
   */
  async findByIds(ids: string[]): Promise<ContentItem[]> {
    return this.prisma.contentItem.findMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * 根据 URL Hash 查找内容
   */
  async findByUrlHash(canonicalUrlHash: string): Promise<ContentItem | null> {
    return this.prisma.contentItem.findUnique({
      where: { canonicalUrlHash },
    });
  }

  /**
   * 批量根据 URL Hash 查找内容
   */
  async findByUrlHashes(hashes: string[]): Promise<ContentItem[]> {
    return this.prisma.contentItem.findMany({
      where: { canonicalUrlHash: { in: hashes } },
    });
  }

  /**
   * 获取内容及其增强信息
   */
  async findWithEnrichment(
    canonicalUrlHash: string,
    locale: string,
  ): Promise<
    (ContentItem & { enrichment: ContentItemEnrichment | null }) | null
  > {
    const content = await this.prisma.contentItem.findUnique({
      where: { canonicalUrlHash },
      include: {
        enrichments: {
          where: { locale },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!content) {
      return null;
    }

    return {
      ...content,
      enrichment: content.enrichments[0] || null,
    };
  }
}
