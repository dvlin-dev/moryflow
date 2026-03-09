/**
 * [PROPS]: ContextFileTagsProps/FileChipProps - 引用/附件胶囊渲染
 * [EMITS]: onRemove - 移除引用/附件
 * [POS]: Chat Prompt 输入框的文件胶囊列表（Lucide 图标）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { LucideIcon } from 'lucide-react';
import { X, File } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@moryflow/ui/components/tooltip';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type ContextFileTag = {
  id: string;
  name: string;
  path: string;
};

type ContextFileTagsProps = {
  files: ContextFileTag[];
  onRemove?: (id: string) => void;
};

type FileChipProps = {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

type ChipHintBadgeProps = {
  label: string;
};

const FileChip = ({ icon, label, tooltip, onRemove, removeLabel, className }: FileChipProps) => {
  const { t } = useTranslation('chat');
  const resolvedRemoveLabel = removeLabel ?? t('removeReference');
  const IconComponent = icon;
  const content = (
    <div
      className={cn(
        'group inline-flex h-7 w-auto max-w-56 min-w-0 items-center gap-1.5 rounded-full border border-border-muted bg-muted/50 pl-1.5 pr-2 text-xs font-medium text-foreground transition-colors duration-fast hover:bg-muted',
        className
      )}
    >
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <IconComponent
          className={cn(
            'size-[13px] text-muted-foreground transition-opacity duration-fast',
            onRemove ? 'group-hover:opacity-0 group-focus-within:opacity-0' : undefined
          )}
        />
        {onRemove ? (
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all duration-fast hover:bg-muted-foreground/20 hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={onRemove}
            aria-label={resolvedRemoveLabel}
          >
            <X className="size-[13px]" />
          </button>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="truncate text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ChipHintBadge = ({ label }: ChipHintBadgeProps) => (
  <span className="rounded-full border border-border-muted bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
    {label}
  </span>
);

export const ContextFileTags = ({ files, onRemove }: ContextFileTagsProps) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <>
      {files.map((file) => (
        <FileChip
          key={file.id}
          icon={File}
          label={file.name}
          tooltip={file.path}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
        />
      ))}
    </>
  );
};

export type { ContextFileTag, ContextFileTagsProps, FileChipProps, ChipHintBadgeProps };
export { FileChip, ChipHintBadge };
