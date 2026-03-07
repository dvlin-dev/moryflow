/**
 * [INPUT]: userId + query + topK + vaultId
 * [OUTPUT]: SearchResponseDto（按运行时后端选择后的原始文件搜索结果）
 * [POS]: SearchService 下游的搜索后端选择与 DTO 归一化边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import {
  LegacyVectorSearchClient,
  MemoxRuntimeConfigService,
  MemoxSearchAdapterService,
} from '../memox';
import type { LegacyVectorSearchMatch } from '../memox';
import type { SearchResponseDto } from './dto/search.dto';

export interface SearchBackendRequest {
  userId: string;
  query: string;
  topK: number;
  vaultId?: string;
}

@Injectable()
export class SearchBackendService {
  constructor(
    private readonly memoxSearchAdapterService: MemoxSearchAdapterService,
    private readonly legacyVectorSearchClient: LegacyVectorSearchClient,
    private readonly memoxRuntimeConfigService: MemoxRuntimeConfigService,
  ) {}

  async searchFiles(params: SearchBackendRequest): Promise<SearchResponseDto> {
    if (
      this.memoxRuntimeConfigService.getSearchBackend() ===
      'legacy_vector_baseline'
    ) {
      return this.searchViaLegacyVectorBaseline(params);
    }

    return this.memoxSearchAdapterService.searchFiles(params);
  }

  private async searchViaLegacyVectorBaseline(
    params: SearchBackendRequest,
  ): Promise<SearchResponseDto> {
    const matches = await this.legacyVectorSearchClient.query(
      params.userId,
      params.query,
      {
        topK: params.topK,
        namespace: `user:${params.userId}`,
        ...(params.vaultId ? { filter: { vaultId: params.vaultId } } : {}),
      },
    );

    return {
      results: matches.map((match) => this.mapLegacyMatch(match)),
      count: matches.length,
    };
  }

  private mapLegacyMatch(
    match: LegacyVectorSearchMatch,
  ): SearchResponseDto['results'][number] {
    const metadata = match.metadata ?? {};

    return {
      fileId: match.id,
      vaultId: typeof metadata.vaultId === 'string' ? metadata.vaultId : null,
      title: typeof metadata.title === 'string' ? metadata.title : match.id,
      path: typeof metadata.path === 'string' ? metadata.path : null,
      snippet: typeof metadata.snippet === 'string' ? metadata.snippet : '',
      score: match.score,
    };
  }
}
