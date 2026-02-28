import { describe, expect, it } from 'vitest';

import {
  buildLanguageModelReasoningSettings,
  resolveReasoningConfigFromThinkingLevel,
  supportsThinkingForSdkType,
} from './reasoning';

describe('resolveReasoningConfigFromThinkingLevel', () => {
  it('returns undefined for off level', () => {
    expect(
      resolveReasoningConfigFromThinkingLevel({
        sdkType: 'openai',
        levelId: 'off',
        visibleParams: [],
      })
    ).toBeUndefined();
  });

  it('resolves openai effort from level token', () => {
    expect(
      resolveReasoningConfigFromThinkingLevel({
        sdkType: 'openai',
        levelId: 'medium',
        visibleParams: [],
      })
    ).toEqual({
      enabled: true,
      effort: 'medium',
    });
  });

  it('resolves openrouter with budget one-of (no effort fallback in payload source)', () => {
    expect(
      resolveReasoningConfigFromThinkingLevel({
        sdkType: 'openrouter',
        levelId: 'medium',
        visibleParams: [{ key: 'thinkingBudget', value: '4096' }],
      })
    ).toEqual({
      enabled: true,
      effort: 'medium',
      maxTokens: 4096,
    });
  });

  it('resolves anthropic budget from level when params missing', () => {
    expect(
      resolveReasoningConfigFromThinkingLevel({
        sdkType: 'anthropic',
        levelId: 'high',
        visibleParams: [],
      })
    ).toEqual({
      enabled: true,
      maxTokens: 16384,
    });
  });

  it('resolves google includeThoughts + budget from params', () => {
    expect(
      resolveReasoningConfigFromThinkingLevel({
        sdkType: 'google',
        levelId: 'low',
        visibleParams: [
          { key: 'includeThoughts', value: 'false' },
          { key: 'thinkingBudget', value: '2048' },
        ],
      })
    ).toEqual({
      enabled: true,
      includeThoughts: false,
      maxTokens: 2048,
    });
  });

  it('builds openrouter language-model settings with max_tokens one-of', () => {
    expect(
      buildLanguageModelReasoningSettings({
        sdkType: 'openrouter',
        reasoning: {
          enabled: true,
          effort: 'high',
          maxTokens: 8192,
        },
      })
    ).toEqual({
      kind: 'openrouter-settings',
      settings: {
        includeReasoning: true,
        extraBody: {
          reasoning: {
            exclude: false,
            max_tokens: 8192,
          },
        },
      },
    });
  });

  it('builds anthropic language-model settings with default budget', () => {
    expect(
      buildLanguageModelReasoningSettings({
        sdkType: 'anthropic',
        reasoning: { enabled: true },
      })
    ).toEqual({
      kind: 'chat-settings',
      settings: {
        thinking: {
          type: 'enabled',
          budgetTokens: 12000,
        },
      },
    });
  });

  it('detects thinking-capable sdk types', () => {
    expect(supportsThinkingForSdkType('openai')).toBe(true);
    expect(supportsThinkingForSdkType('openrouter')).toBe(true);
    expect(supportsThinkingForSdkType('unsupported-sdk')).toBe(false);
  });
});
