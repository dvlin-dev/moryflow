import { describe, expect, it } from 'vitest';

import {
  clampReasoningConfigForSdkType,
  getDefaultThinkingLevelsForSdkType,
  mergeReasoningWithLevelPatches,
  resolveReasoningConfigFromThinkingSelection,
  supportsThinkingForSdkType,
} from '../reasoning-config';

describe('reasoning-config', () => {
  it('returns sdk default thinking levels', () => {
    expect(getDefaultThinkingLevelsForSdkType('openrouter', true)).toEqual([
      'off',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
    expect(getDefaultThinkingLevelsForSdkType('openai', true)).toEqual([
      'off',
      'low',
      'medium',
      'high',
    ]);
  });

  it('disables levels when model does not support thinking', () => {
    expect(getDefaultThinkingLevelsForSdkType('openai-compatible', false)).toEqual(['off']);
  });

  it('builds reasoning config from selection', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection('openai', {
        mode: 'level',
        level: 'high',
      })
    ).toEqual({
      enabled: true,
      effort: 'high',
    });

    expect(
      resolveReasoningConfigFromThinkingSelection('anthropic', {
        mode: 'level',
        level: 'max',
      })
    ).toEqual({
      enabled: true,
      maxTokens: 32768,
    });
  });

  it('returns undefined for off selection', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection('openrouter', {
        mode: 'off',
      })
    ).toBeUndefined();
  });

  it('returns undefined for unknown custom level', () => {
    expect(
      resolveReasoningConfigFromThinkingSelection('openai', {
        mode: 'level',
        level: 'custom-ultra',
      })
    ).toBeUndefined();
  });

  it('merges level patches and clamps provider-specific fields', () => {
    expect(
      mergeReasoningWithLevelPatches({
        sdkType: 'openrouter',
        base: {
          enabled: true,
          effort: 'medium',
          maxTokens: 8192,
          exclude: false,
        },
        levelPatches: {
          openrouter: {
            maxTokens: 500000,
            exclude: true,
          },
        },
      })
    ).toEqual({
      enabled: true,
      effort: 'medium',
      maxTokens: 262144,
      exclude: true,
    });
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
  });
});
