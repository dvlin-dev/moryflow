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
import type { AgentOutput } from '../types';

export type AgentChatOptions = {
  apiKey: string;
  output?: AgentOutput;
  maxCredits?: number;
  modelId?: string;
};

type AgentChatOptionsRef = { current: AgentChatOptions };

export class AgentChatTransport extends DefaultChatTransport<UIMessage> {
  constructor(optionsRef: AgentChatOptionsRef) {
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
            output: options.output ?? { type: 'text' },
            maxCredits: options.maxCredits,
            stream: true,
          },
        };
      },
    });
  }
}
