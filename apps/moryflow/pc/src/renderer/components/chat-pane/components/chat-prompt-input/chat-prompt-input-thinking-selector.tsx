/**
 * [PROPS]: ChatPromptInputThinkingSelectorProps - thinking 选择器渲染参数
 * [EMITS]: onSelectThinkingLevel
 * [POS]: ChatPromptInput thinking 第二下拉（仅在模型支持多等级时显示）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useMemo, useState } from 'react';
import { Brain, CircleCheck } from 'lucide-react';
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

const TOOL_ICON_BUTTON_CLASS = 'size-7 rounded-sm p-0';
const TOOL_ICON_SIZE = 17;
const TOOL_ICON_STROKE_WIDTH = 1.85;

type ChatPromptInputThinkingSelectorLabels = {
  switchThinkingLevel: string;
  noLevelAvailable: string;
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

  if (!showThinkingSelector || !thinkingProfile) {
    return null;
  }

  return (
    <ModelSelector onOpenChange={setThinkingSelectorOpen} open={thinkingSelectorOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          aria-label={labels.switchThinkingLevel}
          disabled={disabled || !selectedModelId}
          className={TOOL_ICON_BUTTON_CLASS}
        >
          <Brain aria-hidden size={TOOL_ICON_SIZE} strokeWidth={TOOL_ICON_STROKE_WIDTH} />
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
