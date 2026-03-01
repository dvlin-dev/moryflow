/**
 * [PROPS]: ChatPromptInputAccessModeSelectorProps - 会话访问模式按钮与下拉详情
 * [EMITS]: onModeChange - 切换会话访问模式
 * [POS]: Chat Prompt 输入框访问模式入口（位于 + 后、模型选择前）
 * [UPDATE]: 2026-03-01 - 访问模式图标改为统一线性图标（Shield/Infinity），修正基线偏移并统一粗细
 * [UPDATE]: 2026-03-01 - 下拉项移除前置 icon；入口按钮收紧尺寸并放大 icon
 * [UPDATE]: 2026-03-01 - 与输入栏其它按钮统一圆角/尺寸规范（小圆角 + 紧凑外框）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Infinity as InfinityIcon, Shield } from 'lucide-react';
import { PromptInputButton } from '@moryflow/ui/ai/prompt-input/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu';

import type { ChatPromptInputProps } from './const';

export type ChatPromptInputAccessModeSelectorProps = {
  disabled: boolean;
  mode: ChatPromptInputProps['mode'];
  onModeChange: (mode: ChatPromptInputProps['mode']) => void;
  labels: {
    defaultPermission: string;
    fullAccessPermission: string;
  };
};

const TOOL_ICON_BUTTON_CLASS = 'size-7 rounded-sm p-0';
const TOOL_ICON_SIZE = 17;
const TOOL_ICON_STROKE_WIDTH = 1.85;

export const ChatPromptInputAccessModeSelector = ({
  disabled,
  mode,
  onModeChange,
  labels,
}: ChatPromptInputAccessModeSelectorProps) => {
  const activeLabel =
    mode === 'full_access' ? labels.fullAccessPermission : labels.defaultPermission;
  const ariaLabel = activeLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-label={ariaLabel}
          disabled={disabled}
          className={TOOL_ICON_BUTTON_CLASS}
        >
          {mode === 'full_access' ? (
            <InfinityIcon aria-hidden size={TOOL_ICON_SIZE} strokeWidth={TOOL_ICON_STROKE_WIDTH} />
          ) : (
            <Shield aria-hidden size={TOOL_ICON_SIZE} strokeWidth={TOOL_ICON_STROKE_WIDTH} />
          )}
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-56">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            if (disabled) {
              return;
            }
            if (value !== 'agent' && value !== 'full_access') {
              return;
            }
            onModeChange(value);
          }}
        >
          <DropdownMenuRadioItem value="agent">
            <span>{labels.defaultPermission}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="full_access">
            <span>{labels.fullAccessPermission}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
