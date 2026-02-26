/**
 * [PROPS]: ChatPaneProps - 会话、消息、输入框与任务 UI
 * [EMITS]: onToggleCollapse/onOpenSettings + chat/session actions
 * [POS]: ChatPane 容器（消息流 + 输入区 + Tasks 面板）
 * [UPDATE]: 2026-02-26 - 容器逻辑下沉到 useChatPaneController，组件聚焦布局与视图组合
 * [UPDATE]: 2026-02-26 - footer 改为 store-first：同步控制器快照到 chat-pane-footer-store，移除 ChatFooter props 平铺
 * [UPDATE]: 2026-02-11 - 引入 selectedSkill 请求级覆盖，保证技能失效软降级后本次发送不携带旧 skill
 * [UPDATE]: 2026-02-08 - Chat Mode 视图内容最大宽度 720px，超出后居中；外层保留 2em padding（底部扣除 Footer 的 p-3，避免叠加过大）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CardContent } from '@moryflow/ui/components/card';
import { getModelContextWindow } from '@shared/model-registry';

import { type ChatPaneProps } from './const';
import { ChatPaneHeader } from './components/chat-pane-header';
import { ChatFooter } from './components/chat-footer';
import { ConversationSection } from './components/conversation-section';
import { useChatPaneController } from './hooks/use-chat-pane-controller';
import { useSyncChatPaneFooterStore } from './hooks/use-chat-pane-footer-store';

export const ChatPane = ({
  variant = 'panel',
  activeFilePath,
  activeFileContent,
  vaultPath,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: ChatPaneProps) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const {
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
    disabled: !sessionsReady || !activeSessionId,
    tokenUsage: activeSession?.tokenUsage ?? null,
    contextWindow: getModelContextWindow(selectedModelId),
    mode: activeSession?.mode ?? 'agent',
    activeSessionId,
    selectedSkillName: selectedSkillName ?? null,
    onSubmit: handlePromptSubmit,
    onStop: handleStop,
    onInputError: setInputError,
    onOpenSettings,
    onSelectModel: setSelectedModelId,
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
    </div>
  );
};
