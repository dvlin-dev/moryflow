import { Injectable } from '@nestjs/common';
import { MemoxClient } from './memox.client';
import {
  MemoxSourceBridgeService,
  type MemoxSearchDocumentResult,
} from './memox-source-bridge.service';

export interface MemoxSearchAdapterResult {
  results: MemoxSearchDocumentResult[];
  count: number;
}

@Injectable()
export class MemoxSearchAdapterService {
  constructor(
    private readonly memoxClient: MemoxClient,
    private readonly bridgeService: MemoxSourceBridgeService,
  ) {}

  async searchFiles(params: {
    userId: string;
    query: string;
    topK: number;
    workspaceId?: string;
    requestId?: string;
  }): Promise<MemoxSearchAdapterResult> {
    const response = await this.memoxClient.searchSources({
      requestId: params.requestId,
      body: this.bridgeService.buildSourcesSearchRequest({
        userId: params.userId,
        query: params.query,
        topK: params.topK,
        workspaceId: params.workspaceId,
      }),
    });

    return {
      results: response.results.map((item) =>
        this.bridgeService.mapSearchItemToFileResult(item),
      ),
      count: response.total,
    };
  }
}
