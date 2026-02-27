import { describe, expect, it } from 'vitest';

import { resolveReasoningConfigFromThinkingLevel } from './reasoning';

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
});
