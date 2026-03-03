/**
 * [PROVIDES]: useChatPaneController - ChatPane 行为编排（会话/模型/提交/审批）
 * [DEPENDS]: useChat + sessions/model hooks + desktopAPI.chat
 * [POS]: ChatPane 容器逻辑层，供 index.tsx 专注布局渲染
 * [UPDATE]: 2026-03-03 - 提交流水线改为“发送即返回 submitted=true”；sendMessage 改为异步派发并补充选区胶囊 metadata
 * [UPDATE]: 2026-03-02 - handlePromptSubmit 返回 submitted 结果，显式区分“真实发送成功”与“前置校验提前返回”
 * [UPDATE]: 2026-02-26 - 从 ChatPane 拆出控制器，收敛容器职责
 * [UPDATE]: 2026-03-03 - 监听首个审批请求并触发 Full access 升级提示；提示确认后立即切换会话权限
 * [UPDATE]: 2026-03-03 - 修复首次提醒消费时机与 seenApprovalIds 增长问题
 * [UPDATE]: 2026-03-03 - seenApprovalIds 标记后移到 IPC 成功返回后，避免 effect 取消导致漏提示
 * [UPDATE]: 2026-03-03 - 升级弹窗绑定会话 id，避免异步消费完成后在错误会话展示并误切权限
 * [UPDATE]: 2026-03-03 - 升级提示改为一次性弱提醒：切换会话时自动关闭，不再回到原会话重复展示
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
  const { models: membershipModels, membershipEnabled, isAuthenticated } = useAuth();
  const membershipThinkingProfileByModelId = useMemo(() => {
    const entries = membershipModels
      .filter((model) => model.thinkingProfile)
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
  } = useChatModelSelection(activeFilePath, selectedSkillName, resolveExternalThinkingProfile);
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
  const seenApprovalIdsRef = useRef<Set<string>>(new Set());
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
    async (payload: ChatSubmitPayload): Promise<ChatSubmitResult> => {
      const text = payload.text.trim();
      if (!text) {
        setInputError(t('writeMessage'));
        return { submitted: false };
      }
      if (!sessionsReady || !activeSessionId) {
        setInputError(t('waitMoment'));
        return { submitted: false };
      }
      if (requireModelSetup) {
        setInputError(t('setupModelFirst'));
        setIsModelSetupError(true);
        onOpenSettings?.('providers');
        return { submitted: false };
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

      void Promise.resolve(
        sendMessage({
          text,
          files: payload.files,
          metadata,
        })
      )
        .then(() => {
          if (
            !isFirstMessage ||
            !activeSessionId ||
            !window.desktopAPI?.chat?.generateSessionTitle
          ) {
            return;
          }
          window.desktopAPI.chat.generateSessionTitle({
            sessionId: activeSessionId,
            userMessage: text,
            preferredModelId: selectedModelId ?? undefined,
          });
        })
        .catch((sendError) => {
          console.error('[chat-pane] sendMessage failed', sendError);
        });

      return { submitted: true };
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
      selectedThinkingLevel,
      selectedThinkingProfile,
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
    async (mode: 'ask' | 'full_access') => {
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
    createSession,
    deleteSession,
    handlePromptSubmit,
    handleStop,
    handleToolApproval,
    handleModeChange,
    isFullAccessUpgradeDialogOpen,
    handleKeepAskMode,
    handleEnableFullAccess,
  };
};
