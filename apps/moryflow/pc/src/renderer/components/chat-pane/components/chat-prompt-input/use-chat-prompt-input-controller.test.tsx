import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

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
  onSubmit: vi.fn(),
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
});
