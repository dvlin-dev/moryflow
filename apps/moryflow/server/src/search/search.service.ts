/**
 * [INPUT]: userId + SearchDto
 * [OUTPUT]: SearchResponseDto（文件级搜索结果，默认 Memox，可切 legacy baseline）
 * [POS]: 文件搜索应用服务，仅编排 ACL 校验、backend 搜索与 live projection
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SearchDto, SearchResponseDto } from './dto/search.dto';
import { SearchBackendService } from './search-backend.service';
import { SearchLiveFileProjectorService } from './search-live-file-projector.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchBackendService: SearchBackendService,
    private readonly searchLiveFileProjectorService: SearchLiveFileProjectorService,
  ) {}

  /**
   * 文件搜索（支持 vault 过滤）
   */
  async search(userId: string, dto: SearchDto): Promise<SearchResponseDto> {
    const { query, topK = 10, vaultId } = dto;

    this.logger.log(
      `Searching for "${query}" with topK=${topK}${vaultId ? ` in vault ${vaultId}` : ''}`,
    );

    if (vaultId && !(await this.isOwnedVault(userId, vaultId))) {
      return { results: [], count: 0 };
    }

    const response = await this.searchBackendService.searchFiles({
      userId,
      query,
      topK,
      vaultId,
    });
    const liveResults = await this.searchLiveFileProjectorService.project({
      userId,
      vaultId,
      results: response.results,
    });

    return {
      results: liveResults,
      count: liveResults.length,
    };
  }

  private async isOwnedVault(
    userId: string,
    vaultId: string,
  ): Promise<boolean> {
    const vault = await this.prisma.vault.findUnique({
      where: { id: vaultId },
      select: { userId: true },
    });
    return Boolean(vault && vault.userId === userId);
  }
}
