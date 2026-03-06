import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OTPForm } from './otp-form';

const mocks = vi.hoisted(() => ({
  verifyEmailOTP: vi.fn(),
  sendVerificationOTP: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { seconds?: number }) => `${key}${params?.seconds ?? ''}`,
  }),
}));

vi.mock('@/lib/server/auth-api', () => ({
  verifyEmailOTP: mocks.verifyEmailOTP,
  sendVerificationOTP: mocks.sendVerificationOTP,
}));

vi.mock('@moryflow/ui/components/input-otp', () => {
  const InputOTP = ({
    onChange,
    children,
    containerClassName: _containerClassName,
    ...props
  }: Record<string, unknown>) => (
    <div data-testid="otp-input-wrapper">
      <input
        data-testid="otp-input"
        onChange={(event) => {
          if (typeof onChange === 'function') {
            onChange((event.target as HTMLInputElement).value);
          }
        }}
        {...props}
      />
      {children as React.ReactNode}
    </div>
  );

  const PassThrough = ({ children, ...props }: Record<string, unknown>) => (
    <div {...props}>{children as React.ReactNode}</div>
  );

  return {
    InputOTP,
    InputOTPGroup: PassThrough,
    InputOTPSeparator: PassThrough,
    InputOTPSlot: PassThrough,
  };
});

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

    mocks.verifyEmailOTP.mockReset();
    mocks.sendVerificationOTP.mockReset();
    mocks.verifyEmailOTP.mockResolvedValue({ error: null });
    mocks.sendVerificationOTP.mockResolvedValue({ error: null });
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
      expect(mocks.verifyEmailOTP).toHaveBeenCalledWith('demo@moryflow.com', '123456');
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
      expect(mocks.verifyEmailOTP).toHaveBeenCalledWith('demo2@moryflow.com', '654321');
    });

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('shows error when onSuccess rejects', async () => {
    const onSuccess = vi.fn(async () => {
      throw new Error('Email not verified');
    });

    render(<OTPForm email="demo3@moryflow.com" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('verificationCodeLabel'), {
      target: { value: '000999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'verifyButton' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Email not verified')).toBeTruthy();
  });
});
