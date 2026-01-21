/**
 * [PROPS]: input, onInputChange, onSend, onStop, isLoading, isInitialized, models, currentModelId, currentModel, onModelChange, isInSheet, disableBottomPadding
 * [EMITS]: onInputChange, onSend, onStop, onModelChange
 * [POS]: 聊天输入栏主组件，组合子组件实现完整功能
 */

import { useState, useCallback, useMemo } from 'react';
import { View, TextInput, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n';
import { useChatLayout } from '../contexts';
import { useVoiceInput, useWorkspaceFiles, useContextFiles, useFileSearch } from './hooks';
import { FilePanel, InputToolbar, GlassContainer, ContextFileTags } from './components';
import { buildAIRequestText } from './handle';
import { createMessageMetadata } from './types';
import type { ChatInputBarProps, VoiceState } from './const';

export function ChatInputBar({
  input,
  onInputChange,
  onSend,
  onStop,
  isLoading = false,
  isInitialized = true,
  models = [],
  currentModel,
  onModelChange,
  isInSheet = false,
  disableBottomPadding = false,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation('chat');

  // Composer 高度管理
  const { setComposerHeight } = useChatLayout();

  // @ 文件选择面板状态
  const [showFilePanel, setShowFilePanel] = useState(false);

  // 工作区文件列表
  const workspaceFiles = useWorkspaceFiles();

  // 已选中的上下文文件
  const { contextFiles, addFile, removeFile, clearFiles, isSelected } = useContextFiles();

  // 文件搜索
  const { query, setQuery, filteredFiles, clearQuery } = useFileSearch(workspaceFiles);

  // 已选中文件 ID 集合（用于 UI 高亮）
  const selectedIds = useMemo(() => new Set(contextFiles.map((f) => f.id)), [contextFiles]);

  // 语音录制
  const {
    isVoiceMode,
    isTranscribing,
    isRecording,
    meteringLevels,
    formattedDuration,
    startVoice,
    stopVoice,
  } = useVoiceInput({ input, onInputChange });

  // 语音状态对象
  const voiceState: VoiceState = {
    isVoiceMode,
    isTranscribing,
    isRecording,
    meteringLevels,
    formattedDuration,
  };

  // 测量输入框容器高度
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      setComposerHeight(height);
    },
    [setComposerHeight]
  );

  // 底部边距
  const bottomPadding = disableBottomPadding ? 0 : isInSheet ? 12 : insets.bottom + 8;

  const canSend = Boolean(input.trim() && isInitialized && !isLoading);

  // @ 按钮点击
  const handleAtPress = useCallback(() => {
    setShowFilePanel((prev) => !prev);
  }, []);

  // 关闭文件面板
  const handleCloseFilePanel = useCallback(() => {
    setShowFilePanel(false);
    clearQuery();
  }, [clearQuery]);

  // 文件选择（切换选中状态）
  const handleFileSelect = useCallback(
    (file: (typeof workspaceFiles)[number]) => {
      if (isSelected(file.id)) {
        removeFile(file.id);
      } else {
        addFile(file);
        handleCloseFilePanel();
      }
    },
    [isSelected, removeFile, addFile, handleCloseFilePanel]
  );

  // 开始语音（关闭文件面板）
  const handleStartVoice = useCallback(async () => {
    handleCloseFilePanel();
    await startVoice();
  }, [startVoice, handleCloseFilePanel]);

  // 发送消息：构建 AI 请求并传递 metadata
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    // 发送消息，附件信息通过 metadata 传递
    onSend({
      text: buildAIRequestText(text, contextFiles),
      metadata:
        contextFiles.length > 0 ? createMessageMetadata({ attachments: contextFiles }) : undefined,
    });

    // 清空状态
    clearFiles();
    handleCloseFilePanel();
  }, [input, contextFiles, onSend, clearFiles, handleCloseFilePanel]);

  // 渲染输入框内容
  const renderInputContent = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
      {/* 已选文件标签 */}
      {contextFiles.length > 0 && (
        <View style={{ marginHorizontal: -16, marginBottom: 8 }}>
          <ContextFileTags files={contextFiles} onRemove={removeFile} />
        </View>
      )}

      {/* 输入框 */}
      <TextInput
        style={{
          fontSize: 16,
          marginBottom: 10,
          padding: 0,
          color: colors.textPrimary,
          lineHeight: 22,
          maxHeight: 120,
          minHeight: 24,
        }}
        placeholder={isInitialized ? t('askAnything') : '初始化中...'}
        placeholderTextColor={colors.textTertiary}
        value={input}
        onChangeText={onInputChange}
        multiline
        editable={!isLoading && isInitialized}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />

      {/* 底部工具栏 */}
      <InputToolbar
        voiceState={voiceState}
        isLoading={isLoading}
        canSend={canSend}
        showFilePanel={showFilePanel}
        models={models}
        currentModel={currentModel}
        onModelChange={onModelChange}
        onAtPress={handleAtPress}
        onStartVoice={handleStartVoice}
        onStopVoice={stopVoice}
        onSend={handleSend}
        onStop={onStop}
      />
    </View>
  );

  return (
    <View style={{ paddingHorizontal: 12 }} onLayout={handleLayout}>
      {/* 文件选择面板 */}
      <FilePanel
        visible={showFilePanel}
        files={filteredFiles}
        selectedIds={selectedIds}
        query={query}
        onQueryChange={setQuery}
        onFileSelect={handleFileSelect}
      />

      {/* 输入框容器 */}
      <View style={{ paddingBottom: bottomPadding }}>
        <GlassContainer>{renderInputContent()}</GlassContainer>
      </View>
    </View>
  );
}

// 导出类型
export type { ChatInputBarProps, ModelOption, VoiceState, SendMessagePayload } from './const';
export type {
  FileRefAttachment,
  FileEmbedAttachment,
  ImageAttachment,
  MessageAttachment,
  ChatMessageMeta,
} from './types';
export { isFileRef, isFileEmbed, isImage, createFileRefAttachment } from './types';
export { getMessageMeta, createMessageMetadata } from './types';
export { buildAIRequestText, cleanFileRefMarker } from './handle';
