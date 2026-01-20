/**
 * [PROVIDES]: resolve(), complete(), completeParsed(), stream() - Extract 用 LLM 能力
 * [DEPENDS]: llm/LlmOpenAiClientService + openai - OpenAI-compatible API client
 * [POS]: Extract 的 LLM 调用边界：只负责 Extract 场景的 prompt/structured-output 调用，不负责 provider 路由/密钥管理
 *
 * [PROTOCOL]: When this file changes, update this header and src/extract/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type OpenAI from 'openai';
import { LlmOpenAiClientService } from '../llm';

export type ExtractResolvedLlm = {
  client: OpenAI;
  upstreamModelId: string;
};

interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: 'text' | 'json_object';
}

interface ParsedCompletionOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
}

@Injectable()
export class ExtractLlmClient {
  private readonly logger = new Logger(ExtractLlmClient.name);

  constructor(private readonly llmOpenAiClient: LlmOpenAiClientService) {}

  async resolve(requestedModelId?: string): Promise<ExtractResolvedLlm> {
    const resolved = await this.llmOpenAiClient.resolveClient({
      purpose: 'extract',
      requestedModelId,
    });

    return {
      client: resolved.client,
      upstreamModelId: resolved.upstreamModelId,
    };
  }

  /**
   * 普通文本完成
   */
  async complete(
    resolved: ExtractResolvedLlm,
    options: CompletionOptions,
  ): Promise<string> {
    const { systemPrompt, userPrompt, responseFormat = 'text' } = options;

    this.logger.debug(
      `LLM request: model=${resolved.upstreamModelId}, format=${responseFormat}`,
    );

    const response = await resolved.client.chat.completions.create({
      model: resolved.upstreamModelId,
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
   * 使用 Structured Outputs（推荐用于 Extract API）
   */
  async completeParsed<T>(
    resolved: ExtractResolvedLlm,
    options: ParsedCompletionOptions<T>,
  ): Promise<T> {
    const { systemPrompt, userPrompt, schema, schemaName } = options;

    this.logger.debug(
      `LLM structured request: model=${resolved.upstreamModelId}, schema=${schemaName}`,
    );

    const response = await resolved.client.chat.completions.parse({
      model: resolved.upstreamModelId,
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
   * 流式输出（用于长内容生成）
   */
  async *stream(
    resolved: ExtractResolvedLlm,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    const { systemPrompt, userPrompt } = options;

    this.logger.debug(`LLM stream request: model=${resolved.upstreamModelId}`);

    const stream = await resolved.client.chat.completions.create({
      model: resolved.upstreamModelId,
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
