/* @vitest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutSection } from './about-section';

const mockUseAppUpdate = vi.fn();

vi.mock('@/hooks/use-app-update', () => ({
  useAppUpdate: () => mockUseAppUpdate(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => options?.version ?? key,
  }),
}));

describe('AboutSection', () => {
  const checkForUpdates = vi.fn();
  const downloadUpdate = vi.fn();

  beforeEach(() => {
    checkForUpdates.mockReset();
    downloadUpdate.mockReset();
    mockUseAppUpdate.mockReset();
  });

  it('renders current version and manual update actions', async () => {
    mockUseAppUpdate.mockReturnValue({
      isLoaded: true,
      state: {
        status: 'available',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        availableVersion: '1.1.0',
        downloadedVersion: null,
        channel: 'beta',
        releaseNotesUrl: 'https://download.moryflow.com/releases/1.1.0-beta.1',
        downloadUrl: 'https://download.moryflow.com/downloads/1.1.0-beta.1',
        notesSummary: ['New beta build'],
        errorMessage: null,
        downloadProgress: null,
        minimumSupportedVersion: null,
        blockedVersions: [],
        requiresImmediateUpdate: false,
        currentVersionBlocked: false,
        lastCheckedAt: '2026-03-08T06:00:00.000Z',
      },
      settings: {
        channel: 'beta',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: '2026-03-08T06:00:00.000Z',
      },
      checkForUpdates,
      downloadUpdate,
      restartToInstall: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      skipVersion: vi.fn(),
      setChannel: vi.fn(),
      setAutoCheck: vi.fn(),
      setAutoDownload: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AboutSection appVersion="1.0.0" />);

    expect(screen.getByText('1.0.0')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'checkForUpdates' }));
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'downloadUpdate' }));
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);
    expect(downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not render a clickable download action while downloading', () => {
    mockUseAppUpdate.mockReturnValue({
      isLoaded: true,
      state: {
        status: 'downloading',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        availableVersion: '1.1.0',
        downloadedVersion: null,
        channel: 'stable',
        releaseNotesUrl: 'https://download.moryflow.com/releases/1.1.0',
        downloadUrl: 'https://download.moryflow.com/downloads/1.1.0',
        notesSummary: ['Downloading'],
        errorMessage: null,
        downloadProgress: {
          percent: 42,
          transferred: 42,
          total: 100,
          bytesPerSecond: 1000,
        },
        minimumSupportedVersion: null,
        blockedVersions: [],
        requiresImmediateUpdate: false,
        currentVersionBlocked: false,
        lastCheckedAt: '2026-03-08T06:00:00.000Z',
      },
      settings: {
        channel: 'stable',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: '2026-03-08T06:00:00.000Z',
      },
      checkForUpdates,
      downloadUpdate,
      restartToInstall: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      skipVersion: vi.fn(),
      setChannel: vi.fn(),
      setAutoCheck: vi.fn(),
      setAutoDownload: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AboutSection appVersion="1.0.0" />);

    expect(screen.queryByRole('button', { name: 'downloadUpdate' })).toBeNull();
    expect(screen.getByText('updateDownloading')).toBeTruthy();
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('does not show up-to-date messaging before update state finishes loading', () => {
    mockUseAppUpdate.mockReturnValue({
      isLoaded: false,
      state: null,
      settings: {
        channel: 'stable',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: null,
      },
      checkForUpdates,
      downloadUpdate,
      restartToInstall: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      skipVersion: vi.fn(),
      setChannel: vi.fn(),
      setAutoCheck: vi.fn(),
      setAutoDownload: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AboutSection appVersion="1.0.0" />);

    expect(screen.queryByText('upToDate')).toBeNull();
    expect(screen.getAllByText('neverChecked')).toHaveLength(2);
    expect(screen.getByText('unknown')).toBeTruthy();
  });

  it('shows ready-to-install status before mandatory update messaging when download completed', () => {
    mockUseAppUpdate.mockReturnValue({
      isLoaded: true,
      state: {
        status: 'downloaded',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        availableVersion: null,
        downloadedVersion: '1.1.0',
        channel: 'stable',
        releaseNotesUrl: 'https://download.moryflow.com/releases/1.1.0',
        downloadUrl: 'https://download.moryflow.com/downloads/1.1.0',
        notesSummary: ['Ready'],
        errorMessage: null,
        downloadProgress: null,
        minimumSupportedVersion: '1.0.1',
        blockedVersions: ['1.0.0'],
        requiresImmediateUpdate: true,
        currentVersionBlocked: true,
        lastCheckedAt: '2026-03-08T06:00:00.000Z',
      },
      settings: {
        channel: 'stable',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: '2026-03-08T06:00:00.000Z',
      },
      checkForUpdates,
      downloadUpdate,
      restartToInstall: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      skipVersion: vi.fn(),
      setChannel: vi.fn(),
      setAutoCheck: vi.fn(),
      setAutoDownload: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AboutSection appVersion="1.0.0" />);

    expect(screen.getByText('updateReadyToInstall')).toBeTruthy();
    expect(screen.queryByText('Update required')).toBeNull();
    expect(screen.getByRole('button', { name: 'restartToInstall' })).toBeTruthy();
  });
});
