import { describe, expect, it } from 'vitest';

import {
  buildReasoningProviderOptions,
  clampReasoningConfigForSdkType,
  resolveReasoningConfigFromThinkingSelection,
  supportsThinkingForSdkType,
} from '../reasoning-config';

describe('reasoning-config', () => {
  it('builds reasoning config from selection and profile visible params', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection({
        sdkType: 'openai',
        profile: {
          supportsThinking: true,
          defaultLevel: 'off',
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'reasoningEffort', value: 'high' }],
            },
          ],
        },
        selection: {
          mode: 'level',
          level: 'high',
        },
      })
    ).toEqual({
      enabled: true,
      effort: 'high',
    });

    expect(
      resolveReasoningConfigFromThinkingSelection({
        sdkType: 'anthropic',
        profile: {
          supportsThinking: true,
          defaultLevel: 'off',
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'max',
              label: 'Max',
              visibleParams: [{ key: 'thinkingBudget', value: '32768' }],
            },
          ],
        },
        selection: {
          mode: 'level',
          level: 'max',
        },
      })
    ).toEqual({
      enabled: true,
      maxTokens: 32768,
    });
  });

  it('returns undefined for off selection', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection({
        sdkType: 'openrouter',
        profile: {
          supportsThinking: true,
          defaultLevel: 'off',
          levels: [{ id: 'off', label: 'Off' }],
        },
        selection: {
          mode: 'off',
        },
      })
    ).toBeUndefined();
  });

  it('returns undefined for unknown custom level', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection({
        sdkType: 'openai',
        profile: {
          supportsThinking: true,
          defaultLevel: 'off',
          levels: [{ id: 'off', label: 'Off' }],
        },
        selection: {
          mode: 'level',
          level: 'custom-ultra',
        },
      })
    ).toBeUndefined();
  });

  it('clamps openai config to supported shape', () => {
    expect(
      clampReasoningConfigForSdkType('openai', {
        enabled: true,
        effort: 'none',
        maxTokens: 100,
      })
    ).toEqual({
      enabled: true,
      effort: 'none',
    });
  });

  it('checks sdk type support', () => {
    expect(supportsThinkingForSdkType('google')).toBe(true);
    expect(supportsThinkingForSdkType('openrouter')).toBe(true);
    expect(supportsThinkingForSdkType('anthropic')).toBe(true);
  });

  it('builds openrouter provider options with one-of max_tokens/effort', () => {
    expect(
      buildReasoningProviderOptions('openrouter', {
        enabled: true,
        effort: 'high',
        maxTokens: 16384,
      })
    ).toEqual({
      openrouter: {
        reasoning: {
          exclude: false,
          max_tokens: 16384,
        },
      },
    });

    expect(
      buildReasoningProviderOptions('openrouter', {
        enabled: true,
        effort: 'high',
      })
    ).toEqual({
      openrouter: {
        reasoning: {
          effort: 'high',
          exclude: false,
        },
      },
    });
  });
});
