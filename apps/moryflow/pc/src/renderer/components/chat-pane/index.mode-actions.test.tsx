import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPane } from './index';

const runtimeState = vi.hoisted(() => ({
  activeSessionId: 'session-1' as string | null,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./components/chat-pane-header', () => ({
  ChatPaneHeader: () => <div data-testid="panel-header" />,
  ChatPaneSessionActions: () => <div data-testid="mode-session-actions" />,
}));

vi.mock('./components/chat-footer', () => ({
  ChatFooter: () => <div data-testid="chat-footer" />,
}));

vi.mock('./components/conversation-section', () => ({
  ConversationSection: ({ footer }: { footer?: ReactNode }) => (
    <div data-testid="conversation-section">{footer}</div>
  ),
}));

vi.mock('./components/pre-thread-view', () => ({
  PreThreadView: () => <div data-testid="prethread-view" />,
}));

vi.mock('./components/full-access-upgrade-dialog', () => ({
  FullAccessUpgradeDialog: () => null,
}));

vi.mock('./context/chat-pane-runtime-context', () => ({
  useOptionalChatPaneRuntime: () => ({
    sessions: [],
    activeSession: null,
    globalMode: 'ask',
    activeSessionId: runtimeState.activeSessionId,
    sessionsReady: true,
    messages: [],
    status: 'ready',
    error: null,
    messageActions: {},
    selectSession: vi.fn(),
    openPreThread: vi.fn(),
    deleteSession: vi.fn(),
    handleToolApproval: vi.fn(),
    isFullAccessUpgradeDialogOpen: false,
    handleKeepAskMode: vi.fn(),
    handleEnableFullAccess: vi.fn(),
  }),
  useChatPaneRuntime: () => ({
    sessions: [],
    activeSession: null,
    globalMode: 'ask',
    activeSessionId: runtimeState.activeSessionId,
    sessionsReady: true,
    messages: [],
    status: 'ready',
    error: null,
    messageActions: {},
    selectSession: vi.fn(),
    openPreThread: vi.fn(),
    deleteSession: vi.fn(),
    handleToolApproval: vi.fn(),
    isFullAccessUpgradeDialogOpen: false,
    handleKeepAskMode: vi.fn(),
    handleEnableFullAccess: vi.fn(),
  }),
  ChatPaneRuntimeProvider: ({ children }: { children: ReactNode }) => children,
}));

describe('ChatPane mode session actions visibility', () => {
  beforeEach(() => {
    runtimeState.activeSessionId = 'session-1';
  });

  it('does not render mode session actions by default', () => {
    render(<ChatPane variant="mode" />);

    expect(screen.queryByTestId('mode-session-actions')).toBeNull();
  });

  it('renders mode session actions when showModeSessionActions=true', () => {
    render(<ChatPane variant="mode" showModeSessionActions />);

    expect(screen.getByTestId('mode-session-actions')).toBeTruthy();
  });

  it('renders prethread view when no active session is selected', () => {
    runtimeState.activeSessionId = null;

    render(<ChatPane variant="mode" />);

    expect(screen.getByTestId('prethread-view')).toBeTruthy();
    expect(screen.queryByTestId('conversation-section')).toBeNull();
  });
});
