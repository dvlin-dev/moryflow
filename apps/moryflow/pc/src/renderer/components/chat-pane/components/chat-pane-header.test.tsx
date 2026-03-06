import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatSessionSummary } from '@shared/ipc';
import { ChatPaneSessionActions } from './chat-pane-header';

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
  it('renders history and new conversation actions', () => {
    render(
      <ChatPaneSessionActions
        sessions={sessions}
        activeSession={sessions[0] ?? null}
        onSelectSession={vi.fn()}
        onCreateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        isSessionReady
      />
    );

    expect(screen.getByLabelText('history')).toBeTruthy();
    expect(screen.getByLabelText('newConversation')).toBeTruthy();
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
});
