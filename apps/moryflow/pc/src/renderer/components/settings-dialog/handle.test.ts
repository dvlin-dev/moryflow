import { describe, expect, it } from 'vitest';

import { defaultValues } from './const';
import { formToUpdate } from './handle';

describe('settings-dialog: formToUpdate', () => {
  it('should include legacy `name` for custom provider models (compat with older main builds)', () => {
    const values = {
      ...defaultValues,
      customProviders: [
        {
          providerId: 'custom-123',
          name: 'Custom provider',
          enabled: true,
          apiKey: '',
          baseUrl: '',
          sdkType: 'openai-compatible',
          models: [
            {
              id: 'claude-sonnet-4-5',
              enabled: true,
              isCustom: true,
              customName: 'CLAUDE Sonnet 4 5',
              customContext: 200000,
              customOutput: 4096,
              customCapabilities: {
                reasoning: true,
              },
              customInputModalities: ['text'],
            },
          ],
          defaultModelId: null,
        },
      ],
    };

    const update = formToUpdate(values as any);
    const model = (update.customProviders?.[0] as any).models[0];

    expect(model.customName).toBe('CLAUDE Sonnet 4 5');
    expect(model.name).toBe('CLAUDE Sonnet 4 5');
  });

  it('should fallback legacy `name` to model id when customName is empty', () => {
    const values = {
      ...defaultValues,
      customProviders: [
        {
          providerId: 'custom-456',
          name: 'Custom provider',
          enabled: true,
          apiKey: '',
          baseUrl: '',
          sdkType: 'openai-compatible',
          models: [
            {
              id: 'gpt-4o',
              enabled: true,
              isCustom: true,
              customName: '',
            },
          ],
          defaultModelId: null,
        },
      ],
    };

    const update = formToUpdate(values as any);
    const model = (update.customProviders?.[0] as any).models[0];

    expect(model.customName).toBeUndefined();
    expect(model.name).toBe('gpt-4o');
  });
});
