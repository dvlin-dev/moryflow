/**
 * [PROPS]: CreateMenuProps
 * [EMITS]: onCreateFile, onCreateFolder
 * [POS]: 新建文件/文件夹下拉菜单
 */

import { Plus, FileText, Folder } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@aiget/ui/components/dropdown-menu'
import { useTranslation } from '@/lib/i18n'
import type { CreateMenuProps } from '../const'

export const CreateMenu = ({ onCreateFile, onCreateFolder }: CreateMenuProps) => {
  const { t } = useTranslation('workspace')

  if (!onCreateFile && !onCreateFolder) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {onCreateFile && (
          <DropdownMenuItem onClick={onCreateFile}>
            <FileText className="mr-2 size-4" />
            {t('newNote')}
          </DropdownMenuItem>
        )}
        {onCreateFolder && (
          <DropdownMenuItem onClick={onCreateFolder}>
            <Folder className="mr-2 size-4" />
            {t('newFolder')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
