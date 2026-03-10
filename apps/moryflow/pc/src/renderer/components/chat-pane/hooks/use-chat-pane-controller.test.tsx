import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatSubmitPayload, ChatSubmitResult } from '../components/chat-prompt-input/const';
import { useChatPaneController } from './use-chat-pane-controller';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
  stop: vi.fn(),
  setMessages: vi.fn(),
  addToolApprovalResponse: vi.fn(),
  setGlobalMode: vi.fn(),
  listSessions: vi.fn(),
  createSession: vi.fn(),
  selectSession: vi.fn(),
  chatStatus: 'ready' as 'ready' | 'submitted' | 'streaming' | 'error',
  messages: [] as Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>,
  sessionState: {
    sessions: [{ id: 'session-1', title: 'Session' }],
    activeSession: { id: 'session-1', title: 'Session' } as { id: string; title: string } | null,
    activeSessionId: 'session-1' as string | null,
  },
  selectedSkillState: {
    selectedSkillName: null as string | null,
    setSelectedSkillName: vi.fn(),
  },
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: mocks.messages,
    sendMessage: mocks.sendMessage,
    regenerate: mocks.regenerate,
    status: mocks.chatStatus,
    stop: mocks.stop,
    error: null,
    setMessages: mocks.setMessages,
    addToolApprovalResponse: mocks.addToolApprovalResponse,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', () => ({
  useAuth: () => ({
    models: [],
    membershipEnabled: false,
    isAuthenticated: false,
  }),
  extractMembershipModelId: () => null,
  isMembershipModelId: () => false,
}));

vi.mock('@/transport/ipc-chat-transport', () => ({
  IpcChatTransport: class {},
}));

vi.mock('../models', () => ({
  buildMembershipModelGroup: () => null,
}));

vi.mock('../handle', () => ({
  computeAgentOptions: () => ({}),
}));

vi.mock('./use-chat-model-selection', () => ({
  useChatModelSelection: () => ({
    agentOptionsRef: { current: {} },
    selectedModelId: 'model-1',
    setSelectedModelId: vi.fn(),
    selectedThinkingLevel: null,
    selectedThinkingProfile: null,
    setSelectedThinkingLevel: vi.fn(),
    modelGroups: [{ id: 'default', label: 'Default', options: [{ id: 'model-1', name: 'M1' }] }],
  }),
}));

vi.mock('./use-chat-sessions', () => ({
  useChatSessions: () => ({
    sessions: mocks.sessionState.sessions,
    activeSession: mocks.sessionState.activeSession,
    activeSessionId: mocks.sessionState.activeSessionId,
    globalMode: 'ask',
    selectSession: mocks.selectSession,
    openPreThread: vi.fn(),
    createSession: mocks.createSession,
    setGlobalMode: mocks.setGlobalMode,
    deleteSession: vi.fn(),
    isReady: true,
  }),
}));

vi.mock('./use-message-actions', () => ({
  useMessageActions: () => ({}),
}));

vi.mock('./use-stored-messages', () => ({
  useStoredMessages: () => undefined,
}));

vi.mock('./use-selected-skill', () => ({
  useSelectedSkillStore: (selector: (state: typeof mocks.selectedSkillState) => unknown) =>
    selector(mocks.selectedSkillState),
}));

const createPayload = (): ChatSubmitPayload =>
  ({
    text: ' hello ',
    files: [],
    attachments: [
      {
        id: 'file-1',
        type: 'file-ref',
        path: 'docs/a.md',
        name: 'a.md',
        extension: 'md',
      },
    ],
    selectedSkillName: 'skill.search',
    selectedSkill: {
      name: 'skill.search',
      title: 'Search',
    },
    contextSummary: 'quoted text body',
    selectionReference: {
      preview: 'quoted text body',
      filePath: '/vault/docs/a.md',
      charCount: 16,
      isTruncated: false,
    },
  }) as unknown as ChatSubmitPayload;

describe('useChatPaneController handlePromptSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messages = [];
    mocks.chatStatus = 'ready';
    mocks.sessionState.sessions = [{ id: 'session-1', title: 'Session' }];
    mocks.sessionState.activeSession = { id: 'session-1', title: 'Session' };
    mocks.sessionState.activeSessionId = 'session-1';

    window.desktopAPI = {
      chat: {
        generateSessionTitle: vi.fn(),
      },
    } as unknown as typeof window.desktopAPI;
  });

  it('returns submitted=true without waiting for stream completion', async () => {
    mocks.sendMessage.mockImplementation(
      () =>
        new Promise<void>(() => {
          // keep pending to assert handlePromptSubmit resolves immediately
        })
    );

    const { result } = renderHook(() => useChatPaneController({}));

    let submitPromise: Promise<ChatSubmitResult> = Promise.resolve({ submitted: false });
    act(() => {
      submitPromise = result.current.handlePromptSubmit(createPayload());
    });

    const raced = await Promise.race([
      submitPromise.then((value) => ({ kind: 'resolved' as const, value })),
      new Promise<{ kind: 'timeout' }>((resolve) => {
        setTimeout(() => resolve({ kind: 'timeout' }), 0);
      }),
    ]);

    expect(raced.kind).toBe('resolved');
    if (raced.kind === 'resolved') {
      expect(raced.value.submitted).toBe(true);
      expect(raced.value.settled).toBeInstanceOf(Promise);
    }
  });

  it('reports delivered=false when async sendMessage rejects', async () => {
    mocks.sendMessage.mockRejectedValue(new Error('network failed'));

    const { result } = renderHook(() => useChatPaneController({}));

    const submitPromise: Promise<ChatSubmitResult> =
      result.current.handlePromptSubmit(createPayload());
    await act(async () => {
      await submitPromise;
    });
    const submitResult = await submitPromise;

    expect(submitResult.submitted).toBe(true);
    expect(submitResult.settled).toBeDefined();
    const settled = await submitResult.settled;
    expect(settled).toEqual({ delivered: false });
  });

  it('includes selection reference metadata in user message payload', async () => {
    mocks.sendMessage.mockResolvedValue(undefined);

    const { result } = renderHook(() => useChatPaneController({}));

    const submitPromise: Promise<ChatSubmitResult> =
      result.current.handlePromptSubmit(createPayload());
    await act(async () => {
      await submitPromise;
    });
    const submitResult = await submitPromise;
    await submitResult.settled;

    const sendPayload = mocks.sendMessage.mock.calls[0]?.[0];
    expect(sendPayload.metadata.chat).toMatchObject({
      attachments: [
        {
          id: 'file-1',
          type: 'file-ref',
          path: 'docs/a.md',
          name: 'a.md',
          extension: 'md',
        },
      ],
      selectedSkill: {
        name: 'skill.search',
        title: 'Search',
      },
      selectionReference: {
        preview: 'quoted text body',
        filePath: '/vault/docs/a.md',
        charCount: 16,
        isTruncated: false,
      },
    });
  });

  it('creates a session before delivering the first prethread message', async () => {
    mocks.sessionState.sessions = [];
    mocks.sessionState.activeSession = null;
    mocks.sessionState.activeSessionId = null;
    mocks.createSession.mockImplementation(async () => {
      mocks.sessionState.sessions = [{ id: 'session-created', title: 'Session Created' }];
      mocks.sessionState.activeSession = { id: 'session-created', title: 'Session Created' };
      mocks.sessionState.activeSessionId = 'session-created';
      return { id: 'session-created', title: 'Session Created' };
    });
    mocks.sendMessage.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useChatPaneController({}));

    const submitPromise = result.current.handlePromptSubmit(createPayload());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    rerender();

    const submitResult = await submitPromise;
    await submitResult.settled;

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('reserves the prethread submit slot before awaiting session creation', async () => {
    mocks.sessionState.sessions = [];
    mocks.sessionState.activeSession = null;
    mocks.sessionState.activeSessionId = null;
    let resolveCreateSession!: (value: { id: string; title: string }) => void;
    mocks.createSession.mockImplementation(
      () =>
        new Promise<{ id: string; title: string }>((resolve) => {
          resolveCreateSession = resolve;
        })
    );
    mocks.sendMessage.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useChatPaneController({}));

    let firstSubmit!: ChatSubmitResult;
    await act(async () => {
      const firstPromise = result.current.handlePromptSubmit(createPayload());
      const secondPromise = result.current.handlePromptSubmit(createPayload());
      firstSubmit = await firstPromise;
      expect(await secondPromise).toEqual({ submitted: false });
    });

    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    expect(firstSubmit.submitted).toBe(true);
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    await act(async () => {
      mocks.sessionState.sessions = [{ id: 'session-created', title: 'Session Created' }];
      mocks.sessionState.activeSession = { id: 'session-created', title: 'Session Created' };
      mocks.sessionState.activeSessionId = 'session-created';
      resolveCreateSession({ id: 'session-created', title: 'Session Created' });
      await Promise.resolve();
    });

    rerender();
    await firstSubmit.settled;

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('forces a new thread when the home entry surface submits with remembered history', async () => {
    mocks.sessionState.sessions = [{ id: 'session-1', title: 'Session' }];
    mocks.sessionState.activeSession = { id: 'session-1', title: 'Session' };
    mocks.sessionState.activeSessionId = 'session-1';
    mocks.createSession.mockImplementation(async () => {
      mocks.sessionState.sessions = [{ id: 'session-created', title: 'Session Created' }];
      mocks.sessionState.activeSession = { id: 'session-created', title: 'Session Created' };
      mocks.sessionState.activeSessionId = 'session-created';
      return { id: 'session-created', title: 'Session Created' };
    });
    mocks.sendMessage.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useChatPaneController({}));

    const submitPromise = result.current.handleNewThreadPromptSubmit(createPayload());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    expect(mocks.sendMessage).not.toHaveBeenCalled();

    rerender();

    const submitResult = await submitPromise;
    await submitResult.settled;

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('notifies workspace when prethread starts a real conversation', async () => {
    mocks.sessionState.sessions = [];
    mocks.sessionState.activeSession = null;
    mocks.sessionState.activeSessionId = null;
    mocks.createSession.mockImplementation(async () => {
      mocks.sessionState.sessions = [{ id: 'session-created', title: 'Session Created' }];
      mocks.sessionState.activeSession = { id: 'session-created', title: 'Session Created' };
      mocks.sessionState.activeSessionId = 'session-created';
      return { id: 'session-created', title: 'Session Created' };
    });
    mocks.sendMessage.mockResolvedValue(undefined);
    const onPreThreadConversationStart = vi.fn();

    const { result, rerender } = renderHook(() =>
      useChatPaneController({ onPreThreadConversationStart })
    );

    const submitPromise = result.current.handlePromptSubmit(createPayload());
    await act(async () => {
      await Promise.resolve();
    });

    expect(onPreThreadConversationStart).toHaveBeenCalledTimes(1);

    rerender();

    const submitResult = await submitPromise;
    await submitResult.settled;
  });
});
