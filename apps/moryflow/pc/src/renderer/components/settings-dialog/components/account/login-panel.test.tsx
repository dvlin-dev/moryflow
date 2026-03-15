import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginPanel } from './login-panel';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  refresh: vi.fn(),
  startEmailSignUp: vi.fn(),
  completeEmailSignUp: vi.fn(),
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
  startEmailSignUp: mocks.startEmailSignUp,
  completeEmailSignUp: mocks.completeEmailSignUp,
}));

vi.mock('@/components/auth', () => ({
  OTPForm: ({
    email,
    onVerified,
  }: {
    email: string;
    onVerified?: (signupToken: string) => void;
  }) => (
    <div data-testid="otp-form">
      {email}
      <button type="button" onClick={() => onVerified?.('signup_token_1')}>
        otp-verified
      </button>
    </div>
  ),
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
    mocks.startEmailSignUp.mockReset();
    mocks.completeEmailSignUp.mockReset();
    mocks.refresh.mockResolvedValue(true);
    mocks.startEmailSignUp.mockResolvedValue({});
    mocks.completeEmailSignUp.mockResolvedValue({ user: { id: 'user_1' } });
  });

  it('enters OTP flow after email sign-up starts', async () => {
    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.startEmailSignUp).toHaveBeenCalledWith('recover@moryflow.com');
    });

    expect(screen.getByTestId('otp-form').textContent).toContain('recover@moryflow.com');
  });

  it('keeps user on the email step when sign-up start fails', async () => {
    mocks.startEmailSignUp.mockResolvedValueOnce({
      error: { code: 'SEND_FAILED', message: 'Failed to send code' },
    });

    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.startEmailSignUp).toHaveBeenCalled();
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

  it('completes sign-up after otp verification', async () => {
    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'otp-verified' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'otp-verified' }));
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.completeEmailSignUp).toHaveBeenCalledWith('signup_token_1', '12345678');
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not close the dialog when complete sign-up fails to establish user state', async () => {
    const onSuccess = vi.fn();
    mocks.refresh.mockResolvedValueOnce(false);

    render(<LoginPanel onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'otp-verified' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'otp-verified' }));
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('operationFailed')).toBeTruthy();
  });

  it('blocks sign-up completion when password is shorter than server minimum', async () => {
    render(<LoginPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));
    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'otp-verified' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'otp-verified' }));
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'signUp' }));

    await waitFor(() => {
      expect(screen.getByText('passwordTooShort')).toBeTruthy();
    });
    expect(mocks.completeEmailSignUp).not.toHaveBeenCalled();
  });

  it('does not render redundant login/register header copy', () => {
    render(<LoginPanel />);

    expect(screen.queryByText('welcomeBackTitle')).toBeNull();
    expect(screen.queryByText('signInToCloudService')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'signUpNow' }));

    expect(screen.queryByText('createAccountTitle')).toBeNull();
    expect(screen.queryByText('signUpToMoryflow')).toBeNull();
  });

  it('renders the auth form shell container', () => {
    const { container } = render(<LoginPanel />);

    const shell = container.querySelector('[data-testid="auth-form-shell"]');
    expect(shell).toBeTruthy();
  });

  it('blocks enter submission with an empty password in login mode', async () => {
    render(<LoginPanel />);

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'recover@moryflow.com' },
    });
    fireEvent.keyDown(screen.getByLabelText('password'), {
      key: 'Enter',
      code: 'Enter',
    });

    await waitFor(() => {
      expect(screen.getByText('passwordRequired')).toBeTruthy();
    });
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
