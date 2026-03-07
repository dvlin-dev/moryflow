/**
 * [PROPS]: ChatPaneProps - 会话、消息、输入框与任务 UI
 * [EMITS]: onToggleCollapse/onOpenSettings + chat/session actions
 * [POS]: ChatPane 容器（消息流 + 输入区 + Tasks 面板）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CardContent } from '@moryflow/ui/components/card';
import { getModelContextWindow } from '@moryflow/model-bank/registry';

import { type ChatPaneProps } from './const';
import { ChatPaneHeader, ChatPaneSessionActions } from './components/chat-pane-header';
import { ChatFooter } from './components/chat-footer';
import { ConversationSection } from './components/conversation-section';
import { FullAccessUpgradeDialog } from './components/full-access-upgrade-dialog';
import { useChatPaneController } from './hooks/use-chat-pane-controller';
import { useSyncChatPaneFooterStore } from './hooks/use-chat-pane-footer-store';
import { useTranslation } from '@/lib/i18n';

export const ChatPane = ({
  variant = 'panel',
  showModeSessionActions = false,
  activeFilePath,
  activeFileContent,
  vaultPath,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ChatPaneProps) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { t } = useTranslation('chat');

  const {
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
    createSession,
    deleteSession,
    handlePromptSubmit,
    handleStop,
    handleToolApproval,
    handleModeChange,
    isFullAccessUpgradeDialogOpen,
    handleKeepAskMode,
    handleEnableFullAccess,
  } = useChatPaneController({ activeFilePath, onOpenSettings });

  const isModeVariant = variant === 'mode';
  const isCollapsed = variant === 'panel' ? Boolean(collapsed) : false;
  useSyncChatPaneFooterStore({
    status,
    inputError,
    activeFilePath: activeFilePath ?? null,
    activeFileContent: activeFileContent ?? null,
    vaultPath: vaultPath ?? null,
    modelGroups,
    selectedModelId: selectedModelId ?? null,
    selectedThinkingLevel: selectedThinkingLevel ?? null,
    selectedThinkingProfile,
    disabled: !sessionsReady || !activeSessionId,
    tokenUsage: activeSession?.tokenUsage ?? null,
    contextWindow: getModelContextWindow(selectedModelId),
    mode: globalMode,
    activeSessionId,
    selectedSkillName: selectedSkillName ?? null,
    onSubmit: handlePromptSubmit,
    onStop: handleStop,
    onInputError: setInputError,
    onOpenSettings,
    onSelectModel: setSelectedModelId,
    onSelectThinkingLevel: setSelectedThinkingLevel,
    onModeChange: handleModeChange,
    onSelectSkillName: setSelectedSkillName,
  });

  const conversationStyle = useMemo(
    () =>
      ({
        '--ai-conversation-top-padding': `${headerHeight}px`,
        '--ai-conversation-top-padding-extra': '0px',
      }) as CSSProperties,
    [headerHeight]
  );

  useLayoutEffect(() => {
    const headerEl = headerRef.current;
    if (variant !== 'panel' || !headerEl) {
      setHeaderHeight(0);
      return;
    }

    const updateHeight = () => {
      const nextHeight = Math.round(headerEl.getBoundingClientRect().height);
      setHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => {
        window.removeEventListener('resize', updateHeight);
      };
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(headerEl);
    return () => observer.disconnect();
  }, [variant]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={conversationStyle}>
      {variant === 'panel' && (
        <div className="shrink-0" ref={headerRef}>
          <ChatPaneHeader
            sessions={sessions}
            activeSession={activeSession}
            onSelectSession={selectSession}
            onCreateSession={createSession}
            onDeleteSession={deleteSession}
            isSessionReady={sessionsReady}
            collapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </div>
      )}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200 ${
          isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <CardContent className="flex-1 overflow-hidden p-0">
          <div
            className={
              isModeVariant
                ? 'flex h-full min-h-0 flex-col overflow-hidden px-[2em] pt-[2em] pb-[calc(2em-0.75rem)]'
                : 'flex h-full flex-col overflow-hidden'
            }
          >
            <div
              className={
                isModeVariant
                  ? 'mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-col overflow-hidden'
                  : 'flex h-full flex-col overflow-hidden'
              }
            >
              {isModeVariant && showModeSessionActions && (
                <div className="flex shrink-0 justify-end pb-2">
                  <ChatPaneSessionActions
                    sessions={sessions}
                    activeSession={activeSession}
                    onSelectSession={selectSession}
                    onCreateSession={createSession}
                    onDeleteSession={deleteSession}
                    isSessionReady={sessionsReady}
                  />
                </div>
              )}
              <ConversationSection
                messages={messages}
                status={status}
                error={error}
                messageActions={messageActions}
                onToolApproval={handleToolApproval}
                threadId={activeSessionId}
                footer={<ChatFooter />}
              />
            </div>
          </div>
        </CardContent>
      </div>
      <FullAccessUpgradeDialog
        open={isFullAccessUpgradeDialogOpen}
        title={t('fullAccessUpgradePromptTitle')}
        description={t('fullAccessUpgradePromptDescription')}
        riskNote={t('fullAccessUpgradePromptRisk')}
        keepAskLabel={t('fullAccessUpgradePromptKeepAsk')}
        enableFullAccessLabel={t('fullAccessUpgradePromptEnable')}
        onKeepAsk={handleKeepAskMode}
        onEnableFullAccess={handleEnableFullAccess}
      />
    </div>
  );
};
