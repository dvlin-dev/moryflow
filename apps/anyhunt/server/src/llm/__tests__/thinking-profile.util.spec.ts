import { describe, expect, it } from 'vitest';
import { buildThinkingProfileFromCapabilities } from '../thinking-profile.util';

describe('thinking-profile util', () => {
  it('lets provider patch override generic reasoning fields', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerType: 'openrouter',
      capabilitiesJson: {
        reasoning: {
          enabled: true,
          levels: [
            {
              id: 'custom-level',
              label: 'Custom Level',
              reasoning: {
                effort: 'low',
                maxTokens: 1024,
              },
              providerPatches: {
                openrouter: {
                  effort: 'high',
                  maxTokens: 2048,
                },
              },
            },
          ],
        },
      },
    });

    const level = profile.levels.find((item) => item.id === 'custom-level');
    expect(level?.reasoning).toEqual({
      effort: 'high',
      maxTokens: 2048,
    });
  });

  it('keeps direct fields as highest priority over provider patch', () => {
    const profile = buildThinkingProfileFromCapabilities({
      providerType: 'openrouter',
      capabilitiesJson: {
        reasoning: {
          enabled: true,
          levels: [
            {
              id: 'custom-level',
              label: 'Custom Level',
              reasoning: {
                effort: 'low',
                maxTokens: 1024,
              },
              providerPatches: {
                openrouter: {
                  effort: 'high',
                  maxTokens: 2048,
                },
              },
              effort: 'minimal',
              maxTokens: 4096,
            },
          ],
        },
      },
    });

    const level = profile.levels.find((item) => item.id === 'custom-level');
    expect(level?.reasoning).toEqual({
      effort: 'minimal',
      maxTokens: 4096,
    });
  });
});
