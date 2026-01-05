/**
 * [PROPS]: { tab, isActive, showSaveIndicator, saveState, onSelect, onClose }
 * [EMITS]: onSelect, onClose
 * [POS]: 单个 Tab 项组件
 */

import { FileTextIcon, Globe, Sparkles, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SaveState, SelectedFile } from '@/workspace/const'
import { AI_TAB_ID, SITES_TAB_ID, formatTabLabel, isToolTab } from '../helper'

type TabItemProps = {
  tab: SelectedFile
  isActive: boolean
  showSaveIndicator: boolean
  saveState: SaveState
  onSelect: () => void
  onClose: () => void
}

export const TabItem = ({
  tab,
  isActive,
  showSaveIndicator,
  saveState,
  onSelect,
  onClose,
}: TabItemProps) => {
  const isAITab = tab.path === AI_TAB_ID
  const isSitesTab = tab.path === SITES_TAB_ID
  const isTool = isToolTab(tab.path)

  const renderIcon = () => {
    if (isAITab) {
      return <Sparkles className="size-3.5 shrink-0 text-violet-500" />
    }
    if (isSitesTab) {
      return <Globe className="size-3.5 shrink-0 text-blue-500" />
    }
    return <FileTextIcon className="size-3.5 shrink-0 opacity-60" />
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'window-no-drag group relative flex h-10 cursor-default items-center gap-1.5 px-3 text-sm transition-colors',
        isActive
          ? 'bg-background text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {/* 保存状态指示器（工具 tab 不显示） */}
      {showSaveIndicator && !isTool && (
        <span
          className={cn(
            'absolute left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full',
            saveState === 'dirty' && 'bg-warning',
            saveState === 'saving' && 'animate-pulse bg-muted-foreground',
            saveState === 'error' && 'bg-destructive'
          )}
        />
      )}

      {renderIcon()}

      <span
        className={cn(
          'max-w-[120px] truncate',
          !tab.pinned && !isTool && 'italic'
        )}
      >
        {formatTabLabel(tab.name)}
      </span>

      {/* 关闭按钮 */}
      <span
        role="button"
        tabIndex={0}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded transition-opacity',
          'opacity-0 group-hover:opacity-100',
          'hover:bg-foreground/10'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onClose()
          }
        }}
      >
        <XIcon className="size-3" />
      </span>
    </button>
  )
}
