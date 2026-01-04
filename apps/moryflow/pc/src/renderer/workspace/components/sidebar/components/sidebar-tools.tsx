/**
 * [PROPS]: { vault, onSettingsOpen }
 * [EMITS]: onSettingsOpen - 设置按钮点击事件
 * [POS]: 侧边栏工具区组件（仅图标，一行两个）
 */

import { Settings } from 'lucide-react'
import { SyncStatusIndicator, SyncStatusHoverCard } from '@/components/cloud-sync'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aiget/ui/components/tooltip'
import { useTranslation } from '@/lib/i18n'
import type { SidebarToolsProps } from '../const'

export const SidebarTools = ({
  vault,
  onSettingsOpen,
}: SidebarToolsProps) => {
  const { t } = useTranslation('workspace')

  return (
    <div className="flex shrink-0 items-center justify-between py-1.5 pl-2.5 pr-2">
      {/* 同步状态 - 左侧对齐基准线 */}
      {vault ? (
        <SyncStatusHoverCard
          vaultPath={vault.path}
          onOpenSettings={() => onSettingsOpen('cloud-sync')}
        >
          <div className="text-muted-foreground transition-colors hover:text-foreground">
            <SyncStatusIndicator vaultPath={vault.path} compact />
          </div>
        </SyncStatusHoverCard>
      ) : (
        <div className="size-4" />
      )}

      {/* 设置 - 右侧 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onSettingsOpen('account')}
          >
            <Settings className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('settingsLabel')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
