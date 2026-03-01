/**
 * [PROPS]: ChatPromptInputProps - 输入框状态/行为/可用模型/访问模式
 * [EMITS]: onSubmit/onStop/onError/onOpenSettings - 提交/中断/错误/打开设置
 * [POS]: Chat Pane 输入框，负责消息输入与上下文/模型选择（+ 菜单 / @ 引用）
 * [UPDATE]: 2026-03-01 - 访问权限入口文案 key 迁移为 `accessMode*` 语义键，避免复用 `agentMode*` 造成语义漂移
 * [UPDATE]: 2026-03-01 - 工具栏视觉二次对齐：统一按钮行内粗细与垂直中心，避免左侧入口和模型按钮错位
 * [UPDATE]: 2026-03-01 - 输入栏工具按钮统一收敛：缩小圆角/外框并减小按钮间距
 * [UPDATE]: 2026-03-01 - 访问模式入口从 + 子菜单迁出，改为独立 icon 下拉按钮
 * [UPDATE]: 2026-02-26 - 固定 overlay store 刷新回调引用，避免 `shouldSync` 在每次 render 误判触发
 * [UPDATE]: 2026-02-26 - 恢复 thinking 第二下拉渲染（仅支持模型展示），修复 thinking UI 入口回归
 * [UPDATE]: 2026-02-26 - 输入状态与提交编排拆分到 controller hook 与子片段组件
 * [UPDATE]: 2026-02-26 - 输入浮层改为 store-first：overlays/file-panel 就地 selector 取数
 * [UPDATE]: 2026-02-11 - 发送链路改为异步执行（fire-and-forget），确保发送后输入框/skill/context 立即清空
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback } from 'react';
import { File, Image, Wrench } from 'lucide-react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputTools,
} from '@moryflow/ui/ai/prompt-input';
import { LiveWaveform } from '@moryflow/ui/components/live-waveform';

import type { ChatPromptInputProps } from './const';
import { ChatPromptInputPlusMenu } from './plus-menu';
import { ChatPromptInputPrimaryAction } from './primary-action';
import { ChatPromptInputAccessModeSelector } from './chat-prompt-input-access-mode-selector';
import { ChatPromptInputModelSelector } from './chat-prompt-input-model-selector';
import { ChatPromptInputThinkingSelector } from './chat-prompt-input-thinking-selector';
import { ChatPromptInputOverlays } from './chat-prompt-input-overlays';
import { useSyncChatPromptOverlayStore } from './chat-prompt-overlay-store';
import { useChatPromptInputController } from './use-chat-prompt-input-controller';
import { ContextFileTags, FileChip } from '../context-file-tags';
import { TokenUsageIndicator } from '../token-usage-indicator';

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
      searchSkills: 'Search skills',
      noSkillsFound: 'No skills found',
      enabledSkills: 'Enabled Skills',
    },
  });

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
    if (!selectedSkill && contextFiles.length === 0 && attachments.files.length === 0) {
      return null;
    }

    return (
      <div className="flex w-full flex-wrap items-center gap-2 px-3 pt-2">
        {selectedSkill ? (
          <FileChip
            icon={Wrench}
            label={selectedSkill.title}
            tooltip={selectedSkill.description}
            removeLabel="Remove selected skill"
            onRemove={handleClearSelectedSkill}
          />
        ) : null}
        {contextFiles.length > 0 ? (
          <ContextFileTags files={contextFiles} onRemove={handleRemoveContextFile} />
        ) : null}
        {attachments.files.map((file) => renderAttachmentChip(file))}
      </div>
    );
  };

  return (
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
        />
      </PromptInputBody>

      <PromptInputFooter className="relative">
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
            <span className="font-mono text-xs text-muted-foreground">
              {isProcessing ? t('transcribing') : formattedDuration}
            </span>
          </div>
        ) : (
          <PromptInputTools className="gap-0.5 [&>*]:self-center">
            <ChatPromptInputPlusMenu
              disabled={isDisabled}
              onOpenSettings={onOpenSettings}
              onOpenFileDialog={attachments.openFileDialog}
              skills={enabledSkills}
              onSelectSkill={(skill) => handleSelectSkill(skill.name)}
              onRefreshSkills={handleRefreshSkills}
              allFiles={workspaceFiles}
              recentFiles={recentFiles}
              existingFiles={contextFiles}
              onAddContextFile={handleAddContextFile}
              onRefreshRecent={refreshFiles}
            />
            <ChatPromptInputAccessModeSelector
              disabled={isDisabled}
              mode={mode}
              onModeChange={onModeChange}
              labels={{
                defaultPermission: t('accessModeDefaultPermission'),
                fullAccessPermission: t('accessModeFullAccess'),
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
                switchThinkingLevel: 'Switch thinking level',
                noLevelAvailable: 'No level available',
                offLabel: 'Off',
              }}
            />
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

        <ChatPromptInputOverlays />
      </PromptInputFooter>
    </PromptInput>
  );
};
