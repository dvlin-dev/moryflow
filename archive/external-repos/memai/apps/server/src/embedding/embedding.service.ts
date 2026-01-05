/**
 * [INPUT]: text content
 * [OUTPUT]: vector embeddings
 * [POS]: 向量嵌入服务
 *
 * 职责：生成文本的向量表示
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get('EMBEDDING_PROVIDER', 'openai');
    this.apiKey = this.configService.get('OPENAI_API_KEY', '');
    this.model = this.configService.get('EMBEDDING_MODEL', 'text-embedding-3-small');
  }

  /**
   * 生成单个文本的向量
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.provider === 'openai') {
      return this.generateOpenAIEmbedding(text);
    }

    throw new Error(`Unsupported embedding provider: ${this.provider}`);
  }

  /**
   * 批量生成向量（使用批量 API 调用优化）
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // 单个文本直接调用单个方法
    if (texts.length === 1) {
      return [await this.generateEmbedding(texts[0])];
    }

    if (this.provider === 'openai') {
      return this.generateOpenAIBatchEmbeddings(texts);
    }

    // 其他 provider 回退到逐个调用
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      const result = await this.generateEmbedding(text);
      results.push(result);
    }
    return results;
  }

  /**
   * 计算两个向量的余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ============ Private Methods ============

  private async generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      return {
        embedding,
        model: this.model,
        dimensions: embedding.length,
      };
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * OpenAI 批量 embedding API 调用
   * 一次请求处理多个文本，减少网络延迟
   */
  private async generateOpenAIBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();

      // OpenAI 返回的 data.data 数组按输入顺序排列
      return data.data.map((item: { embedding: number[]; index: number }) => ({
        embedding: item.embedding,
        model: this.model,
        dimensions: item.embedding.length,
      }));
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${(error as Error).message}`);
      throw error;
    }
  }
}
