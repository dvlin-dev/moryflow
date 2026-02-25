/**
 * [PROPS]: ChatPromptInputPrimaryActionProps - 主操作按钮状态与行为
 * [EMITS]: onStop/onToggleRecording - 终止发送/切换录音
 * [POS]: Chat Prompt 输入框主操作按钮（语音/发送/终止统一样式）
 * [UPDATE]: 2026-01-28 - 终止按钮实心图标缩小并对齐发送色值
 * [UPDATE]: 2026-02-02 - 未登录时隐藏语音入口，仅保留不可用发送态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ArrowUp, Mic, Square } from 'lucide-react';
import { InputGroupButton } from '@moryflow/ui/components/input-group';
import { cn } from '@/lib/utils';

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
        <ArrowUp className="size-4" />
      </InputGroupButton>
    );
  }

  if (!canUseVoice) {
    return (
      <InputGroupButton {...commonProps} type="button" aria-label={labels.send} disabled>
        <ArrowUp className="size-4" />
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
      <Mic className="size-4" />
    </InputGroupButton>
  );
};
