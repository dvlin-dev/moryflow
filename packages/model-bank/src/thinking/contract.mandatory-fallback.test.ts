import { describe, expect, it, vi } from 'vitest';

vi.mock('./resolver', async () => {
  const actual = await vi.importActual<typeof import('./resolver')>('./resolver');

  return {
    ...actual,
    resolveModelThinkingProfile: (
      input: Parameters<typeof actual.resolveModelThinkingProfile>[0]
    ): ReturnType<typeof actual.resolveModelThinkingProfile> => {
      if (input.modelId === 'mock/mandatory-no-visible') {
        return {
          activeControl: 'reasoningBudgetToken',
          availableControls: ['reasoningBudgetToken'],
          constraints: [],
          defaultLevel: 'high',
          levels: [{ id: 'high', label: 'High', visibleParams: [] }],
          modelId: input.modelId,
          providerId: input.providerId,
          sdkType: 'openrouter',
          source: 'model-native',
          supportsThinking: true,
        };
      }
      return actual.resolveModelThinkingProfile(input);
    },
  };
});

import {
  buildThinkingProfileFromCapabilities,
  resolveReasoningFromThinkingSelection,
  ThinkingContractError,
} from './contract';

describe('thinking contract mandatory fallback', () => {
  it('does not fallback to off-only when allowOffLevel is false', () => {
    const profile = buildThinkingProfileFromCapabilities({
      modelId: 'mock/mandatory-no-visible',
      providerId: 'openrouter',
      capabilitiesJson: {
        reasoning: {
          levels: [{ id: 'broken', label: 'Broken' }],
        },
      },
    });

    expect(profile.supportsThinking).toBe(true);
    expect(profile.defaultLevel).toBe('high');
    expect(profile.levels.map((level) => level.id)).toEqual(['high']);
    expect(profile.levels.some((level) => level.id === 'off')).toBe(false);
  });

  it("rejects explicit 'off' selection after mandatory fallback", () => {
    expect(() =>
      resolveReasoningFromThinkingSelection({
        modelId: 'mock/mandatory-no-visible',
        providerId: 'openrouter',
        capabilitiesJson: {
          reasoning: {
            levels: [{ id: 'broken', label: 'Broken' }],
          },
        },
        thinking: { mode: 'off' },
      })
    ).toThrowError(ThinkingContractError);
  });
});
