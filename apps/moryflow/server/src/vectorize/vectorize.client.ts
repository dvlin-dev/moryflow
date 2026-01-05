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

/**
 * Vectorize API 客户端
 * 用于与 Cloudflare Vectorize Worker 通信
 */
@Injectable()
export class VectorizeClient implements OnModuleInit {
  private readonly logger = new Logger(VectorizeClient.name);
  private baseUrl: string;
  private apiSecret: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.baseUrl = this.configService.getOrThrow<string>('VECTORIZE_API_URL');
    this.apiSecret = this.configService.getOrThrow<string>(
      'VECTORIZE_API_SECRET',
    );

    this.logger.log(`Vectorize client initialized: ${this.baseUrl}`);
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiSecret}`,
        ...options.headers,
      },
    });

    const data = (await response.json()) as T | ApiErrorResponse;

    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      this.logger.error(
        `Vectorize API error: ${errorData.error}`,
        errorData.details,
      );
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return data as T;
  }

  /**
   * 生成向量嵌入
   *
   * @param texts - 要生成向量的文本数组（最多 32 条）
   * @param type - 类型：'query' 用于搜索查询，'document' 用于存储文档
   * @returns 向量数组
   */
  async embed(
    texts: string[],
    type: 'query' | 'document' = 'document',
  ): Promise<number[][]> {
    const result = await this.request<EmbedResponse>('/api/embed', {
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
  async upsert(vectors: UpsertVectorInput[]): Promise<UpsertResponse> {
    return this.request<UpsertResponse>('/api/vectors/upsert', {
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
  async query(text: string, options: QueryOptions = {}): Promise<QueryMatch[]> {
    const result = await this.request<QueryResponse>('/api/vectors/query', {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    });
    return result.matches;
  }

  /**
   * 删除向量
   *
   * @param ids - 要删除的向量 ID 列表
   */
  async delete(ids: string[]): Promise<DeleteResponse> {
    return this.request<DeleteResponse>('/api/vectors', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
