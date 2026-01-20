/**
 * [INPUT]: ExtractOptions - URLs, prompt, JSON schema, modelId (optional; fallback to Admin default)
 * [OUTPUT]: ExtractResponse - Array of extraction results with data or errors
 * [POS]: Core extraction logic - scrape pages, call LLM, validate structured output
 *
 * [PROTOCOL]: When this file changes, update this header and src/extract/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScraperService } from '../scraper/scraper.service';
import {
  ExtractLlmClient,
  type ExtractResolvedLlm,
} from './extract-llm.client';
import { z } from 'zod';
import type { ExtractOptions } from './dto/extract.dto';
import type { ExtractResult, ExtractResponse } from './extract.types';
import { BillingService } from '../billing/billing.service';
import { randomUUID } from 'crypto';

/** 默认并发数 */
const DEFAULT_CONCURRENCY = 5;

/**
 * 将 JSON Schema 转换为 Zod Schema
 * 支持基本类型和嵌套对象/数组
 */
function jsonSchemaToZod(
  jsonSchema: Record<string, unknown>,
): z.ZodType<unknown> {
  const type = jsonSchema.type as string;

  if (type === 'object') {
    const properties = (jsonSchema.properties || {}) as Record<
      string,
      Record<string, unknown>
    >;
    const required = (jsonSchema.required || []) as string[];
    const shape: Record<string, z.ZodType<unknown>> = {};

    for (const [key, value] of Object.entries(properties)) {
      const fieldSchema = jsonSchemaToZod(value);
      // 如果不在 required 中，标记为 optional
      shape[key] = required.includes(key)
        ? fieldSchema
        : fieldSchema.optional();
    }

    return z.object(shape);
  }

  if (type === 'array') {
    const items = jsonSchema.items as Record<string, unknown>;
    return z.array(jsonSchemaToZod(items || { type: 'string' }));
  }

  if (type === 'string') {
    return z.string();
  }

  if (type === 'number' || type === 'integer') {
    return z.number();
  }

  if (type === 'boolean') {
    return z.boolean();
  }

  if (type === 'null') {
    return z.null();
  }

  // 默认返回 any
  return z.any();
}

@Injectable()
export class ExtractService {
  private readonly logger = new Logger(ExtractService.name);
  private readonly concurrency: number;

  constructor(
    private scraperService: ScraperService,
    private llmClient: ExtractLlmClient,
    private config: ConfigService,
    private billingService: BillingService,
  ) {
    this.concurrency = config.get('EXTRACT_CONCURRENCY') || DEFAULT_CONCURRENCY;
  }

  /**
   * 从多个 URL 提取结构化数据（并发处理）
   */
  async extract(
    userId: string,
    options: ExtractOptions,
  ): Promise<ExtractResponse> {
    const { urls, prompt, schema, systemPrompt, model } = options;

    const resolvedLlm = await this.llmClient.resolve(model);

    const billingKey = 'fetchx.extract' as const;
    const referenceId = randomUUID();
    const billing = await this.billingService.deductOrThrow({
      userId,
      billingKey,
      referenceId,
    });

    // 将 JSON Schema 转换为 Zod Schema（如果提供）
    const zodSchema = schema ? jsonSchemaToZod(schema) : null;

    this.logger.debug(
      `Extracting from ${urls.length} URLs with concurrency ${this.concurrency}${model ? `, model=${model}` : ''}`,
    );

    try {
      // 并发处理（带限流）
      const results = await this.processWithConcurrency(
        urls,
        (url) =>
          this.extractSingle(
            userId,
            url,
            prompt,
            systemPrompt,
            zodSchema,
            resolvedLlm,
          ),
        this.concurrency,
      );

      return { results };
    } catch (error) {
      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId,
          breakdown: billing.deduct.breakdown,
        });
      }
      throw error;
    }
  }

  /**
   * 提取单个 URL
   */
  private async extractSingle(
    userId: string,
    url: string,
    prompt: string | undefined,
    systemPrompt: string | undefined,
    zodSchema: z.ZodType<unknown> | null,
    resolvedLlm: ExtractResolvedLlm,
  ): Promise<ExtractResult> {
    try {
      // 1. 抓取页面内容
      const scrapeResult = await this.scraperService.scrapeSync(userId, {
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
        mobile: false,
        darkMode: false,
      });

      // 2. 构造 Prompt
      const userPrompt = this.buildPrompt(scrapeResult.markdown || '', prompt);

      let data: Record<string, unknown>;

      if (zodSchema) {
        // 3a. 使用 Structured Outputs
        data = (await this.llmClient.completeParsed(resolvedLlm, {
          systemPrompt: systemPrompt || this.getDefaultSystemPrompt(true),
          userPrompt,
          schema: zodSchema,
          schemaName: 'extracted_data',
        })) as Record<string, unknown>;
      } else {
        // 3b. 无 Schema，返回普通文本
        const response = await this.llmClient.complete(resolvedLlm, {
          systemPrompt: systemPrompt || this.getDefaultSystemPrompt(false),
          userPrompt,
        });
        data = { content: response };
      }

      this.logger.debug(`Extracted from ${url}`);
      return { url, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to extract from ${url}: ${errorMessage}`);
      return { url, error: errorMessage };
    }
  }

  /**
   * 带并发限制的批量处理
   */
  private async processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 构造用户提示词
   */
  private buildPrompt(markdown: string, userPrompt?: string): string {
    let prompt = `Given the following webpage content:\n\n${markdown}\n\n`;

    if (userPrompt) {
      prompt += userPrompt;
    } else {
      prompt += 'Extract the relevant structured data from this content.';
    }

    return prompt;
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(hasSchema: boolean): string {
    if (hasSchema) {
      return `You are a data extraction assistant. Extract structured data from the given webpage content. Be accurate and only include information that is explicitly present in the content.`;
    }
    return `You are a helpful assistant that analyzes webpage content.`;
  }
}
