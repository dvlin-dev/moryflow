import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PasswordResetPanel } from './password-reset-panel';

const mocks = vi.hoisted(() => ({
  sendForgotPasswordOTP: vi.fn(),
  resetPasswordWithOTP: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { email?: string }) => `${key}${params?.email ?? ''}`,
  }),
}));

vi.mock('@/lib/server', () => ({
  sendForgotPasswordOTP: mocks.sendForgotPasswordOTP,
  resetPasswordWithOTP: mocks.resetPasswordWithOTP,
  useAuth: () => ({
    refresh: vi.fn(),
  }),
}));

const sendCodeAndWaitForResetForm = async (email: string) => {
  await waitFor(() => {
    expect(mocks.sendForgotPasswordOTP).toHaveBeenCalledWith(email);
  });

  return screen.findByLabelText('verificationCode');
};

describe('PasswordResetPanel', () => {
  beforeEach(() => {
    mocks.sendForgotPasswordOTP.mockReset();
    mocks.resetPasswordWithOTP.mockReset();
    mocks.sendForgotPasswordOTP.mockResolvedValue({});
    mocks.resetPasswordWithOTP.mockResolvedValue({});
  });

  it('sends the reset OTP after entering email', async () => {
    render(<PasswordResetPanel />);

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'reset@moryflow.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'sendCode' }));

    await sendCodeAndWaitForResetForm('reset@moryflow.com');
  });

  it('resets password after entering otp and new password', async () => {
    const onSuccess = vi.fn();

    render(<PasswordResetPanel initialEmail="reset2@moryflow.com" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'sendCode' }));

    const otpInput = (await sendCodeAndWaitForResetForm('reset2@moryflow.com')) as HTMLInputElement;

    fireEvent.change(otpInput, {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'resetPassword' }));

    await waitFor(() => {
      expect(mocks.resetPasswordWithOTP).toHaveBeenCalledWith(
        'reset2@moryflow.com',
        '123456',
        'new-password'
      );
    });
    expect(onSuccess).toHaveBeenCalledWith('reset2@moryflow.com');
  });

  it('locks the target email after code is sent and reuses it during reset', async () => {
    render(<PasswordResetPanel initialEmail="reset3@moryflow.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'sendCode' }));

    const otpInput = (await sendCodeAndWaitForResetForm('reset3@moryflow.com')) as HTMLInputElement;

    expect((screen.getByLabelText('email') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(otpInput, {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'resetPassword' }));

    await waitFor(() => {
      expect(mocks.resetPasswordWithOTP).toHaveBeenCalledWith(
        'reset3@moryflow.com',
        '123456',
        'new-password'
      );
    });
  });

  it('blocks reset submission when password is shorter than server minimum', async () => {
    render(<PasswordResetPanel initialEmail="reset4@moryflow.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'sendCode' }));

    const otpInput = (await sendCodeAndWaitForResetForm('reset4@moryflow.com')) as HTMLInputElement;

    fireEvent.change(otpInput, {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('password'), {
      target: { value: '1234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'resetPassword' }));

    await waitFor(() => {
      expect(screen.getByText('passwordTooShort')).toBeTruthy();
    });
    expect(mocks.resetPasswordWithOTP).not.toHaveBeenCalled();
  });

  it('normalizes otp input to digits only before submission', async () => {
    render(<PasswordResetPanel initialEmail="reset5@moryflow.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'sendCode' }));

    const otpInput = (await sendCodeAndWaitForResetForm('reset5@moryflow.com')) as HTMLInputElement;
    fireEvent.change(otpInput, {
      target: { value: '12ab34!@56' },
    });

    expect(otpInput.value).toBe('123456');
  });
});
