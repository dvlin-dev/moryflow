import { describe, expect, it } from 'vitest';

import { resolveThinkingToReasoning } from '../thinking-adapter';
import { buildThinkingProfile } from '../thinking-profile';

describe('thinking-adapter', () => {
  const profile = buildThinkingProfile({
    sdkType: 'openai',
    supportsThinking: true,
    override: {
      enabledLevels: ['low', 'medium', 'high'],
      defaultLevel: 'medium',
    },
  });

  it('maps valid level to reasoning config', () => {
    const result = resolveThinkingToReasoning({
      sdkType: 'openai',
      profile,
      requested: { mode: 'level', level: 'high' },
    });

    expect(result.level).toBe('high');
    expect(result.downgradedToOff).toBe(false);
    expect(result.reasoning).toEqual({
      enabled: true,
      effort: 'high',
    });
  });

  it('applies user level patch before provider clamp', () => {
    const result = resolveThinkingToReasoning({
      sdkType: 'openrouter',
      profile: buildThinkingProfile({
        sdkType: 'openrouter',
        supportsThinking: true,
        override: {
          enabledLevels: ['off', 'high'],
          defaultLevel: 'off',
          levelPatches: {
            high: {
              openrouter: {
                maxTokens: 300_000,
                exclude: true,
              },
            },
          },
        },
      }),
      requested: { mode: 'level', level: 'high' },
      override: {
        levelPatches: {
          high: {
            openrouter: {
              maxTokens: 300_000,
              exclude: true,
            },
          },
        },
      },
    });

    expect(result.level).toBe('high');
    expect(result.reasoning).toEqual({
      enabled: true,
      effort: 'high',
      maxTokens: 262144,
      exclude: true,
    });
  });

  it('falls back to default level when request is omitted', () => {
    const result = resolveThinkingToReasoning({
      sdkType: 'openai',
      profile,
    });

    expect(result.level).toBe('medium');
    expect(result.selection).toEqual({
      mode: 'level',
      level: 'medium',
    });
  });

  it('downgrades invalid level to off', () => {
    const result = resolveThinkingToReasoning({
      sdkType: 'openai',
      profile,
      requested: { mode: 'level', level: 'xhigh' },
    });

    expect(result.level).toBe('off');
    expect(result.selection).toEqual({ mode: 'off' });
    expect(result.reasoning).toBeUndefined();
    expect(result.downgradedToOff).toBe(true);
  });

  it('downgrades to off when level exists but has no provider mapping', () => {
    const customProfile = buildThinkingProfile({
      sdkType: 'openai',
      supportsThinking: true,
      override: {
        enabledLevels: ['off', 'custom-ultra'],
        defaultLevel: 'custom-ultra',
      },
    });

    const result = resolveThinkingToReasoning({
      sdkType: 'openai',
      profile: customProfile,
      requested: { mode: 'level', level: 'custom-ultra' },
    });

    expect(result.level).toBe('off');
    expect(result.selection).toEqual({ mode: 'off' });
    expect(result.reasoning).toBeUndefined();
    expect(result.downgradedToOff).toBe(true);
  });
});
