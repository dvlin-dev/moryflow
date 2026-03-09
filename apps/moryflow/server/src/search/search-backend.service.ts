/**
 * [INPUT]: userId + query + topK + vaultId
 * [OUTPUT]: SearchResponseDto（Anyhunt Memox 文件搜索结果）
 * [POS]: SearchService 下游的文件搜索边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { MemoxSearchAdapterService } from '../memox';
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
  ) {}

  async searchFiles(params: SearchBackendRequest): Promise<SearchResponseDto> {
    return this.memoxSearchAdapterService.searchFiles(params);
  }
}
