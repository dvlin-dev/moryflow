/**
 * [PROPS]: ChatPaneProps - 会话、消息、输入框与任务 UI
 * [EMITS]: onToggleCollapse/onOpenSettings + chat/session actions
 * [POS]: ChatPane 容器（消息流 + 输入区 + Tasks 面板）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CardContent } from '@moryflow/ui/components/card';
import { type UIMessage } from 'ai';

import { type ChatPaneProps } from './const';
import { ChatPaneHeader, ChatPaneSessionActions } from './components/chat-pane-header';
import {
  ChatPaneAutomationEntry,
  extractLatestUserMessage,
} from './components/chat-pane-automation-entry';
import { ChatFooter } from './components/chat-footer';
import { ConversationSection } from './components/conversation-section';
import { FullAccessUpgradeDialog } from './components/full-access-upgrade-dialog';
import { PreThreadView } from './components/pre-thread-view';
import {
  ChatPaneRuntimeProvider,
  useChatPaneRuntime,
  useOptionalChatPaneRuntime,
} from './context/chat-pane-runtime-context';
import { useTranslation } from '@/lib/i18n';

const ChatPaneContent = ({
  variant = 'panel',
  showModeSessionActions = false,
  collapsed,
  onToggleCollapse,
}: ChatPaneProps) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { t } = useTranslation('chat');

  const {
    sessions,
    activeSession,
    activeSessionId,
    sessionsReady,
    messages,
    status,
    error,
    messageActions,
    selectSession,
    openPreThread,
    deleteSession,
    handleToolApproval,
    isFullAccessUpgradeDialogOpen,
    handleKeepAskMode,
    handleEnableFullAccess,
  } = useChatPaneRuntime();

  const isModeVariant = variant === 'mode';
  const isCollapsed = variant === 'panel' ? Boolean(collapsed) : false;
  const reduceMotion = useReducedMotion();
  const contentTransition = reduceMotion
    ? { duration: 0.12, ease: 'linear' as const }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  const conversationStyle = useMemo(
    () =>
      ({
        '--ai-conversation-top-padding': `${headerHeight}px`,
        '--ai-conversation-top-padding-extra': '0px',
      }) as CSSProperties,
    [headerHeight]
  );
  const latestUserMessage = useMemo(
    () => extractLatestUserMessage(messages as UIMessage[]),
    [messages]
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
            onCreateSession={openPreThread}
            onDeleteSession={deleteSession}
            isSessionReady={sessionsReady}
            collapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            automationEntry={
              <ChatPaneAutomationEntry
                activeSession={activeSession}
                latestUserMessage={latestUserMessage}
                isSessionReady={sessionsReady}
              />
            }
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
                    onCreateSession={openPreThread}
                    onDeleteSession={deleteSession}
                    isSessionReady={sessionsReady}
                  />
                </div>
              )}
              <AnimatePresence initial={false} mode="wait">
                {activeSessionId ? (
                  <motion.div
                    key={`conversation:${activeSessionId}`}
                    className="flex min-h-0 flex-1 flex-col"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={contentTransition}
                  >
                    <ConversationSection
                      messages={messages}
                      status={status}
                      error={error}
                      messageActions={messageActions}
                      onToolApproval={handleToolApproval}
                      threadId={activeSessionId}
                      footer={<ChatFooter />}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="prethread"
                    className="flex min-h-0 flex-1 flex-col"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={contentTransition}
                  >
                    <PreThreadView variant={variant} />
                  </motion.div>
                )}
              </AnimatePresence>
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

export const ChatPane = (props: ChatPaneProps) => {
  const runtime = useOptionalChatPaneRuntime();
  if (runtime) {
    return <ChatPaneContent {...props} />;
  }

  return (
    <ChatPaneRuntimeProvider
      activeFilePath={props.activeFilePath}
      activeFileContent={props.activeFileContent}
      vaultPath={props.vaultPath}
      onOpenSettings={props.onOpenSettings}
      onPreThreadConversationStart={props.onPreThreadConversationStart}
    >
      <ChatPaneContent {...props} />
    </ChatPaneRuntimeProvider>
  );
};
