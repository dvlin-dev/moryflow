import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginPanel } from './login-panel';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  refresh: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => ({
    login: mocks.login,
    loginWithGoogle: mocks.loginWithGoogle,
    refresh: mocks.refresh,
  }),
  signUpWithEmail: mocks.signUpWithEmail,
}));

vi.mock('@/components/auth', () => ({
  OTPForm: ({ email }: { email: string }) => <div data-testid="otp-form">{email}</div>,
}));

vi.mock('./password-reset-panel', () => ({
  PasswordResetPanel: ({ onSuccess }: { onSuccess?: (email: string) => void }) => (
    <button type="button" onClick={() => onSuccess?.('recover@moryflow.com')}>
      complete-reset
    </button>
  ),
}));

describe('LoginPanel', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.loginWithGoogle.mockReset();
    mocks.refresh.mockReset();
    mocks.signUpWithEmail.mockReset();
    mocks.signUpWithEmail.mockResolvedValue({ user: { id: 'user_1' } });
  });

  it('enters OTP flow after sign-up succeeds', async () => {
    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('nickname'), {
      target: { value: 'Demo' },
    });
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.signUpWithEmail).toHaveBeenCalledWith(
        'recover@moryflow.com',
        '12345678',
        'Demo'
      );
    });

    expect(screen.getByTestId('otp-form').textContent).toContain('recover@moryflow.com');
  });

  it('keeps user on the sign-up form when sign-up fails', async () => {
    mocks.signUpWithEmail.mockResolvedValueOnce({
      error: { code: 'SEND_FAILED', message: 'Failed to send code' },
    });

    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('nickname'), {
      target: { value: 'Demo' },
    });
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.signUpWithEmail).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('otp-form')).toBeNull();
    expect(screen.getByText('Failed to send code')).toBeTruthy();
  });

  it('returns to login mode with preserved email after password reset succeeds', async () => {
    render(<LoginPanel />);

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'initial@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'forgotPassword' }));
    fireEvent.click(screen.getByRole('button', { name: 'complete-reset' }));

    await waitFor(() => {
      expect((screen.getByLabelText('email') as HTMLInputElement).value).toBe(
        'recover@moryflow.com'
      );
    });
  });

  it('blocks sign-up submission when password is shorter than server minimum', async () => {
    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('nickname'), {
      target: { value: 'Demo' },
    });
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(screen.getByText('passwordTooShort')).toBeTruthy();
    });
    expect(mocks.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('does not render redundant login/register header copy', () => {
    render(<LoginPanel />);

    expect(screen.queryByText('welcomeBackTitle')).toBeNull();
    expect(screen.queryByText('signInToCloudService')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));

    expect(screen.queryByText('createAccountTitle')).toBeNull();
    expect(screen.queryByText('signUpToMoryflow')).toBeNull();
  });

  it('centers login and register forms within the account panel area', () => {
    const { container } = render(<LoginPanel />);

    const centeredShell = container.querySelector('[data-testid="auth-form-shell"]');
    expect(centeredShell?.className).toContain('min-h-[420px]');
    expect(centeredShell?.className).toContain('items-center');
    expect(centeredShell?.className).toContain('justify-center');
  });
});
