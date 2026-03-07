/**
 * [PROPS]: ChatPromptInputPrimaryActionProps - 主操作按钮状态与行为
 * [EMITS]: onStop/onToggleRecording - 终止发送/切换录音
 * [POS]: Chat Prompt 输入框主操作按钮（语音/发送/终止统一样式）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { ArrowUp, Mic, Square } from 'lucide-react';
import { InputGroupButton } from '@moryflow/ui/components/input-group';
import { cn } from '@/lib/utils';

const PRIMARY_ACTION_ICON_SIZE = 17;
const PRIMARY_ACTION_ICON_STROKE_WIDTH = 2.15;

export type ChatPromptInputPrimaryActionProps = {
  canStop: boolean;
  canUseVoice: boolean;
  isSpeechActive: boolean;
  isProcessing: boolean;
  hasSendableContent: boolean;
  disabled?: boolean;
  onStop: () => void;
  onToggleRecording: () => void;
  labels: {
    stopGenerating: string;
    stopRecording: string;
    send: string;
    startRecording: string;
  };
  className?: string;
};

export const ChatPromptInputPrimaryAction = ({
  canStop,
  canUseVoice,
  isSpeechActive,
  isProcessing,
  hasSendableContent,
  disabled,
  onStop,
  onToggleRecording,
  labels,
  className,
}: ChatPromptInputPrimaryActionProps) => {
  const baseClassName = cn('rounded-full', className);
  const commonProps = {
    variant: 'default' as const,
    size: 'icon-sm' as const,
    className: baseClassName,
  };

  if (canStop) {
    return (
      <InputGroupButton
        {...commonProps}
        type="button"
        aria-label={labels.stopGenerating}
        onClick={onStop}
        disabled={disabled}
      >
        <Square className="size-3 fill-current" strokeWidth={0} />
      </InputGroupButton>
    );
  }

  if (isSpeechActive) {
    return (
      <InputGroupButton
        {...commonProps}
        type="button"
        aria-label={labels.stopRecording}
        onClick={onToggleRecording}
        disabled={disabled}
      >
        <Square className="size-3 fill-current" strokeWidth={0} />
      </InputGroupButton>
    );
  }

  if (hasSendableContent) {
    return (
      <InputGroupButton {...commonProps} type="submit" aria-label={labels.send} disabled={disabled}>
        <ArrowUp
          aria-hidden
          size={PRIMARY_ACTION_ICON_SIZE}
          strokeWidth={PRIMARY_ACTION_ICON_STROKE_WIDTH}
        />
      </InputGroupButton>
    );
  }

  if (!canUseVoice) {
    return (
      <InputGroupButton {...commonProps} type="button" aria-label={labels.send} disabled>
        <ArrowUp
          aria-hidden
          size={PRIMARY_ACTION_ICON_SIZE}
          strokeWidth={PRIMARY_ACTION_ICON_STROKE_WIDTH}
        />
      </InputGroupButton>
    );
  }

  return (
    <InputGroupButton
      {...commonProps}
      type="button"
      aria-label={labels.startRecording}
      onClick={onToggleRecording}
      disabled={disabled || isProcessing}
    >
      <Mic
        aria-hidden
        size={PRIMARY_ACTION_ICON_SIZE}
        strokeWidth={PRIMARY_ACTION_ICON_STROKE_WIDTH}
      />
    </InputGroupButton>
  );
};
