import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OTPForm } from './otp-form';

const mocks = vi.hoisted(() => ({
  verifyEmailSignUpOTP: vi.fn(),
  startEmailSignUp: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { seconds?: number }) => `${key}${params?.seconds ?? ''}`,
  }),
}));

vi.mock('@/lib/server/auth-api', () => ({
  verifyEmailSignUpOTP: mocks.verifyEmailSignUpOTP,
  startEmailSignUp: mocks.startEmailSignUp,
}));

describe('OTPForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );

    mocks.verifyEmailSignUpOTP.mockReset();
    mocks.startEmailSignUp.mockReset();
    mocks.verifyEmailSignUpOTP.mockResolvedValue({
      signupToken: 'signup_token_1',
      signupTokenExpiresAt: '2030-01-01T00:10:00.000Z',
    });
    mocks.startEmailSignUp.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verify button should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={outerSubmit}>
        <OTPForm email="demo@moryflow.com" />
      </form>
    );

    fireEvent.change(screen.getByLabelText('verificationCodeLabel'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'verifyButton' }));

    await waitFor(() => {
      expect(mocks.verifyEmailSignUpOTP).toHaveBeenCalledWith('demo@moryflow.com', '123456');
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('Enter key verify should not submit ancestor form', async () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    render(
      <form onSubmit={outerSubmit}>
        <OTPForm email="demo2@moryflow.com" />
      </form>
    );

    const input = screen.getByLabelText('verificationCodeLabel');
    fireEvent.change(input, { target: { value: '654321' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mocks.verifyEmailSignUpOTP).toHaveBeenCalledWith('demo2@moryflow.com', '654321');
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('shows error when onVerified rejects', async () => {
    const onVerified = vi.fn(async () => {
      throw new Error('Email not verified');
    });

    render(<OTPForm email="demo3@moryflow.com" onVerified={onVerified} />);

    fireEvent.change(screen.getByLabelText('verificationCodeLabel'), {
      target: { value: '000999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'verifyButton' }));

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalledWith('signup_token_1');
    });
    expect(screen.getByText('Email not verified')).toBeTruthy();
  });

  it('resends verification code when resend action becomes available', async () => {
    render(<OTPForm email="demo4@moryflow.com" resendCooldownSeconds={0} />);

    fireEvent.click(screen.getByRole('button', { name: 'resendOtp' }));

    await waitFor(() => {
      expect(mocks.startEmailSignUp).toHaveBeenCalledWith('demo4@moryflow.com');
    });
  });

  it('renders verification code as a normal text input', () => {
    render(<OTPForm email="demo5@moryflow.com" />);

    const input = screen.getByLabelText('verificationCodeLabel') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.maxLength).toBe(6);
    expect(input.inputMode).toBe('numeric');
  });
});
