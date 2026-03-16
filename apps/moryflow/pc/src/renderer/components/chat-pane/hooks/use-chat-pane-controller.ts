/**
 * [PROVIDES]: useChatPaneController - ChatPane 行为编排（会话/模型/提交/审批）
 * [DEPENDS]: useChat + sessions/model hooks + desktopAPI.chat
 * [POS]: ChatPane 容器逻辑层，供 index.tsx 专注布局渲染
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { isToolUIPart, type UIMessage } from 'ai';
import type { ChatMessageMeta } from '@moryflow/types';
import { toast } from 'sonner';
import type { AgentChatRequestOptions } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import { extractMembershipModelId, isMembershipModelId, useAuth } from '@/lib/server';
import { IpcChatTransport } from '@/transport/ipc-chat-transport';

import { buildMembershipModelGroup } from '../models';
import { computeAgentOptions } from '../handle';
import { createMessageMetadata } from '../types/message';
import type { ChatPaneProps } from '../const';
import type { ChatSubmitPayload, ChatSubmitResult } from '../components/chat-prompt-input/const';
import { useChatModelSelection } from './use-chat-model-selection';
import { useChatSessions } from './use-chat-sessions';
import { useMessageActions } from './use-message-actions';
import { useSelectedSkillStore } from './use-selected-skill';
import { useStoredMessages } from './use-stored-messages';

type UseChatPaneControllerParams = {
  activeFilePath?: ChatPaneProps['activeFilePath'];
  onOpenSettings?: ChatPaneProps['onOpenSettings'];
  onPreThreadConversationStart?: ChatPaneProps['onPreThreadConversationStart'];
};

type PendingPreThreadSubmit = {
  targetSessionId: string | null;
  payload: ChatSubmitPayload;
  settled: Promise<{
    delivered: boolean;
  }>;
  resolveSettled: (value: { delivered: boolean }) => void;
  dispatched: boolean;
};

const collectPendingApprovalIds = (messages: UIMessage[]): string[] => {
  const uniqueIds = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (!isToolUIPart(part) || part.state !== 'approval-requested') {
        continue;
      }
      const approvalId = part.approval?.id;
      if (typeof approvalId !== 'string' || approvalId.length === 0) {
        continue;
      }
      uniqueIds.add(approvalId);
    }
  }
  return [...uniqueIds];
};

export const useChatPaneController = ({
  activeFilePath,
  onOpenSettings,
  onPreThreadConversationStart,
}: UseChatPaneControllerParams) => {
  const { t } = useTranslation('chat');
  const {
    sessions,
    activeSession,
    activeSessionId,
    globalMode,
    selectSession,
    openPreThread,
    createSession,
    setGlobalMode,
    deleteSession,
    isReady: sessionsReady,
  } = useChatSessions();
  const selectedSkillName = useSelectedSkillStore((state) => state.selectedSkillName);
  const setSelectedSkillName = useSelectedSkillStore((state) => state.setSelectedSkillName);
  const { models: membershipModels, membershipEnabled, isAuthenticated, modelsLoading } = useAuth();
  const membershipThinkingProfileByModelId = useMemo(() => {
    const entries = membershipModels
      .filter((model) => model.available && model.thinkingProfile)
      .map((model) => [model.id, model.thinkingProfile] as const);
    return new Map(entries);
  }, [membershipModels]);
  const resolveExternalThinkingProfile = useCallback(
    (modelId?: string) => {
      if (!modelId || !isAuthenticated || !membershipEnabled) {
        return undefined;
      }
      if (!isMembershipModelId(modelId)) {
        return undefined;
      }
      return membershipThinkingProfileByModelId.get(extractMembershipModelId(modelId));
    },
    [isAuthenticated, membershipEnabled, membershipThinkingProfileByModelId]
  );
  const {
    agentOptionsRef,
    selectedModelId,
    setSelectedModelId,
    selectedThinkingLevel,
    selectedThinkingProfile,
    setSelectedThinkingLevel,
    modelGroups: baseModelGroups,
  } = useChatModelSelection(
    activeFilePath,
    selectedSkillName,
    resolveExternalThinkingProfile,
    !modelsLoading
  );
  const agentOptionsOverrideRef = useRef<AgentChatRequestOptions | Record<string, never> | null>(
    null
  );

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
  const [fullAccessUpgradeDialogSessionId, setFullAccessUpgradeDialogSessionId] = useState<
    string | null
  >(null);
  const [pendingSubmitVersion, setPendingSubmitVersion] = useState(0);
  const seenApprovalIdsRef = useRef<Set<string>>(new Set());
  const pendingPreThreadSubmitRef = useRef<PendingPreThreadSubmit | null>(null);
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

  const prepareSubmit = useCallback(
    (payload: ChatSubmitPayload): { ok: true } | { ok: false; result: ChatSubmitResult } => {
      const text = payload.text.trim();
      if (!text) {
        setInputError(t('writeMessage'));
        return { ok: false, result: { submitted: false } };
      }
      if (!sessionsReady) {
        setInputError(t('waitMoment'));
        return { ok: false, result: { submitted: false } };
      }
      if (requireModelSetup) {
        setInputError(t('setupModelFirst'));
        setIsModelSetupError(true);
        onOpenSettings?.('providers');
        return { ok: false, result: { submitted: false } };
      }
      if (status === 'submitted' || status === 'streaming') {
        stop();
      }

      setInputError(null);
      return { ok: true };
    },
    [onOpenSettings, requireModelSetup, sessionsReady, status, stop, t]
  );

  const submitViaNewThread = useCallback(
    async (payload: ChatSubmitPayload): Promise<ChatSubmitResult> => {
      const existingPending = pendingPreThreadSubmitRef.current;
      if (existingPending && !existingPending.dispatched) {
        return { submitted: false };
      }

      let resolveSettled!: (value: { delivered: boolean }) => void;
      const settled = new Promise<{ delivered: boolean }>((resolve) => {
        resolveSettled = resolve;
      });

      const pending: PendingPreThreadSubmit = {
        targetSessionId: null,
        payload,
        settled,
        resolveSettled,
        dispatched: false,
      };
      pendingPreThreadSubmitRef.current = pending;

      void createSession()
        .then((createdSession) => {
          if (!createdSession?.id) {
            if (pendingPreThreadSubmitRef.current === pending) {
              pendingPreThreadSubmitRef.current = null;
            }
            setInputError(t('createFailed'));
            pending.resolveSettled({ delivered: false });
            return;
          }

          pending.targetSessionId = createdSession.id;
          setPendingSubmitVersion((prev) => prev + 1);
          onPreThreadConversationStart?.();
        })
        .catch((createError) => {
          if (pendingPreThreadSubmitRef.current === pending) {
            pendingPreThreadSubmitRef.current = null;
          }
          console.error('[chat-pane] createSession failed', createError);
          setInputError(t('createFailed'));
          pending.resolveSettled({ delivered: false });
        });

      return {
        submitted: true,
        settled,
      };
    },
    [createSession, onPreThreadConversationStart, t]
  );

  const deliverMessage = useCallback(
    async (payload: ChatSubmitPayload) => {
      if (!activeSessionId) {
        return { delivered: false };
      }

      const text = payload.text.trim();
      const isFirstMessage = messages.length === 0;
      const selectedSkillForThisMessage =
        payload.selectedSkillName === undefined ? selectedSkillName : payload.selectedSkillName;
      agentOptionsOverrideRef.current =
        computeAgentOptions({
          activeFilePath,
          contextSummary: payload.contextSummary ?? null,
          preferredModelId: selectedModelId ?? null,
          thinkingLevel: selectedThinkingLevel,
          thinkingProfile: selectedThinkingProfile ?? null,
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
      if (payload.selectionReference) {
        chatMeta.selectionReference = payload.selectionReference;
      }
      const metadata =
        Object.keys(chatMeta).length > 0 ? createMessageMetadata(chatMeta) : undefined;

      const settled = Promise.resolve(
        sendMessage({
          text,
          files: payload.files,
          metadata,
        })
      )
        .then(() => {
          if (isFirstMessage && activeSessionId && window.desktopAPI?.chat?.generateSessionTitle) {
            try {
              window.desktopAPI.chat.generateSessionTitle({
                sessionId: activeSessionId,
                userMessage: text,
                preferredModelId: selectedModelId ?? undefined,
              });
            } catch (titleError) {
              console.warn('[chat-pane] generateSessionTitle failed', titleError);
            }
          }
          return { delivered: true };
        })
        .catch((sendError) => {
          console.error('[chat-pane] sendMessage failed', sendError);
          return { delivered: false };
        });

      return settled;
    },
    [
      activeSessionId,
      messages.length,
      selectedSkillName,
      activeFilePath,
      selectedModelId,
      selectedThinkingLevel,
      selectedThinkingProfile,
      sendMessage,
      setMessages,
    ]
  );

  const handlePromptSubmit = useCallback(
    async (payload: ChatSubmitPayload): Promise<ChatSubmitResult> => {
      const prepared = prepareSubmit(payload);
      if (!prepared.ok) {
        return prepared.result;
      }

      if (activeSessionId) {
        return {
          submitted: true,
          settled: deliverMessage(payload),
        };
      }

      return submitViaNewThread(payload);
    },
    [activeSessionId, deliverMessage, prepareSubmit, submitViaNewThread]
  );

  const handleNewThreadPromptSubmit = useCallback(
    async (payload: ChatSubmitPayload): Promise<ChatSubmitResult> => {
      const prepared = prepareSubmit(payload);
      if (!prepared.ok) {
        return prepared.result;
      }

      return submitViaNewThread(payload);
    },
    [prepareSubmit, submitViaNewThread]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleToolApproval = useCallback(
    async (input: { approvalId: string; action: 'once' | 'allow_type' | 'deny' }) => {
      if (!input.approvalId || typeof window === 'undefined' || !window.desktopAPI?.chat) {
        return;
      }
      try {
        const result = await window.desktopAPI.chat.approveTool({
          approvalId: input.approvalId,
          action: input.action,
        });
        if (result.status === 'already_processed') {
          addToolApprovalResponse({
            id: input.approvalId,
            approved: true,
            reason: 'already_processed',
          });
          return;
        }
        if (result.status === 'denied') {
          addToolApprovalResponse({
            id: input.approvalId,
            approved: false,
          });
          return;
        }
        addToolApprovalResponse({
          id: input.approvalId,
          approved: true,
          reason: result.remember === 'always' ? 'always' : undefined,
        });
      } catch (approveError) {
        console.error(approveError);
        toast.error(t('approvalFailed'));
      }
    },
    [addToolApprovalResponse, t]
  );

  const handleModeChange = useCallback(
    async (mode: 'ask' | 'full_access') => {
      try {
        await setGlobalMode(mode, activeSessionId ?? undefined);
      } catch (modeError) {
        console.error('[chat-pane] failed to update global mode', modeError);
        toast.error(t('updateModeFailed'));
      }
    },
    [activeSessionId, setGlobalMode, t]
  );

  const handleKeepAskMode = useCallback(() => {
    setFullAccessUpgradeDialogSessionId(null);
  }, []);

  const handleEnableFullAccess = useCallback(async () => {
    setFullAccessUpgradeDialogSessionId(null);
    await handleModeChange('full_access');
  }, [handleModeChange]);

  useEffect(() => {
    seenApprovalIdsRef.current.clear();
    setFullAccessUpgradeDialogSessionId(null);
  }, [activeSessionId]);

  useEffect(() => {
    const pending = pendingPreThreadSubmitRef.current;
    if (!activeSessionId || !pending || pending.dispatched) {
      return;
    }
    if (!pending.targetSessionId || pending.targetSessionId !== activeSessionId) {
      return;
    }

    pending.dispatched = true;
    void deliverMessage(pending.payload)
      .then((result) => {
        pending.resolveSettled(result);
      })
      .finally(() => {
        if (pendingPreThreadSubmitRef.current === pending) {
          pendingPreThreadSubmitRef.current = null;
        }
      });
  }, [activeSessionId, deliverMessage, pendingSubmitVersion]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.desktopAPI?.chat?.getApprovalContext ||
      !window.desktopAPI?.chat?.consumeFullAccessUpgradePrompt
    ) {
      return;
    }
    const sessionIdAtEffectStart = activeSessionId;
    if (!sessionIdAtEffectStart) {
      return;
    }
    const pendingApprovalIds = collectPendingApprovalIds(messages);
    const pendingIdSet = new Set(pendingApprovalIds);
    for (const seenApprovalId of seenApprovalIdsRef.current) {
      if (!pendingIdSet.has(seenApprovalId)) {
        seenApprovalIdsRef.current.delete(seenApprovalId);
      }
    }
    const unseenApprovalIds = pendingApprovalIds.filter(
      (approvalId) => !seenApprovalIdsRef.current.has(approvalId)
    );
    if (unseenApprovalIds.length === 0) {
      return;
    }
    let cancelled = false;
    const resolveApprovalContexts = async () => {
      for (const approvalId of unseenApprovalIds) {
        try {
          const context = await window.desktopAPI.chat.getApprovalContext({ approvalId });
          if (cancelled) {
            return;
          }
          seenApprovalIdsRef.current.add(approvalId);
          if (context.suggestFullAccessUpgrade) {
            const consumeResult = await window.desktopAPI.chat.consumeFullAccessUpgradePrompt();
            if (consumeResult.consumed) {
              setFullAccessUpgradeDialogSessionId(sessionIdAtEffectStart);
              return;
            }
          }
        } catch (error) {
          seenApprovalIdsRef.current.add(approvalId);
          console.warn('[chat-pane] failed to resolve approval context', error);
        }
      }
    };
    void resolveApprovalContexts();
    return () => {
      cancelled = true;
    };
  }, [messages, activeSessionId]);

  const isFullAccessUpgradeDialogOpen =
    fullAccessUpgradeDialogSessionId !== null &&
    activeSessionId !== null &&
    fullAccessUpgradeDialogSessionId === activeSessionId;

  return {
    sessions,
    activeSession,
    globalMode,
    activeSessionId,
    sessionsReady,
    selectedSkillName,
    setSelectedSkillName,
    modelGroups,
    selectedModelId,
    setSelectedModelId,
    selectedThinkingLevel,
    selectedThinkingProfile,
    setSelectedThinkingLevel,
    messages,
    status,
    error,
    inputError,
    setInputError,
    messageActions,
    selectSession,
    openPreThread,
    createSession,
    deleteSession,
    handlePromptSubmit,
    handleNewThreadPromptSubmit,
    handleStop,
    handleToolApproval,
    handleModeChange,
    isFullAccessUpgradeDialogOpen,
    handleKeepAskMode,
    handleEnableFullAccess,
  };
};
