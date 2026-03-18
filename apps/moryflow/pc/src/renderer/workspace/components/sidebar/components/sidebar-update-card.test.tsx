/* @vitest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarUpdateCard } from './sidebar-update-card';

const mockUseAppUpdate = vi.fn();

vi.mock('@/hooks/use-app-update', () => ({
  useAppUpdate: () => mockUseAppUpdate(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => options?.version ?? key,
  }),
}));

describe('SidebarUpdateCard', () => {
  const downloadUpdate = vi.fn();
  const skipVersion = vi.fn();
  const restartToInstall = vi.fn();

  const baseHook = {
    downloadUpdate,
    skipVersion,
    restartToInstall,
    openReleaseNotes: vi.fn(),
    openDownloadPage: vi.fn(),
    checkForUpdates: vi.fn(),
    setAutoDownload: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    downloadUpdate.mockReset();
    skipVersion.mockReset();
    restartToInstall.mockReset();
    mockUseAppUpdate.mockReset();
  });

  it('renders manual update actions when a new version is available', async () => {
    mockUseAppUpdate.mockReturnValue({
      ...baseHook,
      isLoaded: true,
      state: {
        status: 'available',
        currentVersion: '1.0.0',
        availableVersion: '1.1.0',
        downloadedVersion: null,
        releaseNotesUrl: 'https://download.moryflow.com/releases/1.1.0',
        errorMessage: null,
        downloadProgress: null,
        lastCheckedAt: null,
      },
      settings: {
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: null,
      },
    });

    render(<SidebarUpdateCard />);

    expect(screen.getByText('1.1.0')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'downloadUpdate' }));
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'skipThisVersion' }));
      await Promise.resolve();
    });

    expect(downloadUpdate).toHaveBeenCalledTimes(1);
    expect(skipVersion).toHaveBeenCalledTimes(1);
  });

  it('renders restarting spinner when status is restarting', () => {
    mockUseAppUpdate.mockReturnValue({
      ...baseHook,
      isLoaded: true,
      state: {
        status: 'restarting',
        currentVersion: '1.0.0',
        availableVersion: null,
        downloadedVersion: '1.1.0',
        releaseNotesUrl: null,
        errorMessage: null,
        downloadProgress: null,
        lastCheckedAt: null,
      },
    });

    render(<SidebarUpdateCard />);

    expect(screen.getByText('restarting')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders Later button in downloaded state and hides card on click', async () => {
    mockUseAppUpdate.mockReturnValue({
      ...baseHook,
      isLoaded: true,
      state: {
        status: 'downloaded',
        currentVersion: '1.0.0',
        availableVersion: null,
        downloadedVersion: '1.1.0',
        releaseNotesUrl: null,
        errorMessage: null,
        downloadProgress: null,
        lastCheckedAt: null,
      },
    });

    const { container } = render(<SidebarUpdateCard />);

    const laterButton = screen.getByRole('button', { name: 'later' });
    expect(laterButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(laterButton);
      await Promise.resolve();
    });

    expect(container.innerHTML).toBe('');
  });

});
