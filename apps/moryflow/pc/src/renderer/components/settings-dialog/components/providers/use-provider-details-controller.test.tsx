import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useProviderDetailsController } from './use-provider-details-controller';
import type { SettingsDialogState } from '../../use-settings-dialog';

const mocks = vi.hoisted(() => ({
  clearChatThinkingOverride: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/chat-thinking-overrides', () => ({
  clearChatThinkingOverride: mocks.clearChatThinkingOverride,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@moryflow/model-bank/registry', () => ({
  getProviderById: (id: string) =>
    id === 'openai'
      ? {
          id: 'openai',
          sdkType: 'openai',
          modelIds: ['gpt-4o'],
          defaultBaseUrl: '',
        }
      : null,
  getModelByProviderAndId: (providerId: string, modelId: string) =>
    providerId === 'openai' && modelId === 'gpt-4o'
      ? {
          id: modelId,
          name: 'GPT-4o',
          shortName: '4o',
          capabilities: {
            reasoning: true,
            attachment: true,
            toolCall: true,
            temperature: true,
            openWeights: false,
          },
          limits: {
            context: 128000,
            output: 4096,
          },
          category: 'chat',
          modalities: { input: ['text'], output: ['text'] },
        }
      : null,
  buildProviderModelRef: (providerId: string, modelId: string) => `${providerId}/${modelId}`,
}));

type ThinkingConfig = {
  defaultLevel: string;
};

const createThinking = (level: string): ThinkingConfig => ({
  defaultLevel: level,
});

describe('useProviderDetailsController thinking propagation', () => {
  it('uses explicit providerType in provider test payload', async () => {
    const testAgentProvider = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'desktopAPI', {
      configurable: true,
      value: { testAgentProvider },
    });

    const form = {
      setValue: vi.fn(),
      getValues: vi.fn((key?: string) => (key === 'providers' ? [] : [])),
    } as unknown as SettingsDialogState['form'];

    const customProviders: SettingsDialogState['providers'] = {
      activeProviderId: 'provider-xyz',
      providerValues: [],
      customProviderValues: [
        {
          providerId: 'provider-xyz',
          name: 'Provider XYZ',
          enabled: true,
          apiKey: ' test-key ',
          baseUrl: '',
          models: [{ id: 'custom-model', enabled: true, isCustom: true, customName: 'Custom' }],
          defaultModelId: null,
        },
      ],
      setActiveProviderId: vi.fn(),
      handleAddCustomProvider: vi.fn(),
      handleRemoveCustomProvider: vi.fn(),
      getProviderIndex: vi.fn(),
      getCustomProviderIndex: vi.fn(),
    };

    const customHook = renderHook(() =>
      useProviderDetailsController({ providers: customProviders, form })
    );
    await act(async () => {
      await customHook.result.current.handleTest();
    });

    expect(testAgentProvider).toHaveBeenLastCalledWith(
      expect.objectContaining({
        providerId: 'provider-xyz',
        providerType: 'custom',
      })
    );

    const presetProviders: SettingsDialogState['providers'] = {
      ...customProviders,
      activeProviderId: 'openai',
      providerValues: [
        {
          providerId: 'openai',
          enabled: true,
          apiKey: ' test-key ',
          baseUrl: '',
          models: [],
          defaultModelId: null,
        },
      ],
      customProviderValues: [],
    };

    const presetForm = {
      setValue: vi.fn(),
      getValues: vi.fn((key?: string) =>
        key === 'providers' ? presetProviders.providerValues : []
      ),
    } as unknown as SettingsDialogState['form'];

    const presetHook = renderHook(() =>
      useProviderDetailsController({ providers: presetProviders, form: presetForm })
    );
    await act(async () => {
      await presetHook.result.current.handleTest();
    });

    expect(testAgentProvider).toHaveBeenLastCalledWith(
      expect.objectContaining({
        providerId: 'openai',
        providerType: 'preset',
      })
    );
  });

  it('keeps thinking in preset model view/edit/save flows', () => {
    const existingThinking = createThinking('high');
    const addThinking = createThinking('medium');
    const saveThinking = createThinking('max');

    const providers: SettingsDialogState['providers'] = {
      activeProviderId: 'openai',
      providerValues: [
        {
          providerId: 'openai',
          enabled: true,
          apiKey: '',
          baseUrl: '',
          models: [
            {
              id: 'gpt-4o',
              enabled: true,
              isCustom: false,
              customName: 'GPT-4o Custom',
              customContext: 200000,
              customOutput: 8000,
              customCapabilities: {
                reasoning: true,
                attachment: true,
                toolCall: true,
                temperature: true,
              },
              customInputModalities: ['text', 'image'],
              thinking: existingThinking,
            },
          ],
          defaultModelId: null,
        },
      ],
      customProviderValues: [],
      setActiveProviderId: vi.fn(),
      handleAddCustomProvider: vi.fn(),
      handleRemoveCustomProvider: vi.fn(),
      getProviderIndex: vi.fn(),
      getCustomProviderIndex: vi.fn(),
    };

    const setValue = vi.fn();
    const getValues = vi.fn((key?: string) =>
      key === 'providers' ? providers.providerValues : []
    );
    const form = { setValue, getValues } as unknown as SettingsDialogState['form'];

    const { result } = renderHook(() => useProviderDetailsController({ providers, form }));

    expect(result.current.allModels[0]?.thinking).toEqual(existingThinking);

    act(() => {
      result.current.handleEditModel(result.current.allModels[0]);
    });
    expect(result.current.editModelData?.thinking).toEqual(existingThinking);

    act(() => {
      result.current.handleAddModel({
        id: 'gpt-4o-mini-custom',
        name: 'GPT-4o mini custom',
        contextSize: 64000,
        outputSize: 4000,
        capabilities: {
          reasoning: true,
          attachment: true,
          toolCall: true,
          temperature: true,
        },
        inputModalities: ['text'],
        thinking: addThinking,
      });
    });

    const addModelsCall = setValue.mock.calls.find((call) => call[0] === 'providers.0.models');
    expect(addModelsCall).toBeTruthy();
    if (!addModelsCall) {
      throw new Error('providers.0.models call not found');
    }
    expect(addModelsCall[1][1].thinking).toEqual(addThinking);

    setValue.mockClear();
    act(() => {
      result.current.handleSaveModel({
        id: 'gpt-4o',
        name: 'GPT-4o Updated',
        contextSize: 160000,
        outputSize: 6000,
        capabilities: {
          reasoning: true,
          attachment: true,
          toolCall: true,
          temperature: true,
        },
        inputModalities: ['text', 'image'],
        thinking: saveThinking,
      });
    });

    const saveCall = setValue.mock.calls.find((call) => call[0] === 'providers.0.models.0');
    expect(saveCall).toBeTruthy();
    if (!saveCall) {
      throw new Error('providers.0.models.0 call not found');
    }
    expect(saveCall[1].thinking).toEqual(saveThinking);
    expect(mocks.clearChatThinkingOverride).toHaveBeenCalledWith('openai/gpt-4o');
    mocks.clearChatThinkingOverride.mockClear();
  });

  it('keeps thinking in custom provider add/update flows', () => {
    const addThinking = createThinking('medium');
    const updateThinking = createThinking('high');

    const providers: SettingsDialogState['providers'] = {
      activeProviderId: 'custom-test',
      providerValues: [],
      customProviderValues: [
        {
          providerId: 'custom-test',
          name: 'Custom',
          enabled: true,
          apiKey: '',
          baseUrl: '',
          models: [
            {
              id: 'custom-existing',
              enabled: true,
              isCustom: true,
              customName: 'Existing',
              customContext: 64000,
              customOutput: 8000,
              customCapabilities: {
                reasoning: true,
                attachment: false,
                toolCall: true,
                temperature: true,
              },
              customInputModalities: ['text'],
            },
          ],
          defaultModelId: null,
        },
      ],
      setActiveProviderId: vi.fn(),
      handleAddCustomProvider: vi.fn(),
      handleRemoveCustomProvider: vi.fn(),
      getProviderIndex: vi.fn(),
      getCustomProviderIndex: vi.fn(),
    };

    const setValue = vi.fn();
    const getValues = vi.fn(() => []);
    const form = { setValue, getValues } as unknown as SettingsDialogState['form'];

    const { result } = renderHook(() => useProviderDetailsController({ providers, form }));

    act(() => {
      result.current.handleAddCustomProviderModel({
        id: 'custom-added',
        name: 'Custom Added',
        contextSize: 32000,
        outputSize: 4000,
        capabilities: {
          reasoning: true,
          attachment: false,
          toolCall: true,
          temperature: true,
        },
        inputModalities: ['text'],
        thinking: addThinking,
      });
    });

    const addCall = setValue.mock.calls.find((call) => call[0] === 'customProviders.0.models');
    expect(addCall).toBeTruthy();
    if (!addCall) {
      throw new Error('customProviders.0.models call not found');
    }
    expect(addCall[1][0].thinking).toEqual(addThinking);

    setValue.mockClear();
    act(() => {
      result.current.handleUpdateCustomProviderModel({
        id: 'custom-existing',
        name: 'Existing Updated',
        contextSize: 96000,
        outputSize: 12000,
        capabilities: {
          reasoning: true,
          attachment: true,
          toolCall: true,
          temperature: true,
        },
        inputModalities: ['text', 'image'],
        thinking: updateThinking,
      });
    });

    const updateCall = setValue.mock.calls.find((call) => call[0] === 'customProviders.0.models.0');
    expect(updateCall).toBeTruthy();
    if (!updateCall) {
      throw new Error('customProviders.0.models.0 call not found');
    }
    expect(updateCall[1].thinking).toEqual(updateThinking);
    expect(mocks.clearChatThinkingOverride).toHaveBeenCalledWith('custom-test/custom-existing');
    mocks.clearChatThinkingOverride.mockClear();
  });
});
