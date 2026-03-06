import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { DesktopApi } from '@shared/ipc';

const openSettingsMock = vi.fn();

vi.mock('../../context', () => ({
  useWorkspaceNav: () => ({
    destination: 'sites',
    sidebarMode: 'chat',
    go: vi.fn(),
    setSidebarMode: vi.fn(),
  }),
  useWorkspaceShell: () => ({ openSettings: openSettingsMock }),
  useWorkspaceVault: () => ({ vault: null }),
  useWorkspaceTree: () => ({ tree: [] }),
}));

vi.mock('../../hooks/use-require-login-for-site-publish', () => ({
  useRequireLoginForSitePublish: () => ({
    isAuthenticated: false,
    authLoading: false,
    openAccountSettings: () => openSettingsMock('account'),
    requireLoginForSitePublish: () => false,
  }),
}));

import { SitesPage } from './index';

describe('SitesPage', () => {
  let list: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    list = vi.fn().mockResolvedValue([]);
    window.desktopAPI = {
      sitePublish: {
        list,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not request sites list when unauthenticated', () => {
    render(<SitesPage />);

    expect(list).not.toHaveBeenCalled();
    expect(screen.getByText('Log in required')).toBeTruthy();
  });

  it('opens Account settings when clicking "Log in"', () => {
    render(<SitesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(openSettingsMock).toHaveBeenCalledWith('account');
  });
});
