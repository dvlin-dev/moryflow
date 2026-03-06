import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatPane } from './index';

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

vi.mock('./components/full-access-upgrade-dialog', () => ({
  FullAccessUpgradeDialog: () => null,
}));

vi.mock('./hooks/use-chat-pane-footer-store', () => ({
  useSyncChatPaneFooterStore: () => undefined,
}));

vi.mock('./hooks/use-chat-pane-controller', () => ({
  useChatPaneController: () => ({
    sessions: [],
    activeSession: null,
    globalMode: 'ask',
    activeSessionId: 'session-1',
    sessionsReady: true,
    selectedSkillName: null,
    setSelectedSkillName: vi.fn(),
    modelGroups: [],
    selectedModelId: null,
    setSelectedModelId: vi.fn(),
    selectedThinkingLevel: null,
    selectedThinkingProfile: null,
    setSelectedThinkingLevel: vi.fn(),
    messages: [],
    status: 'ready',
    error: null,
    inputError: null,
    setInputError: vi.fn(),
    messageActions: {},
    selectSession: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    handlePromptSubmit: vi.fn(),
    handleStop: vi.fn(),
    handleToolApproval: vi.fn(),
    handleModeChange: vi.fn(),
    isFullAccessUpgradeDialogOpen: false,
    handleKeepAskMode: vi.fn(),
    handleEnableFullAccess: vi.fn(),
  }),
}));

describe('ChatPane mode session actions visibility', () => {
  it('does not render mode session actions by default', () => {
    render(<ChatPane variant="mode" />);

    expect(screen.queryByTestId('mode-session-actions')).toBeNull();
  });

  it('renders mode session actions when showModeSessionActions=true', () => {
    render(<ChatPane variant="mode" showModeSessionActions />);

    expect(screen.getByTestId('mode-session-actions')).toBeTruthy();
  });
});
