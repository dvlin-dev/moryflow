/**
 * [PROPS]: { site, onBack, onSettingsChange }
 * [EMITS]: onBack() - 返回上一面板, onSettingsChange(settings) - 设置变更
 * [POS]: Share Popover 的站点设置面板
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@anyhunt/ui/components/button'
import { Input } from '@anyhunt/ui/components/input'
import { Label } from '@anyhunt/ui/components/label'
import { Textarea } from '@anyhunt/ui/components/textarea'
import { Checkbox } from '@anyhunt/ui/components/checkbox'
import type { Site } from '../../../shared/ipc/site-publish'
import type { SiteSettings } from './const'

interface SiteSettingsPanelProps {
  site: Site
  onBack: () => void
  onSettingsChange: (settings: Partial<SiteSettings>) => Promise<void>
}

export function SiteSettingsPanel({
  site,
  onBack,
  onSettingsChange,
}: SiteSettingsPanelProps) {
  const [title, setTitle] = useState(site.title || '')
  const [description, setDescription] = useState(site.description || '')
  const [showWatermark, setShowWatermark] = useState(site.showWatermark)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  // 同步 site 变化
  useEffect(() => {
    setTitle(site.title || '')
    setDescription(site.description || '')
    setShowWatermark(site.showWatermark)
  }, [site])

  // 检查是否有变更
  const hasChanges =
    title !== (site.title || '') ||
    description !== (site.description || '') ||
    showWatermark !== site.showWatermark

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    setError(undefined)

    try {
      await onSettingsChange({
        title: title || undefined,
        description: description || undefined,
        showWatermark,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
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
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Site settings</span>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="site-title" className="text-xs text-muted-foreground">
          Title
        </Label>
        <Input
          id="site-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Site"
          disabled={saving}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="site-description" className="text-xs text-muted-foreground">
          Description
        </Label>
        <Textarea
          id="site-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description..."
          rows={3}
          disabled={saving}
          className="resize-none"
        />
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Watermark */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="show-watermark"
          checked={showWatermark}
          onCheckedChange={(checked) => setShowWatermark(checked === true)}
          disabled={saving}
        />
        <Label
          htmlFor="show-watermark"
          className="text-sm font-normal cursor-pointer"
        >
          Show watermark
        </Label>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Save Button */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={!hasChanges || saving}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save changes'
        )}
      </Button>
    </div>
  )
}
