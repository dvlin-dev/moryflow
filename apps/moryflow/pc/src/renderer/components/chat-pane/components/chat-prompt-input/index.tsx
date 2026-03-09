/**
 * [PROPS]: ChatPromptInputProps - 输入框状态/行为/可用模型/访问模式
 * [EMITS]: onSubmit/onStop/onError/onOpenSettings - 提交/中断/错误/打开设置
 * [POS]: Chat Pane 输入框，负责消息输入与上下文/模型选择（+ 菜单 / @ 引用）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputTools,
} from '@moryflow/ui/ai/prompt-input';
import { LiveWaveform } from '@moryflow/ui/components/live-waveform';
import { cn } from '@/lib/utils';

import type { ChatPromptInputProps } from './const';
import { ChatPromptInputPlusMenu } from './plus-menu';
import { ChatPromptInputPrimaryAction } from './primary-action';
import { ChatPromptInputAccessModeSelector } from './chat-prompt-input-access-mode-selector';
import { ChatPromptInputModelSelector } from './chat-prompt-input-model-selector';
import { ChatPromptInputThinkingSelector } from './chat-prompt-input-thinking-selector';
import { ChatPromptInputOverlays } from './chat-prompt-input-overlays';
import { buildChatPromptInputViewModel } from './chat-prompt-input-view-model';
import {
  ChatPromptOverlayStoreProvider,
  useSyncChatPromptOverlayStore,
} from './chat-prompt-overlay-store';
import { useChatPromptInputController } from './use-chat-prompt-input-controller';
import { ChipHintBadge, ContextFileTags, FileChip } from '../context-file-tags';
import { TokenUsageIndicator } from '../token-usage-indicator';

/** 默认 context window 大小 */
const DEFAULT_CONTEXT_WINDOW = 128000;

export const ChatPromptInput = (props: ChatPromptInputProps) => (
  <PromptInputProvider>
    <ChatPromptOverlayStoreProvider>
      <ChatPromptInputInner {...props} />
    </ChatPromptOverlayStoreProvider>
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
  selectedThinkingLevel,
  selectedThinkingProfile,
  onSelectThinkingLevel,
  disabled,
  onOpenSettings,
  tokenUsage,
  contextWindow = DEFAULT_CONTEXT_WINDOW,
  mode,
  onModeChange,
  selectedSkillName,
  onSelectSkillName,
  variant = 'default',
  suggestions = [],
  className,
}: ChatPromptInputProps) => {
  const {
    t,
    tierDisplayNames,
    textareaRef,
    attachments,
    modelSelectorOpen,
    setModelSelectorOpen,
    contextFiles,
    atPanelOpen,
    setAtPanelOpen,
    setAtTriggerIndex,
    slashSkillPanelOpen,
    setSlashSkillPanelOpen,
    workspaceFiles,
    recentFiles,
    selectedModel,
    hasModelOptions,
    canStop,
    isDisabled,
    canUseVoice,
    hasSendableContent,
    selectedSkill,
    selectionReference,
    isRecording,
    isProcessing,
    isSpeechActive,
    formattedDuration,
    handleSpeechToggle,
    handleStreamReady,
    handleWaveformError,
    enabledSkills,
    refreshSkills,
    refreshWorkspaceFiles,
    refreshRecentFiles,
    handleSubmit,
    handleTextChange,
    handleRemoveContextFile,
    handleAddContextFile,
    handleAddContextFileFromAt,
    handleSelectSkill,
    handleSelectSkillFromSlash,
    handleClearSelectedSkill,
    handleClearSelectionReference,
    promptController,
  } = useChatPromptInputController({
    status,
    onSubmit,
    onError,
    activeFilePath,
    activeFileContent,
    vaultPath,
    modelGroups,
    selectedModelId,
    disabled,
    selectedSkillName,
    onSelectSkillName,
  });

  const refreshFiles = useCallback(() => {
    refreshRecentFiles();
    refreshWorkspaceFiles();
  }, [refreshRecentFiles, refreshWorkspaceFiles]);

  const handleRefreshSkills = useCallback(() => {
    void refreshSkills();
  }, [refreshSkills]);

  const handleApplySuggestion = useCallback(
    (prompt: string) => {
      promptController.textInput.setInput(prompt);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [promptController.textInput, textareaRef]
  );

  useSyncChatPromptOverlayStore({
    isDisabled,
    atPanelOpen,
    setAtPanelOpen,
    setAtTriggerIndex,
    slashSkillPanelOpen,
    setSlashSkillPanelOpen,
    workspaceFiles,
    recentFiles,
    contextFiles,
    onAddContextFileFromAt: handleAddContextFileFromAt,
    onRefreshFiles: refreshFiles,
    skills: enabledSkills,
    onSelectSkillFromSlash: handleSelectSkillFromSlash,
    onRefreshSkills: handleRefreshSkills,
    labels: {
      searchDocs: t('searchDocs'),
      recentFiles: t('recentFiles'),
      allFiles: t('allFiles'),
      notFound: t('notFound'),
      noOpenDocs: t('noOpenDocs'),
      allDocsAdded: t('allDocsAdded'),
      noRecentFiles: t('noRecentFiles'),
      searchSkills: t('searchSkills'),
      noSkillsFound: t('noSkillsFound'),
      enabledSkills: t('enabledSkills'),
    },
  });

  const viewModel = buildChatPromptInputViewModel({
    attachments: attachments.files,
    selectedSkill,
    selectionReference,
    contextFileCount: contextFiles.length,
    isSpeechActive,
    isProcessing,
    formattedDuration,
    labels: {
      imageLabel: t('imageLabel'),
      attachmentLabel: t('attachmentLabel'),
      transcribing: t('transcribing'),
    },
    removeLabels: {
      removeFile: t('removeFile'),
      removeSelectedSkill: t('removeSelectedSkill'),
      removeReference: t('removeReference'),
    },
    handlers: {
      onClearSelectedSkill: handleClearSelectedSkill,
      onClearSelectionReference: handleClearSelectionReference,
      onRemoveAttachment: attachments.remove,
    },
  });

  const renderFileChipsRow = () => {
    if (!viewModel.shouldRenderChipsRow) {
      return null;
    }

    return (
      <div className="flex w-full flex-wrap items-center gap-2 px-3 pt-2">
        {viewModel.fileChips.map((chip) => (
          <FileChip
            key={chip.key}
            icon={chip.icon}
            label={chip.label}
            tooltip={chip.tooltip}
            removeLabel={chip.removeLabel}
            onRemove={chip.onRemove}
          />
        ))}
        {viewModel.showContentTruncatedBadge && <ChipHintBadge label={t('contentTruncated')} />}
        {viewModel.shouldRenderContextFiles && (
          <ContextFileTags files={contextFiles} onRemove={handleRemoveContextFile} />
        )}
      </div>
    );
  };

  const renderFooterLeft = () => {
    if (viewModel.footerLeft.mode === 'speech') {
      return (
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
          <span className="font-mono text-xs text-muted-foreground">
            {viewModel.footerLeft.durationLabel}
          </span>
        </div>
      );
    }

    return (
      <PromptInputTools className="gap-0.5 [&>*]:self-center">
        <ChatPromptInputPlusMenu
          disabled={isDisabled}
          onOpenFileDialog={attachments.openFileDialog}
          skills={enabledSkills}
          onSelectSkill={(skill) => handleSelectSkill(skill.name)}
          onRefreshSkills={handleRefreshSkills}
          allFiles={workspaceFiles}
          recentFiles={recentFiles}
          existingFiles={contextFiles}
          onAddContextFile={handleAddContextFile}
          onRefreshRecent={refreshFiles}
          onOpenSettings={onOpenSettings}
        />
        <ChatPromptInputAccessModeSelector
          disabled={isDisabled}
          mode={mode}
          onModeChange={onModeChange}
          labels={{
            defaultPermission: t('accessModeDefaultPermission'),
            fullAccessPermission: t('accessModeFullAccess'),
            appliesGlobal: t('accessModeAppliesGlobal'),
          }}
        />

        <ChatPromptInputModelSelector
          disabled={isDisabled}
          hasModelOptions={hasModelOptions}
          modelGroups={modelGroups}
          selectedModelId={selectedModelId}
          selectedModelName={selectedModel?.name}
          modelSelectorOpen={modelSelectorOpen}
          onModelSelectorOpenChange={setModelSelectorOpen}
          onSelectModel={onSelectModel}
          onOpenSettings={onOpenSettings}
          labels={{
            noModelFound: t('noModelFound'),
            switchModel: t('switchModel'),
            selectModel: t('selectModel'),
            configureModel: t('configureModel'),
            setupModel: t('setupModel'),
            modelSettings: t('modelSettings'),
            upgrade: t('upgrade'),
          }}
          tierDisplayNames={tierDisplayNames}
        />
        <ChatPromptInputThinkingSelector
          disabled={isDisabled}
          selectedModelId={selectedModelId}
          selectedThinkingLevel={selectedThinkingLevel}
          thinkingProfile={selectedThinkingProfile ?? selectedModel?.thinkingProfile}
          onSelectThinkingLevel={onSelectThinkingLevel}
          labels={{
            switchThinkingLevel: t('switchThinkingLevel'),
            noLevelAvailable: t('noThinkingLevelAvailable'),
            offLabel: t('thinkingOffLabel'),
          }}
        />
      </PromptInputTools>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <PromptInput
        onSubmit={handleSubmit}
        onError={onError}
        globalDrop
        multiple
        className="**:data-[slot=input-group]:rounded-xl **:data-[slot=input-group]:shadow-lg **:data-[slot=input-group]:border-border-muted **:data-[slot=input-group]:overflow-hidden"
      >
        {renderFileChipsRow()}

        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={t('writeMessage')}
            name="message"
            autoComplete="off"
            disabled={isDisabled}
            onChange={handleTextChange}
            className={variant === 'prethread' ? 'min-h-20 text-[15px]' : undefined}
          />
        </PromptInputBody>

        <PromptInputFooter className="relative">
          {renderFooterLeft()}

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

          <ChatPromptInputOverlays />
        </PromptInputFooter>
      </PromptInput>
      {suggestions.length > 0 ? (
        <div
          className={cn(
            'mt-4 grid gap-2',
            variant === 'prethread' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleApplySuggestion(suggestion.prompt)}
              className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left shadow-sm transition-colors duration-150 hover:border-foreground/20 hover:bg-accent/40"
            >
              <div className="text-[13px] font-medium text-foreground">{suggestion.title}</div>
              <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                {suggestion.prompt}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
