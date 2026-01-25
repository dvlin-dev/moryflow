/**
 * [PROPS]: { showHeader?, isInSheet?, onClose? } - 聊天屏幕配置
 * [EMITS]: 无
 * [POS]: 聊天主屏幕，使用可组合架构与 PC 端 chat-pane 保持一致
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { View, Modal } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks/use-theme';
import { useTranslation } from '@/lib/i18n';
import { useModels, useSelectedModel } from '@/lib/models';
import { useChatSessions } from '@/lib/hooks/use-chat-sessions';
import { useStoredMessages } from '@/lib/hooks/use-stored-messages';
import { ChatHeader } from './ChatHeader';
import { ChatInputBar, type SendMessagePayload } from './ChatInputBar';
import { ModelPickerSheet } from './ModelPickerSheet';
import { SessionSwitcher } from './SessionSwitcher';
import { UpgradeSheet } from '@/components/membership';
import { TasksSheet } from './TasksSheet';
import { ChatProvider, useChatLayout, useMessageAnimation } from './contexts';
import { ChatMessageList, ChatErrorBanner, ChatInitBanner, ChatEmptyState } from './components';
import { useChatRuntime, useChatState, useModalState } from './hooks';
import { cn } from '@/lib/utils';

interface ChatScreenProps {
  showHeader?: boolean;
  isInSheet?: boolean;
  onClose?: () => void;
}

/**
 * ChatScreen 主组件（带 Provider）
 */
export function ChatScreen(props: ChatScreenProps) {
  return (
    <ChatProvider isInSheet={props.isInSheet}>
      <ChatScreenContent {...props} />
    </ChatProvider>
  );
}

/**
 * ChatScreen 内容组件
 */
function ChatScreenContent({ showHeader = true, isInSheet = false }: ChatScreenProps) {
  const { t } = useTranslation('chat');
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();

  // Context hooks
  const { keyboardHeight } = useChatLayout();
  const { markMessagesAsAnimated } = useMessageAnimation();

  // 键盘占位动画
  const keyboardSpacerStyle = useAnimatedStyle(() => ({ height: keyboardHeight.value }), []);

  // Runtime 初始化
  const { isInitialized } = useChatRuntime();

  // 会话管理
  const {
    sessions,
    activeSession,
    activeSessionId,
    selectSession,
    createSession,
    deleteSession,
    refreshSessions,
    isReady: sessionsReady,
  } = useChatSessions();

  // Sheet 模式：挂载时创建新会话
  const hasCreatedNewSessionRef = React.useRef(false);
  React.useEffect(() => {
    if (isInSheet && sessionsReady && !hasCreatedNewSessionRef.current) {
      hasCreatedNewSessionRef.current = true;
      createSession();
    }
  }, [isInSheet, sessionsReady, createSession]);

  // 模型管理
  const { allModels } = useModels();
  const { model: selectedModel, modelId: selectedModelId, selectModel } = useSelectedModel();

  // 聊天状态
  const {
    messages,
    displayMessages,
    error,
    isLoading,
    isStreaming,
    sendMessage,
    stop,
    setMessages,
  } = useChatState({
    activeSessionId,
    selectedModelId,
    refreshSessions,
  });

  // 加载历史消息
  const { isLoadingHistory } = useStoredMessages({
    activeSessionId,
    setMessages,
    onHistoryLoaded: markMessagesAsAnimated,
    delayMs: isInSheet ? 100 : 0,
  });

  // Modal 状态
  const {
    showModelPicker,
    showSessionSwitcher,
    showUpgradeSheet,
    lockedModel,
    closeModelPicker,
    openSessionSwitcher,
    closeSessionSwitcher,
    handleLockedModelPress,
    closeUpgradeSheet,
  } = useModalState();

  // 输入状态
  const [input, setInput] = React.useState('');
  const [showTasks, setShowTasks] = React.useState(false);

  // 事件处理
  const handleSend = async (payload: SendMessagePayload) => {
    if (!payload.text || isLoading || !isInitialized || !sessionsReady) return;

    setInput('');
    await sendMessage(payload);
  };

  const handleModelSelect = (modelId: string) => {
    selectModel(modelId);
    closeModelPicker();
  };

  // 渲染
  const isDark = colorScheme === 'dark';
  const isReady = isInitialized && sessionsReady;

  return (
    <View className={cn('flex-1', isDark ? 'bg-[rgb(10,10,12)]' : 'bg-background')}>
      {showHeader && (
        <ChatHeader
          title={activeSession?.title ?? t('newConversation')}
          onTitlePress={openSessionSwitcher}
          onNewConversation={() => createSession()}
          onHistoryPress={openSessionSwitcher}
          onTasksPress={() => setShowTasks(true)}
          isInSheet={isInSheet}
        />
      )}

      <ChatInitBanner isInitialized={isInitialized} isSessionsReady={sessionsReady} />

      <View className="flex-1">
        {messages.length === 0 ? (
          <ChatEmptyState isLoadingHistory={isLoadingHistory} />
        ) : (
          <ChatMessageList
            messages={displayMessages}
            isStreaming={isStreaming}
            isInSheet={isInSheet}
          />
        )}

        <View className="absolute right-0 bottom-0 left-0">
          {error && <ChatErrorBanner error={error} />}

          <ChatInputBar
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onStop={stop}
            isLoading={isLoading}
            isInitialized={isReady}
            models={allModels.map((m) => ({ id: m.id, name: m.name }))}
            currentModelId={selectedModelId ?? undefined}
            currentModel={selectedModel?.name}
            onModelChange={selectModel}
            isInSheet={isInSheet}
            disableBottomPadding={true}
          />

          {/* 动态高度：依赖 insets，需保留 style */}
          <View style={{ height: isInSheet ? 12 : insets.bottom + 8 }} />
          {/* Animated.View：nativewind bug，需保留纯 style */}
          <Animated.View style={keyboardSpacerStyle} />
        </View>
      </View>

      <SessionSwitcher
        visible={showSessionSwitcher}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onDelete={deleteSession}
        onClose={closeSessionSwitcher}
      />

      <Modal
        visible={showModelPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModelPicker}>
        <ModelPickerSheet
          models={allModels}
          currentModelId={selectedModelId ?? undefined}
          onSelect={handleModelSelect}
          onClose={closeModelPicker}
          onLockedModelPress={handleLockedModelPress}
        />
      </Modal>

      <Modal
        visible={showUpgradeSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeUpgradeSheet}>
        <UpgradeSheet model={lockedModel} onClose={closeUpgradeSheet} />
      </Modal>

      <Modal
        visible={showTasks}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTasks(false)}>
        <TasksSheet
          visible={showTasks}
          onClose={() => setShowTasks(false)}
          activeSessionId={activeSessionId}
        />
      </Modal>
    </View>
  );
}
