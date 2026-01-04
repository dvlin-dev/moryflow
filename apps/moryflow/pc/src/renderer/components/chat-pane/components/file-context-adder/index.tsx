import { useState, useCallback, useMemo } from 'react'
import { AtSignIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@aiget/ui/components/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@aiget/ui/components/command'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { FlatFile } from '@/workspace/utils'
import type { ContextFileTag } from '../context-file-tags'

type FileContextAdderProps = {
  disabled?: boolean
  /** 工作区所有文件 */
  allFiles?: FlatFile[]
  existingFiles?: ContextFileTag[]
  onAddFile: (file: ContextFileTag) => void
}

export const FileContextAdder = ({
  disabled,
  allFiles = [],
  existingFiles = [],
  onAddFile,
}: FileContextAdderProps) => {
  const { t } = useTranslation('chat')
  const [open, setOpen] = useState(false)
  const hasFiles = existingFiles.length > 0

  // 过滤掉已经添加的文件
  const availableFiles = useMemo(() => {
    const existingPaths = new Set(existingFiles.map((f) => f.path))
    return allFiles.filter((f) => !existingPaths.has(f.path))
  }, [allFiles, existingFiles])

  const handleSelectFile = useCallback(
    (file: FlatFile) => {
      const newFile: ContextFileTag = {
        id: `manual-${file.path}`,
        name: file.name,
        path: file.path,
      }
      onAddFile(newFile)
      setOpen(false)
    },
    [onAddFile]
  )

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
        hasFiles ? 'size-7 justify-center' : 'h-7 px-3 text-sm'
      )}
    >
      <AtSignIcon className="size-4 shrink-0" />
      {!hasFiles && <span>{t('addContext')}</span>}
    </button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder={t('searchDocs')} className="h-9" />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <SearchIcon className="size-8 opacity-50" />
                <span className="text-sm">{t('notFound')}</span>
              </div>
            </CommandEmpty>
            {availableFiles.length > 0 && (
              <CommandGroup>
                {availableFiles.map((file) => (
                  <CommandItem
                    key={file.path}
                    value={`${file.name} ${file.path}`}
                    keywords={[file.name, file.path]}
                    onSelect={() => handleSelectFile(file)}
                    className="flex items-center gap-2"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {file.path}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {availableFiles.length === 0 && allFiles.length > 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {t('allDocsAdded')}
              </div>
            )}
            {allFiles.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {t('noOpenDocs')}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type { FileContextAdderProps }
