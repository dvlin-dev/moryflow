import { describe, expect, it } from 'vitest';

import {
  buildThinkingProfileFromCapabilities,
  resolveReasoningFromThinkingSelection,
  ThinkingContractError,
} from './contract';

describe('thinking contract', () => {
  it('falls back to off-only when capabilities has no runtime-usable levels', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerId: 'openai',
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

  it('keeps configured levels and moves off to first', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerId: 'openrouter',
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
            { id: 'off', label: 'Off' },
          ],
        },
      },
    });

    expect(profile.defaultLevel).toBe('high');
    expect(profile.levels).toEqual([
      { id: 'off', label: 'Off' },
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

  it('fills model-native visible params when cloud only provides level ids', () => {
    const profile = buildThinkingProfileFromCapabilities({
      modelId: 'gpt-5.2',
      providerId: 'openai',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'medium',
          levels: ['off', 'medium'],
        },
      },
    });

    expect(profile.supportsThinking).toBe(true);
    expect(profile.levels.find((level) => level.id === 'medium')?.visibleParams).toEqual([
      { key: 'reasoningEffort', value: 'medium' },
    ]);
  });

  it('canonicalizes providerType before reasoning mapping', () => {
    const reasoning = resolveReasoningFromThinkingSelection({
      providerId: 'zenmux',
      capabilitiesJson: {
        reasoning: {
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [
                { key: 'reasoningEffort', value: 'high' },
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
      effort: 'high',
      maxTokens: 16384,
      exclude: false,
    });
  });

  it('preserves non-budget control keys in configured visibleParams', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerId: 'google',
      capabilitiesJson: {
        reasoning: {
          defaultLevel: 'high',
          levels: [
            { id: 'off', label: 'Off' },
            {
              id: 'high',
              label: 'High',
              visibleParams: [{ key: 'thinkingLevel', value: 'high' }],
            },
          ],
        },
      },
    });

    expect(profile.supportsThinking).toBe(true);
    expect(profile.levels.find((level) => level.id === 'high')?.visibleParams).toEqual([
      { key: 'thinkingLevel', value: 'high' },
    ]);
  });

  it('throws structured error when selected level is invalid', () => {
    expect(() =>
      resolveReasoningFromThinkingSelection({
        providerId: 'openai',
        capabilitiesJson: {
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'medium',
                label: 'Medium',
                visibleParams: [{ key: 'reasoningEffort', value: 'medium' }],
              },
            ],
          },
        },
        thinking: { mode: 'level', level: 'ultra' },
      })
    ).toThrowError(ThinkingContractError);

    try {
      resolveReasoningFromThinkingSelection({
        providerId: 'openai',
        capabilitiesJson: {
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'medium',
                label: 'Medium',
                visibleParams: [{ key: 'reasoningEffort', value: 'medium' }],
              },
            ],
          },
        },
        thinking: { mode: 'level', level: 'ultra' },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ThinkingContractError);
      expect((error as ThinkingContractError).code).toBe('THINKING_LEVEL_INVALID');
    }
  });
});
