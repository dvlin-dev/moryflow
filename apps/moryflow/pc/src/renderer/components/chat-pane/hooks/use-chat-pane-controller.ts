/**
 * [PROVIDES]: useChatPaneController - ChatPane 行为编排（会话/模型/提交/审批）
 * [DEPENDS]: useChat + sessions/model hooks + desktopAPI.chat
 * [POS]: ChatPane 容器逻辑层，供 index.tsx 专注布局渲染
 * [UPDATE]: 2026-02-26 - 从 ChatPane 拆出控制器，收敛容器职责
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import type { ChatMessageMeta } from '@moryflow/types';
import { toast } from 'sonner';
import type { AgentChatRequestOptions } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/server';
import { IpcChatTransport } from '@/transport/ipc-chat-transport';

import { buildMembershipModelGroup } from '../models';
import { computeAgentOptions } from '../handle';
import { createMessageMetadata } from '../types/message';
import type { ChatPaneProps } from '../const';
import type { ChatSubmitPayload } from '../components/chat-prompt-input/const';
import { useChatModelSelection } from './use-chat-model-selection';
import { useChatSessions } from './use-chat-sessions';
import { useMessageActions } from './use-message-actions';
import { useSelectedSkillStore } from './use-selected-skill';
import { useStoredMessages } from './use-stored-messages';

type UseChatPaneControllerParams = {
  activeFilePath?: ChatPaneProps['activeFilePath'];
  onOpenSettings?: ChatPaneProps['onOpenSettings'];
};

export const useChatPaneController = ({
  activeFilePath,
  onOpenSettings,
}: UseChatPaneControllerParams) => {
  const { t } = useTranslation('chat');
  const {
    sessions,
    activeSession,
    activeSessionId,
    selectSession,
    createSession,
    updateSessionMode,
    deleteSession,
    isReady: sessionsReady,
  } = useChatSessions();
  const selectedSkillName = useSelectedSkillStore((state) => state.selectedSkillName);
  const setSelectedSkillName = useSelectedSkillStore((state) => state.setSelectedSkillName);
  const {
    agentOptionsRef,
    selectedModelId,
    setSelectedModelId,
    modelGroups: baseModelGroups,
  } = useChatModelSelection(activeFilePath, selectedSkillName);
  const agentOptionsOverrideRef = useRef<AgentChatRequestOptions | Record<string, never> | null>(
    null
  );

  const { models: membershipModels, membershipEnabled, isAuthenticated } = useAuth();
  const modelGroups = useMemo(() => {
    if (!isAuthenticated || !membershipEnabled) {
      return baseModelGroups;
    }
    const membershipGroup = buildMembershipModelGroup(membershipModels, membershipEnabled);
    if (!membershipGroup) {
      return baseModelGroups;
    }
    return [membershipGroup, ...baseModelGroups];
  }, [baseModelGroups, membershipModels, membershipEnabled, isAuthenticated]);

  const transport = useMemo(
    () =>
      new IpcChatTransport(() => {
        const override = agentOptionsOverrideRef.current;
        if (override !== null) {
          agentOptionsOverrideRef.current = null;
          return Object.keys(override).length > 0 ? override : undefined;
        }
        return agentOptionsRef.current;
      }),
    [agentOptionsRef]
  );

  const {
    messages,
    sendMessage,
    regenerate,
    status,
    stop,
    error,
    setMessages,
    addToolApprovalResponse,
  } = useChat({
    id: activeSessionId ?? 'pending',
    transport,
  });

  const [inputError, setInputError] = useState<string | null>(null);
  const [isModelSetupError, setIsModelSetupError] = useState(false);
  useStoredMessages({ activeSessionId, setMessages });

  const messageActions = useMessageActions({
    sessionId: activeSessionId,
    messages,
    setMessages,
    regenerate,
    selectSession,
    preferredModelId: selectedModelId,
  });

  const hasModelOptions = useMemo(
    () => modelGroups.some((group) => group.options.length > 0),
    [modelGroups]
  );
  const requireModelSetup = !hasModelOptions || !selectedModelId;

  useEffect(() => {
    if (!requireModelSetup && isModelSetupError) {
      setInputError(null);
      setIsModelSetupError(false);
    }
  }, [requireModelSetup, isModelSetupError]);

  const handlePromptSubmit = useCallback(
    async (payload: ChatSubmitPayload) => {
      const text = payload.text.trim();
      if (!text) {
        setInputError(t('writeMessage'));
        return;
      }
      if (!sessionsReady || !activeSessionId) {
        setInputError(t('waitMoment'));
        return;
      }
      if (requireModelSetup) {
        setInputError(t('setupModelFirst'));
        setIsModelSetupError(true);
        onOpenSettings?.('providers');
        return;
      }
      if (status === 'submitted' || status === 'streaming') {
        stop();
      }

      const isFirstMessage = messages.length === 0;
      setInputError(null);

      const selectedSkillForThisMessage =
        payload.selectedSkillName === undefined ? selectedSkillName : payload.selectedSkillName;
      agentOptionsOverrideRef.current =
        computeAgentOptions({
          activeFilePath,
          preferredModelId: selectedModelId ?? null,
          selectedSkillName: selectedSkillForThisMessage,
        }) ?? {};

      if (activeSessionId && window.desktopAPI?.chat?.prepareCompaction) {
        try {
          const result = await window.desktopAPI.chat.prepareCompaction({
            sessionId: activeSessionId,
            preferredModelId: selectedModelId ?? undefined,
          });
          if (result.changed && Array.isArray(result.messages)) {
            setMessages(result.messages);
          }
        } catch (compactionError) {
          console.warn('[chat-pane] prepareCompaction failed', compactionError);
        }
      }

      const chatMeta: ChatMessageMeta = {};
      if (payload.attachments.length > 0) {
        chatMeta.attachments = payload.attachments;
      }
      if (payload.selectedSkill) {
        chatMeta.selectedSkill = payload.selectedSkill;
      }
      const metadata =
        Object.keys(chatMeta).length > 0 ? createMessageMetadata(chatMeta) : undefined;

      await sendMessage({
        text,
        files: payload.files,
        metadata,
      });

      if (isFirstMessage && activeSessionId) {
        window.desktopAPI.chat.generateSessionTitle({
          sessionId: activeSessionId,
          userMessage: text,
          preferredModelId: selectedModelId ?? undefined,
        });
      }
    },
    [
      sendMessage,
      sessionsReady,
      activeSessionId,
      requireModelSetup,
      status,
      stop,
      messages.length,
      selectedSkillName,
      activeFilePath,
      selectedModelId,
      t,
      onOpenSettings,
      setMessages,
    ]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleToolApproval = useCallback(
    async (input: { approvalId: string; remember: 'once' | 'always' }) => {
      if (!input.approvalId || typeof window === 'undefined' || !window.desktopAPI?.chat) {
        return;
      }
      try {
        await window.desktopAPI.chat.approveTool({
          approvalId: input.approvalId,
          remember: input.remember,
        });
        addToolApprovalResponse({
          id: input.approvalId,
          approved: true,
          reason: input.remember === 'always' ? 'always' : undefined,
        });
      } catch (approveError) {
        console.error(approveError);
        toast.error(t('approvalFailed'));
      }
    },
    [addToolApprovalResponse, t]
  );

  const handleModeChange = useCallback(
    async (mode: 'agent' | 'full_access') => {
      if (!activeSessionId) {
        return;
      }
      try {
        await updateSessionMode(activeSessionId, mode);
      } catch (modeError) {
        console.error('[chat-pane] failed to update session mode', modeError);
        toast.error(t('updateModeFailed'));
      }
    },
    [activeSessionId, updateSessionMode, t]
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    sessionsReady,
    selectedSkillName,
    setSelectedSkillName,
    modelGroups,
    selectedModelId,
    setSelectedModelId,
    messages,
    status,
    error,
    inputError,
    setInputError,
    messageActions,
    selectSession,
    createSession,
    deleteSession,
    handlePromptSubmit,
    handleStop,
    handleToolApproval,
    handleModeChange,
  };
};
