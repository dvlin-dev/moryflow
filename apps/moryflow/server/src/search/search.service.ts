/**
 * [INPUT]: userId + SearchDto
 * [OUTPUT]: SearchResponseDto（向量搜索结果）
 * [POS]: 语义搜索服务（Vectorize Worker）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { VectorizeClient } from '../vectorize';
import type {
  SearchDto,
  SearchResponseDto,
  SearchResultItem,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorizeClient: VectorizeClient,
  ) {}

  /**
   * 语义搜索（支持 vault 过滤）
   */
  async search(userId: string, dto: SearchDto): Promise<SearchResponseDto> {
    const { query, topK = 10, vaultId } = dto;

    this.logger.log(
      `Searching for "${query}" with topK=${topK}${vaultId ? ` in vault ${vaultId}` : ''}`,
    );

    // 如果指定了 vaultId，验证用户对该 vault 的所有权
    if (vaultId) {
      const vault = await this.prisma.vault.findUnique({
        where: { id: vaultId },
        select: { userId: true },
      });
      if (!vault || vault.userId !== userId) {
        return { results: [], count: 0 };
      }
    }

    // 调用 Vectorize Worker 搜索，使用 filter 进行 vaultId 过滤
    const matches = await this.vectorizeClient.query(userId, query, {
      topK,
      namespace: `user:${userId}`,
      filter: vaultId ? { vaultId } : undefined,
    });

    // 转换结果
    const results: SearchResultItem[] = matches.map((match) => ({
      fileId: match.id,
      score: match.score,
      title: (match.metadata?.title as string) || '',
    }));

    return {
      results,
      count: results.length,
    };
  }
}
