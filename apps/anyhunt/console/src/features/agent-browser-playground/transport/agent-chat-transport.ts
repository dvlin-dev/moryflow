/**
 * [PROVIDES]: AgentChatTransport（官方 UIMessage stream 协议）
 * [DEPENDS]: ai DefaultChatTransport
 * [POS]: Agent Playground 标准 transport（ApiKey + 请求体组装）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { DefaultChatTransport, type UIMessage } from 'ai';
import { API_BASE_URL } from '@/lib/api-base';
import { AGENT_API } from '@/lib/api-paths';
import { buildAgentChatMessages } from '../agent-streaming';
import type { AgentOutput, AgentThinkingSelection } from '../types';

export type AgentChatOptions = {
  apiKey: string;
  output?: AgentOutput;
  maxCredits?: number;
  modelId?: string;
  thinking?: AgentThinkingSelection;
};

type AgentChatOptionsRef = { current: AgentChatOptions };

type AgentChatTransportOptions = {
  onThinkingAutoDowngrade?: (modelId: string) => void;
};

const THINKING_BOUNDARY_ERROR_CODES = new Set(['THINKING_LEVEL_INVALID', 'THINKING_NOT_SUPPORTED']);

const parseJsonBody = (value: BodyInit | null | undefined): Record<string, unknown> | null => {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const parseErrorCode = async (response: Response): Promise<string | null> => {
  if (response.status !== 400) {
    return null;
  }

  try {
    const json = (await response.clone().json()) as Record<string, unknown>;
    if (typeof json.code === 'string' && json.code.trim().length > 0) {
      return json.code.trim();
    }
    const error =
      json.error && typeof json.error === 'object' ? (json.error as Record<string, unknown>) : null;
    if (error && typeof error.code === 'string' && error.code.trim().length > 0) {
      return error.code.trim();
    }
  } catch {
    return null;
  }

  return null;
};

export class AgentChatTransport extends DefaultChatTransport<UIMessage> {
  constructor(optionsRef: AgentChatOptionsRef, transportOptions?: AgentChatTransportOptions) {
    super({
      api: `${API_BASE_URL}${AGENT_API.BASE}`,
      headers: () => {
        const headers = new Headers();
        const apiKey = optionsRef.current.apiKey.trim();
        if (apiKey) {
          headers.set('Authorization', `Bearer ${apiKey}`);
        }
        return headers;
      },
      prepareSendMessagesRequest: ({ messages }) => {
        const options = optionsRef.current;
        const apiKey = options.apiKey;
        if (!apiKey) {
          throw new Error('API key is required');
        }

        const chatMessages = buildAgentChatMessages(messages);
        if (chatMessages.length === 0) {
          throw new Error('Prompt is empty');
        }

        return {
          body: {
            messages: chatMessages,
            model: options.modelId,
            thinking: options.thinking,
            output: options.output ?? { type: 'text' },
            maxCredits: options.maxCredits,
            stream: true,
          },
        };
      },
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        const requestBody = parseJsonBody(init?.body);
        const thinking = requestBody?.thinking as { mode?: string; level?: string } | undefined;
        if (!thinking || thinking.mode !== 'level') {
          return response;
        }

        const errorCode = await parseErrorCode(response);
        if (!errorCode || !THINKING_BOUNDARY_ERROR_CODES.has(errorCode)) {
          return response;
        }

        const retryBody = {
          ...requestBody,
          thinking: { mode: 'off' as const },
        };
        const modelId = typeof requestBody?.model === 'string' ? requestBody.model.trim() : '';
        if (modelId) {
          transportOptions?.onThinkingAutoDowngrade?.(modelId);
        }

        return globalThis.fetch(input, {
          ...init,
          body: JSON.stringify(retryBody),
        });
      },
    });
  }
}
