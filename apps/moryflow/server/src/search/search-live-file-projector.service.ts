/**
 * [INPUT]: userId + vault scope + 原始文件搜索命中
 * [OUTPUT]: 仅保留活跃 SyncFile 且字段回填后的搜索结果
 * [POS]: SearchService 下游的 live file truth projection 边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SearchResponseDto } from './dto/search.dto';

export interface SearchLiveProjectionRequest {
  userId: string;
  vaultId?: string;
  results: SearchResponseDto['results'];
}

@Injectable()
export class SearchLiveFileProjectorService {
  constructor(private readonly prisma: PrismaService) {}

  async project(
    params: SearchLiveProjectionRequest,
  ): Promise<SearchResponseDto['results']> {
    const fileIds = [...new Set(params.results.map((item) => item.fileId))];
    if (fileIds.length === 0) {
      return [];
    }

    const liveFiles = await this.prisma.syncFile.findMany({
      where: {
        id: {
          in: fileIds,
        },
        isDeleted: false,
        vault: {
          userId: params.userId,
        },
        ...(params.vaultId ? { vaultId: params.vaultId } : {}),
      },
      select: {
        id: true,
        vaultId: true,
        title: true,
        path: true,
      },
    });
    const liveMap = new Map(liveFiles.map((file) => [file.id, file]));

    return params.results
      .filter((item) => liveMap.has(item.fileId))
      .map((item) => {
        const liveFile = liveMap.get(item.fileId);
        if (!liveFile) {
          return item;
        }

        return {
          ...item,
          vaultId: liveFile.vaultId,
          title: liveFile.title,
          path: liveFile.path,
        };
      });
  }
}
