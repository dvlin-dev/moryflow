import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPaneAutomationEntry } from './chat-pane-automation-entry';
import type { ChatSessionSummary } from '@shared/ipc';
import { ChatPaneSessionActions } from './chat-pane-header';
import { resetAutomationsStore } from '@/workspace/components/automations/store/use-automations-store';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const sessions: ChatSessionSummary[] = [
  {
    id: 'session-1',
    title: 'Session One',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    vaultPath: '/vault',
  },
  {
    id: 'session-2',
    title: 'Session Two',
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    vaultPath: '/vault',
  },
];

describe('ChatPaneSessionActions', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    resetAutomationsStore();
    window.desktopAPI = {
      ...window.desktopAPI,
      automations: {
        listAutomations: vi.fn(async () => []),
        getAutomation: vi.fn(async () => null),
        createAutomation: vi.fn(async (input) => ({
          id: 'job-created',
          name: input.name,
          enabled: input.enabled,
          source: {
            kind: 'conversation-session',
            origin: 'conversation-entry',
            sessionId: 'session-1',
            vaultPath: '/vault',
            displayTitle: input.name,
          },
          schedule: input.schedule,
          payload: input.payload,
          delivery: input.delivery,
          executionPolicy: input.executionPolicy,
          state: {},
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        })),
        updateAutomation: vi.fn(async (job) => job),
        deleteAutomation: vi.fn(async () => ({ ok: true })),
        toggleAutomation: vi.fn(),
        runAutomationNow: vi.fn(),
        listRuns: vi.fn(async () => []),
        listEndpoints: vi.fn(async () => [
          {
            id: 'endpoint-1',
            channel: 'telegram',
            accountId: 'default',
            label: 'Daily endpoint',
            target: {
              kind: 'telegram',
              chatId: 'chat-1',
              peerKey: 'tg:chat-1',
              threadKey: 'tg:chat-1',
            },
            verifiedAt: '2026-03-13T09:00:00.000Z',
            replySessionId: 'reply-session-1',
          },
        ]),
        getDefaultEndpoint: vi.fn(async () => null),
        bindEndpoint: vi.fn(),
        updateEndpoint: vi.fn(),
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
      },
    } as typeof window.desktopAPI;
  });

  it('renders history and new conversation actions', () => {
    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        isSessionReady
        automationEntry={
          <ChatPaneAutomationEntry
            activeSession={sessions[0] ?? null}
            latestUserMessage="Summarize the latest release notes."
            isSessionReady
          />
        }
      />
    );

    expect(screen.getByLabelText('history')).toBeTruthy();
    expect(screen.getByLabelText('newConversation')).toBeTruthy();
    expect(screen.getByText('Automate')).toBeTruthy();
  });

  it('calls onCreateSession when clicking plus', () => {
    const onCreateSession = vi.fn();

    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={onCreateSession}
        onDeleteSession={vi.fn()}
        isSessionReady
      />
    );

    fireEvent.click(screen.getByLabelText('newConversation'));

    expect(onCreateSession).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectSession when selecting a session from history menu', () => {
    const onSelectSession = vi.fn();

    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={onSelectSession}
        onCreateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        isSessionReady
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('history'));
    fireEvent.click(screen.getByText('Session Two'));

    expect(onSelectSession).toHaveBeenCalledWith('session-2');
  });

  it('calls onDeleteSession when clicking delete action in history menu', () => {
    const onDeleteSession = vi.fn();

    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onDeleteSession={onDeleteSession}
        isSessionReady
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('history'));
    const sessionItem = screen.getByRole('menuitem', { name: /Session Two/i });
    fireEvent.mouseEnter(sessionItem);
    fireEvent.click(screen.getByLabelText('deleteChat'));

    expect(onDeleteSession).toHaveBeenCalledWith('session-2');
  });

  it('opens the shared automation editor with the latest user message prefilled', async () => {
    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        isSessionReady
        automationEntry={
          <ChatPaneAutomationEntry
            activeSession={sessions[0] ?? null}
            latestUserMessage="Summarize the latest release notes."
            isSessionReady
          />
        }
      />
    );

    fireEvent.click(screen.getByText('Automate'));

    expect(await screen.findByDisplayValue('Summarize the latest release notes.')).toBeTruthy();
    expect(screen.getAllByText('Daily endpoint').length).toBeGreaterThan(0);
  });

  it('creates a conversation-bound automation from the header entry', async () => {
    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        isSessionReady
        automationEntry={
          <ChatPaneAutomationEntry
            activeSession={sessions[0] ?? null}
            latestUserMessage="Summarize the latest release notes."
            isSessionReady
          />
        }
      />
    );

    fireEvent.click(screen.getByText('Automate'));
    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Release notes digest' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Confirm unattended execution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create automation' }));

    await waitFor(() => {
      expect(window.desktopAPI.automations.createAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          source: expect.objectContaining({
            kind: 'conversation-session',
            sessionId: 'session-1',
          }),
          payload: expect.objectContaining({
            message: 'Summarize the latest release notes.',
          }),
          delivery: expect.objectContaining({
            endpointId: 'endpoint-1',
          }),
        })
      );
    });
  });
});
