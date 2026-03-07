import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStatusIndicator } from './sync-status-indicator';

const mockUseCloudSync = vi.fn();

vi.mock('@/hooks/use-cloud-sync', () => ({
  useCloudSync: (...args: unknown[]) => mockUseCloudSync(...args),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        synced: 'Synced',
        syncing: 'Syncing',
        needsAttention: 'Needs attention',
        allChangesSynced: 'All changes synced',
        syncingChanges: 'Syncing changes',
        syncPausedDescription: 'Sync paused',
        syncSetupDescription: 'Open sync settings to finish setup.',
        syncOfflineDescription: 'We could not reach the cloud.',
        syncRecoveryDescription: 'Resume sync to safely finish the last changes.',
        syncConflictCopyDescription: 'A conflict copy was kept so nothing was lost.',
        lastSync: 'Last sync',
        neverSynced: 'Never',
      })[key] ?? key,
  }),
}));

vi.mock('@moryflow/ui/components/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    mockUseCloudSync.mockReset();
  });

  it('updates tooltip copy when the callout kind changes within the same tone', () => {
    mockUseCloudSync.mockReturnValue({
      status: {
        engineStatus: 'disabled',
        vaultPath: '/vault',
        vaultId: null,
        pendingCount: 0,
        lastSyncAt: null,
        error: undefined,
        notice: undefined,
      },
    });

    const view = render(<SyncStatusIndicator vaultPath="/vault" />);
    expect(screen.getByText('Open sync settings to finish setup.')).toBeTruthy();

    mockUseCloudSync.mockReturnValue({
      status: {
        engineStatus: 'offline',
        vaultPath: '/vault',
        vaultId: 'vault-1',
        pendingCount: 0,
        lastSyncAt: null,
        error: undefined,
        notice: undefined,
      },
    });

    view.rerender(<SyncStatusIndicator vaultPath="/vault" />);

    expect(screen.getByText('We could not reach the cloud.')).toBeTruthy();
    expect(screen.queryByText('Open sync settings to finish setup.')).toBeNull();
  });
});
