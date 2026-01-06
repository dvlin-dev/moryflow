/**
 * [PROPS]: VaultListItemProps
 * [EMITS]: onSelect, onStartEdit, onSaveEdit, onRemove
 * [POS]: Vault 列表单项组件
 */

import { FolderOpen, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'
import { Button } from '@moryflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu'
import { Input } from '@moryflow/ui/components/input'
import { useTranslation } from '@/lib/i18n'
import type { VaultListItemProps } from '../const'

export const VaultListItem = ({
  vault,
  isActive,
  isEditing,
  editName,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onRemove,
}: VaultListItemProps) => {
  const { t } = useTranslation('common')
  const { t: tWorkspace } = useTranslation('workspace')

  // 编辑模式
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
          className="h-7 flex-1"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 ${
        isActive ? 'bg-accent' : 'hover:bg-accent/50'
      }`}
    >
      {/* Vault 名称 */}
      <button
        type="button"
        className="flex flex-1 items-center gap-2 text-left"
        onClick={onSelect}
      >
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm">{vault.name}</span>
      </button>

      {/* 操作菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onStartEdit}>
            <Pencil className="mr-2 size-4" />
            {t('rename')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRemove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            {tWorkspace('removeFromList')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 选中标记 */}
      {isActive && <Check className="size-4 shrink-0 text-primary" />}
    </div>
  )
}
