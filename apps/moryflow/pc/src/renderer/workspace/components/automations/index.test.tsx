import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomationStatusChangeEvent } from '@shared/ipc';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { AutomationsPage } from './index';
import { resetAutomationsStore } from './store/use-automations-store';

const mockUseWorkspaceVault = vi.fn();
let automationsStatusChangeHandler: ((event: AutomationStatusChangeEvent) => void) | null = null;

vi.mock('../../context', () => ({
  useWorkspaceVault: () => mockUseWorkspaceVault(),
}));

const JOB_FIXTURE = {
  id: 'job-1',
  name: 'Daily summary',
  enabled: true,
  source: {
    kind: 'automation-context' as const,
    origin: 'automations-module' as const,
    vaultPath: '/vaults/alpha',
    displayTitle: 'Daily summary',
    contextId: 'ctx-1',
  },
  schedule: { kind: 'every' as const, intervalMs: 86_400_000 },
  payload: {
    kind: 'agent-turn' as const,
    message: 'Summarize the latest updates',
    contextDepth: 6,
  },
  delivery: {
    mode: 'push' as const,
    target: {
      channel: 'telegram' as const,
      accountId: 'default',
      chatId: 'chat-1',
      label: 'Telegram chat-1',
    },
  },
  executionPolicy: {
    approvalMode: 'unattended' as const,
    toolPolicy: { allow: [{ tool: 'Read' as const }, { tool: 'Edit' as const }] },
    networkPolicy: { mode: 'deny' as const },
    fileSystemPolicy: { mode: 'vault_only' as const },
    requiresExplicitConfirmation: true,
  },
  state: { nextRunAt: 1_742_000_000_000 },
  createdAt: 1_741_000_000_000,
  updatedAt: 1_741_000_000_000,
};

const KNOWN_CHAT_FIXTURE = {
  accountId: 'default',
  chatId: 'chat-1',
  conversationId: 'conv-1',
  lastActiveAt: '2026-03-13T09:00:00.000Z',
};

describe('AutomationsPage', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    resetAutomationsStore();
    mockUseWorkspaceVault.mockReturnValue({ vault: { path: '/vaults/alpha' } });

    window.desktopAPI = {
      ...window.desktopAPI,
      telegram: {
        ...((window.desktopAPI as any)?.telegram ?? {}),
        listKnownChats: vi.fn(async () => [KNOWN_CHAT_FIXTURE]),
      },
      automations: {
        listAutomations: vi.fn(async () => [JOB_FIXTURE]),
        getAutomation: vi.fn(async () => null),
        createAutomation: vi.fn(async (input) => ({
          id: 'job-2',
          name: input.name,
          enabled: input.enabled,
          source: {
            kind: 'automation-context' as const,
            origin: 'automations-module' as const,
            vaultPath: input.source.vaultPath,
            displayTitle: input.source.displayTitle,
            contextId: 'ctx-2',
          },
          schedule: input.schedule,
          payload: input.payload,
          delivery: input.delivery,
          executionPolicy: input.executionPolicy,
          state: {},
          createdAt: 1_741_100_000_000,
          updatedAt: 1_741_100_000_000,
        })),
        updateAutomation: vi.fn(async (job) => job),
        deleteAutomation: vi.fn(async () => ({ ok: true })),
        toggleAutomation: vi.fn(async ({ jobId, enabled }) => ({
          ...JOB_FIXTURE,
          id: jobId,
          enabled,
          state: {},
          updatedAt: 1_741_100_000_000,
        })),
        runAutomationNow: vi.fn(async ({ jobId }) => ({
          ...JOB_FIXTURE,
          id: jobId,
          state: { lastRunAt: 1_742_000_000_000 },
          updatedAt: 1_742_000_000_000,
        })),
        listRuns: vi.fn(async (input) =>
          input?.jobId
            ? [
                {
                  id: 'run-1',
                  jobId: input.jobId,
                  startedAt: 1_742_000_000_000,
                  finishedAt: 1_742_000_010_000,
                  status: 'ok',
                  outputText: 'Summary delivered.',
                },
              ]
            : []
        ),
        onStatusChange: vi.fn((handler: (event: AutomationStatusChangeEvent) => void) => {
          automationsStatusChangeHandler = handler;
          return () => {
            if (automationsStatusChangeHandler === handler) {
              automationsStatusChangeHandler = null;
            }
          };
        }),
      },
    } as unknown as typeof window.desktopAPI;
  });

  it('hydrates the automation list view', async () => {
    render(<AutomationsPage />);

    expect(await screen.findByText('Daily summary')).not.toBeNull();
    expect(screen.getByText('automationsSubtitle')).not.toBeNull();
  });

  it('creates a new automation from the create view', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByRole('button', { name: 'automationsNewAutomation' }));
    expect(await screen.findByText('automationsBackToList')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('automationsFormName'), {
      target: { value: 'Weekly digest' },
    });
    fireEvent.change(screen.getByLabelText('automationsFormWhatToRun'), {
      target: { value: 'Create a weekly digest for the team.' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'automationsFormConfirmUnattended' }));
    fireEvent.click(screen.getByText('automationsFormCreateAutomation'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.createAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Weekly digest',
          source: expect.objectContaining({
            kind: 'automation-context',
            vaultPath: '/vaults/alpha',
          }),
        })
      );
    });
  });

  it('requires an explicit unattended execution confirmation before creating', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByRole('button', { name: 'automationsNewAutomation' }));
    await screen.findByText('automationsBackToList');

    fireEvent.change(screen.getByLabelText('automationsFormName'), {
      target: { value: 'Weekly digest' },
    });
    fireEvent.change(screen.getByLabelText('automationsFormWhatToRun'), {
      target: { value: 'Create a weekly digest for the team.' },
    });
    fireEvent.click(screen.getByText('automationsFormCreateAutomation'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.createAutomation).not.toHaveBeenCalled();
    });
    expect(
      await screen.findByText('Please confirm unattended execution permissions.')
    ).toBeTruthy();
  });

  it('resets the create draft when navigating back and clicking New automation again', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByRole('button', { name: 'automationsNewAutomation' }));
    await screen.findByText('automationsBackToList');

    fireEvent.change(screen.getByLabelText('automationsFormName'), {
      target: { value: 'Stale draft' },
    });
    fireEvent.change(screen.getByLabelText('automationsFormWhatToRun'), {
      target: { value: 'Keep stale content' },
    });

    fireEvent.click(screen.getByText('automationsBackToList'));
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByRole('button', { name: 'automationsNewAutomation' }));

    await waitFor(() => {
      expect((screen.getByLabelText('automationsFormName') as HTMLInputElement).value).toBe(
        'New automation'
      );
      expect((screen.getByLabelText('automationsFormWhatToRun') as HTMLTextAreaElement).value).toBe(
        ''
      );
    });
  });

  it('preserves the create draft when background status changes fire', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByRole('button', { name: 'automationsNewAutomation' }));
    await screen.findByText('automationsBackToList');

    fireEvent.change(screen.getByLabelText('automationsFormName'), {
      target: { value: 'Draft that should stay' },
    });
    fireEvent.change(screen.getByLabelText('automationsFormWhatToRun'), {
      target: { value: 'Do not wipe this prompt.' },
    });

    act(() => {
      automationsStatusChangeHandler?.({ occurredAt: Date.now() });
    });

    await waitFor(() => {
      expect(window.desktopAPI.automations.listAutomations).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect((screen.getByLabelText('automationsFormName') as HTMLInputElement).value).toBe(
        'Draft that should stay'
      );
      expect((screen.getByLabelText('automationsFormWhatToRun') as HTMLTextAreaElement).value).toBe(
        'Do not wipe this prompt.'
      );
    });
  });

  it('updates an existing automation from the detail view', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByText('Daily summary'));
    expect(await screen.findByText('automationsBackToList')).not.toBeNull();

    await waitFor(() => {
      expect((screen.getByLabelText('automationsFormWhatToRun') as HTMLTextAreaElement).value).toBe(
        'Summarize the latest updates'
      );
    });

    fireEvent.change(screen.getByLabelText('automationsFormWhatToRun'), {
      target: { value: 'Summarize updates with action items.' },
    });
    fireEvent.click(screen.getByText('automationsFormSaveChanges'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.updateAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-1',
          payload: expect.objectContaining({
            message: 'Summarize updates with action items.',
          }),
        })
      );
    });
  });

  it('shows run history in the detail view', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByText('Daily summary'));
    expect(await screen.findByText('automationsRunHistory (1)')).not.toBeNull();
  });

  it('rehydrates when automations status changes in the background', async () => {
    render(<AutomationsPage />);
    expect(await screen.findByText('Daily summary')).not.toBeNull();

    const listAutomationsMock = vi.mocked(window.desktopAPI.automations.listAutomations);
    listAutomationsMock.mockResolvedValueOnce([
      {
        ...JOB_FIXTURE,
        id: 'job-2',
        name: 'Fresh background run',
        source: {
          kind: 'automation-context' as const,
          origin: 'automations-module' as const,
          vaultPath: '/vaults/alpha',
          displayTitle: 'Fresh background run',
          contextId: 'ctx-2',
        },
        delivery: { mode: 'none' as const },
        state: { lastRunAt: 1_742_100_000_000 },
        createdAt: 1_742_000_000_000,
        updatedAt: 1_742_100_000_000,
      },
    ]);

    act(() => {
      automationsStatusChangeHandler?.({ occurredAt: 1_742_100_000_000 });
    });

    await waitFor(() => {
      expect(screen.getByText('Fresh background run')).toBeTruthy();
    });
  });
});
