/**
 * [PROVIDES]: complete(), completeParsed(), stream() - LLM completion methods
 * [DEPENDS]: openai - OpenAI-compatible API client
 * [POS]: LLM client wrapper supporting text, structured output, and streaming
 *
 * [PROTOCOL]: When this file changes, update this header and src/extract/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: 'text' | 'json_object';
  model?: string;
}

interface ParsedCompletionOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  model?: string;
}

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private openai: OpenAI;
  private readonly defaultModel: string;

  constructor(private config: ConfigService) {
    const baseUrl = config.get<string>('OPENAI_BASE_URL');
    this.openai = new OpenAI({
      apiKey: config.get('OPENAI_API_KEY'),
      // 只有明确配置了 baseURL 才使用，空字符串视为未配置
      baseURL: baseUrl && baseUrl.trim() ? baseUrl.trim() : undefined,
    });
    this.defaultModel = config.get('OPENAI_DEFAULT_MODEL') || 'gpt-4o-mini';
  }

  /**
   * 普通文本完成
   */
  async complete(options: CompletionOptions): Promise<string> {
    const {
      systemPrompt,
      userPrompt,
      responseFormat = 'text',
      model = this.defaultModel,
    } = options;

    this.logger.debug(`LLM request: model=${model}, format=${responseFormat}`);

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format:
        responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 使用 Structured Outputs (推荐用于 Extract API)
   * 自动进行 Schema 验证，无需手动解析 JSON
   */
  async completeParsed<T>(options: ParsedCompletionOptions<T>): Promise<T> {
    const {
      systemPrompt,
      userPrompt,
      schema,
      schemaName,
      model = this.defaultModel,
    } = options;

    this.logger.debug(`LLM structured request: model=${model}, schema=${schemaName}`);

    const response = await this.openai.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(schema, schemaName),
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) {
      throw new Error('Failed to parse LLM response');
    }

    return parsed;
  }

  /**
   * 流式输出 (用于长内容生成)
   */
  async *stream(options: CompletionOptions): AsyncGenerator<string> {
    const { systemPrompt, userPrompt, model = this.defaultModel } = options;

    this.logger.debug(`LLM stream request: model=${model}`);

    const stream = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
