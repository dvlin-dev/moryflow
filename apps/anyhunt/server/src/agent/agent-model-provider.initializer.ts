/**
 * [INPUT]: ConfigService env (OPENAI_API_KEY / OPENAI_BASE_URL)
 * [OUTPUT]: 设置 @anyhunt/agents-core 的默认 ModelProvider（只使用 Chat Completions）
 * [POS]: Anyhunt Server 启动期初始化 Agent 的 LLM Provider（避免 runtime 报 “No default model provider set”）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setDefaultModelProvider } from '@anyhunt/agents-core';
import { OpenAIProvider } from '@anyhunt/agents-openai';

@Injectable()
export class AgentModelProviderInitializer implements OnModuleInit {
  private readonly logger = new Logger(AgentModelProviderInitializer.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const rawApiKey = this.config.get<string>('OPENAI_API_KEY');
    const apiKey = rawApiKey && rawApiKey.trim() ? rawApiKey.trim() : undefined;

    const rawBaseUrl = this.config.get<string>('OPENAI_BASE_URL');
    const baseURL =
      rawBaseUrl && rawBaseUrl.trim() ? rawBaseUrl.trim() : undefined;

    // 注意：即使 apiKey 未配置，也要先设置 provider，避免 agents-core 直接抛 “No default model provider set”
    // 真正调用时若缺少 apiKey，会由 OpenAI SDK 抛出更具体的错误（可在上层再做用户友好提示）。
    setDefaultModelProvider(
      // 约束：Anyhunt Server 禁止使用 Responses API，只使用 /chat/completions
      new OpenAIProvider({ apiKey, baseURL, useResponses: false }),
    );

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not configured; Agent/Playground LLM calls will fail until it is set',
      );
    }

    this.logger.log(
      `Default model provider set: OpenAIProvider(api=chat_completions, baseURL=${baseURL ? 'configured' : 'default'})`,
    );
  }
}
