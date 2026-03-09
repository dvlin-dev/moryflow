/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppCloseBehavior, LaunchAtLoginState } from '@shared/ipc';
import { defaultValues, type FormValues } from '../const';
import { GeneralSection } from './general-section';

const mockUseAppUpdate = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/use-app-update', () => ({
  useAppUpdate: () => mockUseAppUpdate(),
}));

vi.mock('./language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock('./sandbox-settings', () => ({
  SandboxSettings: () => <div data-testid="sandbox-settings" />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const TestHarness = () => {
  const form = useForm<FormValues>({
    defaultValues,
  });

  return <GeneralSection control={form.control} />;
};

describe('GeneralSection', () => {
  beforeEach(() => {
    mockUseAppUpdate.mockReset();
    mockUseAppUpdate.mockReturnValue({
      isLoaded: true,
      settings: {
        channel: 'stable',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: null,
      },
      state: null,
      setChannel: vi.fn(),
      setAutoCheck: vi.fn(),
      setAutoDownload: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      restartToInstall: vi.fn(),
      skipVersion: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      refresh: vi.fn(),
    });
    window.desktopAPI = {
      appRuntime: {
        getCloseBehavior: vi.fn(() => new Promise<AppCloseBehavior>(() => undefined)),
        getLaunchAtLogin: vi.fn(() => new Promise<LaunchAtLoginState>(() => undefined)),
      },
    } as unknown as typeof window.desktopAPI;
  });

  it('keeps close-behavior radio group grid layout while runtime settings are disabled', () => {
    render(<TestHarness />);

    const closeBehaviorGroup = screen.getAllByRole('radiogroup')[0] as HTMLElement;

    expect(closeBehaviorGroup.className).toContain('grid');
    expect(closeBehaviorGroup.className).toContain('gap-2');
  });

  it('hides close-behavior controls when runtime does not support launch-at-login', async () => {
    window.desktopAPI = {
      appRuntime: {
        getCloseBehavior: vi.fn(async () => 'hide_to_menubar'),
        getLaunchAtLogin: vi.fn(async () => ({
          enabled: false,
          supported: false,
          source: 'system',
        })),
      },
    } as unknown as typeof window.desktopAPI;

    render(<TestHarness />);

    await waitFor(() => {
      expect(screen.queryByText('closeBehavior')).toBeNull();
    });
  });

  it('renders update channel controls and persists changes through desktop update API', async () => {
    const setChannel = vi.fn().mockResolvedValue({
      channel: 'beta',
      autoCheck: true,
      autoDownload: false,
      skippedVersion: null,
      lastCheckAt: null,
    });
    const setAutoCheck = vi.fn().mockResolvedValue({
      channel: 'beta',
      autoCheck: false,
      autoDownload: false,
      skippedVersion: null,
      lastCheckAt: null,
    });
    mockUseAppUpdate.mockReturnValue({
      isLoaded: true,
      settings: {
        channel: 'stable',
        autoCheck: true,
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: null,
      },
      state: null,
      setChannel,
      setAutoCheck,
      setAutoDownload: vi.fn(),
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      restartToInstall: vi.fn(),
      skipVersion: vi.fn(),
      openReleaseNotes: vi.fn(),
      openDownloadPage: vi.fn(),
      refresh: vi.fn(),
    });

    render(<TestHarness />);

    expect(screen.getByText('updateChannel')).toBeTruthy();
    fireEvent.click(screen.getByText('updateChannelBeta'));
    expect(setChannel).toHaveBeenCalledWith('beta');
  });
});
