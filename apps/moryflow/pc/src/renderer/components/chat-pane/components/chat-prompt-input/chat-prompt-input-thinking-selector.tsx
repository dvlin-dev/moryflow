/**
 * [PROPS]: ChatPromptInputThinkingSelectorProps - thinking 选择器渲染参数
 * [EMITS]: onSelectThinkingLevel
 * [POS]: ChatPromptInput thinking 第二下拉（仅在模型支持多等级时显示）
 * [UPDATE]: 2026-03-01 - 下拉项详情简化为仅显示等级名称，移除每项参数明细文本
 * [UPDATE]: 2026-03-01 - 触发按钮文案简化为“仅显示等级”，移除等级参数拼接并与模型按钮文字规格保持一致
 * [UPDATE]: 2026-03-01 - 调整文字按钮视觉重量：移除 text-xs、统一 chevron 粗细并提升行内对齐
 * [UPDATE]: 2026-03-01 - 输入栏按钮风格统一：触发器改为紧凑高度与小圆角
 * [UPDATE]: 2026-02-26 - 从 ChatPromptInput 抽离 thinking 选择器并修复 UI 入口回归
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { PromptInputButton } from '@moryflow/ui/ai/prompt-input';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@moryflow/ui/ai/model-selector';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';
import {
  resolveActiveThinkingLevel,
  shouldRenderThinkingSelector,
} from './chat-prompt-input-thinking-selector.utils';

const TOOL_TEXT_BUTTON_CLASS = 'h-7 rounded-sm px-2 gap-1.5 leading-none';
const TOOL_CHEVRON_SIZE = 16;
const TOOL_CHEVRON_STROKE_WIDTH = 2.15;

type ChatPromptInputThinkingSelectorLabels = {
  switchThinkingLevel: string;
  noLevelAvailable: string;
  offLabel: string;
};

export type ChatPromptInputThinkingSelectorProps = {
  disabled: boolean;
  selectedModelId?: string | null;
  selectedThinkingLevel?: string | null;
  thinkingProfile?: ModelThinkingProfile;
  onSelectThinkingLevel: (level: string) => void;
  labels: ChatPromptInputThinkingSelectorLabels;
};

export const ChatPromptInputThinkingSelector = ({
  disabled,
  selectedModelId,
  selectedThinkingLevel,
  thinkingProfile,
  onSelectThinkingLevel,
  labels,
}: ChatPromptInputThinkingSelectorProps) => {
  const [thinkingSelectorOpen, setThinkingSelectorOpen] = useState(false);
  const showThinkingSelector = shouldRenderThinkingSelector(thinkingProfile);

  useEffect(() => {
    if (!showThinkingSelector) {
      setThinkingSelectorOpen(false);
    }
  }, [showThinkingSelector]);

  useEffect(() => {
    if (disabled) {
      setThinkingSelectorOpen(false);
    }
  }, [disabled]);

  const activeThinkingLevel = useMemo(() => {
    if (!thinkingProfile) {
      return 'off';
    }
    return resolveActiveThinkingLevel(thinkingProfile, selectedThinkingLevel);
  }, [thinkingProfile, selectedThinkingLevel]);

  const activeThinkingLabel = useMemo(() => {
    if (!thinkingProfile) {
      return labels.offLabel;
    }
    return (
      thinkingProfile.levels.find((option) => option.id === activeThinkingLevel)?.label ??
      labels.offLabel
    );
  }, [activeThinkingLevel, labels.offLabel, thinkingProfile]);
  if (!showThinkingSelector || !thinkingProfile) {
    return null;
  }

  return (
    <ModelSelector onOpenChange={setThinkingSelectorOpen} open={thinkingSelectorOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          type="button"
          aria-label={labels.switchThinkingLevel}
          disabled={disabled || !selectedModelId}
          className={TOOL_TEXT_BUTTON_CLASS}
        >
          <span>{activeThinkingLabel}</span>
          <ChevronDown
            aria-hidden
            size={TOOL_CHEVRON_SIZE}
            strokeWidth={TOOL_CHEVRON_STROKE_WIDTH}
            className="opacity-70"
          />
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorList>
          <ModelSelectorEmpty>{labels.noLevelAvailable}</ModelSelectorEmpty>
          {thinkingProfile.levels.map((option) => (
            <ModelSelectorItem
              key={option.id}
              value={option.id}
              onSelect={() => {
                onSelectThinkingLevel(option.id);
                setThinkingSelectorOpen(false);
              }}
            >
              <ModelSelectorName>{option.label}</ModelSelectorName>
              {activeThinkingLevel === option.id ? (
                <CircleCheck className="ml-auto size-4 shrink-0" />
              ) : null}
            </ModelSelectorItem>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
