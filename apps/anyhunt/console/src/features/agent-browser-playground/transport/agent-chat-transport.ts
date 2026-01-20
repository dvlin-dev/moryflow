/**
 * [PROVIDES]: ConsoleAgentChatTransport (SSE + graceful abort)
 * [DEPENDS]: fetch, eventsource-parser, ai UIMessage
 * [POS]: 将 Agent SSE 转为 UIMessageChunk 流（useChat）
 */

import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { API_BASE_URL } from '@/lib/api-client';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import {
  createAgentEventState,
  extractPromptFromMessages,
  mapAgentEventToChunks,
} from '../agent-stream';
import { parseSchemaJsonToAgentOutput } from '../agent-output';
import type { AgentStreamEvent, AgentOutput } from '../types';

type SendOptions = Parameters<ChatTransport<UIMessage>['sendMessages']>[0];

export type AgentChatOptions = {
  apiKeyId: string;
  urls?: string[];
  output?: AgentOutput;
  schemaJson?: string;
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
        urls: options.urls,
        output: options.output ?? parseSchemaJsonToAgentOutput(options.schemaJson),
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

    const state = createAgentEventState(crypto.randomUUID());
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
            let parsed: AgentStreamEvent;
            try {
              parsed = JSON.parse(event.data) as AgentStreamEvent;
            } catch {
              return;
            }

            if (parsed.type === 'started') {
              taskId = parsed.id;
            }

            const chunks = mapAgentEventToChunks(parsed, state);
            chunks.forEach((chunk) => controller.enqueue(chunk));

            if ((parsed.type === 'complete' || parsed.type === 'failed') && !closed) {
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
