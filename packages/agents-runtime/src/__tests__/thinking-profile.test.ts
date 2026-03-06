import { describe, expect, it } from 'vitest';

import {
  buildThinkingProfile,
  resolveDefaultThinkingLevel,
  toThinkingSelection,
} from '../thinking-profile';

describe('thinking-profile', () => {
  it('keeps off only when thinking is not supported', () => {
    const profile = buildThinkingProfile({
      sdkType: 'openrouter',
      supportsThinking: false,
    });

    expect(profile.supportsThinking).toBe(false);
    expect(profile.defaultLevel).toBe('off');
    expect(profile.levels.map((item) => item.id)).toEqual(['off']);
  });

  it('does not fallback to sdk default levels when model contract is absent', () => {
    const profile = buildThinkingProfile({
      sdkType: 'openrouter',
      supportsThinking: true,
      modelId: 'custom-openrouter-unknown',
      providerId: 'openrouter',
    });

    expect(profile.supportsThinking).toBe(false);
    expect(profile.defaultLevel).toBe('off');
    expect(profile.levels.map((item) => item.id)).toEqual(['off']);
  });

  it('resolves prefixed model contract even when provider-scoped contract misses', () => {
    const profile = buildThinkingProfile({
      sdkType: 'openrouter',
      supportsThinking: true,
      modelId: 'openai/gpt-5.2',
      providerId: 'custom-openrouter',
    });

    expect(profile.supportsThinking).toBe(true);
    expect(profile.levels.some((item) => item.id !== 'off')).toBe(true);
    expect(profile.levels.map((item) => item.id)).toContain('medium');
  });

  it('applies override default level on available levels', () => {
    const profile = buildThinkingProfile({
      sdkType: 'openai',
      supportsThinking: true,
      rawProfile: {
        levels: ['off', 'low', 'medium', 'high'],
      },
      override: {
        defaultLevel: 'medium',
      },
    });

    expect(profile.supportsThinking).toBe(true);
    expect(profile.defaultLevel).toBe('medium');
    expect(profile.levels.map((item) => item.id)).toEqual(['off', 'low', 'medium', 'high']);
  });

  it('preserves cloud labels and visible params when provided', () => {
    const profile = buildThinkingProfile({
      sdkType: 'openrouter',
      supportsThinking: true,
      rawProfile: {
        levels: [
          { id: 'off', label: 'Close' },
          {
            id: 'high',
            label: 'Deep',
            visibleParams: [
              { key: 'reasoningEffort', value: 'high' },
              { key: 'thinkingBudget', value: '16384' },
            ],
          },
        ],
        defaultLevel: 'high',
      },
    });

    expect(profile.defaultLevel).toBe('high');
    expect(profile.levels).toEqual([
      { id: 'off', label: 'Close' },
      {
        id: 'high',
        label: 'Deep',
        visibleParams: [
          { key: 'reasoningEffort', value: 'high' },
          { key: 'thinkingBudget', value: '16384' },
        ],
      },
    ]);
  });

  it('resolves default level safely and converts to selection', () => {
    const level = resolveDefaultThinkingLevel(['off', 'low', 'high'], 'unknown');
    expect(level).toBe('off');
    expect(toThinkingSelection(level)).toEqual({ mode: 'off' });
  });
});
