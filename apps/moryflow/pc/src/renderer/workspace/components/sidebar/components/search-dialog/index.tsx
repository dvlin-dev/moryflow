/**
 * [PROPS]: SearchDialogProps
 * [EMITS]: onOpenChange, onSelectFile
 * [POS]: Notion 风格搜索对话框，固定高度
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, FolderOpen, SearchIcon } from 'lucide-react'
import { Command as CommandPrimitive } from 'cmdk'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@aiget/ui/components/dialog'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { SearchDialogProps } from './const'
import { flattenTree, fuzzySearch, formatDisplayName } from './helper'

export const SearchDialog = ({ open, onOpenChange, tree, onSelectFile }: SearchDialogProps) => {
  const { t } = useTranslation('workspace')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 扁平化文件树（只在 tree 变化时重新计算）
  const flatFiles = useMemo(() => flattenTree(tree), [tree])

  // 搜索结果
  const searchResults = useMemo(() => fuzzySearch(flatFiles, query), [flatFiles, query])

  // 最近文件（无搜索词时显示）
  const recentFiles = useMemo(
    () => [...flatFiles].sort((a, b) => (b.node.mtime ?? 0) - (a.node.mtime ?? 0)).slice(0, 8),
    [flatFiles]
  )

  const hasQuery = query.trim().length > 0
  const displayResults = hasQuery ? searchResults : recentFiles
  const hasResults = displayResults.length > 0

  // 处理选择文件
  const handleSelect = useCallback(
    (path: string) => {
      const result =
        flatFiles.find((r) => r.node.path === path) ||
        searchResults.find((r) => r.node.path === path)
      if (result) {
        onSelectFile(result.node)
        onOpenChange(false)
        setQuery('')
      }
    },
    [flatFiles, searchResults, onSelectFile, onOpenChange]
  )

  // 对话框关闭时重置搜索
  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open)
      if (!open) {
        setQuery('')
      }
    },
    [onOpenChange]
  )

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      // 延迟聚焦，确保动画完成
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t('searchFiles')}</DialogTitle>
        <DialogDescription>{t('searchFilesDescription')}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="flex h-[380px] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <CommandPrimitive className="flex h-full flex-col" shouldFilter={false}>
          {/* 搜索输入框 */}
          <div className="flex h-12 items-center gap-2 border-b border-border/40 px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={t('searchFilesPlaceholder')}
              className="flex h-10 w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            />
          </div>

          {/* 结果列表 */}
          <CommandPrimitive.List className="min-h-0 flex-1 overflow-y-auto p-1">
            {hasResults ? (
              <CommandPrimitive.Group
                heading={hasQuery ? t('searchResults') : t('recentFiles')}
                className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground"
              >
                {displayResults.map((result) => (
                  <CommandPrimitive.Item
                    key={result.node.path}
                    value={result.node.path}
                    onSelect={handleSelect}
                    className={cn(
                      'flex cursor-default items-center gap-3 rounded-lg px-2 py-2 text-sm outline-hidden',
                      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                      'transition-colors duration-fast'
                    )}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate">{formatDisplayName(result.node.name)}</span>
                      {result.relativePath && (
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <FolderOpen className="size-3" />
                          {result.relativePath}
                        </span>
                      )}
                    </div>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ) : (
              <CommandPrimitive.Empty className="py-6 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="size-8 opacity-50" />
                  <span className="text-sm">{hasQuery ? t('noSearchResults') : t('noFiles')}</span>
                </div>
              </CommandPrimitive.Empty>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  )
}
