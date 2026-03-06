/**
 * [INPUT]: 向量搜索原始 matches
 * [OUTPUT]: 仅保留当前存活 SyncFile 的结果
 * [POS]: Search 结果过滤服务，确保搜索永远以文件真相源为准
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SearchResultItem } from './dto/search.dto';
import type { QueryMatch } from '../vectorize/types';

@Injectable()
export class SearchResultFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async filterLiveResults(
    userId: string,
    matches: QueryMatch[],
    vaultId?: string,
  ): Promise<SearchResultItem[]> {
    const liveSyncFiles = await this.prisma.syncFile.findMany({
      where: {
        id: { in: matches.map((match) => match.id) },
        vault: { userId },
        isDeleted: false,
        ...(vaultId ? { vaultId } : {}),
      },
      select: { id: true, isDeleted: true },
    });

    const liveFileIds = new Set(
      liveSyncFiles.filter((file) => !file.isDeleted).map((file) => file.id),
    );

    return matches
      .filter((match) => liveFileIds.has(match.id))
      .map((match) => ({
        fileId: match.id,
        score: match.score,
        title: (match.metadata?.title as string) || '',
      }));
  }
}
