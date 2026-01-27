/**
 * [PROPS]: ChatPromptInputProps - 输入框状态/行为/可用模型/访问模式
 * [EMITS]: onSubmit/onStop/onError/onOpenSettings - 提交/中断/错误/打开设置
 * [POS]: Chat Pane 输入框，负责消息输入与上下文/模型选择（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PromptInputMessage } from '@anyhunt/ui/ai/prompt-input';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from '@anyhunt/ui/ai/prompt-input';
import { InputGroupButton } from '@anyhunt/ui/components/input-group';
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
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CircleCheck,
  File,
  Image,
  Mic,
  Settings,
  Sparkles,
  SquareStop,
} from 'lucide-react';
import { Badge } from '@anyhunt/ui/components/badge';
import { TIER_DISPLAY_NAMES } from '@/lib/server';
import { McpSelector } from '@/components/ai-elements/mcp-selector';
import { LiveWaveform } from '@anyhunt/ui/components/live-waveform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSpeechRecording } from '@/hooks/use-speech-recording';
import { useTranslation } from '@/lib/i18n';

import { ContextFileTags, FileChip, type ContextFileTag } from '../context-file-tags';
import { FileContextAdder } from '../file-context-adder';
import { TokenUsageIndicator } from '../token-usage-indicator';
import { useRecentFiles, useWorkspaceFiles } from '../../hooks';
import { createFileRefAttachment } from '../../types/attachment';
import { buildAIRequest } from '../../utils';

import type { ChatPromptInputProps } from './const';
import { enrichFileMetadata, findModel } from './handle';

/** 默认 context window 大小 */
const DEFAULT_CONTEXT_WINDOW = 128000;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFileTag[]>([]);
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
  const accessMode = mode;
  const hasTextInput = promptController.textInput.value.trim().length > 0;

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
    disabled: isDisabled,
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
    }
  }, [isDisabled]);

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
      setContextFiles([]);
    },
    [isDisabled, onSubmit, contextFiles]
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
      />
    </PromptInputBody>
  );

  const renderActionMenu = () => (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger aria-label={t('addFile')} disabled={isDisabled}>
        <Plus className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent>
        <PromptInputActionAddAttachments />
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );

  const renderPrimaryAction = () => {
    if (canStop) {
      return (
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onStop}
          aria-label={t('stopGenerating')}
          disabled={isDisabled}
          className="rounded-full bg-white text-black hover:bg-gray-100"
        >
          <SquareStop className="size-4 fill-current" />
        </InputGroupButton>
      );
    }

    if (isSpeechActive) {
      return (
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleSpeechToggle}
          aria-label={t('stopRecording')}
          disabled={isDisabled}
          className={cn(
            'rounded-full transition-colors',
            isSpeechActive && 'bg-black/40 text-white hover:bg-black/50'
          )}
        >
          <SquareStop className="size-4 fill-current" />
        </InputGroupButton>
      );
    }

    if (hasTextInput) {
      return (
        <PromptInputSubmit status={status} disabled={isDisabled} className="rounded-full">
          <ArrowUp className="size-4" />
        </PromptInputSubmit>
      );
    }

    return (
      <InputGroupButton
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleSpeechToggle}
        aria-label={t('startRecording')}
        disabled={isDisabled || isProcessing}
        className="rounded-full"
      >
        <Mic className="size-4" />
      </InputGroupButton>
    );
  };

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
            <ArrowDown className="size-3 opacity-50" />
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

  const renderModeSwitch = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          type="button"
          aria-label={accessMode === 'full_access' ? t('fullAccessMode') : t('agentMode')}
          disabled={isDisabled}
          className={cn(
            'gap-1.5',
            accessMode === 'full_access' && 'border-orange-200 text-orange-600'
          )}
        >
          <Sparkles className="size-4" />
          <span>{accessMode === 'full_access' ? t('fullAccessMode') : t('agentMode')}</span>
          <ArrowDown className="size-3 opacity-50" />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={accessMode}
          onValueChange={(value) => {
            if (isDisabled) {
              return;
            }
            onModeChange(value as ChatPromptInputProps['mode']);
          }}
        >
          <DropdownMenuRadioItem value="agent">{t('agentMode')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="full_access">{t('fullAccessMode')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderFooterActions = () => (
    <PromptInputFooter>
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
          {renderModeSwitch()}
          {renderModelSelector()}
          <McpSelector disabled={isDisabled} onOpenSettings={onOpenSettings} />
        </PromptInputTools>
      )}
      <div className="flex items-center gap-2">
        <div className="sr-only">
          <TokenUsageIndicator usage={tokenUsage} contextWindow={contextWindow} />
        </div>
        {!isSpeechActive && renderActionMenu()}
        {!isSpeechActive && (
          <FileContextAdder
            disabled={isDisabled}
            allFiles={workspaceFiles}
            recentFiles={recentFiles}
            existingFiles={contextFiles}
            onAddFile={handleAddContextFile}
            onRefreshRecent={() => {
              refreshRecentFiles();
              refreshWorkspaceFiles();
            }}
            iconOnly
          />
        )}
        {renderPrimaryAction()}
      </div>
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
