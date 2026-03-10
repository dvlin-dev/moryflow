import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ChatStatus } from 'ai';
import { getModelContextWindow } from '@moryflow/model-bank/registry';
import type { SettingsSection } from '@/components/settings-dialog/const';
import { useChatPaneController } from '../hooks/use-chat-pane-controller';
import type { ChatSubmitPayload, ChatSubmitResult } from '../components/chat-prompt-input/const';
import type { ChatGlobalPermissionMode, TokenUsage } from '@shared/ipc';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';
import type { ModelGroup } from '../models';

export type ChatComposerController = {
  status: ChatStatus;
  inputError: string | null;
  activeFilePath: string | null;
  activeFileContent: string | null;
  vaultPath: string | null;
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  selectedThinkingLevel: string | null;
  selectedThinkingProfile?: ModelThinkingProfile;
  disabled: boolean;
  tokenUsage: TokenUsage | null;
  contextWindow: number | undefined;
  mode: ChatGlobalPermissionMode;
  selectedSkillName: string | null;
  onSubmit: (payload: ChatSubmitPayload) => Promise<ChatSubmitResult>;
  onSubmitNewThread: (payload: ChatSubmitPayload) => Promise<ChatSubmitResult>;
  onStop: () => void;
  onInputError: (message: string) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onSelectModel: (id: string) => void;
  onSelectThinkingLevel: (level: string) => void;
  onModeChange: (mode: ChatGlobalPermissionMode) => void;
  onSelectSkillName?: (name: string | null) => void;
};

type ChatPaneRuntimeProviderProps = {
  children: ReactNode;
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  vaultPath?: string | null;
  onOpenSettings?: (section?: SettingsSection) => void;
  onPreThreadConversationStart?: () => void;
};

type ChatPaneRuntimeContextValue = ReturnType<typeof useChatPaneController> & {
  composer: ChatComposerController;
};

const ChatPaneRuntimeContext = createContext<ChatPaneRuntimeContextValue | null>(null);

export const ChatPaneRuntimeProvider = ({
  children,
  activeFilePath,
  activeFileContent,
  vaultPath,
  onOpenSettings,
  onPreThreadConversationStart,
}: ChatPaneRuntimeProviderProps) => {
  const runtime = useChatPaneController({
    activeFilePath: activeFilePath ?? undefined,
    onOpenSettings,
    onPreThreadConversationStart,
  });

  const composer = useMemo<ChatComposerController>(
    () => ({
      status: runtime.status,
      inputError: runtime.inputError,
      activeFilePath: activeFilePath ?? null,
      activeFileContent: activeFileContent ?? null,
      vaultPath: vaultPath ?? null,
      modelGroups: runtime.modelGroups,
      selectedModelId: runtime.selectedModelId ?? null,
      selectedThinkingLevel: runtime.selectedThinkingLevel ?? null,
      selectedThinkingProfile: runtime.selectedThinkingProfile ?? undefined,
      disabled: !runtime.sessionsReady,
      tokenUsage: runtime.activeSession?.tokenUsage ?? null,
      contextWindow: getModelContextWindow(runtime.selectedModelId),
      mode: runtime.globalMode,
      selectedSkillName: runtime.selectedSkillName ?? null,
      onSubmit: runtime.handlePromptSubmit,
      onSubmitNewThread: runtime.handleNewThreadPromptSubmit,
      onStop: runtime.handleStop,
      onInputError: runtime.setInputError,
      onOpenSettings,
      onSelectModel: runtime.setSelectedModelId,
      onSelectThinkingLevel: runtime.setSelectedThinkingLevel,
      onModeChange: runtime.handleModeChange,
      onSelectSkillName: runtime.setSelectedSkillName,
    }),
    [
      activeFileContent,
      activeFilePath,
      onOpenSettings,
      runtime.activeSession?.tokenUsage,
      runtime.globalMode,
      runtime.handleModeChange,
      runtime.handlePromptSubmit,
      runtime.handleNewThreadPromptSubmit,
      runtime.handleStop,
      runtime.inputError,
      runtime.modelGroups,
      runtime.selectedModelId,
      runtime.selectedSkillName,
      runtime.selectedThinkingLevel,
      runtime.selectedThinkingProfile,
      runtime.sessionsReady,
      runtime.setInputError,
      runtime.setSelectedModelId,
      runtime.setSelectedSkillName,
      runtime.setSelectedThinkingLevel,
      runtime.status,
      vaultPath,
    ]
  );

  // `runtime` is a new object reference every render, so memoizing `value`
  // against `[composer, runtime]` would never skip — drop the outer useMemo.
  const value: ChatPaneRuntimeContextValue = { ...runtime, composer };

  return (
    <ChatPaneRuntimeContext.Provider value={value}>{children}</ChatPaneRuntimeContext.Provider>
  );
};

export const useOptionalChatPaneRuntime = () => useContext(ChatPaneRuntimeContext);

export const useChatPaneRuntime = () => {
  const value = useContext(ChatPaneRuntimeContext);
  if (!value) {
    throw new Error('useChatPaneRuntime must be used within <ChatPaneRuntimeProvider>');
  }
  return value;
};
