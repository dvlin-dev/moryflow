import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsDialogState } from '../../use-settings-dialog';
import { ProviderDetails } from './provider-details';

const mocks = vi.hoisted(() => ({
  useProviderDetailsController: vi.fn(),
  providerDetailsPreset: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./use-provider-details-controller', () => ({
  useProviderDetailsController: mocks.useProviderDetailsController,
}));

vi.mock('./provider-details-preset', () => ({
  ProviderDetailsPreset: (props: unknown) => {
    mocks.providerDetailsPreset(props);
    return null;
  },
}));

vi.mock('./provider-details-custom', () => ({
  ProviderDetailsCustom: () => null,
}));

vi.mock('./membership-details', () => ({
  MembershipDetails: () => null,
}));

vi.mock('./ollama-panel', () => ({
  OllamaPanel: () => null,
}));

describe('ProviderDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes preset sdkType to preset dialogs', () => {
    mocks.useProviderDetailsController.mockReturnValue({
      activeProviderId: 'openrouter',
      isMembership: false,
      isCustom: false,
      preset: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'test',
        docUrl: 'https://openrouter.ai/docs/models',
        defaultBaseUrl: 'https://openrouter.ai/api/v1',
        sdkType: 'openrouter',
      },
      presetIndex: 0,
      customIndex: -1,
      customConfig: undefined,
      testStatus: 'idle',
      searchQuery: '',
      setSearchQuery: vi.fn(),
      allModels: [],
      filteredModels: [],
      existingModelIds: [],
      addModelOpen: false,
      setAddModelOpen: vi.fn(),
      editModelOpen: false,
      setEditModelOpen: vi.fn(),
      editModelData: null,
      handleTest: vi.fn(),
      handleAddModel: vi.fn(),
      handleRemoveCustomModel: vi.fn(),
      handleEditModel: vi.fn(),
      handleSaveModel: vi.fn(),
      isModelEnabled: vi.fn(() => false),
      handleTogglePresetModel: vi.fn(),
      handleAddCustomProviderModel: vi.fn(),
      handleUpdateCustomProviderModel: vi.fn(),
      handleToggleCustomProviderModel: vi.fn(),
      handleDeleteCustomProviderModel: vi.fn(),
      handleChangeCustomSdkType: vi.fn(),
      handleRemoveCustomProviderByIndex: vi.fn(),
    });

    render(
      <ProviderDetails
        providers={{} as SettingsDialogState['providers']}
        form={{} as SettingsDialogState['form']}
      />
    );

    expect(mocks.providerDetailsPreset).toHaveBeenCalledTimes(1);
    const props = mocks.providerDetailsPreset.mock.calls[0]?.[0] as {
      dialogModel: { providerId: string; sdkType: string };
    };
    expect(props.dialogModel.providerId).toBe('openrouter');
    expect(props.dialogModel.sdkType).toBe('openrouter');
  });
});
