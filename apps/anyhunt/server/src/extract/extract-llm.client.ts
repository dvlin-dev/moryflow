/**
 * [PROVIDES]: resolve(), complete(), completeParsed(), stream() - Extract 用 LLM 能力
 * [DEPENDS]: llm/LlmLanguageModelService + ai - AI SDK LanguageModel
 * [POS]: Extract 的 LLM 调用边界：只负责 Extract 场景的 prompt/structured-output 调用，不负责 provider 路由/密钥管理（统一抛出 LlmError）
 *
 * [PROTOCOL]: When this file changes, update this header and src/extract/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  generateObject,
  generateText,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from 'ai';
import { LlmLanguageModelService } from '../llm';
import { LlmError } from './extract.errors';

export type ExtractResolvedLlm = {
  model: LanguageModel;
  upstreamModelId: string;
};

interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
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

  constructor(private readonly llmLanguageModel: LlmLanguageModelService) {}

  async resolve(requestedModelId?: string): Promise<ExtractResolvedLlm> {
    const resolved = await this.llmLanguageModel.resolveModel({
      purpose: 'extract',
      requestedModelId,
    });

    return {
      model: resolved.model,
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
    const { systemPrompt, userPrompt } = options;

    this.logger.debug(`LLM request: model=${resolved.upstreamModelId}`);

    const messages: ModelMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await generateText({
      model: resolved.model,
      messages,
    });

    return result.text ?? '';
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

    const messages: ModelMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const result = await generateObject({
        model: resolved.model,
        schema,
        messages,
      });

      if (!result.object) {
        throw new LlmError('Structured output is empty', {
          schema: schemaName,
          model: resolved.upstreamModelId,
        });
      }

      return result.object as T;
    } catch (error) {
      if (error instanceof LlmError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new LlmError(`Structured output failed: ${reason}`, {
        schema: schemaName,
        model: resolved.upstreamModelId,
      });
    }
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

    const messages: ModelMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const streamResult = streamText({
      model: resolved.model,
      messages,
    });

    for await (const delta of streamResult.textStream) {
      if (delta) {
        yield delta;
      }
    }
  }
}
