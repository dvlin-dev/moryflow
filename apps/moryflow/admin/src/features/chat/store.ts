/**
 * [PROVIDES]: chat 会话 Zustand store（模型/消息/状态/错误）
 * [DEPENDS]: zustand, chat types
 * [POS]: Chat 模块状态层（不包含网络请求）
 */

import { create } from 'zustand';
import type { ModelGroup } from './types';

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatTokenUsage {
  prompt: number;
  completion: number;
}

interface ChatSessionState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | null;
  tokenUsage: ChatTokenUsage;
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  modelsLoading: boolean;
  modelsError: Error | null;
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  appendAssistantContent: (messageId: string, content: string) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: Error | null) => void;
  setTokenUsage: (tokenUsage: ChatTokenUsage) => void;
  setModelGroups: (groups: ModelGroup[]) => void;
  setSelectedModelId: (id: string | null) => void;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: Error | null) => void;
  resetConversation: () => void;
}

const INITIAL_TOKEN_USAGE: ChatTokenUsage = {
  prompt: 0,
  completion: 0,
};

export const useChatSessionStore = create<ChatSessionState>((set) => ({
  messages: [],
  status: 'ready',
  error: null,
  tokenUsage: INITIAL_TOKEN_USAGE,
  modelGroups: [],
  selectedModelId: null,
  modelsLoading: false,
  modelsError: null,
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  appendAssistantContent: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId
          ? { ...message, content: message.content + content }
          : message
      ),
    })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setTokenUsage: (tokenUsage) => set({ tokenUsage }),
  setModelGroups: (modelGroups) => set({ modelGroups }),
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
  setModelsLoading: (modelsLoading) => set({ modelsLoading }),
  setModelsError: (modelsError) => set({ modelsError }),
  resetConversation: () =>
    set({
      messages: [],
      status: 'ready',
      error: null,
      tokenUsage: INITIAL_TOKEN_USAGE,
    }),
}));

export const selectIsStreaming = (state: ChatSessionState) =>
  state.status === 'submitted' || state.status === 'streaming';

export const selectSelectedModelMaxTokens = (state: ChatSessionState): number => {
  const selectedModelId = state.selectedModelId;
  if (!selectedModelId) return 0;

  for (const group of state.modelGroups) {
    const selectedModel = group.options.find((item) => item.id === selectedModelId);
    if (selectedModel) {
      return selectedModel.maxContextTokens;
    }
  }

  return 0;
};

export const selectUsedTokens = (state: ChatSessionState) =>
  state.tokenUsage.prompt + state.tokenUsage.completion;

export const selectChatDisplayError = (state: ChatSessionState) =>
  state.modelsError ?? state.error;
