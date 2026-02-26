/**
 * [PROVIDES]: useChatPromptInputController - 输入框状态与提交编排控制器
 * [DEPENDS]: PromptInput hooks + Speech/Skills/File hooks
 * [POS]: ChatPromptInput 逻辑层，隔离输入态机与提交流水线
 * [UPDATE]: 2026-02-26 - 从 ChatPromptInput 拆出状态与行为编排
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { PromptInputMessage } from '@moryflow/ui/ai/prompt-input';
import { usePromptInputAttachments, usePromptInputController } from '@moryflow/ui/ai/prompt-input';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { TIER_DISPLAY_NAMES, useAuth } from '@/lib/server';
import { useSpeechRecording } from '@/hooks/use-speech-recording';
import { useAgentSkills } from '@/hooks/use-agent-skills';

import { useRecentFiles, useWorkspaceFiles } from '../../hooks';
import { createFileRefAttachment } from '../../types/attachment';
import { buildAIRequest } from '../../utils';
import { detectAtTrigger, removeAtTrigger } from './at-mention';
import { enrichFileMetadata, findModel } from './handle';
import type { ChatPromptInputProps } from './const';
import type { ContextFileTag } from '../context-file-tags';

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

export const useChatPromptInputController = ({
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
}: Pick<
  ChatPromptInputProps,
  | 'status'
  | 'onSubmit'
  | 'onError'
  | 'activeFilePath'
  | 'activeFileContent'
  | 'vaultPath'
  | 'modelGroups'
  | 'selectedModelId'
  | 'disabled'
  | 'selectedSkillName'
  | 'onSelectSkillName'
>) => {
  const { t } = useTranslation('chat');
  const { isAuthenticated } = useAuth();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousTextRef = useRef('');

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFileTag[]>([]);
  const [atPanelOpen, setAtPanelOpen] = useState(false);
  const [atTriggerIndex, setAtTriggerIndex] = useState<number | null>(null);
  const [slashSkillPanelOpen, setSlashSkillPanelOpen] = useState(false);

  const promptController = usePromptInputController();
  const attachments = usePromptInputAttachments();
  const { skills, enabledSkills, refresh: refreshSkills } = useAgentSkills();

  const { files: workspaceFiles, refresh: refreshWorkspaceFiles } = useWorkspaceFiles(vaultPath ?? null);
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
  const hasTextInput = promptController.textInput.value.trim().length > 0;
  const hasSendableContent =
    hasTextInput || attachments.files.length > 0 || contextFiles.length > 0;
  const selectedSkill = useMemo(
    () => skills.find((item) => item.name === selectedSkillName) ?? null,
    [selectedSkillName, skills]
  );

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

  useEffect(() => {
    if (activeFilePath && activeFileContent) {
      const fileName = activeFilePath.split(/[\\/]/).pop() ?? 'current-note.md';
      const fileId = `active-${activeFilePath}`;
      setContextFiles((prev) => {
        const exists = prev.some((file) => file.id === fileId);
        if (exists) {
          return prev;
        }
        return [
          { id: fileId, name: fileName, path: activeFilePath },
          ...prev.filter((file) => !file.id.startsWith('active-')),
        ];
      });
      return;
    }

    setContextFiles((prev) => prev.filter((file) => !file.id.startsWith('active-')));
  }, [activeFilePath, activeFileContent]);

  const handleRemoveContextFile = useCallback((id: string) => {
    setContextFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const handleAddContextFile = useCallback((file: ContextFileTag) => {
    setContextFiles((prev) => {
      const exists = prev.some((item) => item.path === file.path);
      if (exists) {
        return prev;
      }
      return [...prev, file];
    });
  }, []);

  useEffect(() => {
    if (!isDisabled) {
      return;
    }
    setModelSelectorOpen(false);
    setAtPanelOpen(false);
    setSlashSkillPanelOpen(false);
    setAtTriggerIndex(null);
  }, [isDisabled]);

  useEffect(() => {
    previousTextRef.current = promptController.textInput.value;
  }, [promptController.textInput.value]);

  const handleSubmit = useCallback(
    (payload: PromptInputMessage) => {
      if (isDisabled) {
        return;
      }

      let effectiveSelectedSkillName =
        selectedSkillName && selectedSkillName.trim().length > 0 ? selectedSkillName.trim() : null;
      let effectiveSelectedSkill: { name: string; title?: string } | null = null;

      if (effectiveSelectedSkillName) {
        const availableSkill = skills.find((item) => item.name === effectiveSelectedSkillName);
        if (!availableSkill || !availableSkill.enabled) {
          effectiveSelectedSkillName = null;
          onSelectSkillName?.(null);
          toast.warning('Selected skill is unavailable. Continuing without it.');
        } else {
          effectiveSelectedSkill = {
            name: availableSkill.name,
            title: availableSkill.title,
          };
        }
      }

      const contextAttachments = contextFiles.map(createFileRefAttachment);
      const aiRequest = buildAIRequest(payload.text, contextAttachments);
      const allFiles = [...payload.files.map(enrichFileMetadata), ...aiRequest.files];

      if (effectiveSelectedSkill) {
        onSelectSkillName?.(null);
      }
      setContextFiles((prev) => prev.filter((file) => file.id.startsWith('active-')));

      void Promise.resolve(
        onSubmit({
          text: aiRequest.text,
          files: allFiles,
          attachments: contextAttachments,
          selectedSkillName: effectiveSelectedSkillName,
          selectedSkill: effectiveSelectedSkill,
        })
      ).catch(() => {
        onError?.({
          code: 'submit',
          message: 'Failed to submit message.',
        });
      });
    },
    [isDisabled, selectedSkillName, skills, onSelectSkillName, contextFiles, onSubmit, onError]
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
      const shouldOpenSlashSkillPanel =
        nextValue === '/' && previousValue.length === 0 && caret === 1;

      if (shouldOpenSlashSkillPanel) {
        setSlashSkillPanelOpen(true);
        setAtPanelOpen(false);
      } else if (nextValue !== '/') {
        setSlashSkillPanelOpen(false);
      }

      if (nextTriggerIndex === null) {
        setAtPanelOpen(false);
      } else if (triggerIndex !== null) {
        setAtPanelOpen(true);
        setSlashSkillPanelOpen(false);
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
      const shouldStripTrigger =
        atTriggerIndex >= 0 &&
        atTriggerIndex < currentValue.length &&
        currentValue[atTriggerIndex] === '@';

      if (shouldStripTrigger) {
        promptController.textInput.setInput(removeAtTrigger(currentValue, atTriggerIndex));
      }

      setAtPanelOpen(false);
      setAtTriggerIndex(null);
      textareaRef.current?.focus();
    },
    [handleAddContextFile, atTriggerIndex, promptController.textInput]
  );

  const handleSelectSkill = useCallback(
    (skillName: string) => {
      onSelectSkillName?.(skillName);
      setSlashSkillPanelOpen(false);
      textareaRef.current?.focus();
    },
    [onSelectSkillName]
  );

  const handleSelectSkillFromSlash = useCallback(
    (skillName: string) => {
      onSelectSkillName?.(skillName);
      promptController.textInput.clear();
      previousTextRef.current = '';
      setSlashSkillPanelOpen(false);
      textareaRef.current?.focus();
    },
    [onSelectSkillName, promptController.textInput]
  );

  const handleClearSelectedSkill = useCallback(() => {
    onSelectSkillName?.(null);
    textareaRef.current?.focus();
  }, [onSelectSkillName]);

  return {
    t,
    tierDisplayNames: TIER_DISPLAY_NAMES,
    textareaRef,
    promptController,
    attachments,
    modelSelectorOpen,
    setModelSelectorOpen,
    contextFiles,
    atPanelOpen,
    setAtPanelOpen,
    atTriggerIndex,
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
  };
};
