import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBarActions } from './top-bar-actions';

const authState = {
  user: null as { name?: string; email?: string } | null,
  isAuthenticated: false,
};

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'settingsLabel') return 'Settings';
      if (key === 'topbarAccountAction') return 'Log in';
      if (key === 'topbarAccountSettingsLabel') return 'Open account settings';
      return key;
    },
  }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => authState,
}));

describe('TopBarActions', () => {
  it('shows login entry when unauthenticated and triggers callback for both buttons', () => {
    const onOpenSettings = vi.fn();
    authState.user = null;
    authState.isAuthenticated = false;
    render(<TopBarActions onOpenSettings={onOpenSettings} />);

    expect(screen.getByTestId('topbar-account-entry-button').textContent).toContain('Log in');
    fireEvent.click(screen.getByTestId('topbar-account-entry-button'));
    fireEvent.click(screen.getByTestId('topbar-settings-button'));
    expect(onOpenSettings).toHaveBeenCalledTimes(2);
  });

  it('shows user name when authenticated', () => {
    const onOpenSettings = vi.fn();
    authState.user = { name: 'Mory User', email: 'mory@example.com' };
    authState.isAuthenticated = true;
    render(<TopBarActions onOpenSettings={onOpenSettings} />);

    expect(screen.getByTestId('topbar-account-entry-button').textContent).toContain('Mory User');
  });

  it('falls back to email local part when user name is empty', () => {
    const onOpenSettings = vi.fn();
    authState.user = { name: '', email: 'fallback@example.com' };
    authState.isAuthenticated = true;
    render(<TopBarActions onOpenSettings={onOpenSettings} />);

    expect(screen.getByTestId('topbar-account-entry-button').textContent).toContain('fallback');
  });
});
