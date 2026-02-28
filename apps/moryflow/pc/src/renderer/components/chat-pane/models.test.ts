import { describe, expect, it } from 'vitest';
import { getSortedProviders } from '@moryflow/model-bank/registry';

import { buildModelGroupsFromSettings } from './models';

describe('chat-pane models thinking profile', () => {
  it('resolves router custom prefixed model via model-bank contract', () => {
    const groups = buildModelGroupsFromSettings({
      model: { defaultModel: '' },
      providers: [
        {
          providerId: 'openrouter',
          enabled: true,
          apiKey: 'test-key',
          baseUrl: '',
          defaultModelId: 'openai/gpt-5.2',
          models: [
            {
              id: 'openai/gpt-5.2',
              enabled: true,
              isCustom: true,
              customName: 'GPT-5.2',
              customCapabilities: {
                reasoning: true,
                attachment: false,
                toolCall: true,
                temperature: true,
              },
            },
          ],
        },
      ],
      customProviders: [],
    } as any);

    const option = groups
      .flatMap((group) => group.options)
      .find((model) => model.id === 'openrouter/openai/gpt-5.2');

    expect(option?.thinkingProfile.supportsThinking).toBe(true);
    expect(option?.thinkingProfile.levels.map((level) => level.id)).toEqual([
      'off',
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
  });

  it('keeps model-native thinking when legacy custom model misses reasoning flag', () => {
    const groups = buildModelGroupsFromSettings({
      model: { defaultModel: '' },
      providers: [
        {
          providerId: 'openrouter',
          enabled: true,
          apiKey: 'test-key',
          baseUrl: '',
          defaultModelId: 'openai/gpt-5.2',
          models: [
            {
              id: 'openai/gpt-5.2',
              enabled: true,
              isCustom: true,
              customName: 'GPT-5.2',
              customCapabilities: {
                attachment: true,
                toolCall: true,
                temperature: true,
              },
            },
          ],
        },
      ],
      customProviders: [],
    } as any);

    const option = groups
      .flatMap((group) => group.options)
      .find((model) => model.id === 'openrouter/openai/gpt-5.2');

    expect(option?.thinkingProfile.supportsThinking).toBe(true);
    expect(option?.thinkingProfile.levels.length).toBeGreaterThan(1);
  });

  it('prefers provider defaultModelId when preset models are still empty', () => {
    const provider = getSortedProviders().find((entry) => entry.modelIds.length > 1);
    expect(provider).toBeDefined();

    const targetModelId = provider!.modelIds[1];
    const groups = buildModelGroupsFromSettings({
      model: { defaultModel: '' },
      providers: [
        {
          providerId: provider!.id,
          enabled: true,
          apiKey: 'test-key',
          baseUrl: '',
          defaultModelId: targetModelId,
          models: [],
        },
      ],
      customProviders: [],
    } as any);

    const options = groups.flatMap((group) => group.options);
    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe(`${provider!.id}/${targetModelId}`);
  });
});
