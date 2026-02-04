/**
 * [PROPS]: ChatPaneProps - 会话、消息、输入框与任务 UI
 * [EMITS]: onToggleCollapse/onOpenSettings + chat/session actions
 * [POS]: ChatPane 容器（消息流 + 输入区 + Tasks 面板）
 * [UPDATE]: 2026-02-03 - 移除 Renderer 侧强制同步，避免覆盖主进程持久化
 * [UPDATE]: 2026-02-04 - 移除 Header inset 参与滚动逻辑，严格对齐 assistant-ui
 * [UPDATE]: 2026-02-04 - 清理 scrollReady 状态，交由 UI 包滚动逻辑接管
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { CardContent } from '@anyhunt/ui/components/card';
import { IpcChatTransport } from '@/transport/ipc-chat-transport';
import { getModelContextWindow } from '@shared/model-registry';
import { useAuth } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

import { type ChatPaneProps } from './const';
import { ChatPaneHeader } from './components/chat-pane-header';
import {
  useChatModelSelection,
  useChatSessions,
  useMessageActions,
  useStoredMessages,
} from './hooks';
import { ChatFooter } from './components/chat-footer';
import { ConversationSection } from './components/conversation-section';
import { buildMembershipModelGroup } from './models';
import type { ChatSubmitPayload } from './components/chat-prompt-input/const';
import { createMessageMetadata } from './types/message';

export const CHAT_CHUNK_HASH =
  typeof import.meta.url === 'string'
    ? import.meta.url.match(/([A-Za-z0-9]{8,})\.(?:m?js|js)/)?.[1]
    : undefined;

export const ChatPane = ({
  activeFilePath,
  activeFileContent,
  vaultPath,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ChatPaneProps) => {
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
  const {
    agentOptionsRef,
    selectedModelId,
    setSelectedModelId,
    modelGroups: baseModelGroups,
  } = useChatModelSelection(activeFilePath);

  // 获取会员模型并合并到模型列表
  const { models: membershipModels, membershipEnabled, isAuthenticated } = useAuth();
  const modelGroups = useMemo(() => {
    // 只有在登录且启用会员模型时才添加
    if (!isAuthenticated || !membershipEnabled) {
      return baseModelGroups;
    }
    const membershipGroup = buildMembershipModelGroup(membershipModels, membershipEnabled);
    if (!membershipGroup) {
      return baseModelGroups;
    }
    // 会员模型放在最前面
    return [membershipGroup, ...baseModelGroups];
  }, [baseModelGroups, membershipModels, membershipEnabled, isAuthenticated]);
  const transport = useMemo(
    () => new IpcChatTransport(() => agentOptionsRef.current),
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
  // 追踪错误是否由于模型未设置引起，用于后续清理
  const [isModelSetupError, setIsModelSetupError] = useState(false);
  useStoredMessages({ activeSessionId, setMessages });

  // 消息操作（重发、重试、编辑重发、分支）
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

      // 检测是否是第一条消息（用于生成标题）
      const isFirstMessage = messages.length === 0;

      setInputError(null);

      if (activeSessionId && window.desktopAPI?.chat?.prepareCompaction) {
        try {
          const result = await window.desktopAPI.chat.prepareCompaction({
            sessionId: activeSessionId,
            preferredModelId: selectedModelId ?? undefined,
          });
          if (result.changed && Array.isArray(result.messages)) {
            setMessages(result.messages);
          }
        } catch (error) {
          console.warn('[chat-pane] prepareCompaction failed', error);
        }
      }

      // 将附件存入消息的 metadata
      const metadata =
        payload.attachments.length > 0
          ? createMessageMetadata({ attachments: payload.attachments })
          : undefined;

      await sendMessage({
        text,
        files: payload.files,
        metadata,
      });

      // 第一条消息时异步生成标题（不阻塞发送）
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
      status,
      stop,
      requireModelSetup,
      messages.length,
      selectedModelId,
      t,
      onOpenSettings,
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
      } catch (error) {
        console.error(error);
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
      } catch (error) {
        console.error('[chat-pane] failed to update session mode', error);
        toast.error(t('updateModeFailed'));
      }
    },
    [activeSessionId, updateSessionMode, t]
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="shrink-0">
        <ChatPaneHeader
          sessions={sessions}
          activeSession={activeSession}
          onSelectSession={selectSession}
          onCreateSession={createSession}
          onDeleteSession={deleteSession}
          isSessionReady={sessionsReady}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200 ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="flex h-full flex-col overflow-hidden">
            <ConversationSection
              messages={messages}
              status={status}
              error={error}
              messageActions={messageActions}
              onToolApproval={handleToolApproval}
              threadId={activeSessionId}
              footer={
                <ChatFooter
                  status={status}
                  inputError={inputError}
                  onInputError={setInputError}
                  onSubmit={handlePromptSubmit}
                  onStop={handleStop}
                  activeFilePath={activeFilePath}
                  activeFileContent={activeFileContent}
                  vaultPath={vaultPath}
                  activeSessionId={activeSessionId}
                  modelGroups={modelGroups}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  disabled={!sessionsReady || !activeSessionId}
                  onOpenSettings={onOpenSettings}
                  tokenUsage={activeSession?.tokenUsage}
                  contextWindow={getModelContextWindow(selectedModelId)}
                  mode={activeSession?.mode ?? 'agent'}
                  onModeChange={handleModeChange}
                />
              }
            />
          </div>
        </CardContent>
      </div>
    </div>
  );
};
