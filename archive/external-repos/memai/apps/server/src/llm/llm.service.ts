/**
 * [INPUT]: messages, prompts
 * [OUTPUT]: AI completions
 * [POS]: LLM 服务
 *
 * 职责：与 LLM 交互，用于实体抽取、关系识别等
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ExtractedEntity {
  name: string;
  type: string;
  confidence?: number;
  properties?: Record<string, any>;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  properties?: Record<string, any>;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get('LLM_PROVIDER', 'openai');
    this.apiKey = this.configService.get('OPENAI_API_KEY', '');
    this.model = this.configService.get('LLM_MODEL', 'gpt-4o-mini');
  }

  /**
   * 发送聊天消息
   */
  async chat(messages: ChatMessage[]): Promise<ChatCompletionResult> {
    if (this.provider === 'openai') {
      return this.chatOpenAI(messages);
    }

    throw new Error(`Unsupported LLM provider: ${this.provider}`);
  }

  /**
   * 从文本中抽取实体
   */
  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const systemPrompt = `You are an entity extraction system. Extract named entities from the given text.
Return a JSON array of objects with the following structure:
[{"name": "entity name", "type": "person|place|organization|product|event|concept|other", "confidence": 0.0-1.0}]

Only return the JSON array, no other text.`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    try {
      return JSON.parse(result.content);
    } catch (error) {
      this.logger.warn(`Failed to parse entity extraction result: ${result.content}`);
      return [];
    }
  }

  /**
   * 从文本中抽取关系
   */
  async extractRelations(text: string, entities: ExtractedEntity[]): Promise<ExtractedRelation[]> {
    const entityNames = entities.map((e) => e.name).join(', ');
    const systemPrompt = `You are a relation extraction system. Given the text and a list of entities, extract relationships between them.
Entities: ${entityNames}

Return a JSON array of objects with the following structure:
[{"source": "entity1", "target": "entity2", "type": "relationship type", "confidence": 0.0-1.0}]

Only return the JSON array, no other text.`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    try {
      return JSON.parse(result.content);
    } catch (error) {
      this.logger.warn(`Failed to parse relation extraction result: ${result.content}`);
      return [];
    }
  }

  /**
   * 从文本中同时抽取实体和关系
   */
  async extractEntitiesAndRelations(
    text: string,
    options: { entityTypes?: string[]; relationTypes?: string[] } = {},
  ): Promise<{ entities: ExtractedEntity[]; relations: ExtractedRelation[] }> {
    const entityTypesHint = options.entityTypes?.length
      ? `Focus on these entity types: ${options.entityTypes.join(', ')}`
      : '';
    const relationTypesHint = options.relationTypes?.length
      ? `Focus on these relation types: ${options.relationTypes.join(', ')}`
      : '';

    const systemPrompt = `You are an entity and relation extraction system. Extract named entities and their relationships from the given text.
${entityTypesHint}
${relationTypesHint}

Return a JSON object with the following structure:
{
  "entities": [{"name": "entity name", "type": "person|place|organization|product|event|concept|other", "confidence": 0.0-1.0, "properties": {}}],
  "relations": [{"source": "entity1 name", "target": "entity2 name", "type": "relationship type", "confidence": 0.0-1.0, "properties": {}}]
}

Only return the JSON object, no other text.`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    try {
      const parsed = JSON.parse(result.content);
      return {
        entities: parsed.entities || [],
        relations: parsed.relations || [],
      };
    } catch (error) {
      this.logger.warn(`Failed to parse extraction result: ${result.content}`);
      return { entities: [], relations: [] };
    }
  }

  /**
   * 生成记忆摘要
   */
  async generateMemorySummary(content: string): Promise<string> {
    const systemPrompt = `You are a summarization system. Create a concise, informative summary of the given content.
The summary should capture the key information in 1-2 sentences.`;

    const result = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ]);

    return result.content;
  }

  // ============ Private Methods ============

  private async chatOpenAI(messages: ChatMessage[]): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content,
        model: this.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to call LLM: ${(error as Error).message}`);
      throw error;
    }
  }
}
