/**
 * Text Refiner Service
 * 使用 LLM 优化语音转录文本，纠正错别字并还原用户原话
 *
 * [INPUT]: rawText - 原始语音转录文本
 * [OUTPUT]: refinedText - 优化后的文本
 * [POS]: 使用 OpenRouter API 调用 openai/gpt-4.1-mini 模型
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

// ==================== 常量 ====================

/** OpenRouter API 配置 */
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'azure/gpt-4.1-mini';

const REFINER_SYSTEM_PROMPT = `你是一个语音转文字的校对助手。请优化以下语音转录文本：
1. 纠正明显的错别字和同音字错误
2. 保持用户原话的口语化风格，不要改写成书面语
3. 补充必要的标点符号
4. 不要添加、删除或改变原意

请直接输出优化后的文本，不要有任何解释。`;

// ==================== 异常类型 ====================

export enum RefinerErrorCode {
  /** 未配置 */
  NOT_CONFIGURED = 'REFINER_NOT_CONFIGURED',
  /** 优化失败 */
  REFINE_FAILED = 'REFINER_FAILED',
}

export class RefinerException extends Error {
  constructor(
    message: string,
    public readonly code: RefinerErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RefinerException';
  }
}

// ==================== 服务实现 ====================

@Injectable()
export class TextRefinerService {
  private readonly logger = new Logger(TextRefinerService.name);
  private client: OpenAI | null = null;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY ?? '';
  }

  /**
   * 获取 OpenAI 客户端（延迟初始化）
   */
  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new RefinerException(
          'OPENROUTER_API_KEY is not configured',
          RefinerErrorCode.NOT_CONFIGURED,
        );
      }

      this.client = new OpenAI({
        baseURL: OPENROUTER_BASE_URL,
        apiKey: this.apiKey,
      });

      this.logger.log(
        `Text Refiner initialized with model: ${OPENROUTER_MODEL}`,
      );
    }
    return this.client;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * 优化转录文本
   * 如果未配置或出错，返回原文本
   */
  async refine(rawText: string): Promise<string> {
    // 未配置时直接返回原文本
    if (!this.isConfigured()) {
      this.logger.debug('Text Refiner not configured, returning raw text');
      return rawText;
    }

    // 空文本直接返回
    if (!rawText.trim()) {
      return rawText;
    }

    try {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: REFINER_SYSTEM_PROMPT },
          { role: 'user', content: rawText },
        ],
        temperature: 0.3,
        max_tokens: Math.max(rawText.length * 2, 500),
      });

      const refinedText = response.choices[0]?.message?.content?.trim();

      if (!refinedText) {
        this.logger.warn('Refiner returned empty response, using raw text');
        return rawText;
      }

      this.logger.debug(
        `Text refined: ${rawText.length} chars -> ${refinedText.length} chars`,
      );

      return refinedText;
    } catch (error) {
      // 出错时返回原文本，不影响主流程
      this.logger.error('Text refining failed, using raw text', error);
      return rawText;
    }
  }
}
