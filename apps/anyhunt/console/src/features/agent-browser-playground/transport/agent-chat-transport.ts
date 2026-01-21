/**
 * [PROVIDES]: ConsoleAgentChatTransport (SSE + graceful abort)
 * [DEPENDS]: fetch, eventsource-parser, ai UIMessage
 * [POS]: 将 Agent SSE 转为 UIMessageChunk 流（含 start 边界）
 */

import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { API_BASE_URL } from '@/lib/api-client';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { extractPromptFromMessages } from '../agent-streaming';
import type { AgentOutput } from '../types';

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0];

export type AgentChatOptions = {
  apiKeyId: string;
  output?: AgentOutput;
  maxCredits?: number;
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

export class ConsoleAgentChatTransport implements ChatTransport<UIMessage> {
  private readonly optionsRef: AgentChatOptionsRef;

  constructor(optionsRef: AgentChatOptionsRef) {
    this.optionsRef = optionsRef;
  }

  async sendMessages({
    messages,
    abortSignal,
  }: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    const options = this.optionsRef.current;
    const requestApiKeyId = options.apiKeyId;
    if (!requestApiKeyId) {
      throw new Error('API key is required');
    }

    const prompt = extractPromptFromMessages(messages);
    if (!prompt) {
      throw new Error('Prompt is empty');
    }

    const response = await fetch(`${API_BASE_URL}${CONSOLE_PLAYGROUND_API.AGENT_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify({
        apiKeyId: requestApiKeyId,
        prompt,
        output: options.output ?? { type: 'text' },
        maxCredits: options.maxCredits,
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

    const cancelRemote = async () => {
      if (!taskId) return;
      try {
        await fetch(
          `${API_BASE_URL}${CONSOLE_PLAYGROUND_API.AGENT}/${taskId}?apiKeyId=${requestApiKeyId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
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
            let parsed: UIMessageChunk;
            try {
              parsed = JSON.parse(event.data) as UIMessageChunk;
            } catch {
              controller.enqueue({ type: 'error', errorText: 'Invalid stream payload' });
              if (!closed) {
                closed = true;
                controller.close();
                void reader.cancel();
              }
              return;
            }

            if (parsed.type === 'start' && parsed.messageId) {
              taskId = parsed.messageId;
            }

            controller.enqueue(parsed);

            if (parsed.type === 'finish' && !closed) {
              closed = true;
              controller.close();
              void reader.cancel();
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
