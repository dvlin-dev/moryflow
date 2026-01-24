/**
 * [INPUT]: messages, custom instructions, custom categories
 * [OUTPUT]: memories/tags/graph from LLM
 * [POS]: Memory LLM 推断与抽取服务（Mem0 aligned）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  AgentOutputItem,
  ModelRequest,
  ModelResponse,
} from '@anyhunt/agents-core';
import { getDefaultModelSettings } from '@anyhunt/agents-core';
import { LlmRoutingService } from '../../llm';

const MEMORY_INFER_PROMPT = `You are a memory extraction assistant.
Summarize the input messages into one or more concise memory sentences.
Return strict JSON with the following shape:
{
  "memories": ["..."]
}
Only return JSON.`;

const GRAPH_EXTRACTION_PROMPT = `You are a knowledge graph extraction assistant.
Extract entities and relations from the input text.
Return strict JSON with the following shape:
{
  "entities": [{"id": "", "name": "", "type": ""}],
  "relations": [{"source": "", "target": "", "relation": ""}]
}
Rules:
- Use entity name as id if no stable id exists.
- relation is a short verb phrase.
Only return JSON.`;

const MEMORY_TAGS_PROMPT = `You are a memory tagging assistant.
Extract short categories and keywords from the input memory text.
Return strict JSON with the following shape:
{
  "categories": ["..."],
  "keywords": ["..."]
}
Rules:
- categories should be short, concrete topics (1-3 words).
- keywords should be concise terms or short phrases.
- If custom categories are provided, prefer them.
Only return JSON.`;

@Injectable()
export class MemoryLlmService {
  private readonly logger = new Logger(MemoryLlmService.name);

  constructor(private readonly llmRoutingService: LlmRoutingService) {}

  async inferMemoriesFromMessages(params: {
    messages: Record<string, string | null>[];
    includes?: string;
    excludes?: string;
    customInstructions?: string;
    fallbackText: string;
  }): Promise<string[]> {
    try {
      const payload = await this.callLlmText(
        this.buildMemoryInferencePrompt({
          includes: params.includes,
          excludes: params.excludes,
          customInstructions: params.customInstructions,
        }),
        JSON.stringify({ messages: params.messages }),
      );
      const parsed = this.parseJsonPayload<{ memories?: string[] }>(payload);
      if (parsed?.memories?.length) {
        return parsed.memories.map((memory) => memory.trim()).filter(Boolean);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to infer memory from LLM: ${(error as Error).message}`,
      );
    }

    return params.fallbackText ? [params.fallbackText] : [];
  }

  async extractTags(params: {
    text: string;
    customCategories?: Record<string, unknown> | null;
    customInstructions?: string | null;
  }): Promise<{ categories: string[]; keywords: string[] }> {
    const fallbackKeywords = this.extractKeywordsFallback(params.text);
    const customCategoryNames = params.customCategories
      ? Object.keys(params.customCategories)
      : [];

    try {
      const payload = await this.callLlmText(
        MEMORY_TAGS_PROMPT,
        JSON.stringify({
          text: params.text,
          custom_categories: params.customCategories ?? null,
          custom_instructions: params.customInstructions ?? null,
        }),
      );
      const parsed = this.parseJsonPayload<{
        categories?: unknown;
        keywords?: unknown;
      }>(payload);

      const categories = this.normalizeStringList(parsed?.categories, 12);
      const keywords = this.normalizeStringList(parsed?.keywords, 16);

      return {
        categories: categories.length
          ? categories
          : this.normalizeStringList(customCategoryNames, 12),
        keywords: keywords.length ? keywords : fallbackKeywords,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to extract tags from LLM: ${(error as Error).message}`,
      );
      return {
        categories: this.normalizeStringList(customCategoryNames, 12),
        keywords: fallbackKeywords,
      };
    }
  }

  async extractGraph(text: string): Promise<{
    entities: Record<string, unknown>[];
    relations: Record<string, unknown>[];
  } | null> {
    try {
      const payload = await this.callLlmText(
        GRAPH_EXTRACTION_PROMPT,
        JSON.stringify({ text }),
      );
      const parsed = this.parseJsonPayload<{
        entities?: Record<string, unknown>[];
        relations?: Record<string, unknown>[];
      }>(payload);

      if (!parsed) {
        return null;
      }

      return {
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      };
    } catch (error) {
      this.logger.warn(
        `Failed to extract graph from LLM: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private extractTextFromOutput(output: AgentOutputItem[]): string {
    const chunks: string[] = [];

    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      const role = (item as { role?: unknown }).role;
      if (role !== 'assistant' || !Array.isArray(content)) {
        continue;
      }

      for (const part of content) {
        if (
          typeof part === 'object' &&
          part !== null &&
          (part as { type?: string }).type === 'output_text'
        ) {
          const text = (part as { text?: string }).text;
          if (text) {
            chunks.push(text);
          }
        }
      }
    }

    return chunks.join('').trim();
  }

  private parseJsonPayload<T>(raw: string): T | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      const first = trimmed.indexOf('{');
      const last = trimmed.lastIndexOf('}');
      if (first >= 0 && last > first) {
        try {
          return JSON.parse(trimmed.slice(first, last + 1)) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private async callLlmText(
    systemInstructions: string,
    input: string,
  ): Promise<string> {
    const route = await this.llmRoutingService.resolveExtractModel();
    const request: ModelRequest = {
      systemInstructions,
      input,
      modelSettings: getDefaultModelSettings(),
      tools: [],
      toolsExplicitlyProvided: true,
      outputType: 'text',
      handoffs: [],
      tracing: false,
    };

    const response: ModelResponse = await route.model.getResponse(request);
    return this.extractTextFromOutput(response.output);
  }

  private buildMemoryInferencePrompt(params: {
    includes?: string;
    excludes?: string;
    customInstructions?: string;
  }): string {
    const additions: string[] = [];

    if (params.customInstructions) {
      additions.push(`Custom instructions: ${params.customInstructions}`);
    }
    if (params.includes) {
      additions.push(`Always include: ${params.includes}`);
    }
    if (params.excludes) {
      additions.push(`Always exclude: ${params.excludes}`);
    }

    if (additions.length === 0) {
      return MEMORY_INFER_PROMPT;
    }

    return `${MEMORY_INFER_PROMPT}\n${additions.join('\n')}`;
  }

  private normalizeStringList(input: unknown, limit = 12): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of input) {
      const value = String(item).trim();
      if (!value) {
        continue;
      }
      const key = value.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(value);
      if (result.length >= limit) {
        break;
      }
    }

    return result;
  }

  private extractKeywordsFallback(text: string): string[] {
    const stopwords = new Set([
      'the',
      'and',
      'or',
      'a',
      'an',
      'to',
      'of',
      'in',
      'on',
      'for',
      'with',
      'is',
      'are',
      'was',
      'were',
      'be',
      'this',
      'that',
      'it',
      'as',
      'at',
      'by',
      'from',
      'i',
      'you',
      'we',
      'they',
      'he',
      'she',
      'my',
      'your',
      'our',
      'their',
      'me',
    ]);

    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return [];
    }

    const frequency = new Map<string, number>();
    const order = new Map<string, number>();
    const tokens = cleaned.split(' ');
    let index = 0;

    for (const token of tokens) {
      if (token.length < 3 || stopwords.has(token)) {
        continue;
      }
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
      if (!order.has(token)) {
        order.set(token, index++);
      }
    }

    return Array.from(frequency.entries())
      .sort((a, b) => {
        const diff = b[1] - a[1];
        if (diff !== 0) {
          return diff;
        }
        return (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0);
      })
      .slice(0, 12)
      .map(([token]) => token);
  }
}
