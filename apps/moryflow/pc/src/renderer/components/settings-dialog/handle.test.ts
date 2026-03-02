import { describe, expect, it } from 'vitest';

import { defaultValues } from './const';
import { formToUpdate, settingsToForm } from './handle';

describe('settings-dialog: formToUpdate', () => {
  it('should normalize custom provider models to { customName, isCustom: true }', () => {
    const values = {
      ...defaultValues,
      customProviders: [
        {
          providerId: 'custom-123',
          name: 'Custom provider',
          enabled: true,
          apiKey: '',
          baseUrl: '',
          models: [
            {
              id: 'claude-sonnet-4-5',
              enabled: true,
              isCustom: false,
              customName: '  CLAUDE Sonnet 4 5  ',
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
    expect(model.isCustom).toBe(true);
    expect('name' in model).toBe(false);
  });

  it('should fallback customName to model id when customName is empty', () => {
    const values = {
      ...defaultValues,
      customProviders: [
        {
          providerId: 'custom-456',
          name: 'Custom provider',
          enabled: true,
          apiKey: '',
          baseUrl: '',
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

    expect(model.customName).toBe('gpt-4o');
    expect('name' in model).toBe(false);
  });
});

describe('settings-dialog: settingsToForm', () => {
  it('should map custom provider models to form values', () => {
    const form = settingsToForm({
      model: { defaultModel: null },
      personalization: { customInstructions: 'Keep output concise.' },
      mcp: { stdio: [], streamableHttp: [] },
      providers: [],
      customProviders: [
        {
          providerId: 'custom-abc',
          name: 'Custom provider',
          enabled: true,
          apiKey: null,
          baseUrl: null,
          models: [{ id: 'gpt-4o', enabled: true, customName: 'GPT-4o', isCustom: true }],
          defaultModelId: null,
        },
      ],
      ui: { theme: 'system' },
    } as any);

    expect(form.customProviders[0].models[0].customName).toBe('GPT-4o');
    expect(form.personalization.customInstructions).toBe('Keep output concise.');
  });
});

describe('settings-dialog: personalization mapping', () => {
  it('should trim personalization.customInstructions on submit', () => {
    const update = formToUpdate({
      ...defaultValues,
      personalization: { customInstructions: '  answer in markdown  ' },
    } as any);

    expect(update.personalization?.customInstructions).toBe('answer in markdown');
  });
});
