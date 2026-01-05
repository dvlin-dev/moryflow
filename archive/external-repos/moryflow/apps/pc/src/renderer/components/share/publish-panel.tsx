/**
 * [PROPS]: { fileTitle, onBack, onPublished, subdomain, setSubdomain, ... }
 * [EMITS]: onBack() - 返回上一面板, onPublished(site) - 发布成功
 * [POS]: Share Popover 的发布面板
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@moryflow/ui/components/button'
import { Label } from '@moryflow/ui/components/label'
import { Progress } from '@moryflow/ui/components/progress'
import { SubdomainInput } from './subdomain-input'
import type { Site, BuildProgressEvent } from '../../../shared/ipc/site-publish'
import type { SubdomainStatus } from './const'

interface PublishPanelProps {
  fileTitle?: string
  onBack: () => void
  onPublished: (site: Site) => void
  // 状态（从 Hook 传入）
  subdomain: string
  setSubdomain: (value: string) => void
  subdomainStatus: SubdomainStatus
  subdomainMessage?: string
  publishing: boolean
  progress: BuildProgressEvent | null
  onPublish: () => Promise<void>
}

/** 计算进度百分比 */
function getProgressPercent(progress: BuildProgressEvent | null): number {
  if (!progress) return 0
  if (progress.phase === 'done') return 100
  if (progress.phase === 'error') return 0
  if (progress.total === 0) return 0
  return Math.round((progress.current / progress.total) * 100)
}

export function PublishPanel({
  onBack,
  subdomain,
  setSubdomain,
  subdomainStatus,
  subdomainMessage,
  publishing,
  progress,
  onPublish,
}: PublishPanelProps) {
  const [error, setError] = useState<string>()

  const canPublish =
    !publishing && subdomain && subdomainStatus === 'available'

  const handlePublish = async () => {
    setError(undefined)
    try {
      await onPublish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onBack}
          disabled={publishing}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Publish</span>
      </div>

      {/* Subdomain Input */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Subdomain</Label>
        <SubdomainInput
          value={subdomain}
          onChange={setSubdomain}
          status={subdomainStatus}
          message={subdomainMessage}
          disabled={publishing}
        />
      </div>

      {/* Progress */}
      {publishing && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.message}</span>
            <span>{getProgressPercent(progress)}%</span>
          </div>
          <Progress value={getProgressPercent(progress)} className="h-1" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Publish Button */}
      <Button
        className="w-full"
        onClick={handlePublish}
        disabled={!canPublish}
      >
        {publishing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : (
          'Publish'
        )}
      </Button>
    </div>
  )
}
