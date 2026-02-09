import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddModelDialog } from './add-model-dialog';
import { ProviderList } from './provider-list';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    membershipEnabled: false,
    setMembershipEnabled: vi.fn(),
    isLoading: false,
    login: vi.fn(),
    refresh: vi.fn(),
  }),
  MEMBERSHIP_PROVIDER_ID: 'membership',
}));

vi.mock('@shared/model-registry', () => ({
  getSortedProviders: () => [],
}));

vi.mock('@anyhunt/model-registry-data', () => ({
  searchModels: () => [],
  getModelCount: () => 0,
}));

describe('settings-dialog: prevent submit bubbling', () => {
  it('AddModelDialog should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onAdd = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <form onSubmit={outerSubmit}>
        <AddModelDialog open onOpenChange={onOpenChange} existingModelIds={[]} onAdd={onAdd} />
      </form>
    );

    fireEvent.change(screen.getByLabelText(/Model ID/i), { target: { value: 'gpt-4o' } });
    fireEvent.change(screen.getByLabelText(/Model name/i), { target: { value: 'GPT-4o' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'gpt-4o',
          name: 'GPT-4o',
        })
      );
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('ProviderList "add custom provider" should not submit ancestor form', () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const handleAddCustomProvider = vi.fn();

    render(
      <form onSubmit={outerSubmit}>
        <ProviderList
          // ProviderList reads only a subset of fields; keep the test minimal.
          providers={
            {
              providerValues: [],
              customProviderValues: [],
              activeProviderId: null,
              setActiveProviderId: vi.fn(),
              handleAddCustomProvider,
            } as any
          }
          form={
            {
              setValue: vi.fn(),
              getValues: vi.fn(() => []),
            } as any
          }
          isLoading={false}
        />
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'addCustomProvider' }));

    expect(handleAddCustomProvider).toHaveBeenCalledTimes(1);
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
