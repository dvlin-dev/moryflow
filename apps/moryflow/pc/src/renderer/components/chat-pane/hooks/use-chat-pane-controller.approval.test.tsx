import { act, renderHook } from '@testing-library/react';
import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastError, addToolApprovalResponse, approveTool } = vi.hoisted(() => ({
  toastError: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  approveTool: vi.fn(),
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [] as UIMessage[],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: 'ready',
    stop: vi.fn(),
    error: undefined,
    setMessages: vi.fn(),
    addToolApprovalResponse,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', () => ({
  extractMembershipModelId: (id: string) => id,
  isMembershipModelId: () => false,
  useAuth: () => ({
    models: [],
    membershipEnabled: false,
    isAuthenticated: false,
  }),
}));

vi.mock('../models', () => ({
  buildMembershipModelGroup: () => null,
}));

vi.mock('../handle', () => ({
  computeAgentOptions: () => undefined,
}));

vi.mock('./use-chat-model-selection', () => ({
  useChatModelSelection: () => ({
    agentOptionsRef: { current: undefined },
    selectedModelId: 'model-1',
    setSelectedModelId: vi.fn(),
    selectedThinkingLevel: 'medium',
    selectedThinkingProfile: undefined,
    setSelectedThinkingLevel: vi.fn(),
    modelGroups: [{ label: 'default', options: [{ value: 'model-1', label: 'Model 1' }] }],
  }),
}));

vi.mock('./use-chat-sessions', () => ({
  useChatSessions: () => ({
    sessions: [
      {
        id: 'session-1',
        title: 'Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        vaultPath: '/vault',
      },
    ],
    activeSession: {
      id: 'session-1',
      title: 'Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      vaultPath: '/vault',
    },
    activeSessionId: 'session-1',
    globalMode: 'ask',
    selectSession: vi.fn(),
    createSession: vi.fn(),
    setGlobalMode: vi.fn(),
    deleteSession: vi.fn(),
    isReady: true,
  }),
}));

vi.mock('./use-message-actions', () => ({
  useMessageActions: () => ({}),
}));

vi.mock('./use-selected-skill', () => ({
  useSelectedSkillStore: (
    selector: (state: {
      selectedSkillName: string | null;
      setSelectedSkillName: () => void;
    }) => unknown
  ) =>
    selector({
      selectedSkillName: null,
      setSelectedSkillName: vi.fn(),
    }),
}));

vi.mock('./use-stored-messages', () => ({
  useStoredMessages: vi.fn(),
}));

import { useChatPaneController } from './use-chat-pane-controller';

describe('useChatPaneController approval handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approveTool.mockReset();
    window.desktopAPI = {
      chat: {
        approveTool,
      },
    } as never;
  });

  it('already_processed 响应不报错并写入结果态', async () => {
    approveTool.mockResolvedValue({
      status: 'already_processed',
      reason: 'missing',
    });
    const { result } = renderHook(() => useChatPaneController({}));

    await act(async () => {
      await result.current.handleToolApproval({ approvalId: 'approval-1', action: 'once' });
    });

    expect(approveTool).toHaveBeenCalledWith({
      approvalId: 'approval-1',
      action: 'once',
    });
    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: 'approval-1',
      approved: true,
      reason: 'already_processed',
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('approved 响应按 remember 写入结果态', async () => {
    approveTool.mockResolvedValue({
      status: 'approved',
      remember: 'always',
    });
    const { result } = renderHook(() => useChatPaneController({}));

    await act(async () => {
      await result.current.handleToolApproval({ approvalId: 'approval-2', action: 'allow_type' });
    });

    expect(approveTool).toHaveBeenCalledWith({
      approvalId: 'approval-2',
      action: 'allow_type',
    });
    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: 'approval-2',
      approved: true,
      reason: 'always',
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('denied 响应写入拒绝结果态', async () => {
    approveTool.mockResolvedValue({
      status: 'denied',
    });
    const { result } = renderHook(() => useChatPaneController({}));

    await act(async () => {
      await result.current.handleToolApproval({ approvalId: 'approval-3', action: 'deny' });
    });

    expect(approveTool).toHaveBeenCalledWith({
      approvalId: 'approval-3',
      action: 'deny',
    });
    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: 'approval-3',
      approved: false,
    });
    expect(toastError).not.toHaveBeenCalled();
  });
});
