import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AddModelDialog } from './add-model-dialog';
import { ProviderList } from './provider-list';
import { LoginPanel } from '../account/login-panel';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  signUpEmail: vi.fn(),
}));

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
    login: mocks.login,
    refresh: mocks.refresh,
  }),
  signUp: { email: mocks.signUpEmail },
  MEMBERSHIP_PROVIDER_ID: 'membership',
}));

vi.mock('@/components/auth', () => ({
  OTPForm: () => null,
}));

vi.mock('@moryflow/model-bank/registry', () => ({
  getSortedProviders: () => [],
  searchModels: () => [],
  getModelCount: () => 0,
}));

describe('settings-dialog: prevent submit bubbling', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.refresh.mockReset();
    mocks.signUpEmail.mockReset();
    mocks.login.mockResolvedValue(undefined);
    mocks.refresh.mockResolvedValue(undefined);
    mocks.signUpEmail.mockResolvedValue({ error: null });
  });

  it('AddModelDialog should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onAdd = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <form onSubmit={outerSubmit}>
        <AddModelDialog
          open
          onOpenChange={onOpenChange}
          existingModelIds={[]}
          onAdd={onAdd}
          sdkType="openai-compatible"
        />
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

  it('LoginPanel submit button should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={outerSubmit}>
        <LoginPanel />
      </form>
    );

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'demo@moryflow.com' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signIn' }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith('demo@moryflow.com', '123456');
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('LoginPanel Enter key submit should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={outerSubmit}>
        <LoginPanel />
      </form>
    );

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'demo2@moryflow.com' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'abcdef' },
    });
    fireEvent.keyDown(screen.getByLabelText('password'), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith('demo2@moryflow.com', 'abcdef');
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
