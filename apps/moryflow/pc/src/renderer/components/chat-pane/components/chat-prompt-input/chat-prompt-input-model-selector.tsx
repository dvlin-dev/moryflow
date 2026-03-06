/**
 * [PROPS]: ChatPromptInputModelSelectorProps - 模型选择器渲染参数
 * [EMITS]: onSelectModel/onOpenSettings
 * [POS]: ChatPromptInput 模型选择片段（列表/空态）
 * [UPDATE]: 2026-03-01 - 调整文字按钮视觉重量：移除 text-xs、统一 icon/chevron 粗细并提升行内对齐
 * [UPDATE]: 2026-03-01 - 输入栏按钮风格统一：触发器改为紧凑高度与小圆角
 * [UPDATE]: 2026-02-26 - 从 ChatPromptInput 拆出模型选择渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ArrowUpRight, ChevronDown, CircleCheck, Settings, Sparkles } from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { PromptInputButton } from '@moryflow/ui/ai/prompt-input';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorFooter,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@moryflow/ui/ai/model-selector';
import type { SettingsSection } from '@/components/settings-dialog/const';

import type { ModelGroup } from '../../models';

const TOOL_TEXT_BUTTON_CLASS = 'h-7 rounded-sm px-2 gap-1.5 leading-none';
const TOOL_CHEVRON_SIZE = 16;
const TOOL_CHEVRON_STROKE_WIDTH = 2.15;

export type ChatPromptInputModelSelectorProps = {
  disabled: boolean;
  hasModelOptions: boolean;
  modelGroups: ModelGroup[];
  selectedModelId?: string | null;
  selectedModelName?: string;
  modelSelectorOpen: boolean;
  onModelSelectorOpenChange: (open: boolean) => void;
  onSelectModel: (id: string) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  labels: {
    noModelFound: string;
    switchModel: string;
    selectModel: string;
    configureModel: string;
    setupModel: string;
    modelSettings: string;
    upgrade: string;
  };
  tierDisplayNames: Record<string, string>;
};

export const ChatPromptInputModelSelector = ({
  disabled,
  hasModelOptions,
  modelGroups,
  selectedModelId,
  selectedModelName,
  modelSelectorOpen,
  onModelSelectorOpenChange,
  onSelectModel,
  onOpenSettings,
  labels,
  tierDisplayNames,
}: ChatPromptInputModelSelectorProps) => {
  const renderOptionIndicator = (option: ModelGroup['options'][number]) => {
    if (option.disabled && option.isMembership && option.requiredTier) {
      return (
        <Badge variant="outline" className="ml-auto h-5 shrink-0 gap-0.5 px-1.5 py-0 text-xs">
          <ArrowUpRight className="size-3" />
          {tierDisplayNames[option.requiredTier] || labels.upgrade}
        </Badge>
      );
    }

    if (selectedModelId === option.id) {
      return <CircleCheck className="ml-auto size-4 shrink-0" />;
    }

    return null;
  };

  if (!hasModelOptions) {
    return (
      <PromptInputSetupModelButton
        disabled={disabled}
        onOpenSettings={onOpenSettings}
        configureLabel={labels.configureModel}
        setupLabel={labels.setupModel}
      />
    );
  }

  return (
    <ModelSelector onOpenChange={onModelSelectorOpenChange} open={modelSelectorOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          aria-label={labels.switchModel}
          disabled={disabled}
          className={TOOL_TEXT_BUTTON_CLASS}
        >
          <span>{selectedModelName ?? labels.selectModel}</span>
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
          <ModelSelectorEmpty>{labels.noModelFound}</ModelSelectorEmpty>
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
                    onModelSelectorOpenChange(false);
                  }}
                >
                  <ModelSelectorName>{option.name}</ModelSelectorName>
                  {renderOptionIndicator(option)}
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
              onModelSelectorOpenChange(false);
              onOpenSettings?.('providers');
            }}
          >
            <Settings className="mr-2 size-3.5" />
            {labels.modelSettings}
          </Button>
        </ModelSelectorFooter>
      </ModelSelectorContent>
    </ModelSelector>
  );
};

type PromptInputSetupModelButtonProps = {
  disabled: boolean;
  onOpenSettings?: (section?: SettingsSection) => void;
  configureLabel: string;
  setupLabel: string;
};

const PromptInputSetupModelButton = ({
  disabled,
  onOpenSettings,
  configureLabel,
  setupLabel,
}: PromptInputSetupModelButtonProps) => {
  return (
    <PromptInputButton
      type="button"
      aria-label={configureLabel}
      disabled={disabled}
      onClick={() => onOpenSettings?.('providers')}
      className={TOOL_TEXT_BUTTON_CLASS}
    >
      <Sparkles aria-hidden size={17} strokeWidth={1.95} />
      <span>{setupLabel}</span>
    </PromptInputButton>
  );
};
