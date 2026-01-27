/**
 * [PROPS]: FileContextAdderProps - @ 引用入口与列表控制
 * [EMITS]: onAddFile/onRefreshRecent - 添加引用/刷新 MRU
 * [POS]: Chat Prompt 输入框的文件引用入口（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState, useCallback, useMemo } from 'react';
import { AtSign, File, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@anyhunt/ui/components/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@anyhunt/ui/components/command';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { FlatFile } from '@/workspace/utils';
import type { ContextFileTag } from '../context-file-tags';

type FileContextAdderProps = {
  disabled?: boolean;
  /** 工作区所有文件 */
  allFiles?: FlatFile[];
  /** 最近操作文件（MRU） */
  recentFiles?: FlatFile[];
  existingFiles?: ContextFileTag[];
  onAddFile: (file: ContextFileTag) => void;
  onRefreshRecent?: () => void;
  iconOnly?: boolean;
};

export const FileContextAdder = ({
  disabled,
  allFiles = [],
  recentFiles = [],
  existingFiles = [],
  onAddFile,
  onRefreshRecent,
  iconOnly = false,
}: FileContextAdderProps) => {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const hasFiles = existingFiles.length > 0;

  // 过滤掉已经添加的文件
  const availableFiles = useMemo(() => {
    const existingPaths = new Set(existingFiles.map((f) => f.path));
    return allFiles.filter((f) => !existingPaths.has(f.path));
  }, [allFiles, existingFiles]);

  const availableRecentFiles = useMemo(() => {
    const existingPaths = new Set(existingFiles.map((f) => f.path));
    return recentFiles.filter((f) => !existingPaths.has(f.path));
  }, [existingFiles, recentFiles]);

  const hasQuery = query.trim().length > 0;

  const filteredFiles = useMemo(() => {
    if (!hasQuery) {
      return [];
    }
    const keyword = query.trim().toLowerCase();
    return availableFiles.filter((file) => {
      const name = file.name.toLowerCase();
      const path = file.path.toLowerCase();
      return name.includes(keyword) || path.includes(keyword);
    });
  }, [availableFiles, hasQuery, query]);

  const displayFiles = hasQuery ? filteredFiles : availableRecentFiles;

  const handleSelectFile = useCallback(
    (file: FlatFile) => {
      const newFile: ContextFileTag = {
        id: `manual-${file.path}`,
        name: file.name,
        path: file.path,
      };
      onAddFile(newFile);
      setOpen(false);
    },
    [onAddFile]
  );

  // 渲染触发按钮：有文件时只显示 @ icon，无文件时显示完整内容
  const renderTrigger = () => (
    <button
      type="button"
      aria-label={t('addContext')}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-border-muted bg-background text-muted-foreground transition-colors duration-fast',
        'hover:bg-muted hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        iconOnly || hasFiles ? 'size-7 justify-center' : 'h-7 px-3 text-sm'
      )}
    >
      <AtSign className="size-4 shrink-0" />
      {!iconOnly && !hasFiles && <span>{t('addContext')}</span>}
    </button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          onRefreshRecent?.();
        } else {
          setQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="top" sideOffset={8}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchDocs')}
            className="h-9"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {displayFiles.length > 0 ? (
              <CommandGroup heading={hasQuery ? t('allFiles') : t('recentFiles')}>
                {displayFiles.map((file) => (
                  <CommandItem
                    key={file.path}
                    value={file.path}
                    onSelect={() => handleSelectFile(file)}
                    className="flex items-center gap-2"
                  >
                    <File className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{file.path}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                    <Search className="size-8 opacity-50" />
                    <span className="text-sm">
                      {hasQuery
                        ? t('notFound')
                        : allFiles.length === 0
                          ? t('noOpenDocs')
                          : availableFiles.length === 0
                            ? t('allDocsAdded')
                            : t('noRecentFiles')}
                    </span>
                  </div>
                </CommandEmpty>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export type { FileContextAdderProps };
