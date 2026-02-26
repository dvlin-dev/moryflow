/**
 * [PROVIDES]: chatMethods（模型同步/提交流式消息/停止）
 * [DEPENDS]: react-query, chat api/store, auth store
 * [POS]: Chat 模块业务编排层
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChatCompletionStream, fetchModels } from './api';
import { parseChatStreamChunk } from './stream-parser';
import type { ModelGroup } from './types';
import { useAuthStore } from '@/stores/auth';
import { useChatSessionStore, type ChatMessage } from './store';

const MODEL_STORAGE_KEY = 'admin.chat.preferredModel';

let abortController: AbortController | null = null;

function readStoredModelId(): string {
  if (typeof window === 'undefined') return '';

  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStoredModelId(value: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (value) {
      localStorage.setItem(MODEL_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(MODEL_STORAGE_KEY);
    }
  } catch {
    // ignore storage write failure
  }
}

export function resolveNextSelectedModelId(
  modelGroups: ModelGroup[],
  candidateId: string | null
): string | null {
  if (candidateId) {
    const hasCandidate = modelGroups.some((group) =>
      group.options.some((option) => option.id === candidateId)
    );
    if (hasCandidate) {
      return candidateId;
    }
  }

  return modelGroups[0]?.options[0]?.id ?? null;
}

function normalizeQueryError(error: unknown): Error | null {
  if (!error) return null;
  return error instanceof Error ? error : new Error(String(error));
}

function createRequestMessages(text: string): {
  requestMessages: ChatMessage[];
  userMessage: ChatMessage;
} {
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
  };

  const requestMessages = [...useChatSessionStore.getState().messages, userMessage];
  return { requestMessages, userMessage };
}

export function selectChatModel(modelId: string): void {
  useChatSessionStore.getState().setSelectedModelId(modelId);
  writeStoredModelId(modelId);
}

export function stopChatStream(): void {
  abortController?.abort();
  abortController = null;
  useChatSessionStore.getState().setStatus('ready');
}

export function resetChatConversation(): void {
  stopChatStream();
  useChatSessionStore.getState().resetConversation();
}

export async function submitChatMessage(text: string): Promise<void> {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  const state = useChatSessionStore.getState();
  const isStreaming = state.status === 'submitted' || state.status === 'streaming';
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (isStreaming || !isAuthenticated || !state.selectedModelId) return;

  const { requestMessages } = createRequestMessages(trimmedText);
  state.setMessages(requestMessages);
  state.setStatus('submitted');
  state.setError(null);

  abortController = new AbortController();

  try {
    const response = await createChatCompletionStream(
      {
        model: state.selectedModelId,
        messages: requestMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: true,
      },
      abortController.signal
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData && typeof errorData === 'object'
          ? (errorData as { error?: { message?: string } }).error?.message
          : null;

      throw new Error(errorMessage || 'Request failed');
    }

    useChatSessionStore.getState().setStatus('streaming');

    const assistantMessageId = crypto.randomUUID();
    useChatSessionStore.getState().appendMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const parsedChunk = parseChatStreamChunk(chunk);

          for (const content of parsedChunk.contentSegments) {
            useChatSessionStore.getState().appendAssistantContent(assistantMessageId, content);
          }

          if (parsedChunk.usage) {
            useChatSessionStore.getState().setTokenUsage(parsedChunk.usage);
          }

          if (parsedChunk.done) {
            done = true;
          }
        }
      }
    }

    useChatSessionStore.getState().setStatus('ready');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      useChatSessionStore.getState().setStatus('ready');
    } else {
      useChatSessionStore.getState().setError(
        error instanceof Error ? error : new Error('Unknown error')
      );
      useChatSessionStore.getState().setStatus('error');
    }
  } finally {
    abortController = null;
  }
}

export function useSyncChatModels(): void {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['chat-models'],
    queryFn: fetchModels,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const state = useChatSessionStore.getState();
    const normalizedError = normalizeQueryError(error);
    const preferredModelId = (state.selectedModelId ?? readStoredModelId()) || null;
    const nextModelId = resolveNextSelectedModelId(data, preferredModelId);

    state.setModelGroups(data);
    state.setModelsLoading(isLoading);
    state.setModelsError(normalizedError);

    if (nextModelId !== state.selectedModelId) {
      state.setSelectedModelId(nextModelId);
    }

    writeStoredModelId(nextModelId ?? '');
  }, [data, isLoading, error]);
}

export const chatMethods = {
  submitChatMessage,
  stopChatStream,
  selectChatModel,
  resetChatConversation,
};
