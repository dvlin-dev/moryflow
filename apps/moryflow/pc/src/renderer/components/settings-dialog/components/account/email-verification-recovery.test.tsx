import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailVerificationRecovery } from './email-verification-recovery';

const mocks = vi.hoisted(() => ({
  sendVerificationOTP: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', () => ({
  sendVerificationOTP: mocks.sendVerificationOTP,
  useAuth: () => ({
    refresh: mocks.refresh,
  }),
}));

vi.mock('@/components/auth', () => ({
  OTPForm: ({
    email,
    onSuccess,
    onBack,
  }: {
    email: string;
    onSuccess?: () => void;
    onBack?: () => void;
  }) => (
    <div>
      <span>{email}</span>
      <button type="button" onClick={() => void onSuccess?.()}>
        otp-success
      </button>
      <button type="button" onClick={onBack}>
        otp-back
      </button>
    </div>
  ),
}));

describe('EmailVerificationRecovery', () => {
  beforeEach(() => {
    mocks.sendVerificationOTP.mockReset();
    mocks.refresh.mockReset();
    mocks.sendVerificationOTP.mockResolvedValue({});
    mocks.refresh.mockResolvedValue(true);
  });

  it('shows recovery entry for unverified users and enters otp flow after sending code', async () => {
    render(<EmailVerificationRecovery email="verify@moryflow.com" />);

    expect(screen.getByText('emailNotVerified')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'verifyEmail' }));

    await waitFor(() => {
      expect(mocks.sendVerificationOTP).toHaveBeenCalledWith(
        'verify@moryflow.com',
        'email-verification'
      );
    });

    expect(screen.getByText('verify@moryflow.com')).toBeTruthy();
  });

  it('refreshes auth state after otp verification succeeds', async () => {
    render(<EmailVerificationRecovery email="verify2@moryflow.com" />);

    fireEvent.click(screen.getByRole('button', { name: 'verifyEmail' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'otp-success' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'otp-success' }));

    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });
  });
});
