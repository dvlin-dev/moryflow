/**
 * [PROPS]: ChatPromptInputProps - 输入框状态/行为/可用模型
 * [EMITS]: onSubmit/onStop/onError/onOpenSettings - 提交/中断/错误/打开设置
 * [POS]: Chat Pane 输入框，负责消息输入与上下文/模型选择
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
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
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
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  CheckmarkCircle01Icon,
  Mic01Icon,
  Settings02Icon,
  SparklesIcon,
  StopIcon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@anyhunt/ui/components/badge';
import { TIER_DISPLAY_NAMES } from '@/lib/server';
import { McpSelector } from '@/components/ai-elements/mcp-selector';
import { LiveWaveform } from '@anyhunt/ui/components/live-waveform';
import { Icon } from '@anyhunt/ui/components/icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSpeechRecording } from '@/hooks/use-speech-recording';
import { useTranslation } from '@/lib/i18n';

import { ContextFileTags, type ContextFileTag } from '../context-file-tags';
import { FileContextAdder } from '../file-context-adder';
import { TokenUsageIndicator } from '../token-usage-indicator';
import { useWorkspaceFiles } from '../../hooks';
import { createFileRefAttachment } from '../../types/attachment';
import { buildAIRequest } from '../../utils';

import type { ChatPromptInputProps } from './const';
import { enrichFileMetadata, findModel } from './handle';

/** 默认 context window 大小 */
const DEFAULT_CONTEXT_WINDOW = 128000;

export const ChatPromptInput = ({
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
}: ChatPromptInputProps) => {
  const { t } = useTranslation('chat');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFileTag[]>([]);

  // 获取工作区所有文件
  const { files: workspaceFiles } = useWorkspaceFiles(vaultPath ?? null);

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

  // 语音录制 hook
  const handleTranscribed = useCallback((text: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const currentValue = textarea.value;
      const newValue = currentValue ? `${currentValue} ${text}` : text;

      textarea.value = newValue;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
    }
  }, []);

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
      const attachments = contextFiles.map(createFileRefAttachment);

      // 转换为 AI 请求格式（file-ref 拼接到文本，file-embed/image-embed 放入 files）
      const aiRequest = buildAIRequest(payload.text, attachments);

      // 合并原有上传文件和嵌入附件
      const allFiles = [...payload.files.map(enrichFileMetadata), ...aiRequest.files];

      // 提交：text 已包含 [Referenced files: ...]，attachments 用于存储和展示
      onSubmit({
        text: aiRequest.text,
        files: allFiles,
        attachments,
      });

      // 清空已选文件
      setContextFiles([]);
    },
    [isDisabled, onSubmit, contextFiles]
  );

  // 渲染文件引用区域：@ 按钮 + 已引用文件标签
  const renderFileReferenceArea = () => (
    <div className="flex w-full flex-wrap items-center justify-start gap-1.5 px-3 pt-2">
      <FileContextAdder
        disabled={isDisabled}
        allFiles={workspaceFiles}
        existingFiles={contextFiles}
        onAddFile={handleAddContextFile}
      />
      {contextFiles.length > 0 && (
        <ContextFileTags files={contextFiles} onRemove={handleRemoveContextFile} />
      )}
    </div>
  );

  const renderAttachments = () => (
    <PromptInputAttachments className="flex-wrap gap-2 px-3 pt-2">
      {(file) => <PromptInputAttachment key={file.id} data={file} />}
    </PromptInputAttachments>
  );

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

  // 渲染语音按钮
  const renderSpeechButton = () => (
    <InputGroupButton
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleSpeechToggle}
      disabled={isDisabled || isProcessing || canStop}
      aria-label={isRecording ? t('stopRecording') : t('startRecording')}
      className={cn(
        'rounded-full transition-colors',
        isSpeechActive && 'bg-black/40 text-white hover:bg-black/50'
      )}
    >
      {isSpeechActive ? (
        <Icon icon={StopIcon} className="size-3.5 fill-current" />
      ) : (
        <Icon icon={Mic01Icon} className="size-4" />
      )}
    </InputGroupButton>
  );

  const renderActionMenu = () => (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger aria-label={t('addFile')} disabled={isDisabled}>
        <Icon icon={Attachment01Icon} className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent>
        <PromptInputActionAddAttachments />
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
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
                    <Icon icon={ArrowUpRight01Icon} className="size-3" />
                    {TIER_DISPLAY_NAMES[option.requiredTier as keyof typeof TIER_DISPLAY_NAMES] ||
                      t('upgrade')}
                  </Badge>
                ) : selectedModelId === option.id ? (
                  <Icon icon={CheckmarkCircle01Icon} className="ml-auto size-4 shrink-0" />
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
          <Icon icon={Settings02Icon} className="mr-2 size-3.5" />
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
            <Icon icon={ArrowDown01Icon} className="size-3 opacity-50" />
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
        <Icon icon={SparklesIcon} className="size-4" />
        <span>{t('setupModel')}</span>
      </PromptInputButton>
    );

  const renderSubmitAction = () =>
    canStop ? (
      <InputGroupButton
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onStop}
        aria-label={t('stopGenerating')}
        disabled={isDisabled}
        className="rounded-full bg-white text-black hover:bg-gray-100"
      >
        <Icon icon={StopIcon} className="size-4 fill-current" />
      </InputGroupButton>
    ) : (
      <PromptInputSubmit status={status} disabled={isDisabled} className="rounded-full">
        <Icon icon={ArrowUp01Icon} className="size-4" />
      </PromptInputSubmit>
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
          {renderActionMenu()}
          {renderModelSelector()}
          <McpSelector disabled={isDisabled} onOpenSettings={onOpenSettings} />
        </PromptInputTools>
      )}
      <div className="flex items-center gap-2">
        {!isSpeechActive && (
          <TokenUsageIndicator usage={tokenUsage} contextWindow={contextWindow} />
        )}
        {renderSpeechButton()}
        {!isSpeechActive && renderSubmitAction()}
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
      {/* 只在对话进行中显示 plan 面板 */}
      {renderFileReferenceArea()}
      {renderAttachments()}
      {renderTextarea()}
      {renderFooterActions()}
    </PromptInput>
  );
};
