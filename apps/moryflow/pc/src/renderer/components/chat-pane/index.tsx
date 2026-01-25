import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { CardContent } from '@anyhunt/ui/components/card';
import { IpcChatTransport } from '@/transport/ipc-chat-transport';
import { getModelContextWindow } from '@shared/model-registry';
import { useAuth } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';

import { type ChatPaneProps } from './const';
import { ChatPaneHeader } from './components/chat-pane-header';
import {
  useChatModelSelection,
  useChatSessions,
  useConversationLayout,
  useMessageActions,
  useStoredMessages,
} from './hooks';
import { ChatFooter } from './components/chat-footer';
import { ConversationSection } from './components/conversation-section';
import { TasksPanel } from './components/tasks-panel';
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
  const { messages, sendMessage, regenerate, status, stop, error, setMessages } = useChat({
    id: activeSessionId ?? 'pending',
    transport,
  });
  const [tasksOpen, setTasksOpen] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  // 追踪错误是否由于模型未设置引起，用于后续清理
  const [isModelSetupError, setIsModelSetupError] = useState(false);
  const { conversationContextRef, registerMessageRef, renderMessages, getMessageLayout } =
    useConversationLayout(messages, status);
  useStoredMessages({ activeSessionId, setMessages });

  // 消息操作（重发、重试、编辑重发、分支）
  const messageActions = useMessageActions({
    sessionId: activeSessionId,
    messages,
    setMessages,
    regenerate,
    selectSession,
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

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TasksPanel open={tasksOpen} onOpenChange={setTasksOpen} activeSessionId={activeSessionId} />
      <ChatPaneHeader
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={selectSession}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
        isSessionReady={sessionsReady}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onOpenTasks={() => setTasksOpen((prev) => !prev)}
      />
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
              conversationContextRef={conversationContextRef}
              renderMessages={renderMessages}
              getMessageLayout={getMessageLayout}
              registerMessageRef={registerMessageRef}
              messageActions={messageActions}
            />
          </div>
        </CardContent>
        <ChatFooter
          status={status}
          inputError={inputError}
          onInputError={setInputError}
          onSubmit={handlePromptSubmit}
          onStop={handleStop}
          activeFilePath={activeFilePath}
          activeFileContent={activeFileContent}
          vaultPath={vaultPath}
          modelGroups={modelGroups}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          disabled={!sessionsReady || !activeSessionId}
          onOpenSettings={onOpenSettings}
          tokenUsage={activeSession?.tokenUsage}
          contextWindow={getModelContextWindow(selectedModelId)}
        />
      </div>
    </div>
  );
};
