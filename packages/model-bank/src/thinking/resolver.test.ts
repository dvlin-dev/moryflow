import { describe, expect, it } from 'vitest';

import {
  getThinkingVisibleParamsByLevel,
  resolveModelThinkingProfileById,
  resolveProviderSdkType,
  resolveRuntimeChatSdkType,
} from './resolver';

describe('thinking resolver', () => {
  it('resolves vertexai thinkingBudget profile and includes includeThoughts param', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gemini-2.5-pro',
      providerId: 'vertexai',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('thinkingBudget');
    expect(profile.defaultLevel).toBe('medium');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'max',
    ]);
    expect(getThinkingVisibleParamsByLevel(profile, 'high')).toEqual([
      { key: 'includeThoughts', value: 'true' },
      { key: 'thinkingBudget', value: '16384' },
    ]);
  });

  it('resolves prefixed model ids under retained provider without external fallback', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'vertexai/gemini-2.5-pro',
      providerId: 'vertexai',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('thinkingBudget');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'max',
    ]);
  });

  it('resolves prefixed model ids under custom provider to model-native profile', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'vertexai/gemini-2.5-pro',
      providerId: 'custom-provider',
      sdkType: 'google',
    });

    expect(profile.source).toBe('model-native');
    expect(profile.activeControl).toBe('thinkingBudget');
    expect(profile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'max',
    ]);
  });

  it('resolves bedrock effort profile with max level', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'us.anthropic.claude-opus-4-6-v1',
      providerId: 'bedrock',
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

  it('returns off-only profile when model has no model-native thinking controls', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'gpt-5',
      providerId: 'azure',
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
      modelId: 'us.anthropic.claude-opus-4-6-v1',
      providerId: 'bedrock',
    });

    expect(getThinkingVisibleParamsByLevel(profile, 'none')).toEqual([]);
    expect(getThinkingVisibleParamsByLevel(profile, 'disabled')).toEqual([]);
  });

  it('forces off-only when abilities.reasoning is false', () => {
    const profile = resolveModelThinkingProfileById({
      modelId: 'us.anthropic.claude-opus-4-6-v1',
      providerId: 'bedrock',
      abilities: {
        reasoning: false,
      },
    });

    expect(profile.source).toBe('off-only');
    expect(profile.supportsThinking).toBe(false);
    expect(profile.levels.map((level) => level.id)).toEqual(['off']);
  });

  it('normalizes router/openrouter sdk aliases to openrouter', () => {
    expect(resolveProviderSdkType({ providerId: 'openrouter' })).toBe('openrouter');
    expect(resolveProviderSdkType({ sdkType: 'router' })).toBe('openrouter');
  });

  it('resolves runtime sdk type with strict supported set', () => {
    expect(resolveRuntimeChatSdkType({ providerId: 'openrouter' })).toBe('openrouter');
    expect(resolveRuntimeChatSdkType({ providerId: 'openai-compatible' })).toBe(
      'openai-compatible'
    );
    expect(resolveRuntimeChatSdkType({ sdkType: 'openai-compatible' })).toBe('openai-compatible');
    expect(resolveRuntimeChatSdkType({ providerId: 'vertexai' })).toBeUndefined();
  });
});
