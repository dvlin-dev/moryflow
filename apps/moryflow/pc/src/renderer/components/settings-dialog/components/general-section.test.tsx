/* @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react';
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
        autoDownload: false,
        skippedVersion: null,
        lastCheckAt: null,
      },
      state: null,
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

  it('renders close-behavior select while runtime settings are loading', () => {
    render(<TestHarness />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
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
});
