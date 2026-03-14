/**
 * [INPUT]: userId + workspace scope + 原始文档搜索命中
 * [OUTPUT]: 仅保留活跃 WorkspaceDocument 且字段回填后的搜索结果
 * [POS]: SearchService 下游的 live document truth projection 边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { SearchResponseDto } from './dto/search.dto';

export interface SearchLiveProjectionRequest {
  userId: string;
  workspaceId?: string;
  results: SearchResponseDto['results'];
}

@Injectable()
export class SearchLiveFileProjectorService {
  constructor(private readonly prisma: PrismaService) {}

  async project(
    params: SearchLiveProjectionRequest,
  ): Promise<SearchResponseDto['results']> {
    const documentIds = [
      ...new Set(params.results.map((item) => item.documentId)),
    ];
    if (documentIds.length === 0) {
      return [];
    }

    const liveDocuments = await this.prisma.workspaceDocument.findMany({
      where: {
        id: {
          in: documentIds,
        },
        workspace: {
          userId: params.userId,
        },
        ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        path: true,
      },
    });
    const liveMap = new Map(
      liveDocuments.map((document) => [document.id, document]),
    );

    return params.results
      .filter((item) => liveMap.has(item.documentId))
      .map((item) => {
        const liveDocument = liveMap.get(item.documentId);
        if (!liveDocument) {
          return item;
        }

        return {
          ...item,
          workspaceId: liveDocument.workspaceId,
          title: liveDocument.title,
          path: liveDocument.path,
        };
      });
  }
}
