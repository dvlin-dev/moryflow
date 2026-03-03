import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import {
  captureEditorSelectionReference,
  clearEditorSelectionReference,
  getEditorSelectionReference,
} from '@/workspace/stores/editor-selection-reference-store';

import { useChatPromptInputController } from './use-chat-prompt-input-controller';

let currentLanguage: 'en' | 'zh-CN' = 'en';

const translations = {
  en: {
    selectedSkillUnavailable: 'Selected skill is unavailable. Continuing without it.',
  },
  'zh-CN': {
    selectedSkillUnavailable: '所选技能不可用，已忽略该技能继续发送。',
  },
} as const;

const mockSkillsState = {
  skills: [] as { name: string; enabled?: boolean }[],
  enabledSkills: [] as { name: string; enabled?: boolean }[],
  refresh: vi.fn(),
};

const mockWorkspaceFilesState = {
  files: [] as { id: string; name: string; path: string }[],
  refresh: vi.fn(),
};

const mockRecentFilesState = {
  recentFiles: [] as { id: string; name: string; path: string }[],
  refresh: vi.fn(),
};

vi.mock('@moryflow/ui/ai/prompt-input', () => ({
  usePromptInputController: () => ({
    textInput: {
      value: '',
      setInput: vi.fn(),
      clear: vi.fn(),
    },
  }),
  usePromptInputAttachments: () => ({
    files: [],
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    openFileDialog: vi.fn(),
    fileInputRef: { current: null },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => {
    const language = currentLanguage;
    return {
      t: (key: string) => (translations[language] as Record<string, string>)[key] ?? key,
    };
  },
}));

vi.mock('@/lib/server', () => ({
  TIER_DISPLAY_NAMES: {},
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('@/hooks/use-speech-recording', () => ({
  useSpeechRecording: () => ({
    isRecording: false,
    isProcessing: false,
    isActive: false,
    formattedDuration: '00:00',
    toggleRecording: vi.fn(),
    handleStreamReady: vi.fn(),
    handleWaveformError: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-agent-skills', () => ({
  useAgentSkills: () => mockSkillsState,
}));

vi.mock('../../hooks', () => ({
  useWorkspaceFiles: () => mockWorkspaceFilesState,
  useRecentFiles: () => mockRecentFilesState,
}));

vi.mock('../../types/attachment', () => ({
  createFileRefAttachment: vi.fn((file: { id: string }) => ({
    type: 'file-ref',
    fileId: file.id,
  })),
}));

vi.mock('../../utils', () => ({
  buildAIRequest: vi.fn((text: string) => ({ text, files: [] })),
}));

type ControllerInput = Parameters<typeof useChatPromptInputController>[0];

const createControllerProps = (): ControllerInput => ({
  status: 'ready',
  onSubmit: vi.fn().mockResolvedValue({ submitted: true }),
  onError: vi.fn(),
  activeFilePath: null,
  activeFileContent: null,
  vaultPath: null,
  modelGroups: [],
  selectedModelId: null,
  disabled: false,
  selectedSkillName: 'skill-not-available',
  onSelectSkillName: vi.fn(),
});

describe('useChatPromptInputController', () => {
  beforeEach(() => {
    currentLanguage = 'en';
    mockSkillsState.skills = [];
    mockSkillsState.enabledSkills = [];
    clearEditorSelectionReference();
    vi.clearAllMocks();
  });

  it('uses latest translation when warning about unavailable selected skill', () => {
    const initialProps = createControllerProps();
    const { result, rerender } = renderHook(
      (props: ControllerInput) => useChatPromptInputController(props),
      {
        initialProps,
      }
    );

    act(() => {
      result.current.handleSubmit({
        text: 'hello',
        files: [],
      });
    });

    expect(toast.warning).toHaveBeenLastCalledWith(
      'Selected skill is unavailable. Continuing without it.'
    );

    currentLanguage = 'zh-CN';
    rerender({ ...initialProps });

    act(() => {
      result.current.handleSubmit({
        text: 'hello again',
        files: [],
      });
    });

    expect(toast.warning).toHaveBeenLastCalledWith('所选技能不可用，已忽略该技能继续发送。');
  });

  it('injects selection contextSummary and clears selection reference after successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ submitted: true });
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'quoted text',
      capturedAt: 1,
    });

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(getEditorSelectionReference()).toBeNull();
    });

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      contextSummary: 'quoted text',
    });
  });

  it('keeps selection reference when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('submit failed'));
    const onError = vi.fn();
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      onError,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'quoted text',
      capturedAt: 1,
    });

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({
        code: 'submit',
        message: 'Failed to submit message.',
      });
    });

    expect(getEditorSelectionReference()?.text).toBe('quoted text');
  });

  it('keeps selection reference when submit returns submitted=false', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ submitted: false });
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'quoted text',
      capturedAt: 1,
    });

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(getEditorSelectionReference()?.text).toBe('quoted text');
  });

  it('rolls back selection reference when settled reports delivered=false', async () => {
    let resolveSettled: ((value: { delivered: boolean }) => void) | null = null;
    const onSubmit = vi.fn().mockResolvedValue({
      submitted: true,
      settled: new Promise<{ delivered: boolean }>((resolve) => {
        resolveSettled = resolve;
      }),
    });
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'quoted text',
      capturedAt: 1,
    });
    const originalReference = getEditorSelectionReference();

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    await waitFor(() => {
      expect(getEditorSelectionReference()).toBeNull();
    });

    await act(async () => {
      resolveSettled?.({ delivered: false });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getEditorSelectionReference()?.captureVersion).toBe(originalReference?.captureVersion);
      expect(getEditorSelectionReference()?.text).toBe('quoted text');
    });
  });

  it('does not roll back old selection after delivery failure when user captured a new selection', async () => {
    let resolveSettled: ((value: { delivered: boolean }) => void) | null = null;
    const onSubmit = vi.fn().mockResolvedValue({
      submitted: true,
      settled: new Promise<{ delivered: boolean }>((resolve) => {
        resolveSettled = resolve;
      }),
    });
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'old selection',
      capturedAt: 1,
    });

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    await waitFor(() => {
      expect(getEditorSelectionReference()).toBeNull();
    });

    act(() => {
      captureEditorSelectionReference({
        filePath: '/vault/note.md',
        text: 'new selection',
        capturedAt: 2,
      });
    });
    const recapturedReference = getEditorSelectionReference();

    await act(async () => {
      resolveSettled?.({ delivered: false });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getEditorSelectionReference()?.captureVersion).toBe(
        recapturedReference?.captureVersion
      );
      expect(getEditorSelectionReference()?.text).toBe('new selection');
    });
  });

  it('does not clear a recaptured same selection reference when submit succeeds later', async () => {
    let resolveSubmit: ((value: { submitted: true }) => void) | null = null;
    const onSubmit = vi.fn(
      () =>
        new Promise<{ submitted: true }>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    const initialProps = {
      ...createControllerProps(),
      onSubmit,
      selectedSkillName: null,
    };
    captureEditorSelectionReference({
      filePath: '/vault/note.md',
      text: 'old selection',
      capturedAt: 1,
    });
    const firstReference = getEditorSelectionReference();

    const { result } = renderHook((props: ControllerInput) => useChatPromptInputController(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSubmit({
        text: 'rewrite this',
        files: [],
      });
    });

    act(() => {
      captureEditorSelectionReference({
        filePath: '/vault/note.md',
        text: 'old selection',
        capturedAt: 2,
      });
    });
    const recapturedReference = getEditorSelectionReference();
    expect(recapturedReference?.captureVersion).not.toBe(firstReference?.captureVersion);

    await act(async () => {
      resolveSubmit?.({ submitted: true });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(getEditorSelectionReference()?.captureVersion).toBe(recapturedReference?.captureVersion);
    expect(getEditorSelectionReference()?.text).toBe('old selection');
  });
});
