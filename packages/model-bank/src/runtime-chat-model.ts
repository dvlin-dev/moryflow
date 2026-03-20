import type { LanguageModelV2, LanguageModelV3 } from '@ai-sdk/provider';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import {
  buildLanguageModelReasoningSettings,
  type ThinkingReasoningRuntimeInput,
} from './thinking/reasoning';
import type { RuntimeChatSdkType } from './thinking/resolver';
import type { ProviderSdkType } from './types/llm';

export type RuntimeChatLanguageModel = LanguageModelV2 | LanguageModelV3;

export interface RuntimeChatModelFactoryOptions {
  apiKey: string;
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
  modelId: string;
  providerId: string;
  reasoning?: ThinkingReasoningRuntimeInput;
  sdkType: RuntimeChatSdkType;
}

export interface RuntimeChatModelFactoryResult {
  agentProviderData?: Record<string, unknown>;
  model: RuntimeChatLanguageModel;
  providerOptions?: Record<string, unknown>;
}

const withOptionalFetch = <T extends Record<string, unknown>>(
  value: T,
  fetchFn?: typeof globalThis.fetch
): T & { fetch?: typeof globalThis.fetch } => (fetchFn ? { ...value, fetch: fetchFn } : value);

const nonEmptyRecord = (
  value: Record<string, unknown> | undefined
): Record<string, unknown> | undefined =>
  value && Object.keys(value).length > 0 ? value : undefined;

const resolveCallableFactory = (
  value: unknown
): ((modelId: string, settings?: Record<string, unknown>) => RuntimeChatLanguageModel) => {
  if (typeof value === 'function') {
    return value as (
      modelId: string,
      settings?: Record<string, unknown>
    ) => RuntimeChatLanguageModel;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'chat' in value &&
    typeof (value as { chat?: unknown }).chat === 'function'
  ) {
    return (
      value as {
        chat: (modelId: string, settings?: Record<string, unknown>) => RuntimeChatLanguageModel;
      }
    ).chat;
  }

  throw new TypeError('Expected AI SDK provider factory to be callable or expose .chat()');
};

export const buildReasoningProviderOptions = (
  sdkType: ProviderSdkType,
  reasoning?: ThinkingReasoningRuntimeInput
): Record<string, unknown> | undefined => {
  const settings = buildLanguageModelReasoningSettings({
    sdkType,
    reasoning,
  });
  if (!settings) {
    return undefined;
  }

  if (settings.kind === 'openrouter-settings') {
    return {
      openrouter: settings.settings.extraBody,
    };
  }

  switch (sdkType) {
    case 'openai':
    case 'xai':
      return {
        openai: settings.settings,
      };
    case 'openai-compatible':
      return {
        openaiCompatible: settings.settings,
      };
    case 'google':
      return {
        google: settings.settings,
      };
    case 'anthropic':
      return {
        anthropic: settings.settings,
      };
    default:
      return undefined;
  }
};

export const buildAgentReasoningProviderData = (
  sdkType: ProviderSdkType,
  reasoning?: ThinkingReasoningRuntimeInput
): Record<string, unknown> | undefined => {
  const providerOptions = buildReasoningProviderOptions(sdkType, reasoning);
  if (!providerOptions) {
    return undefined;
  }

  if (sdkType === 'openai-compatible') {
    return {
      ...providerOptions,
      reasoningContentToolCalls: true,
    };
  }

  return providerOptions;
};

export const createRuntimeChatLanguageModel = (
  options: RuntimeChatModelFactoryOptions
): RuntimeChatModelFactoryResult => {
  const { apiKey, baseURL, fetch, modelId, providerId, reasoning, sdkType } = options;
  const reasoningSettings = buildLanguageModelReasoningSettings({
    sdkType,
    reasoning,
  });
  const providerOptions = buildReasoningProviderOptions(sdkType, reasoning);
  const agentProviderData = buildAgentReasoningProviderData(sdkType, reasoning);

  switch (sdkType) {
    case 'openai': {
      const openai = createOpenAI(
        withOptionalFetch(
          {
            apiKey,
            baseURL,
          },
          fetch
        )
      ) as {
        chat: (
          targetModelId: string,
          settings?: Record<string, unknown>
        ) => RuntimeChatLanguageModel;
      };

      return {
        model: openai.chat(
          modelId,
          reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
        ),
        providerOptions: nonEmptyRecord(providerOptions),
        agentProviderData: nonEmptyRecord(agentProviderData),
      };
    }

    case 'openai-compatible': {
      const openaiCompatible = createOpenAICompatible(
        withOptionalFetch(
          {
            apiKey,
            baseURL: baseURL || 'https://api.openai.com/v1',
            name: providerId,
          },
          fetch
        )
      ) as (targetModelId: string) => RuntimeChatLanguageModel;

      return {
        model: openaiCompatible(modelId),
        providerOptions: nonEmptyRecord(providerOptions),
        agentProviderData: nonEmptyRecord(agentProviderData),
      };
    }

    case 'anthropic': {
      const anthropic = resolveCallableFactory(
        createAnthropic(
          withOptionalFetch(
            {
              apiKey,
              baseURL,
            },
            fetch
          )
        )
      );

      return {
        model: anthropic(
          modelId,
          reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
        ),
        providerOptions: nonEmptyRecord(providerOptions),
        agentProviderData: nonEmptyRecord(agentProviderData),
      };
    }

    case 'google': {
      const google = resolveCallableFactory(
        createGoogleGenerativeAI(
          withOptionalFetch(
            {
              apiKey,
              baseURL,
            },
            fetch
          )
        )
      );

      return {
        model: google(
          modelId,
          reasoningSettings?.kind === 'chat-settings' ? reasoningSettings.settings : undefined
        ),
        providerOptions: nonEmptyRecord(providerOptions),
        agentProviderData: nonEmptyRecord(agentProviderData),
      };
    }

    case 'openrouter': {
      const openrouter = createOpenRouter(
        withOptionalFetch(
          {
            apiKey,
            baseURL,
          },
          fetch
        )
      );

      return {
        model:
          reasoningSettings?.kind === 'openrouter-settings'
            ? (openrouter.chat(
                modelId,
                reasoningSettings.settings
              ) as unknown as RuntimeChatLanguageModel)
            : (openrouter.chat(modelId) as unknown as RuntimeChatLanguageModel),
        providerOptions: nonEmptyRecord(providerOptions),
        agentProviderData: nonEmptyRecord(agentProviderData),
      };
    }
  }
};
