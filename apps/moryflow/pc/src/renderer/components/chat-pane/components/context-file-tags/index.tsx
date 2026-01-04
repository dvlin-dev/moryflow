import { FileTextIcon, XIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aiget/ui/components/tooltip'
import { useTranslation } from '@/lib/i18n'

type ContextFileTag = {
  id: string
  name: string
  path: string
}

type ContextFileTagsProps = {
  files: ContextFileTag[]
  onRemove?: (id: string) => void
}

export const ContextFileTags = ({ files, onRemove }: ContextFileTagsProps) => {
  if (files.length === 0) {
    return null
  }

  return (
    <>
      {files.map((file) => (
        <ContextFileTagItem key={file.id} file={file} onRemove={onRemove} />
      ))}
    </>
  )
}

type ContextFileTagItemProps = {
  file: ContextFileTag
  onRemove?: (id: string) => void
}

const ContextFileTagItem = ({ file, onRemove }: ContextFileTagItemProps) => {
  const { t } = useTranslation('chat')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group relative flex h-7 cursor-default items-center gap-1.5 rounded-full border border-border-muted bg-muted/50 pl-2 pr-1.5 text-xs font-medium text-foreground transition-colors duration-fast hover:bg-muted">
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-32 truncate">{file.name}</span>
          {onRemove && (
            <button
              type="button"
              className="ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-transparent text-muted-foreground opacity-0 transition-all duration-fast hover:bg-muted-foreground/20 hover:text-foreground group-hover:opacity-100"
              onClick={() => onRemove(file.id)}
              aria-label={t('removeReference')}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="truncate text-xs">{file.path}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export type { ContextFileTag, ContextFileTagsProps }
