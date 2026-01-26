/**
 * Digest AI Service
 *
 * [INPUT]: 内容全文、订阅上下文、语言设置
 * [OUTPUT]: AI 生成的摘要、叙事稿、评分解释
 * [POS]: 处理所有 AI 调用，负责 LLM 交互和结果缓存（统一走 AI SDK）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { generateText, type LanguageModel, type ModelMessage } from 'ai';
import { LlmLanguageModelService } from '../../llm';
import { AI_PROMPTS, AI_SUMMARY, BILLING } from '../digest.constants';
import type { BillingBreakdown } from './run.service';

/**
 * 内容摘要输入
 */
export interface ContentSummaryInput {
  title: string;
  description?: string;
  fulltext?: string;
  url: string;
}

/**
 * 叙事稿输入项
 */
export interface NarrativeItem {
  title: string;
  url: string;
  aiSummary?: string;
  scoreOverall: number;
  scoringReason?: string;
}

/**
 * 订阅上下文（用于叙事和解释生成）
 */
export interface SubscriptionContext {
  topic: string;
  interests: string[];
}

/**
 * 评分解释输入
 */
export interface ReasonInput {
  title: string;
  description?: string;
  heuristicReason: string;
}

/**
 * AI 生成结果（带计费）
 */
export interface AiGenerationResult<T> {
  result: T;
  tokensUsed?: number;
  cost: number;
}

type DigestResolvedLlm = {
  model: LanguageModel;
};

@Injectable()
export class DigestAiService {
  private readonly logger = new Logger(DigestAiService.name);

  constructor(private readonly llmLanguageModel: LlmLanguageModelService) {}

  private async resolveLlm(): Promise<DigestResolvedLlm> {
    const resolved = await this.llmLanguageModel.resolveModel({
      purpose: 'agent',
    });

    return {
      model: resolved.model,
    };
  }

  private async completeText(
    resolved: DigestResolvedLlm,
    params: { systemPrompt: string; userPrompt: string },
  ): Promise<string> {
    const messages: ModelMessage[] = [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ];

    const result = await generateText({
      model: resolved.model,
      messages,
    });

    return result.text ?? '';
  }

  /**
   * 生成内容摘要
   *
   * 为单条内容生成 AI 摘要，支持多语言
   */
  async generateSummary(
    input: ContentSummaryInput,
    locale: string,
    billingBreakdown?: BillingBreakdown,
  ): Promise<AiGenerationResult<string>> {
    const { title, description, fulltext, url } = input;

    // 构建用于摘要的内容
    const contentForSummary = this.buildContentForSummary(
      title,
      description,
      fulltext,
    );

    if (!contentForSummary || contentForSummary.length < 100) {
      // 内容太短，使用描述作为摘要
      const fallback =
        description || `${title} - Read more at the original article.`;
      return {
        result: fallback.slice(0, AI_SUMMARY.maxLength),
        cost: 0,
      };
    }

    const localeInstruction =
      locale !== 'en' ? `\n\nOutput language: ${locale}` : '';

    const resolved = await this.resolveLlm();

    try {
      const summary = await this.completeText(resolved, {
        systemPrompt: AI_PROMPTS.contentSummary.system + localeInstruction,
        userPrompt: `Title: ${title}\n\nContent:\n${contentForSummary}`,
      });

      // 记录计费
      const cost = BILLING.costs['ai.summary'];
      if (billingBreakdown) {
        billingBreakdown['ai.summary'] = {
          count: (billingBreakdown['ai.summary']?.count || 0) + 1,
          costPerCall: cost,
          subtotalCredits:
            (billingBreakdown['ai.summary']?.subtotalCredits || 0) + cost,
        };
      }

      this.logger.debug(`Generated summary for: ${title.slice(0, 50)}...`);

      return {
        result: summary.slice(0, AI_SUMMARY.maxLength),
        cost,
      };
    } catch (error) {
      this.logger.error(`Failed to generate summary for ${url}:`, error);

      // 降级：使用描述或截断的全文
      const fallback =
        description || fulltext?.slice(0, AI_SUMMARY.maxLength) || title;
      return {
        result: fallback.slice(0, AI_SUMMARY.maxLength),
        cost: 0,
      };
    }
  }

  /**
   * 生成叙事摘要
   *
   * 将多条内容组织成连贯的编辑稿
   */
  async generateNarrative(
    items: NarrativeItem[],
    subscription: SubscriptionContext,
    locale: string,
    billingBreakdown?: BillingBreakdown,
  ): Promise<AiGenerationResult<string>> {
    if (items.length === 0) {
      return { result: '', cost: 0 };
    }

    // 构建叙事输入
    const itemsDescription = items
      .map(
        (item, index) =>
          `${index + 1}. **${item.title}**
   URL: ${item.url}
   Summary: ${item.aiSummary || 'No summary available'}
   Relevance: ${item.scoringReason || 'Matches topic'}`,
      )
      .join('\n\n');

    const localeInstruction =
      locale !== 'en' ? `\n\nOutput language: ${locale}` : '';

    const userPrompt = `Topic: ${subscription.topic}
Interests: ${subscription.interests.join(', ') || 'General'}

Articles to include (${items.length} items):

${itemsDescription}`;

    const resolved = await this.resolveLlm();

    try {
      const narrative = await this.completeText(resolved, {
        systemPrompt: AI_PROMPTS.narrative.system + localeInstruction,
        userPrompt,
      });

      // 记录计费
      const cost = BILLING.costs['ai.narrative'];
      if (billingBreakdown) {
        billingBreakdown['ai.narrative'] = {
          count: (billingBreakdown['ai.narrative']?.count || 0) + 1,
          costPerCall: cost,
          subtotalCredits:
            (billingBreakdown['ai.narrative']?.subtotalCredits || 0) + cost,
        };
      }

      this.logger.debug(
        `Generated narrative for ${items.length} items, ${narrative.length} chars`,
      );

      return {
        result: narrative,
        cost,
      };
    } catch (error) {
      this.logger.error('Failed to generate narrative:', error);

      // 降级：生成简单的列表格式
      const fallback = this.generateFallbackNarrative(items, subscription);
      return {
        result: fallback,
        cost: 0,
      };
    }
  }

  /**
   * 生成评分解释（增强版）
   *
   * 将启发式 reason 转换为更自然的解释
   */
  async generateReason(
    input: ReasonInput,
    subscription: SubscriptionContext,
    billingBreakdown?: BillingBreakdown,
  ): Promise<AiGenerationResult<string>> {
    const { title, description, heuristicReason } = input;

    // 如果启发式 reason 已经足够好，直接返回
    if (
      heuristicReason.length > 30 &&
      !heuristicReason.startsWith('No keyword')
    ) {
      return { result: heuristicReason, cost: 0 };
    }

    const userPrompt = `Article: "${title}"
${description ? `Description: ${description}` : ''}

User's topic: ${subscription.topic}
User's interests: ${subscription.interests.join(', ') || 'None specified'}

Current explanation: ${heuristicReason}`;

    const resolved = await this.resolveLlm();

    try {
      const reason = await this.completeText(resolved, {
        systemPrompt: AI_PROMPTS.explainReason.system,
        userPrompt,
      });

      // 记录计费
      const cost = BILLING.costs['ai.explainReason'];
      if (billingBreakdown) {
        billingBreakdown['ai.explainReason'] = {
          count: (billingBreakdown['ai.explainReason']?.count || 0) + 1,
          costPerCall: cost,
          subtotalCredits:
            (billingBreakdown['ai.explainReason']?.subtotalCredits || 0) + cost,
        };
      }

      // 确保不超过长度限制
      return {
        result: reason.slice(0, 100),
        cost,
      };
    } catch (error) {
      this.logger.warn(`Failed to generate reason for "${title}":`, error);
      return { result: heuristicReason, cost: 0 };
    }
  }

  /**
   * 批量生成摘要（优化版）
   *
   * 对多条内容并发生成摘要，控制并发数
   */
  async generateSummaryBatch(
    inputs: ContentSummaryInput[],
    locale: string,
    billingBreakdown?: BillingBreakdown,
    concurrency = 3,
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // 分批处理
    for (let i = 0; i < inputs.length; i += concurrency) {
      const batch = inputs.slice(i, i + concurrency);
      const promises = batch.map(async (input) => {
        const { result } = await this.generateSummary(
          input,
          locale,
          billingBreakdown,
        );
        return { url: input.url, summary: result };
      });

      const batchResults = await Promise.all(promises);
      for (const { url, summary } of batchResults) {
        results.set(url, summary);
      }
    }

    return results;
  }

  /**
   * 构建用于摘要的内容（截断过长内容）
   */
  private buildContentForSummary(
    title: string,
    description?: string,
    fulltext?: string,
  ): string {
    // 优先使用全文
    if (fulltext && fulltext.length > 200) {
      // 截断到合理长度（约 4000 tokens ≈ 16000 chars）
      const maxLength = 16000;
      if (fulltext.length > maxLength) {
        return fulltext.slice(0, maxLength) + '\n\n[Content truncated...]';
      }
      return fulltext;
    }

    // 回退到描述
    if (description && description.length > 50) {
      return description;
    }

    // 最后使用标题
    return title;
  }

  /**
   * 生成降级版叙事稿
   */
  private generateFallbackNarrative(
    items: NarrativeItem[],
    subscription: SubscriptionContext,
  ): string {
    const lines = [
      `## ${subscription.topic} Digest`,
      '',
      `Here are the top ${items.length} articles for you:`,
      '',
    ];

    for (const item of items) {
      lines.push(`- **${item.title}**`);
      if (item.aiSummary) {
        lines.push(`  ${item.aiSummary.slice(0, 200)}...`);
      }
      lines.push(`  [Read more](${item.url})`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
