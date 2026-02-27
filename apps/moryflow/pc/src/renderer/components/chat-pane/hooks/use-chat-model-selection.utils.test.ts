import { describe, expect, it } from 'vitest';

import {
  hasEnabledModelOption,
  pickAvailableModelId,
  pickFirstEnabledModelId,
  resolveThinkingLevel,
} from './use-chat-model-selection.utils';
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

describe('model availability helpers', () => {
  it('checks whether the target model exists and enabled', () => {
    const profile = createThinkingProfile();
    const groups = createModelGroups(profile);
    expect(hasEnabledModelOption(groups, 'openai/gpt-5.2')).toBe(true);
    expect(hasEnabledModelOption(groups, 'openai/unknown')).toBe(false);
  });

  it('returns first enabled model id', () => {
    const profile = createThinkingProfile();
    const groups: ModelGroup[] = [
      {
        label: 'A',
        providerSlug: 'a',
        options: [
          { ...createModelGroups(profile)[0]!.options[0]!, id: 'a/disabled', disabled: true },
        ],
      },
      {
        label: 'B',
        providerSlug: 'b',
        options: [
          { ...createModelGroups(profile)[0]!.options[0]!, id: 'b/enabled', disabled: false },
        ],
      },
    ];
    expect(pickFirstEnabledModelId(groups)).toBe('b/enabled');
  });

  it('picks first available candidate, then falls back to first enabled model', () => {
    const profile = createThinkingProfile();
    const groups: ModelGroup[] = [
      {
        label: 'OpenAI',
        providerSlug: 'openai',
        options: [
          { ...createModelGroups(profile)[0]!.options[0]!, id: 'openai/gpt-4o', disabled: false },
          {
            ...createModelGroups(profile)[0]!.options[0]!,
            id: 'openai/gpt-4o-mini',
            disabled: true,
          },
        ],
      },
    ];

    expect(
      pickAvailableModelId({
        groups,
        candidates: ['openai/gpt-4o-mini', 'openai/gpt-4o'],
      })
    ).toBe('openai/gpt-4o');

    expect(
      pickAvailableModelId({
        groups,
        candidates: ['openai/not-found'],
      })
    ).toBe('openai/gpt-4o');
  });
});
