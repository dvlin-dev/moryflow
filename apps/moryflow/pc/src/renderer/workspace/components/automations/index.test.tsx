import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationsPage } from './index';
import { resetAutomationsStore } from './store/use-automations-store';

const mockUseWorkspaceVault = vi.fn();

vi.mock('../../context', () => ({
  useWorkspaceVault: () => mockUseWorkspaceVault(),
}));

describe('AutomationsPage', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    resetAutomationsStore();
    mockUseWorkspaceVault.mockReturnValue({
      vault: {
        path: '/vaults/alpha',
      },
    });

    window.desktopAPI = {
      ...window.desktopAPI,
      automations: {
        listAutomations: vi.fn(async () => [
          {
            id: 'job-1',
            name: 'Daily summary',
            enabled: true,
            source: {
              kind: 'automation-context',
              origin: 'automations-module',
              vaultPath: '/vaults/alpha',
              displayTitle: 'Daily summary',
              contextId: 'ctx-1',
            },
            schedule: {
              kind: 'every',
              intervalMs: 86_400_000,
            },
            payload: {
              kind: 'agent-turn',
              message: 'Summarize the latest updates',
              contextDepth: 6,
            },
            delivery: {
              mode: 'push',
              endpointId: 'endpoint-1',
            },
            executionPolicy: {
              approvalMode: 'unattended',
              toolPolicy: { allow: [{ tool: 'Read' }, { tool: 'Edit' }] },
              networkPolicy: { mode: 'deny' },
              fileSystemPolicy: { mode: 'vault_only' },
              requiresExplicitConfirmation: true,
            },
            state: {
              nextRunAt: 1_742_000_000_000,
            },
            createdAt: 1_741_000_000_000,
            updatedAt: 1_741_000_000_000,
          },
        ]),
        getAutomation: vi.fn(async () => null),
        createAutomation: vi.fn(async (input) => ({
          id: 'job-2',
          name: input.name,
          enabled: input.enabled,
          source: {
            kind: 'automation-context',
            origin: 'automations-module',
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
          id: jobId,
          name: 'Daily summary',
          enabled,
          source: {
            kind: 'automation-context',
            origin: 'automations-module',
            vaultPath: '/vaults/alpha',
            displayTitle: 'Daily summary',
            contextId: 'ctx-1',
          },
          schedule: {
            kind: 'every',
            intervalMs: 86_400_000,
          },
          payload: {
            kind: 'agent-turn',
            message: 'Summarize the latest updates',
            contextDepth: 6,
          },
          delivery: {
            mode: 'push',
            endpointId: 'endpoint-1',
          },
          executionPolicy: {
            approvalMode: 'unattended',
            toolPolicy: { allow: [{ tool: 'Read' }, { tool: 'Edit' }] },
            networkPolicy: { mode: 'deny' },
            fileSystemPolicy: { mode: 'vault_only' },
            requiresExplicitConfirmation: true,
          },
          state: {},
          createdAt: 1_741_000_000_000,
          updatedAt: 1_741_100_000_000,
        })),
        runAutomationNow: vi.fn(async ({ jobId }) => ({
          id: jobId,
          name: 'Daily summary',
          enabled: true,
          source: {
            kind: 'automation-context',
            origin: 'automations-module',
            vaultPath: '/vaults/alpha',
            displayTitle: 'Daily summary',
            contextId: 'ctx-1',
          },
          schedule: {
            kind: 'every',
            intervalMs: 86_400_000,
          },
          payload: {
            kind: 'agent-turn',
            message: 'Summarize the latest updates',
            contextDepth: 6,
          },
          delivery: {
            mode: 'push',
            endpointId: 'endpoint-1',
          },
          executionPolicy: {
            approvalMode: 'unattended',
            toolPolicy: { allow: [{ tool: 'Read' }, { tool: 'Edit' }] },
            networkPolicy: { mode: 'deny' },
            fileSystemPolicy: { mode: 'vault_only' },
            requiresExplicitConfirmation: true,
          },
          state: {
            lastRunAt: 1_742_000_000_000,
          },
          createdAt: 1_741_000_000_000,
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
        listEndpoints: vi.fn(async () => [
          {
            id: 'endpoint-1',
            channel: 'telegram',
            accountId: 'default',
            label: 'Telegram Daily',
            target: {
              kind: 'telegram',
              chatId: 'chat-1',
              peerKey: 'tg:chat-1',
              threadKey: 'tg:chat-1',
            },
            verifiedAt: '2026-03-13T09:00:00.000Z',
            replySessionId: 'session-1',
          },
        ]),
        getDefaultEndpoint: vi.fn(async () => ({
          id: 'endpoint-1',
          channel: 'telegram',
          accountId: 'default',
          label: 'Telegram Daily',
          target: {
            kind: 'telegram',
            chatId: 'chat-1',
            peerKey: 'tg:chat-1',
            threadKey: 'tg:chat-1',
          },
          verifiedAt: '2026-03-13T09:00:00.000Z',
          replySessionId: 'session-1',
        })),
        bindEndpoint: vi.fn(async (input) => ({
          id: 'endpoint-2',
          channel: 'telegram',
          accountId: input.accountId,
          label: input.label ?? 'New endpoint',
          target: {
            kind: 'telegram',
            chatId: input.chatId,
            threadId: input.threadId,
            peerKey: `tg:${input.chatId}`,
            threadKey: `tg:${input.chatId}:${input.threadId ?? 'root'}`,
          },
          verifiedAt: '2026-03-13T10:00:00.000Z',
          replySessionId: 'session-2',
        })),
        updateEndpoint: vi.fn(async (input) => ({
          id: input.endpointId,
          channel: 'telegram',
          accountId: 'default',
          label: input.label,
          target: {
            kind: 'telegram',
            chatId: 'chat-1',
            peerKey: 'tg:chat-1',
            threadKey: 'tg:chat-1',
          },
          verifiedAt: '2026-03-13T09:00:00.000Z',
          replySessionId: 'session-1',
        })),
        removeEndpoint: vi.fn(async () => ({ ok: true })),
        setDefaultEndpoint: vi.fn(async () => ({ ok: true })),
      },
    } as typeof window.desktopAPI;
  });

  it('hydrates list, endpoint health and run history from desktopAPI', async () => {
    render(<AutomationsPage />);

    expect(await screen.findByText('Daily summary')).not.toBeNull();
    expect(screen.getByText('Telegram endpoints')).not.toBeNull();
    expect(screen.getByText('Summary delivered.')).not.toBeNull();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('creates a new automation from the module editor', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.click(screen.getByText('New automation'));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Weekly digest' },
    });
    fireEvent.change(screen.getByLabelText('What to run'), {
      target: { value: 'Create a weekly digest for the team.' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Confirm unattended execution' }));
    fireEvent.click(screen.getByText('Create automation'));

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

    fireEvent.click(screen.getByText('New automation'));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Weekly digest' },
    });
    fireEvent.change(screen.getByLabelText('What to run'), {
      target: { value: 'Create a weekly digest for the team.' },
    });
    fireEvent.click(screen.getByText('Create automation'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.createAutomation).not.toHaveBeenCalled();
    });
    expect(
      await screen.findByText('Please confirm unattended execution permissions.')
    ).toBeTruthy();
  });

  it('updates an existing automation from the editor', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.change(screen.getByLabelText('What to run'), {
      target: { value: 'Summarize updates with action items.' },
    });
    fireEvent.click(screen.getByText('Save changes'));

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

  it('binds a verified endpoint and can clear the default target', async () => {
    render(<AutomationsPage />);
    await screen.findByText('Daily summary');

    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Finance chat' },
    });
    fireEvent.change(screen.getByLabelText('Chat ID'), {
      target: { value: 'chat-finance' },
    });
    fireEvent.click(screen.getByText('Bind endpoint'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.bindEndpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'telegram',
          chatId: 'chat-finance',
          label: 'Finance chat',
        })
      );
    });

    fireEvent.click(screen.getByText('Clear default'));

    await waitFor(() => {
      expect(window.desktopAPI.automations.setDefaultEndpoint).toHaveBeenCalled();
    });
  });
});
