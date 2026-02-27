import { describe, expect, it } from 'vitest';

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
      .find((model) => model.id === 'openai/gpt-5.2');

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
      .find((model) => model.id === 'openai/gpt-5.2');

    expect(option?.thinkingProfile.supportsThinking).toBe(true);
    expect(option?.thinkingProfile.levels.length).toBeGreaterThan(1);
  });
});
