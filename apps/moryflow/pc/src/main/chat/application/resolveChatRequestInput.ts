import type { UIMessage } from 'ai';
import path from 'node:path';
import type { AgentChatRequestOptions } from '../../../shared/ipc.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { getGlobalPermissionMode } from '../../agent-runtime/runtime/runtime-config.js';
import { processAttachments } from '../services/attachments/processAttachments.js';
import { normalizeAgentOptions } from './normalizeAgentOptions.js';
import {
  extractUserAttachments,
  extractUserText,
  findLatestUserMessage,
} from '../messages/extractUserMessageParts.js';

export type ChatRequestPayload = {
  chatId?: string;
  channel?: string;
  messages?: UIMessage[];
  agentOptions?: AgentChatRequestOptions;
};

const summarizeThinkingProfile = (profile?: AgentChatRequestOptions['thinkingProfile']) => {
  if (!profile) {
    return undefined;
  }
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      visibleParams: level.visibleParams ?? [],
    })),
  };
};

export const resolveChatRequestInput = async (
  payload: ChatRequestPayload | null | undefined
): Promise<{
  chatId: string;
  channel: string;
  messages: UIMessage[];
  agentOptions: AgentChatRequestOptions | undefined;
  sessionSummary: ReturnType<typeof chatSessionStore.getSummary>;
  sessionVaultPath: string;
  preferredModelId: string | undefined;
  thinking: AgentChatRequestOptions['thinking'];
  globalMode: Awaited<ReturnType<typeof getGlobalPermissionMode>>;
  userInput: string | null;
  attachmentContexts: Awaited<ReturnType<typeof processAttachments>>['textContexts'];
  images: Awaited<ReturnType<typeof processAttachments>>['images'];
  thinkingProfileSummary: ReturnType<typeof summarizeThinkingProfile>;
}> => {
  const { chatId, channel, messages } = payload ?? {};
  const agentOptions = normalizeAgentOptions(payload?.agentOptions);
  if (!chatId || !channel || !Array.isArray(messages)) {
    throw new Error('Incomplete chat request payload.');
  }

  const sessionSummary = chatSessionStore.getSummary(chatId);
  const sessionVaultPath = sessionSummary.vaultPath.trim();
  if (!path.isAbsolute(sessionVaultPath)) {
    throw new Error('This thread has invalid workspace scope. Please create a new thread.');
  }
  const preferredModelId = agentOptions?.preferredModelId ?? sessionSummary.preferredModelId;
  const thinking = agentOptions?.thinking;
  const globalMode = await getGlobalPermissionMode();
  const latestUserMessage = findLatestUserMessage(messages);
  if (!latestUserMessage) {
    throw new Error('Unable to resolve user input.');
  }

  const userInput = extractUserText(latestUserMessage);
  const { textContexts: attachmentContexts, images } = await processAttachments(
    extractUserAttachments(latestUserMessage)
  );
  if (!userInput && images.length === 0) {
    throw new Error('Message must contain text or images');
  }

  return {
    chatId,
    channel,
    messages,
    agentOptions,
    sessionSummary,
    sessionVaultPath,
    preferredModelId,
    thinking,
    globalMode,
    userInput,
    attachmentContexts,
    images,
    thinkingProfileSummary: summarizeThinkingProfile(agentOptions?.thinkingProfile),
  };
};
