/**
 * [INPUT]: userId + SearchDto
 * [OUTPUT]: SearchResponseDto（文件级搜索结果，固定走 Anyhunt Memox）
 * [POS]: 文件搜索应用服务，仅编排 ACL 校验、backend 搜索与 live projection
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
   * 文件搜索（支持 workspace 过滤）
   */
  async search(userId: string, dto: SearchDto): Promise<SearchResponseDto> {
    const { query, topK = 10, workspaceId } = dto;

    this.logger.log(
      `Searching for "${query}" with topK=${topK}${workspaceId ? ` in workspace ${workspaceId}` : ''}`,
    );

    if (workspaceId && !(await this.isOwnedWorkspace(userId, workspaceId))) {
      throw new NotFoundException('Workspace not found');
    }

    const response = await this.searchBackendService.searchFiles({
      userId,
      query,
      topK,
      workspaceId,
    });
    const liveResults = await this.searchLiveFileProjectorService.project({
      userId,
      workspaceId,
      results: response.results,
    });

    return {
      results: liveResults,
      count: liveResults.length,
    };
  }

  private async isOwnedWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { userId: true },
    });
    return Boolean(workspace && workspace.userId === userId);
  }
}
