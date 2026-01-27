/**
 * [PROPS]: ContextFileTagsProps/FileChipProps - 引用/附件胶囊渲染
 * [EMITS]: onRemove - 移除引用/附件
 * [POS]: Chat Prompt 输入框的文件胶囊列表（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { LucideIcon } from 'lucide-react';
import { X, File } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@anyhunt/ui/components/tooltip';
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

const FileChip = ({ icon, label, tooltip, onRemove, removeLabel, className }: FileChipProps) => {
  const { t } = useTranslation('chat');
  const resolvedRemoveLabel = removeLabel ?? t('removeReference');
  const IconComponent = icon;
  const content = (
    <div
      className={cn(
        'group flex h-7 w-36 items-center gap-1.5 rounded-full border border-border-muted bg-muted/50 px-2 text-xs font-medium text-foreground transition-colors duration-fast hover:bg-muted',
        className
      )}
    >
      <IconComponent className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all duration-fast hover:bg-muted-foreground/20 hover:text-foreground group-hover:opacity-100"
          onClick={onRemove}
          aria-label={resolvedRemoveLabel}
        >
          <X className="size-3.5" />
        </button>
      )}
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

export type { ContextFileTag, ContextFileTagsProps, FileChipProps };
export { FileChip };
