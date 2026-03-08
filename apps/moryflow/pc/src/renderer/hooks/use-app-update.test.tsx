/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUpdateSettings, AppUpdateState, DesktopApi } from '@shared/ipc';
import { resetAppUpdateStoreForTests, useAppUpdate } from './use-app-update';

describe('useAppUpdate', () => {
  let getState: ReturnType<typeof vi.fn>;
  let getSettings: ReturnType<typeof vi.fn>;
  let setChannel: ReturnType<typeof vi.fn>;
  let checkForUpdates: ReturnType<typeof vi.fn>;
  let openReleaseNotes: ReturnType<typeof vi.fn>;
  let openDownloadPage: ReturnType<typeof vi.fn>;
  let onStateChange: ReturnType<typeof vi.fn>;
  let updateListener:
    | ((event: { state: AppUpdateState; settings: AppUpdateSettings }) => void)
    | null;

  const baseState: AppUpdateState = {
    status: 'idle',
    currentVersion: '1.0.0',
    latestVersion: null,
    availableVersion: null,
    downloadedVersion: null,
    channel: 'stable',
    releaseNotesUrl: null,
    downloadUrl: null,
    notesSummary: [],
    errorMessage: null,
    downloadProgress: null,
    minimumSupportedVersion: null,
    blockedVersions: [],
    requiresImmediateUpdate: false,
    currentVersionBlocked: false,
    lastCheckedAt: null,
  };

  const baseSettings: AppUpdateSettings = {
    channel: 'stable',
    autoCheck: true,
    autoDownload: false,
    skippedVersion: null,
    lastCheckAt: null,
  };

  beforeEach(() => {
    resetAppUpdateStoreForTests();
    updateListener = null;
    getState = vi.fn().mockResolvedValue(baseState);
    getSettings = vi.fn().mockResolvedValue(baseSettings);
    setChannel = vi.fn().mockResolvedValue({
      ...baseSettings,
      channel: 'beta',
    } satisfies AppUpdateSettings);
    openReleaseNotes = vi.fn();
    openDownloadPage = vi.fn();
    checkForUpdates = vi.fn().mockResolvedValue({
      ...baseState,
      status: 'available',
      latestVersion: '1.1.0',
      availableVersion: '1.1.0',
      releaseNotesUrl: 'https://download.moryflow.com/releases/1.1.0',
      downloadUrl: 'https://download.moryflow.com/downloads/1.1.0',
    } satisfies AppUpdateState);
    onStateChange = vi.fn(
      (handler: (event: { state: AppUpdateState; settings: AppUpdateSettings }) => void) => {
        updateListener = handler;
        return vi.fn();
      }
    );

    window.desktopAPI = {
      updates: {
        getState,
        getSettings,
        setChannel,
        setAutoCheck: vi.fn(),
        setAutoDownload: vi.fn(),
        checkForUpdates,
        downloadUpdate: vi.fn(),
        restartToInstall: vi.fn(),
        skipVersion: vi.fn(),
        openReleaseNotes,
        openDownloadPage,
        onStateChange,
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    resetAppUpdateStoreForTests();
    vi.clearAllMocks();
  });

  it('loads initial state and keeps listening for update events', async () => {
    const { result } = renderHook(() => useAppUpdate());

    await act(async () => {
      await waitFor(() => expect(result.current.isLoaded).toBe(true));
    });
    expect(result.current.state?.currentVersion).toBe('1.0.0');
    expect(result.current.settings?.channel).toBe('stable');
    expect(onStateChange).toHaveBeenCalledTimes(1);

    act(() => {
      updateListener?.({
        state: {
          ...baseState,
          status: 'downloaded',
          latestVersion: '1.1.0',
          availableVersion: '1.1.0',
          downloadedVersion: '1.1.0',
        },
        settings: {
          ...baseSettings,
          lastCheckAt: '2026-03-08T10:00:00.000Z',
        },
      });
    });

    expect(result.current.state?.status).toBe('downloaded');
    expect(result.current.state?.downloadedVersion).toBe('1.1.0');
    expect(result.current.settings?.lastCheckAt).toBe('2026-03-08T10:00:00.000Z');
  });

  it('updates local snapshot after changing channel and manual checking', async () => {
    getState.mockResolvedValueOnce(baseState).mockResolvedValueOnce({
      ...baseState,
      channel: 'beta',
    } satisfies AppUpdateState);

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await waitFor(() => expect(result.current.isLoaded).toBe(true));
    });

    await act(async () => {
      await result.current.setChannel('beta');
    });

    expect(setChannel).toHaveBeenCalledWith('beta');
    expect(result.current.settings?.channel).toBe('beta');
    expect(result.current.state?.channel).toBe('beta');

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(checkForUpdates).toHaveBeenCalledTimes(1);
    expect(result.current.state?.status).toBe('available');
    expect(result.current.state?.availableVersion).toBe('1.1.0');
  });

  it('rethrows release-note and download-page failures so the caller can surface feedback', async () => {
    const error = new Error('Unable to open update link');
    openReleaseNotes.mockRejectedValue(error);
    openDownloadPage.mockRejectedValue(error);

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await waitFor(() => expect(result.current.isLoaded).toBe(true));
    });

    await expect(result.current.openReleaseNotes()).rejects.toThrow('Unable to open update link');
    expect(result.current.errorMessage).toBe('Unable to open update link');

    await expect(result.current.openDownloadPage()).rejects.toThrow('Unable to open update link');
    expect(result.current.errorMessage).toBe('Unable to open update link');
  });
});
