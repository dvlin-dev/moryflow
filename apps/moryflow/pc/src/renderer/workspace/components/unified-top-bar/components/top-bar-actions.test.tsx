import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBarActions } from './top-bar-actions';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'settingsLabel' ? 'Settings' : key),
  }),
}));

describe('TopBarActions', () => {
  it('triggers settings callback when clicking settings button', () => {
    const onOpenSettings = vi.fn();
    render(<TopBarActions onOpenSettings={onOpenSettings} />);

    fireEvent.click(screen.getByTestId('topbar-settings-button'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
