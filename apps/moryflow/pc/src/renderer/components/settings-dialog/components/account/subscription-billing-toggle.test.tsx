/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionBillingToggle } from './subscription-billing-toggle';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'savePercent') {
        return `Save ${params?.percent}%`;
      }

      return (
        {
          monthly: 'Monthly',
          yearly: 'Yearly',
        }[key] ?? key
      );
    },
  }),
}));

describe('SubscriptionBillingToggle', () => {
  it('fires onBillingCycleChange once when clicking a different tab', () => {
    const onBillingCycleChange = vi.fn();

    render(
      <SubscriptionBillingToggle
        billingCycle="monthly"
        onBillingCycleChange={onBillingCycleChange}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Yearly/i }));

    expect(onBillingCycleChange).toHaveBeenCalledTimes(1);
    expect(onBillingCycleChange).toHaveBeenCalledWith('yearly');
  });
});
