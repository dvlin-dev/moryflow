import { describe, expect, it } from 'vitest';
import {
  buildThinkingProfileFromCapabilities,
  resolveReasoningFromThinkingSelection,
} from '../thinking-profile.util';

describe('thinking-profile util', () => {
  it('falls back to off-only when levels are missing', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerType: 'openai',
      capabilitiesJson: {
        reasoning: {
          enabled: true,
        },
      },
    });

    expect(profile).toEqual({
      supportsThinking: false,
      defaultLevel: 'off',
      levels: [{ id: 'off', label: 'Off' }],
    });
  });

  it('keeps cloud levels and visible params as-is', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerType: 'openrouter',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'high',
          levels: [
            {
              id: 'high',
              label: 'High',
              visibleParams: [
                { key: 'reasoningEffort', value: 'high' },
                { key: 'thinkingBudget', value: '16384' },
              ],
            },
            {
              id: 'off',
              label: 'Off',
            },
          ],
        },
      },
    });

    expect(profile.defaultLevel).toBe('high');
    expect(profile.levels).toEqual([
      {
        id: 'off',
        label: 'Off',
      },
      {
        id: 'high',
        label: 'High',
        visibleParams: [
          { key: 'reasoningEffort', value: 'high' },
          { key: 'thinkingBudget', value: '16384' },
        ],
      },
    ]);
  });

  it('fills builtin level params from provider defaults when missing', () => {
    const profile = buildThinkingProfileFromCapabilities({
      modelId: 'gpt-5.2',
      providerType: 'openai',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'medium',
          levels: ['off', 'medium'],
        },
      },
    });

    expect(profile.supportsThinking).toBe(true);
    const mediumLevel = profile.levels.find((level) => level.id === 'medium');
    expect(mediumLevel?.visibleParams).toEqual([
      { key: 'reasoningEffort', value: 'medium' },
    ]);
  });

  it('downgrades to off-only when non-off levels miss runtime params', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerType: 'openai',
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            { id: 'custom-ultra', label: 'Custom Ultra' },
          ],
        },
      },
    });

    expect(profile).toEqual({
      supportsThinking: false,
      defaultLevel: 'off',
      levels: [{ id: 'off', label: 'Off' }],
    });
  });

  it('maps selected level to reasoning from visible params', () => {
    const reasoning = resolveReasoningFromThinkingSelection({
      providerType: 'anthropic',
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'deep',
              label: 'Deep',
              visibleParams: [{ key: 'thinkingBudget', value: '12000' }],
            },
          ],
        },
      },
      thinking: { mode: 'level', level: 'deep' },
    });

    expect(reasoning).toEqual({
      enabled: true,
      maxTokens: 12000,
    });
  });

  it('maps google includeThoughts and thinkingBudget from visible params', () => {
    const reasoning = resolveReasoningFromThinkingSelection({
      providerType: 'google',
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [
                { key: 'includeThoughts', value: 'false' },
                { key: 'thinkingBudget', value: '16384' },
              ],
            },
          ],
        },
      },
      thinking: { mode: 'level', level: 'high' },
    });

    expect(reasoning).toEqual({
      enabled: true,
      includeThoughts: false,
      maxTokens: 16384,
    });
  });
});
