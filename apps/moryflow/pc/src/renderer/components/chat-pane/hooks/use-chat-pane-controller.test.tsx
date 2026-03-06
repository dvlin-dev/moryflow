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
  chatStatus: 'ready' as 'ready' | 'submitted' | 'streaming' | 'error',
  messages: [] as Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>,
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
    sessions: [{ id: 'session-1', title: 'Session' }],
    activeSession: { id: 'session-1', title: 'Session' },
    activeSessionId: 'session-1',
    globalMode: 'ask',
    selectSession: vi.fn(),
    createSession: vi.fn(),
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
});
