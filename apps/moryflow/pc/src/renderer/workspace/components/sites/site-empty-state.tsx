/**
 * [PROPS]: { onPublishClick }
 * [EMITS]: onPublishClick() - 点击发布按钮
 * [POS]: Sites CMS 的空状态组件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Globe } from 'lucide-react'
import { Button } from '@anyhunt/ui/components/button'
import type { SiteEmptyStateProps } from './const'

export function SiteEmptyState({ onPublishClick }: SiteEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Globe className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium">No sites yet</h3>
        <p className="text-sm text-muted-foreground">
          Publish any page to the web
          <br />
          and manage it here.
        </p>
      </div>
      <Button onClick={onPublishClick}>Publish a page</Button>
    </div>
  )
}
