import { createUIMessageStream, type UIMessage } from 'ai';
import type { TokenUsage } from '../../../shared/ipc.js';
import { isChatDebugEnabled, logChatDebug } from '../../chat-debug-log.js';
import type { ActiveStreamRegistry } from '../services/active-stream-registry.js';
import { resolveChatRequestInput, type ChatRequestPayload } from './resolveChatRequestInput.js';
import { executeChatTurn } from './executeChatTurn.js';
import { persistChatRound } from './persistChatRound.js';

type ChatRequestSender = {
  send: (channel: string, payload: unknown) => void;
};

export const createChatRequestExecutor = (activeStreams: ActiveStreamRegistry) => {
  return async (input: {
    sender: ChatRequestSender;
    payload: ChatRequestPayload | null | undefined;
  }) => {
    const { sender, payload } = input;
    const resolved = await resolveChatRequestInput(payload);

    if (resolved.thinking) {
      console.debug('[chat] thinking selection resolved', {
        chatId: resolved.chatId,
        preferredModelId: resolved.preferredModelId,
        thinking: resolved.thinking,
      });
    }
    if (isChatDebugEnabled()) {
      logChatDebug('chat.request.received', {
        chatId: resolved.chatId,
        channel: resolved.channel,
        preferredModelId: resolved.preferredModelId,
        thinking: resolved.thinking,
        thinkingProfile: resolved.thinkingProfileSummary,
        messageCount: resolved.messages.length,
        sessionMode: resolved.globalMode,
      });
    }

    const abortController = new AbortController();
    const requestUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const roundStartedAtRef: { value?: number } = {};

    const stream = createUIMessageStream<UIMessage>({
      originalMessages: resolved.messages,
      async execute({ writer }) {
        await executeChatTurn({
          chatId: resolved.chatId,
          channel: resolved.channel,
          writer,
          sessionVaultPath: resolved.sessionVaultPath,
          preferredModelId: resolved.preferredModelId,
          thinking: resolved.thinking,
          agentOptions: resolved.agentOptions,
          globalMode: resolved.globalMode,
          userInput: resolved.userInput,
          attachmentContexts: resolved.attachmentContexts,
          images: resolved.images,
          requestUsage,
          roundStartedAtRef,
          abortController,
        });
      },
      onFinish: async ({ messages: nextMessages }) => {
        try {
          await persistChatRound({
            chatId: resolved.chatId,
            messages: nextMessages,
            preferredModelId: resolved.preferredModelId,
            thinking: resolved.thinking,
            thinkingProfile: resolved.agentOptions?.thinkingProfile,
            requestUsage,
            roundStartedAt: roundStartedAtRef.value,
          });
        } catch (error) {
          console.error('[chat] failed to persist chat session', error);
        }
      },
      onError: (error) => String(error),
    });

    activeStreams.set(resolved.channel, {
      sessionId: resolved.chatId,
      stream,
      cancel: async () => {
        abortController.abort();
        try {
          await stream.cancel('aborted');
        } catch {
          // ignore
        }
      },
    });
    const reader = stream.getReader();

    void (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sender.send(resolved.channel, value);
        }
      } catch (error) {
        console.error('[chat] reader error:', error);
        sender.send(resolved.channel, { type: 'error', errorText: String(error) });
      } finally {
        sender.send(resolved.channel, null);
        activeStreams.delete(resolved.channel);
      }
    })();

    return { ok: true };
  };
};
