/**
 * [PROPS]: ChatPromptInputProps - 输入框状态/行为/可用模型/访问模式
 * [EMITS]: onSubmit/onStop/onError/onOpenSettings - 提交/中断/错误/打开设置
 * [POS]: Chat Pane 输入框，负责消息输入与上下文/模型选择（+ 菜单 / @ 引用）
 * [UPDATE]: 2026-02-02 - 语音入口仅对登录用户开放
 * [UPDATE]: 2026-01-28 - 模型选择箭头尺寸放大提升可读性
 * [UPDATE]: 2026-01-28 - 提交后保留 active 引用，@ 触发索引随文本变更更新
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { PromptInputMessage } from '@anyhunt/ui/ai/prompt-input';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from '@anyhunt/ui/ai/prompt-input';
import { Button } from '@anyhunt/ui/components/button';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
  ModelSelectorFooter,
} from '@anyhunt/ui/ai/model-selector';
import {
  ArrowUpRight,
  ChevronDown,
  CircleCheck,
  File,
  Image,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@anyhunt/ui/components/badge';
import { TIER_DISPLAY_NAMES, useAuth } from '@/lib/server';
import { LiveWaveform } from '@anyhunt/ui/components/live-waveform';
import { toast } from 'sonner';
import { useSpeechRecording } from '@/hooks/use-speech-recording';
import { useTranslation } from '@/lib/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@anyhunt/ui/components/popover';

import { ContextFileTags, FileChip, type ContextFileTag } from '../context-file-tags';
import { TokenUsageIndicator } from '../token-usage-indicator';
import { useRecentFiles, useWorkspaceFiles } from '../../hooks';
import { createFileRefAttachment } from '../../types/attachment';
import { buildAIRequest } from '../../utils';

import type { ChatPromptInputProps } from './const';
import { enrichFileMetadata, findModel } from './handle';
import { detectAtTrigger, removeAtTrigger } from './at-mention';
import { ChatPromptInputPlusMenu } from './plus-menu';
import { ChatPromptInputPrimaryAction } from './primary-action';
import { FileContextPanel } from './file-context-panel';

/** 默认 context window 大小 */
const DEFAULT_CONTEXT_WINDOW = 128000;

const updateAtTriggerIndex = (
  previousValue: string,
  nextValue: string,
  currentIndex: number | null
): number | null => {
  if (currentIndex === null || previousValue === nextValue) {
    return currentIndex;
  }

  let start = 0;
  const minLength = Math.min(previousValue.length, nextValue.length);
  while (start < minLength && previousValue[start] === nextValue[start]) {
    start += 1;
  }

  let prevEnd = previousValue.length - 1;
  let nextEnd = nextValue.length - 1;
  while (prevEnd >= start && nextEnd >= start && previousValue[prevEnd] === nextValue[nextEnd]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }

  const removedCount = Math.max(0, prevEnd - start + 1);
  const addedCount = Math.max(0, nextEnd - start + 1);

  if (currentIndex < start) {
    return currentIndex;
  }
  if (currentIndex >= start + removedCount) {
    return currentIndex + (addedCount - removedCount);
  }

  const insertedSegment = nextValue.slice(start, start + addedCount);
  const insertedAtOffset = insertedSegment.indexOf('@');
  return insertedAtOffset === -1 ? null : start + insertedAtOffset;
};

export const ChatPromptInput = (props: ChatPromptInputProps) => (
  <PromptInputProvider>
    <ChatPromptInputInner {...props} />
  </PromptInputProvider>
);

const ChatPromptInputInner = ({
  status,
  onSubmit,
  onStop,
  onError,
  activeFilePath,
  activeFileContent,
  vaultPath,
  modelGroups,
  selectedModelId,
  onSelectModel,
  disabled,
  onOpenSettings,
  tokenUsage,
  contextWindow = DEFAULT_CONTEXT_WINDOW,
  mode,
  onModeChange,
}: ChatPromptInputProps) => {
  const { t } = useTranslation('chat');
  const { isAuthenticated } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFileTag[]>([]);
  const [atPanelOpen, setAtPanelOpen] = useState(false);
  const [atTriggerIndex, setAtTriggerIndex] = useState<number | null>(null);
  const previousTextRef = useRef('');
  const promptController = usePromptInputController();
  const attachments = usePromptInputAttachments();

  // 获取工作区所有文件
  const { files: workspaceFiles, refresh: refreshWorkspaceFiles } = useWorkspaceFiles(
    vaultPath ?? null
  );
  const { recentFiles, refreshRecentFiles } = useRecentFiles(vaultPath ?? null, workspaceFiles);

  const selectedModel = useMemo(
    () => findModel(modelGroups, selectedModelId),
    [modelGroups, selectedModelId]
  );
  const hasModelOptions = useMemo(
    () => modelGroups.some((group) => group.options.length > 0),
    [modelGroups]
  );
  const canStop = status === 'submitted' || status === 'streaming';
  const isDisabled = Boolean(disabled);
  const canUseVoice = isAuthenticated;
  const accessMode = mode;
  const hasTextInput = promptController.textInput.value.trim().length > 0;
  const hasSendableContent =
    hasTextInput || attachments.files.length > 0 || contextFiles.length > 0;

  // 语音录制 hook
  const handleTranscribed = useCallback(
    (text: string) => {
      const currentValue = promptController.textInput.value;
      const newValue = currentValue ? `${currentValue} ${text}` : text;
      promptController.textInput.setInput(newValue);
      textareaRef.current?.focus();
    },
    [promptController.textInput]
  );

  const handleSpeechError = useCallback(
    (error: Error) => {
      // 根据错误类型显示不同提示
      const message = error.message || t('voiceTranscriptionFailed');
      toast.error(message);
    },
    [t]
  );

  const handleMaxDuration = useCallback(() => {
    toast.info(t('maxRecordingReached'));
  }, [t]);

  const {
    isRecording,
    isProcessing,
    isActive: isSpeechActive,
    formattedDuration,
    toggleRecording: handleSpeechToggle,
    handleStreamReady,
    handleWaveformError,
  } = useSpeechRecording({
    onTranscribed: handleTranscribed,
    onError: handleSpeechError,
    onMaxDuration: handleMaxDuration,
    disabled: isDisabled || !canUseVoice,
  });

  // 同步当前活跃文件到引用列表
  useEffect(() => {
    if (activeFilePath && activeFileContent) {
      const fileName = activeFilePath.split(/[\\/]/).pop() ?? 'current-note.md';
      const fileId = `active-${activeFilePath}`;
      setContextFiles((prev) => {
        // 检查是否已存在
        const exists = prev.some((f) => f.id === fileId);
        if (exists) return prev;
        // 添加当前活跃文件
        return [
          { id: fileId, name: fileName, path: activeFilePath },
          ...prev.filter((f) => !f.id.startsWith('active-')),
        ];
      });
    } else {
      // 移除活跃文件引用
      setContextFiles((prev) => prev.filter((f) => !f.id.startsWith('active-')));
    }
  }, [activeFilePath, activeFileContent]);

  const handleRemoveContextFile = useCallback((id: string) => {
    setContextFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleAddContextFile = useCallback((file: ContextFileTag) => {
    setContextFiles((prev) => {
      const exists = prev.some((f) => f.path === file.path);
      if (exists) return prev;
      return [...prev, file];
    });
  }, []);

  useEffect(() => {
    if (isDisabled) {
      setModelSelectorOpen(false);
      setAtPanelOpen(false);
      setAtTriggerIndex(null);
    }
  }, [isDisabled]);

  useEffect(() => {
    previousTextRef.current = promptController.textInput.value;
  }, [promptController.textInput.value]);

  const handleSubmit = useCallback(
    (payload: PromptInputMessage) => {
      if (isDisabled) {
        return;
      }

      // 构建结构化附件列表
      const contextAttachments = contextFiles.map(createFileRefAttachment);

      // 转换为 AI 请求格式（file-ref 拼接到文本，file-embed/image-embed 放入 files）
      const aiRequest = buildAIRequest(payload.text, contextAttachments);

      // 合并原有上传文件和嵌入附件
      const allFiles = [...payload.files.map(enrichFileMetadata), ...aiRequest.files];

      // 提交：text 已包含 [Referenced files: ...]，attachments 用于存储和展示
      onSubmit({
        text: aiRequest.text,
        files: allFiles,
        attachments: contextAttachments,
      });

      // 清空已选文件
      setContextFiles((prev) => prev.filter((file) => file.id.startsWith('active-')));
    },
    [isDisabled, onSubmit, contextFiles]
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (isDisabled) {
        return;
      }
      const nextValue = event.currentTarget.value;
      const previousValue = previousTextRef.current;
      const syncedAtIndex = updateAtTriggerIndex(previousValue, nextValue, atTriggerIndex);
      previousTextRef.current = nextValue;
      const nativeEvent = event.nativeEvent as InputEvent | undefined;
      const caret = event.currentTarget.selectionStart ?? nextValue.length;
      const triggerIndex = detectAtTrigger({
        previousValue,
        nextValue,
        caretIndex: caret,
        insertedData: nativeEvent?.data,
      });
      const nextTriggerIndex = triggerIndex ?? syncedAtIndex;
      if (nextTriggerIndex === null) {
        setAtPanelOpen(false);
      } else if (triggerIndex !== null) {
        setAtPanelOpen(true);
      }
      if (nextTriggerIndex !== atTriggerIndex) {
        setAtTriggerIndex(nextTriggerIndex);
      }
    },
    [atTriggerIndex, isDisabled]
  );

  const handleAddContextFileFromAt = useCallback(
    (file: ContextFileTag) => {
      handleAddContextFile(file);
      if (atTriggerIndex === null) {
        setAtPanelOpen(false);
        return;
      }
      const currentValue = promptController.textInput.value;
      if (
        atTriggerIndex >= 0 &&
        atTriggerIndex < currentValue.length &&
        currentValue[atTriggerIndex] === '@'
      ) {
        promptController.textInput.setInput(removeAtTrigger(currentValue, atTriggerIndex));
      }
      setAtPanelOpen(false);
      setAtTriggerIndex(null);
      textareaRef.current?.focus();
    },
    [atTriggerIndex, handleAddContextFile, promptController.textInput]
  );

  const renderAttachmentChip = (file: (typeof attachments.files)[number]) => {
    const isImage = Boolean(file.mediaType?.startsWith('image/'));
    const label = file.filename || (isImage ? 'Image' : 'Attachment');
    return (
      <FileChip
        key={file.id}
        icon={isImage ? Image : File}
        label={label}
        tooltip={file.filename ?? undefined}
        removeLabel={t('removeFile')}
        onRemove={() => attachments.remove(file.id)}
      />
    );
  };

  const renderFileChipsRow = () => {
    if (contextFiles.length === 0 && attachments.files.length === 0) {
      return null;
    }
    return (
      <div className="flex w-full flex-wrap items-center gap-2 px-3 pt-2">
        {contextFiles.length > 0 && (
          <ContextFileTags files={contextFiles} onRemove={handleRemoveContextFile} />
        )}
        {attachments.files.map((file) => renderAttachmentChip(file))}
      </div>
    );
  };

  const renderTextarea = () => (
    <PromptInputBody>
      <PromptInputTextarea
        ref={textareaRef}
        placeholder={t('writeMessage')}
        name="message"
        autoComplete="off"
        disabled={isDisabled}
        onChange={handleTextChange}
      />
    </PromptInputBody>
  );

  const renderModelSelectorList = () => (
    <ModelSelectorContent>
      <ModelSelectorList>
        <ModelSelectorEmpty>{t('noModelFound')}</ModelSelectorEmpty>
        {modelGroups.map((group) => (
          <ModelSelectorGroup key={group.label} heading={group.label}>
            {group.options.map((option) => (
              <ModelSelectorItem
                key={option.id}
                value={option.id}
                disabled={option.disabled}
                onSelect={() => {
                  if (option.disabled) {
                    return;
                  }
                  onSelectModel(option.id);
                  setModelSelectorOpen(false);
                }}
              >
                <ModelSelectorName>{option.name}</ModelSelectorName>
                {option.disabled && option.isMembership && option.requiredTier ? (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 text-xs px-1.5 py-0 h-5 gap-0.5"
                  >
                    <ArrowUpRight className="size-3" />
                    {TIER_DISPLAY_NAMES[option.requiredTier as keyof typeof TIER_DISPLAY_NAMES] ||
                      t('upgrade')}
                  </Badge>
                ) : selectedModelId === option.id ? (
                  <CircleCheck className="ml-auto size-4 shrink-0" />
                ) : null}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        ))}
      </ModelSelectorList>
      <ModelSelectorFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => {
            setModelSelectorOpen(false);
            onOpenSettings?.('providers');
          }}
        >
          <Settings className="mr-2 size-3.5" />
          {t('modelSettings')}
        </Button>
      </ModelSelectorFooter>
    </ModelSelectorContent>
  );

  const renderModelSelector = () =>
    hasModelOptions ? (
      <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
        <ModelSelectorTrigger asChild>
          <PromptInputButton aria-label={t('switchModel')} disabled={isDisabled}>
            <span>{selectedModel?.name ?? t('selectModel')}</span>
            <ChevronDown className="size-4.5 opacity-50" />
          </PromptInputButton>
        </ModelSelectorTrigger>
        {renderModelSelectorList()}
      </ModelSelector>
    ) : (
      <PromptInputButton
        type="button"
        aria-label={t('configureModel')}
        disabled={isDisabled}
        onClick={() => onOpenSettings?.('providers')}
      >
        <Sparkles className="size-4" />
        <span>{t('setupModel')}</span>
      </PromptInputButton>
    );

  const renderFooterActions = () => (
    <PromptInputFooter className="relative">
      {/* 录音时左侧显示波形，否则显示工具按钮 */}
      {isSpeechActive ? (
        <div className="flex items-center gap-3">
          <LiveWaveform
            active={isRecording}
            processing={isProcessing}
            mode="static"
            height={24}
            barWidth={2}
            barGap={1}
            barRadius={1}
            sensitivity={1.2}
            className="w-32"
            onStreamReady={handleStreamReady}
            onError={handleWaveformError}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {isProcessing ? t('transcribing') : formattedDuration}
          </span>
        </div>
      ) : (
        <PromptInputTools>
          <ChatPromptInputPlusMenu
            disabled={isDisabled}
            mode={accessMode}
            onModeChange={onModeChange}
            onOpenSettings={onOpenSettings}
            onOpenFileDialog={attachments.openFileDialog}
            allFiles={workspaceFiles}
            recentFiles={recentFiles}
            existingFiles={contextFiles}
            onAddContextFile={handleAddContextFile}
            onRefreshRecent={() => {
              refreshRecentFiles();
              refreshWorkspaceFiles();
            }}
          />
          {renderModelSelector()}
        </PromptInputTools>
      )}
      <div className="flex items-center gap-2">
        <div className="sr-only">
          <TokenUsageIndicator usage={tokenUsage} contextWindow={contextWindow} />
        </div>
        <ChatPromptInputPrimaryAction
          canStop={canStop}
          canUseVoice={canUseVoice}
          isSpeechActive={isSpeechActive}
          isProcessing={isProcessing}
          hasSendableContent={hasSendableContent}
          disabled={isDisabled}
          onStop={onStop}
          onToggleRecording={handleSpeechToggle}
          labels={{
            stopGenerating: t('stopGenerating'),
            stopRecording: t('stopRecording'),
            send: t('sendMessage'),
            startRecording: t('startRecording'),
          }}
        />
      </div>
      <Popover
        open={atPanelOpen}
        onOpenChange={(next) => {
          setAtPanelOpen(next);
          if (!next) {
            setAtTriggerIndex(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <span aria-hidden className="absolute left-3 top-0 h-0 w-0" />
        </PopoverTrigger>
        <PopoverContent align="start" side="top" sideOffset={8} className="w-72 p-0">
          <FileContextPanel
            autoFocus
            disabled={isDisabled}
            allFiles={workspaceFiles}
            recentFiles={recentFiles}
            existingFiles={contextFiles}
            onAddFile={handleAddContextFileFromAt}
            onRefreshRecent={() => {
              refreshRecentFiles();
              refreshWorkspaceFiles();
            }}
            searchPlaceholder={t('searchDocs')}
            recentLabel={t('recentFiles')}
            allFilesLabel={t('allFiles')}
            emptySearchLabel={t('notFound')}
            emptyNoFilesLabel={t('noOpenDocs')}
            emptyAllAddedLabel={t('allDocsAdded')}
            emptyNoRecentLabel={t('noRecentFiles')}
          />
        </PopoverContent>
      </Popover>
    </PromptInputFooter>
  );

  return (
    <PromptInput
      onSubmit={handleSubmit}
      onError={onError}
      globalDrop
      multiple
      className="**:data-[slot=input-group]:rounded-xl **:data-[slot=input-group]:shadow-lg **:data-[slot=input-group]:border-border-muted **:data-[slot=input-group]:overflow-hidden"
    >
      {renderFileChipsRow()}
      {renderTextarea()}
      {renderFooterActions()}
    </PromptInput>
  );
};
