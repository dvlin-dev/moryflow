/**
 * [INPUT]: userId + Vectorize 请求参数
 * [OUTPUT]: Vectorize Worker 响应
 * [POS]: 向量化 Worker 客户端（JWT 鉴权）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EmbedResponse,
  UpsertVectorInput,
  UpsertResponse,
  QueryMatch,
  QueryOptions,
  QueryResponse,
  DeleteResponse,
  ApiErrorResponse,
} from './types';
import { AuthTokensService } from '../auth';
import {
  serverHttpJson,
  serverHttpRaw,
  ServerApiError,
} from '../common/http/server-http-client';
import type { ApiClientRequestOptions } from '@moryflow/api';
@Injectable()
export class VectorizeClient implements OnModuleInit {
  private readonly logger = new Logger(VectorizeClient.name);
  private baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authTokensService: AuthTokensService,
  ) {}

  onModuleInit() {
    this.baseUrl = this.configService.getOrThrow<string>('VECTORIZE_API_URL');

    this.logger.log(`Vectorize client initialized: ${this.baseUrl}`);
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(
    userId: string,
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const accessToken = await this.authTokensService.createAccessToken(userId);

    try {
      return await serverHttpJson<T>({
        url,
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
        timeoutMs: 10000,
      });
    } catch (error) {
      if (error instanceof ServerApiError) {
        this.logger.error(`Vectorize API error: ${error.message}`);
        throw new Error(error.message || `Request failed: ${error.status}`);
      }
      const errorData = error as ApiErrorResponse;
      this.logger.error(
        `Vectorize API error: ${errorData.error}`,
        errorData.details,
      );
      throw error;
    }
  }

  /**
   * 生成向量嵌入
   *
   * @param texts - 要生成向量的文本数组（最多 32 条）
   * @param type - 类型：'query' 用于搜索查询，'document' 用于存储文档
   * @returns 向量数组
   */
  async embed(
    userId: string,
    texts: string[],
    type: 'query' | 'document' = 'document',
  ): Promise<number[][]> {
    const result = await this.request<EmbedResponse>(userId, '/api/v1/embed', {
      method: 'POST',
      body: JSON.stringify({ texts, type }),
    });
    return result.data;
  }

  /**
   * 插入/更新向量
   * 自动生成文本的向量嵌入并存储
   *
   * @param vectors - 向量数据数组
   * @returns 操作结果
   */
  async upsert(
    userId: string,
    vectors: UpsertVectorInput[],
  ): Promise<UpsertResponse> {
    return this.request<UpsertResponse>(userId, '/api/v1/vectors/upsert', {
      method: 'POST',
      body: JSON.stringify({ vectors }),
    });
  }

  /**
   * 语义搜索
   * 根据文本查找最相似的向量
   *
   * @param text - 搜索文本
   * @param options - 搜索选项
   * @returns 匹配结果
   */
  async query(
    userId: string,
    text: string,
    options: QueryOptions = {},
  ): Promise<QueryMatch[]> {
    const result = await this.request<QueryResponse>(
      userId,
      '/api/v1/vectors/query',
      {
        method: 'POST',
        body: JSON.stringify({ text, ...options }),
      },
    );
    return result.matches;
  }

  /**
   * 删除向量
   *
   * @param ids - 要删除的向量 ID 列表
   */
  async delete(userId: string, ids: string[]): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(userId, '/api/v1/vectors', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await serverHttpRaw({
        url: `${this.baseUrl}/health`,
        method: 'GET',
        timeoutMs: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
