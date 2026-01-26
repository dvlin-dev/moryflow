/**
 * [PROVIDES]: AgentChatTransport (SSE + graceful abort)
 * [DEPENDS]: fetch, eventsource-parser, ai UIMessage
 * [POS]: 将 Agent SSE 转为 UIMessageChunk 流（ApiKey 认证）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { API_BASE_URL } from '@/lib/api-base';
import { AGENT_API } from '@/lib/api-paths';
import { buildAgentChatMessages } from '../agent-streaming';
import type { AgentOutput } from '../types';

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0];

type AgentStreamEvent =
  | { type: 'started'; id: string; expiresAt?: string }
  | { type: 'textDelta'; delta: string }
  | { type: 'reasoningDelta'; delta: string }
  | { type: 'toolCall'; toolCallId: string; toolName: string; input?: unknown }
  | {
      type: 'toolResult';
      toolCallId: string;
      toolName: string;
      output?: unknown;
      errorText?: string;
    }
  | { type: 'progress'; message?: string }
  | { type: 'complete'; data?: unknown; creditsUsed?: number }
  | { type: 'failed'; error: string };

export type AgentChatOptions = {
  apiKey: string;
  output?: AgentOutput;
  maxCredits?: number;
  modelId?: string;
};

type AgentChatOptionsRef = { current: AgentChatOptions };

const buildErrorMessage = async (response: Response): Promise<string> => {
  const fallback = response.statusText || 'Request failed';
  try {
    const text = await response.text();
    if (!text) return fallback;
    const json = JSON.parse(text) as { message?: string; error?: { message?: string } };
    return json.error?.message || json.message || fallback;
  } catch {
    return fallback;
  }
};

export class AgentChatTransport implements ChatTransport<UIMessage> {
  private readonly optionsRef: AgentChatOptionsRef;

  constructor(optionsRef: AgentChatOptionsRef) {
    this.optionsRef = optionsRef;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    const options = this.optionsRef.current;
    const apiKey = options.apiKey;
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const chatMessages = buildAgentChatMessages(messages);
    if (chatMessages.length === 0) {
      throw new Error('Prompt is empty');
    }

    const response = await fetch(`${API_BASE_URL}${AGENT_API.BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: chatMessages,
        model: options.modelId,
        output: options.output ?? { type: 'text' },
        maxCredits: options.maxCredits,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const message = await buildErrorMessage(response);
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error('Empty response body');
    }

    let taskId: string | null = null;
    let closed = false;
    let textPartId: string | null = null;
    let reasoningPartId: string | null = null;

    const ensureTextPart = (controller: ReadableStreamDefaultController<UIMessageChunk>) => {
      if (!textPartId) {
        textPartId = taskId ? `${taskId}-text` : 'text-1';
        controller.enqueue({ type: 'text-start', id: textPartId });
      }
      return textPartId;
    };

    const ensureReasoningPart = (controller: ReadableStreamDefaultController<UIMessageChunk>) => {
      if (!reasoningPartId) {
        reasoningPartId = taskId ? `${taskId}-reasoning` : 'reasoning-1';
        controller.enqueue({ type: 'reasoning-start', id: reasoningPartId });
      }
      return reasoningPartId;
    };

    const finishStream = (
      controller: ReadableStreamDefaultController<UIMessageChunk>,
      finishReason?: 'stop' | 'error'
    ) => {
      if (textPartId) {
        controller.enqueue({ type: 'text-end', id: textPartId });
      }
      if (reasoningPartId) {
        controller.enqueue({ type: 'reasoning-end', id: reasoningPartId });
      }
      controller.enqueue({ type: 'finish', finishReason });
      closed = true;
    };

    const cancelRemote = async () => {
      if (!taskId) return;
      try {
        await fetch(`${API_BASE_URL}${AGENT_API.BASE}/${taskId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch {
        // ignore cancellation errors
      }
    };

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        const parser = createParser({
          onEvent: (event: EventSourceMessage) => {
            if (!event.data) return;
            let parsed: AgentStreamEvent;
            try {
              parsed = JSON.parse(event.data) as AgentStreamEvent;
            } catch {
              controller.enqueue({ type: 'error', errorText: 'Invalid stream payload' });
              if (!closed) {
                finishStream(controller, 'error');
                controller.close();
                void reader.cancel();
              }
              return;
            }

            switch (parsed.type) {
              case 'started': {
                taskId = parsed.id;
                controller.enqueue({ type: 'start', messageId: parsed.id });
                break;
              }
              case 'textDelta': {
                const partId = ensureTextPart(controller);
                controller.enqueue({ type: 'text-delta', id: partId, delta: parsed.delta });
                break;
              }
              case 'reasoningDelta': {
                const partId = ensureReasoningPart(controller);
                controller.enqueue({ type: 'reasoning-delta', id: partId, delta: parsed.delta });
                break;
              }
              case 'toolCall': {
                controller.enqueue({
                  type: 'tool-input-available',
                  toolCallId: parsed.toolCallId,
                  toolName: parsed.toolName,
                  input: parsed.input ?? null,
                });
                break;
              }
              case 'toolResult': {
                if (parsed.errorText) {
                  controller.enqueue({
                    type: 'tool-output-error',
                    toolCallId: parsed.toolCallId,
                    errorText: parsed.errorText,
                  });
                } else {
                  controller.enqueue({
                    type: 'tool-output-available',
                    toolCallId: parsed.toolCallId,
                    output: parsed.output ?? null,
                  });
                }
                break;
              }
              case 'complete': {
                finishStream(controller, 'stop');
                controller.close();
                void reader.cancel();
                break;
              }
              case 'failed': {
                controller.enqueue({ type: 'error', errorText: parsed.error });
                finishStream(controller, 'error');
                controller.close();
                void reader.cancel();
                break;
              }
              case 'progress': {
                break;
              }
              default: {
                break;
              }
            }
          },
        });

        const read = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              parser.feed(decoder.decode(value, { stream: true }));
            }
            if (!closed) {
              controller.close();
            }
          } catch (error) {
            if (!closed) {
              controller.error(error);
            }
          }
        };

        read().catch(() => {});

        const handleAbort = () => {
          void cancelRemote();
          void reader.cancel();
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        abortSignal?.addEventListener('abort', handleAbort, { once: true });
      },
      cancel: () => {
        void cancelRemote();
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
