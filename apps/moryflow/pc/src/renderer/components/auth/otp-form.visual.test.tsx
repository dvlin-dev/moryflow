import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OTPForm } from './otp-form';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('OTPForm visual structure', () => {
  it('renders the verification form with the same structural hierarchy as the login panel', () => {
    render(<OTPForm email="demo@moryflow.com" onVerified={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByRole('heading', { name: 'verifyEmailTitle' })).toBeTruthy();
    expect(screen.getByText('verificationCodeSentTo')).toBeTruthy();
    expect(screen.getByLabelText('verificationCodeLabel')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'verifyButton' })).toBeTruthy();
    expect(screen.getByText('noCodeQuestion')).toBeTruthy();
    expect(screen.getByText('resendInSeconds')).toBeTruthy();
  });

  it('keeps the back action as a secondary control', () => {
    render(
      <OTPForm
        email="demo@moryflow.com"
        onVerified={vi.fn().mockResolvedValue(undefined)}
        onBack={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['verifyButton', 'backButton']);
  });

  it('uses a standard single input instead of segmented otp slots', () => {
    const { container } = render(
      <OTPForm email="demo@moryflow.com" onVerified={vi.fn().mockResolvedValue(undefined)} />
    );

    expect(screen.getByLabelText('verificationCodeLabel')).toBeTruthy();
    expect(container.querySelector('[data-testid="otp-slot-group"]')).toBeNull();
  });
});
