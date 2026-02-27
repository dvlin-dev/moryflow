import { describe, expect, it } from 'vitest';

import {
  getThinkingVisibleParamsByLevel,
  resolveModelThinkingProfileById,
  resolveProviderSdkType,
} from './resolver';

describe('thinking resolver', () => {
  it('resolves GPT-5.2 with model-native gpt5_2ReasoningEffort levels', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gpt-5.2',
      providerId: 'openai',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('gpt5_2ReasoningEffort');
    expect(profile.defaultLevel).toBe('off');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
    expect(getThinkingVisibleParamsByLevel(profile, 'high')).toEqual([
      { key: 'reasoningEffort', value: 'high' },
    ]);
  });

  it('resolves prefixed model ids under router provider without external fallback', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'openai/gpt-5.2',
      providerId: 'openrouter',
      sdkType: 'openrouter',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('gpt5_2ReasoningEffort');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
  });

  it('resolves prefixed model ids under custom provider to model-native profile', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'openai/gpt-5.2',
      providerId: 'custom-provider',
      sdkType: 'openai-compatible',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('gpt5_2ReasoningEffort');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
  });

  it('resolves anthropic effort profile with max level', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'claude-opus-4-6',
      providerId: 'anthropic',
    });

    expect(profile.activeControl).toBe('effort');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'max',
    ]);
    expect(getThinkingVisibleParamsByLevel(profile, 'max')).toEqual([
      { key: 'effort', value: 'max' },
    ]);
  });

  it('resolves google thinkingBudget profile and includes includeThoughts param', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gemini-2.5-pro',
      providerId: 'google',
    });

    expect(profile.activeControl).toBe('thinkingBudget');
    expect(profile.defaultLevel).toBe('medium');
    expect(getThinkingVisibleParamsByLevel(profile, 'medium')).toEqual([
      { key: 'includeThoughts', value: 'true' },
      { key: 'thinkingBudget', value: '8192' },
    ]);
  });

  it('returns off-only profile when model has no model-native thinking controls', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'MiniMax-M2.5',
      providerId: 'minimax',
    });

    expect(profile.source).toBe('off-only');
    expect(profile.supportsThinking).toBe(false);
    expect(profile.levels.map((level) => level.id)).toEqual(['off']);
  });

  it('enforces one-of constraints when both effort and budget controls exist', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'custom-openrouter-model',
      providerId: 'openrouter',
      extendParams: ['gpt5_2ReasoningEffort', 'reasoningBudgetToken'],
      sdkType: 'openai',
    });

    expect(profile.activeControl).toBe('gpt5_2ReasoningEffort');
    expect(profile.constraints.map((item) => item.id)).toContain('reasoning-effort-vs-budget');
    expect(getThinkingVisibleParamsByLevel(profile, 'high')).toEqual([
      { key: 'reasoningEffort', value: 'high' },
    ]);
  });

  it('normalizes none/disabled to off when querying level params', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gpt-5.1',
      providerId: 'openai',
    });

    expect(getThinkingVisibleParamsByLevel(profile, 'none')).toEqual([]);
    expect(getThinkingVisibleParamsByLevel(profile, 'disabled')).toEqual([]);
  });

  it('forces off-only when abilities.reasoning is false', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gpt-5.2',
      providerId: 'openai',
      abilities: {
        reasoning: false,
      },
    });

    expect(profile.source).toBe('off-only');
    expect(profile.supportsThinking).toBe(false);
    expect(profile.levels.map((level) => level.id)).toEqual(['off']);
  });

  it('normalizes router/openrouter sdk aliases to openrouter', () => {
    expect(resolveProviderSdkType({ providerId: 'zenmux' })).toBe('openrouter');
    expect(resolveProviderSdkType({ providerId: 'openrouter' })).toBe('openrouter');
    expect(resolveProviderSdkType({ sdkType: 'router' })).toBe('openrouter');
  });
});
