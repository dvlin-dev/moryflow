import { describe, expect, it } from 'vitest';

import {
  clampReasoningConfigForSdkType,
  getDefaultThinkingLevelsForSdkType,
  getDefaultVisibleParamsForLevel,
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

  it('provides default visible params for known level', () => {
    expect(
      getDefaultVisibleParamsForLevel({
        sdkType: 'openai',
        level: 'high',
      })
    ).toEqual([{ key: 'reasoningEffort', value: 'high' }]);
  });

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
  });
});
