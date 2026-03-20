import { describe, expect, it } from 'vitest';

import { resolveThinkingToReasoning } from '../thinking-adapter';
import { buildThinkingProfile } from '../thinking-profile';

describe('thinking-adapter', () => {
  const profile = buildThinkingProfile({
    sdkType: 'openai',
    supportsThinking: true,
    rawProfile: {
      levels: ['off', 'low', 'medium', 'high'],
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
    expect(result.downgradeReason).toBeUndefined();
    expect(result.reasoning).toEqual({
      enabled: true,
      effort: 'high',
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
    expect(result.downgradeReason).toBe('requested-level-not-allowed');
  });

  it('downgrades to off when level exists but has no runtime params', () => {
    const customProfile = buildThinkingProfile({
      sdkType: 'openai',
      supportsThinking: true,
      rawProfile: {
        levels: [
          { id: 'off', label: 'Off' },
          { id: 'custom-ultra', label: 'Custom Ultra' },
        ],
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
    expect(result.downgradeReason).toBe('reasoning-config-unavailable');
  });

  it('builds explicit disable payload for openai-compatible boolean reasoning controls', () => {
    const customProfile = buildThinkingProfile({
      sdkType: 'openai-compatible',
      supportsThinking: true,
      rawProfile: {
        levels: [
          { id: 'off', label: 'Off' },
          {
            id: 'on',
            label: 'On',
            visibleParams: [{ key: 'enableReasoning', value: 'true' }],
          },
        ],
        defaultLevel: 'off',
      },
    });

    const result = resolveThinkingToReasoning({
      sdkType: 'openai-compatible',
      profile: customProfile,
      requested: { mode: 'off' },
    });

    expect(result.level).toBe('off');
    expect(result.selection).toEqual({ mode: 'off' });
    expect(result.reasoning).toEqual({
      enabled: false,
      rawConfig: {
        enableReasoning: false,
      },
    });
  });
});
