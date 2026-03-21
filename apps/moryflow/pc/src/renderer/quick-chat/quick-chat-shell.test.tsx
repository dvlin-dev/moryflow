import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickChatShell } from './quick-chat-shell';

const mocks = vi.hoisted(() => ({
  selectSession: vi.fn(),
  activeSessionId: null as string | null,
  chatPaneWrapperProps: vi.fn(),
}));

vi.mock('@/components/chat-pane/hooks/use-chat-sessions', () => ({
  useChatSessions: () => ({
    selectSession: mocks.selectSession,
    openPreThread: vi.fn(),
    activeSessionId: mocks.activeSessionId,
  }),
}));

vi.mock('@/workspace/components/chat-pane-wrapper', () => ({
  ChatPaneWrapper: (props: { variant?: string; fallback?: unknown }) => {
    mocks.chatPaneWrapperProps(props);
    return <div data-testid="quick-chat-pane" />;
  },
}));

describe('QuickChatShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeSessionId = null;
    window.desktopAPI = {
      quickChat: {
        getState: vi.fn().mockResolvedValue({
          visible: false,
          focused: false,
          sessionId: 'session-1',
        }),
        setSessionId: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as typeof window.desktopAPI;
  });

  it('binds initial session from quick chat state and renders mode chat pane', async () => {
    render(<QuickChatShell />);

    await waitFor(() => {
      expect(mocks.selectSession).toHaveBeenCalledWith('session-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('quick-chat-pane')).toBeTruthy();
    });

    expect(mocks.chatPaneWrapperProps).toHaveBeenCalledWith({
      fallback: expect.anything(),
      variant: 'mode',
      showModeSessionActions: true,
    });
  });

  it('persists active session id changes to main process', async () => {
    const setSessionId = vi.fn().mockResolvedValue(undefined);
    window.desktopAPI = {
      quickChat: {
        getState: vi.fn().mockResolvedValue({
          visible: false,
          focused: false,
          sessionId: null,
        }),
        setSessionId,
      },
    } as unknown as typeof window.desktopAPI;

    mocks.activeSessionId = 'session-a';
    const view = render(<QuickChatShell />);

    await waitFor(() => {
      expect(setSessionId).toHaveBeenCalledWith({ sessionId: 'session-a' });
    });

    setSessionId.mockClear();
    mocks.activeSessionId = 'session-b';
    view.rerender(<QuickChatShell />);

    await waitFor(() => {
      expect(setSessionId).toHaveBeenCalledWith({ sessionId: 'session-b' });
    });
  });
});
