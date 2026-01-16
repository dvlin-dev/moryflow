/**
 * [PROPS]: { sites, loading, onSiteClick, onSiteAction, onPublishClick }
 * [EMITS]: onSiteClick(site), onSiteAction(siteId, action), onPublishClick()
 * [POS]: Sites CMS 的站点列表组件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Plus } from 'lucide-react'
import { Button } from '@anyhunt/ui/components/button'
import { Skeleton } from '@anyhunt/ui/components/skeleton'
import { ScrollArea } from '@anyhunt/ui/components/scroll-area'
import { SiteCard } from './site-card'
import { SiteEmptyState } from './site-empty-state'
import type { SiteListProps } from './const'
import { SKELETON_PLACEHOLDER_COUNT } from './const'

/** 生成骨架屏占位符序列 */
const SKELETON_PLACEHOLDERS = Array.from({ length: SKELETON_PLACEHOLDER_COUNT }, (_, i) => i)

export function SiteList({
  sites,
  loading,
  onSiteClick,
  onSiteAction,
  onPublishClick,
}: SiteListProps) {
  // 加载状态
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Sites</h1>
          <Skeleton className="h-8 w-24" />
        </div>
        {/* 骨架屏 */}
        <div className="flex-1 p-6">
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {SKELETON_PLACEHOLDERS.map((i) => (
              <Skeleton key={i} className="h-[100px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 空状态
  if (sites.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Sites</h1>
          <Button size="sm" onClick={onPublishClick}>
            <Plus className="mr-1.5 h-4 w-4" />
            Publish
          </Button>
        </div>
        {/* 空状态 */}
        <div className="flex-1">
          <SiteEmptyState onPublishClick={onPublishClick} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Sites</h1>
        <Button size="sm" onClick={onPublishClick}>
          <Plus className="mr-1.5 h-4 w-4" />
          Publish
        </Button>
      </div>

      {/* 站点列表 */}
      <ScrollArea className="flex-1">
        <div className="grid gap-4 p-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onClick={() => onSiteClick(site)}
              onAction={(action) => onSiteAction(site.id, action)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
