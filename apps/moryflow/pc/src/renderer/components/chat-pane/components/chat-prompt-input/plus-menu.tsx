/**
 * [PROPS]: ChatPromptInputPlusMenuProps - + 菜单入口与子面板
 * [EMITS]: onModeChange/onAddContextFile/onOpenSettings - 切换模式/添加引用/打开设置
 * [POS]: Chat Prompt 输入框「+」菜单与二级面板（上传/Agent/引用/MCP）
 * [UPDATE]: 2026-01-28 - 二级面板底部对齐触发项，按项计算对齐偏移
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Plus, Sparkles, AtSign, Gavel, Upload } from 'lucide-react';
import { PromptInputButton } from '@anyhunt/ui/ai/prompt-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import type { FlatFile } from '@/workspace/utils';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { ChatPromptInputProps } from './const';
import type { ContextFileTag } from '../context-file-tags';
import { FileContextPanel } from './file-context-panel';
import { McpPanel } from './mcp-panel';

export type ChatPromptInputPlusMenuProps = {
  disabled?: boolean;
  mode: ChatPromptInputProps['mode'];
  onModeChange: (mode: ChatPromptInputProps['mode']) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onOpenFileDialog: () => void;
  allFiles?: FlatFile[];
  recentFiles?: FlatFile[];
  existingFiles?: ContextFileTag[];
  onAddContextFile: (file: ContextFileTag) => void;
  onRefreshRecent?: () => void;
};

export const ChatPromptInputPlusMenu = ({
  disabled,
  mode,
  onModeChange,
  onOpenSettings,
  onOpenFileDialog,
  allFiles = [],
  recentFiles = [],
  existingFiles = [],
  onAddContextFile,
  onRefreshRecent,
}: ChatPromptInputPlusMenuProps) => {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const [subOffsets, setSubOffsets] = useState({
    agent: { base: 0, alignOffset: 0 },
    reference: { base: 0, alignOffset: 0 },
    mcp: { base: 0, alignOffset: 0 },
  });
  const subOffsetsRef = useRef(subOffsets);

  useEffect(() => {
    subOffsetsRef.current = subOffsets;
  }, [subOffsets]);

  const updateSubBase = useCallback(
    (key: keyof typeof subOffsets) => (event: SyntheticEvent<HTMLElement>) => {
      const trigger = event.currentTarget;
      const triggerRect = trigger.getBoundingClientRect();
      const base = Math.round(triggerRect.height);
      setSubOffsets((prev) =>
        prev[key].base === base ? prev : { ...prev, [key]: { ...prev[key], base } }
      );
    },
    []
  );

  const updateSubAlignOffset = useCallback((key: keyof typeof subOffsets) => {
    const base = subOffsetsRef.current[key].base;
    const panel = document.querySelector<HTMLElement>(`[data-plus-sub="${key}"]`);
    if (!panel) return;
    const height = panel.getBoundingClientRect().height;
    const alignOffset = Math.round(base - height);
    setSubOffsets((prev) =>
      prev[key].alignOffset === alignOffset
        ? prev
        : { ...prev, [key]: { ...prev[key], alignOffset } }
    );
  }, []);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <PromptInputButton aria-label={t('openPlusMenu')} disabled={disabled}>
          <Plus className="size-4" />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-52">
        <DropdownMenuItem
          onSelect={() => {
            if (disabled) return;
            onOpenFileDialog();
            setOpen(false);
          }}
          disabled={disabled}
        >
          <Upload className="size-4" />
          <span>{t('uploadFiles')}</span>
        </DropdownMenuItem>
        <DropdownMenuSub
          onOpenChange={(next) => {
            if (next) {
              requestAnimationFrame(() => updateSubAlignOffset('agent'));
            }
          }}
        >
          <DropdownMenuSubTrigger
            disabled={disabled}
            onMouseEnter={updateSubBase('agent')}
            onFocus={updateSubBase('agent')}
          >
            <Sparkles className="size-4" />
            <span>{t('agentModeMenu')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            sideOffset={8}
            alignOffset={subOffsets.agent.alignOffset}
            avoidCollisions={false}
            data-plus-sub="agent"
          >
            <DropdownMenuRadioGroup
              value={mode}
              onValueChange={(value) => {
                if (disabled) return;
                onModeChange(value as ChatPromptInputProps['mode']);
                setOpen(false);
              }}
            >
              <DropdownMenuRadioItem value="agent">{t('agentMode')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="full_access">
                {t('agentModeFullAccess')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub
          onOpenChange={(next) => {
            if (next) {
              requestAnimationFrame(() => updateSubAlignOffset('reference'));
            }
          }}
        >
          <DropdownMenuSubTrigger
            disabled={disabled}
            onMouseEnter={updateSubBase('reference')}
            onFocus={updateSubBase('reference')}
          >
            <AtSign className="size-4" />
            <span>{t('referenceFiles')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="p-0"
            sideOffset={8}
            alignOffset={subOffsets.reference.alignOffset}
            avoidCollisions={false}
            data-plus-sub="reference"
          >
            <FileContextPanel
              disabled={disabled}
              allFiles={allFiles}
              recentFiles={recentFiles}
              existingFiles={existingFiles}
              onAddFile={onAddContextFile}
              onRefreshRecent={onRefreshRecent}
              onClose={() => setOpen(false)}
              searchPlaceholder={t('searchDocs')}
              recentLabel={t('recentFiles')}
              allFilesLabel={t('allFiles')}
              emptySearchLabel={t('notFound')}
              emptyNoFilesLabel={t('noOpenDocs')}
              emptyAllAddedLabel={t('allDocsAdded')}
              emptyNoRecentLabel={t('noRecentFiles')}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub
          onOpenChange={(next) => {
            if (next) {
              requestAnimationFrame(() => updateSubAlignOffset('mcp'));
            }
          }}
        >
          <DropdownMenuSubTrigger
            disabled={disabled}
            onMouseEnter={updateSubBase('mcp')}
            onFocus={updateSubBase('mcp')}
          >
            <Gavel className="size-4" />
            <span>{t('mcpMenu')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="p-0"
            sideOffset={8}
            alignOffset={subOffsets.mcp.alignOffset}
            avoidCollisions={false}
            data-plus-sub="mcp"
          >
            <McpPanel
              disabled={disabled}
              onOpenSettings={onOpenSettings}
              onClose={() => setOpen(false)}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
