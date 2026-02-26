/**
 * [PROPS]: ChatPromptInputPlusMenuProps - + 菜单入口与子面板
 * [EMITS]: onModeChange/onAddContextFile/onOpenSettings - 切换模式/添加引用/打开设置
 * [POS]: Chat Prompt 输入框「+」菜单与二级面板（上传/Agent/Skills/引用/MCP）
 * [UPDATE]: 2026-02-26 - 子菜单统一改为可复用渲染片段，收敛重复结构与对齐逻辑
 * [UPDATE]: 2026-02-11 - 新增 Skills 子菜单，统一选择逻辑供输入框显式注入 skill
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Plus, Sparkles, AtSign, Gavel, Upload, Wrench } from 'lucide-react';
import { PromptInputButton } from '@moryflow/ui/ai/prompt-input';
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
} from '@moryflow/ui/components/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import type { FlatFile } from '@/workspace/utils';
import type { SkillSummary } from '@shared/ipc';
import type { SettingsSection } from '@/components/settings-dialog/const';

import type { ChatPromptInputProps } from './const';
import type { ContextFileTag } from '../context-file-tags';
import { FileContextPanel } from './file-context-panel';
import { McpPanel } from './mcp-panel';
import { SkillPanel } from './skill-panel';

export type ChatPromptInputPlusMenuProps = {
  disabled?: boolean;
  mode: ChatPromptInputProps['mode'];
  onModeChange: (mode: ChatPromptInputProps['mode']) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onOpenFileDialog: () => void;
  skills?: SkillSummary[];
  onSelectSkill: (skill: SkillSummary) => void;
  onRefreshSkills?: () => void;
  allFiles?: FlatFile[];
  recentFiles?: FlatFile[];
  existingFiles?: ContextFileTag[];
  onAddContextFile: (file: ContextFileTag) => void;
  onRefreshRecent?: () => void;
};

type PlusSubmenuKey = 'agent' | 'skills' | 'reference' | 'mcp';

type PlusSubmenuOffset = {
  base: number;
  alignOffset: number;
};

const DEFAULT_SUB_OFFSETS: Record<PlusSubmenuKey, PlusSubmenuOffset> = {
  agent: { base: 0, alignOffset: 0 },
  skills: { base: 0, alignOffset: 0 },
  reference: { base: 0, alignOffset: 0 },
  mcp: { base: 0, alignOffset: 0 },
};

export const ChatPromptInputPlusMenu = ({
  disabled,
  mode,
  onModeChange,
  onOpenSettings,
  onOpenFileDialog,
  skills = [],
  onSelectSkill,
  onRefreshSkills,
  allFiles = [],
  recentFiles = [],
  existingFiles = [],
  onAddContextFile,
  onRefreshRecent,
}: ChatPromptInputPlusMenuProps) => {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const [subOffsets, setSubOffsets] = useState(DEFAULT_SUB_OFFSETS);
  const subOffsetsRef = useRef(subOffsets);

  useEffect(() => {
    subOffsetsRef.current = subOffsets;
  }, [subOffsets]);

  const updateSubBase = useCallback(
    (key: PlusSubmenuKey) => (event: SyntheticEvent<HTMLElement>) => {
      const trigger = event.currentTarget;
      const triggerRect = trigger.getBoundingClientRect();
      const base = Math.round(triggerRect.height);
      setSubOffsets((prev) =>
        prev[key].base === base ? prev : { ...prev, [key]: { ...prev[key], base } }
      );
    },
    []
  );

  const updateSubAlignOffset = useCallback((key: PlusSubmenuKey) => {
    const base = subOffsetsRef.current[key].base;
    const panel = document.querySelector<HTMLElement>(`[data-plus-sub="${key}"]`);
    if (!panel) {
      return;
    }
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
            if (disabled) {
              return;
            }
            onOpenFileDialog();
            setOpen(false);
          }}
          disabled={disabled}
        >
          <Upload className="size-4" />
          <span>{t('uploadFiles')}</span>
        </DropdownMenuItem>

        <PlusSubmenu
          submenuKey="agent"
          icon={<Sparkles className="size-4" />}
          label={t('agentModeMenu')}
          disabled={disabled}
          alignOffset={subOffsets.agent.alignOffset}
          onMeasureBase={updateSubBase}
          onRequestAlign={updateSubAlignOffset}
        >
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => {
              if (disabled) {
                return;
              }
              onModeChange(value as ChatPromptInputProps['mode']);
              setOpen(false);
            }}
          >
            <DropdownMenuRadioItem value="agent">{t('agentMode')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="full_access">{t('agentModeFullAccess')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </PlusSubmenu>

        <PlusSubmenu
          submenuKey="skills"
          icon={<Wrench className="size-4" />}
          label="Skills"
          disabled={disabled}
          className="p-0"
          alignOffset={subOffsets.skills.alignOffset}
          onMeasureBase={updateSubBase}
          onRequestAlign={updateSubAlignOffset}
        >
          <SkillPanel
            disabled={disabled}
            skills={skills}
            onSelectSkill={(skill) => {
              onSelectSkill(skill);
              setOpen(false);
            }}
            onRefresh={onRefreshSkills}
            onClose={() => setOpen(false)}
            searchPlaceholder="Search skills"
            emptyLabel="No skills found"
            headingLabel="Enabled Skills"
          />
        </PlusSubmenu>

        <PlusSubmenu
          submenuKey="reference"
          icon={<AtSign className="size-4" />}
          label={t('referenceFiles')}
          disabled={disabled}
          className="p-0"
          alignOffset={subOffsets.reference.alignOffset}
          onMeasureBase={updateSubBase}
          onRequestAlign={updateSubAlignOffset}
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
        </PlusSubmenu>

        <PlusSubmenu
          submenuKey="mcp"
          icon={<Gavel className="size-4" />}
          label={t('mcpMenu')}
          disabled={disabled}
          className="p-0"
          alignOffset={subOffsets.mcp.alignOffset}
          onMeasureBase={updateSubBase}
          onRequestAlign={updateSubAlignOffset}
        >
          <McpPanel
            disabled={disabled}
            onOpenSettings={onOpenSettings}
            onClose={() => setOpen(false)}
          />
        </PlusSubmenu>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type PlusSubmenuProps = {
  submenuKey: PlusSubmenuKey;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  alignOffset: number;
  onMeasureBase: (key: PlusSubmenuKey) => (event: SyntheticEvent<HTMLElement>) => void;
  onRequestAlign: (key: PlusSubmenuKey) => void;
  children: ReactNode;
};

const PlusSubmenu = ({
  submenuKey,
  icon,
  label,
  disabled,
  className,
  alignOffset,
  onMeasureBase,
  onRequestAlign,
  children,
}: PlusSubmenuProps) => {
  return (
    <DropdownMenuSub
      onOpenChange={(next) => {
        if (next) {
          requestAnimationFrame(() => onRequestAlign(submenuKey));
        }
      }}
    >
      <DropdownMenuSubTrigger
        disabled={disabled}
        onMouseEnter={onMeasureBase(submenuKey)}
        onFocus={onMeasureBase(submenuKey)}
      >
        {icon}
        <span>{label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className={className}
        sideOffset={8}
        alignOffset={alignOffset}
        avoidCollisions={false}
        data-plus-sub={submenuKey}
      >
        {children}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
