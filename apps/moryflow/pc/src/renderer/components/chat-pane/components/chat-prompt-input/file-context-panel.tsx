/**
 * [PROPS]: FileContextPanelProps - 引用文件面板数据与行为
 * [EMITS]: onAddFile/onRefreshRecent/onClose - 添加引用/刷新最近/关闭面板
 * [POS]: Chat Prompt 输入框引用文件面板（@ 与 + 菜单复用，挂载时刷新最近文件）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { File, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@moryflow/ui/components/command';
import { cn } from '@/lib/utils';
import type { FlatFile } from '@/workspace/utils';
import type { ContextFileTag } from '../context-file-tags';

export type FileContextPanelProps = {
  disabled?: boolean;
  /** 工作区所有文件 */
  allFiles?: FlatFile[];
  /** 最近操作文件（MRU） */
  recentFiles?: FlatFile[];
  existingFiles?: ContextFileTag[];
  onAddFile: (file: ContextFileTag) => void;
  onRefreshRecent?: () => void;
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
  emptySearchLabel?: string;
  emptyNoFilesLabel?: string;
  emptyAllAddedLabel?: string;
  emptyNoRecentLabel?: string;
  recentLabel?: string;
  allFilesLabel?: string;
  searchPlaceholder?: string;
};

export const FileContextPanel = ({
  disabled,
  allFiles = [],
  recentFiles = [],
  existingFiles = [],
  onAddFile,
  onRefreshRecent,
  onClose,
  autoFocus = false,
  className,
  emptySearchLabel,
  emptyNoFilesLabel,
  emptyAllAddedLabel,
  emptyNoRecentLabel,
  recentLabel,
  allFilesLabel,
  searchPlaceholder,
}: FileContextPanelProps) => {
  const [query, setQuery] = useState('');
  const refreshRecentRef = useRef(onRefreshRecent);

  useEffect(() => {
    refreshRecentRef.current = onRefreshRecent;
  }, [onRefreshRecent]);

  useEffect(() => {
    refreshRecentRef.current?.();
  }, []);

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
      onClose?.();
    },
    [onAddFile, onClose]
  );

  const showEmpty = displayFiles.length === 0;
  const emptyLabel =
    (hasQuery
      ? emptySearchLabel
      : allFiles.length === 0
        ? emptyNoFilesLabel
        : availableFiles.length === 0
          ? emptyAllAddedLabel
          : emptyNoRecentLabel) ?? '';

  return (
    <div className={cn('w-72 p-0', className)}>
      <Command shouldFilter={false}>
        <CommandInput
          autoFocus={autoFocus}
          placeholder={searchPlaceholder}
          className="h-9"
          value={query}
          onValueChange={setQuery}
          disabled={disabled}
        />
        <CommandList>
          {showEmpty ? (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Search className="size-8 opacity-50" />
                <span className="text-sm">{emptyLabel}</span>
              </div>
            </CommandEmpty>
          ) : (
            <CommandGroup heading={hasQuery ? allFilesLabel : recentLabel}>
              {displayFiles.map((file) => (
                <CommandItem
                  key={file.path}
                  value={file.path}
                  onSelect={() => handleSelectFile(file)}
                  className="flex items-center gap-2"
                  disabled={disabled}
                >
                  <File className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{file.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{file.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
};
