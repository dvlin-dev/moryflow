/**
 * [INPUT]: text content + embedding provider runtime config
 * [OUTPUT]: vector embeddings (expected dims, default 1536; provider dims only sent when explicitly configured)
 * [POS]: 向量嵌入服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 *
 * 职责：生成文本的向量表示
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const EMBEDDING_OPENAI_API_KEY_ENV = 'EMBEDDING_OPENAI_API_KEY';
const EMBEDDING_OPENAI_BASE_URL_ENV = 'EMBEDDING_OPENAI_BASE_URL';
const EMBEDDING_OPENAI_MODEL_ENV = 'EMBEDDING_OPENAI_MODEL';
const EMBEDDING_OPENAI_DIMENSIONS_ENV = 'EMBEDDING_OPENAI_DIMENSIONS';
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly dimensionsExplicit: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(EMBEDDING_OPENAI_API_KEY_ENV);
    if (!apiKey || !apiKey.trim()) {
      throw new Error('Embedding provider API key is not configured');
    }

    const baseUrl = this.configService.get<string>(
      EMBEDDING_OPENAI_BASE_URL_ENV,
    );

    this.openai = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: baseUrl && baseUrl.trim() ? baseUrl.trim() : undefined,
    });

    this.model = this.configService.get<string>(
      EMBEDDING_OPENAI_MODEL_ENV,
      'text-embedding-3-small',
    );
    const dimensionsConfig = this.readDimensions();
    this.dimensions = dimensionsConfig.value;
    this.dimensionsExplicit = dimensionsConfig.explicit;
  }

  /**
   * 生成单个文本的向量
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.openai.embeddings.create({
        input: text,
        model: this.model,
        ...(this.dimensionsExplicit ? { dimensions: this.dimensions } : {}),
      });

      const embedding = response.data[0].embedding;
      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: expected ${this.dimensions}, got ${embedding.length}`,
        );
      }

      return {
        embedding,
        model: response.model,
        dimensions: embedding.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${(error as Error).message}`,
      );
      throw error;
    }
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

    try {
      const response = await this.openai.embeddings.create({
        input: texts,
        model: this.model,
        ...(this.dimensionsExplicit ? { dimensions: this.dimensions } : {}),
      });

      // OpenAI 返回的 data 数组按输入顺序排列
      return response.data.map((item) => {
        if (item.embedding.length !== this.dimensions) {
          throw new Error(
            `Embedding dimension mismatch: expected ${this.dimensions}, got ${item.embedding.length}`,
          );
        }

        return {
          embedding: item.embedding,
          model: response.model,
          dimensions: item.embedding.length,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate batch embeddings: ${(error as Error).message}`,
      );
      throw error;
    }
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

  private readDimensions(): { value: number; explicit: boolean } {
    const configured = this.configService.get<string>(
      EMBEDDING_OPENAI_DIMENSIONS_ENV,
    );
    if (!configured?.trim()) {
      return {
        value: DEFAULT_EMBEDDING_DIMENSIONS,
        explicit: false,
      };
    }

    const parsed = Number(configured);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(
        `${EMBEDDING_OPENAI_DIMENSIONS_ENV} must be a positive integer`,
      );
    }

    return {
      value: parsed,
      explicit: true,
    };
  }
}
