import { describe, expect, it } from 'vitest';

import { resolveThinkingLevel } from './use-chat-model-selection.utils';
import type { ModelGroup } from '../models';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

const createThinkingProfile = (
  overrides?: Partial<ModelThinkingProfile>
): ModelThinkingProfile => ({
  supportsThinking: true,
  defaultLevel: 'off',
  levels: [
    { id: 'off', label: 'Off' },
    { id: 'high', label: 'High' },
  ],
  ...overrides,
});

const createModelGroups = (profile: ModelThinkingProfile): ModelGroup[] => [
  {
    label: 'OpenAI',
    providerSlug: 'openai',
    options: [
      {
        id: 'openai/gpt-5.2',
        name: 'GPT-5.2',
        provider: 'OpenAI',
        providers: ['openai'],
        thinkingProfile: profile,
      },
    ],
  },
];

describe('resolveThinkingLevel', () => {
  it('returns off when profile is missing', () => {
    expect(
      resolveThinkingLevel({
        modelId: 'openai/gpt-5.2',
        thinkingByModel: {},
        modelGroups: [],
      })
    ).toBe('off');
  });

  it('uses profile default level when local override is missing', () => {
    const profile = createThinkingProfile({ defaultLevel: 'high' });
    expect(
      resolveThinkingLevel({
        modelId: 'openai/gpt-5.2',
        thinkingByModel: {},
        modelGroups: createModelGroups(profile),
      })
    ).toBe('high');
  });

  it('falls back to off when default level is invalid', () => {
    const profile = createThinkingProfile({ defaultLevel: 'xhigh' });
    expect(
      resolveThinkingLevel({
        modelId: 'openai/gpt-5.2',
        thinkingByModel: {},
        modelGroups: createModelGroups(profile),
      })
    ).toBe('off');
  });

  it('prefers valid local override over default level', () => {
    const profile = createThinkingProfile({ defaultLevel: 'off' });
    expect(
      resolveThinkingLevel({
        modelId: 'openai/gpt-5.2',
        thinkingByModel: { 'openai/gpt-5.2': 'high' },
        modelGroups: createModelGroups(profile),
      })
    ).toBe('high');
  });

  it('ignores invalid local override and falls back to default level', () => {
    const profile = createThinkingProfile({ defaultLevel: 'high' });
    expect(
      resolveThinkingLevel({
        modelId: 'openai/gpt-5.2',
        thinkingByModel: { 'openai/gpt-5.2': 'invalid-level' },
        modelGroups: createModelGroups(profile),
      })
    ).toBe('high');
  });
});
