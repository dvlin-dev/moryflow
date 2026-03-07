/**
 * [INPUT]: userId + legacy vector query/upsert/delete
 * [OUTPUT]: 旧向量搜索基线结果 / 回滚窗口镜像写入结果
 * [POS]: Memox cutover 期间的 legacy baseline 客户端
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { AuthTokensService } from '../auth';
import {
  serverHttpJson,
  ServerApiError,
} from '../common/http/server-http-client';
import type { ApiClientRequestOptions } from '@moryflow/api';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

type LegacyVectorMetadata = Record<string, string | number | boolean>;

interface LegacyVectorQueryResponse {
  matches: LegacyVectorSearchMatch[];
}

interface LegacyVectorMutationResponse {
  success: boolean;
}

export interface LegacyVectorSearchMatch {
  id: string;
  score: number;
  metadata?: LegacyVectorMetadata;
}

@Injectable()
export class LegacyVectorSearchClient {
  private readonly logger = new Logger(LegacyVectorSearchClient.name);

  constructor(
    private readonly runtimeConfigService: MemoxRuntimeConfigService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  async query(
    userId: string,
    text: string,
    options: {
      topK?: number;
      namespace?: string;
      filter?: Record<string, unknown>;
    } = {},
  ): Promise<LegacyVectorSearchMatch[]> {
    const response = await this.request<LegacyVectorQueryResponse>(
      userId,
      '/api/v1/vectors/query',
      {
        method: 'POST',
        body: JSON.stringify({ text, ...options }),
      },
    );

    return response.matches;
  }

  async upsertFile(params: {
    userId: string;
    fileId: string;
    content: string;
    vaultId: string;
    title: string;
    path: string;
  }): Promise<void> {
    await this.request<LegacyVectorMutationResponse>(
      params.userId,
      '/api/v1/vectors/upsert',
      {
        method: 'POST',
        body: JSON.stringify({
          vectors: [
            {
              id: params.fileId,
              text: params.content,
              namespace: `user:${params.userId}`,
              metadata: {
                vaultId: params.vaultId,
                title: params.title,
                path: params.path,
              },
            },
          ],
        }),
      },
    );
  }

  async deleteFile(params: { userId: string; fileId: string }): Promise<void> {
    await this.request<LegacyVectorMutationResponse>(
      params.userId,
      '/api/v1/vectors',
      {
        method: 'DELETE',
        body: JSON.stringify({
          ids: [params.fileId],
        }),
      },
    );
  }

  private async request<T>(
    userId: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const accessToken = await this.authTokensService.createAccessToken(userId);

    try {
      return await serverHttpJson<T>({
        url: `${this.runtimeConfigService.getLegacyVectorBaseUrl()}${path}`,
        method:
          (options.method as
            | 'GET'
            | 'POST'
            | 'PUT'
            | 'PATCH'
            | 'DELETE'
            | undefined) ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.token}`,
          ...options.headers,
        },
        body: options.body as ApiClientRequestOptions['body'],
        signal: options.signal ?? undefined,
        timeoutMs: 10_000,
      });
    } catch (error) {
      if (error instanceof ServerApiError) {
        this.logger.error(`Legacy vector search API error: ${error.message}`);
        throw new Error(error.message || `Request failed: ${error.status}`);
      }

      this.logger.error(
        'Legacy vector search API error',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
