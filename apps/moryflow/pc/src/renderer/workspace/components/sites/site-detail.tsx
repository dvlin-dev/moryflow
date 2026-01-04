/**
 * [PROPS]: { site, onBack, onPublish, onUpdate, onUnpublish, onSettingsChange, onDelete }
 * [EMITS]: onBack(), onPublish(), onUpdate(), onUnpublish(), onSettingsChange(settings), onDelete()
 * [POS]: Sites CMS 的站点详情页组件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@aiget/ui/components/button'
import { Input } from '@aiget/ui/components/input'
import { Label } from '@aiget/ui/components/label'
import { Textarea } from '@aiget/ui/components/textarea'
import { Checkbox } from '@aiget/ui/components/checkbox'
import { ScrollArea } from '@aiget/ui/components/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@aiget/ui/components/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SiteDetailProps } from './const'
import { formatRelativeTime, isSiteOnline } from './const'

export function SiteDetail({
  site,
  onBack,
  onPublish,
  onUpdate,
  onUnpublish,
  onSettingsChange,
  onDelete,
}: SiteDetailProps) {
  const [title, setTitle] = useState(site.title || '')
  const [description, setDescription] = useState(site.description || '')
  const [showWatermark, setShowWatermark] = useState(site.showWatermark)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)

  const isOnline = isSiteOnline(site)

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
    try {
      await onSettingsChange({
        title: title || undefined,
        description: description || undefined,
        showWatermark,
      })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(site.url)
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenSite = () => {
    window.open(site.url, '_blank')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{site.subdomain}</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* 状态信息 */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                    )}
                  />
                  <span className="text-sm font-medium">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">URL</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="truncate text-sm">{site.url}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={handleOpenSite}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pages</p>
                <p className="mt-1 text-sm">
                  {site.pageCount} {site.pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last updated</p>
                <p className="mt-1 text-sm">{formatRelativeTime(site.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* 设置 */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Settings</h2>

            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
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

              {/* Save Button */}
              {hasChanges && (
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 操作 */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Actions</h2>

            <div className="flex flex-wrap gap-2">
              {isOnline ? (
                <>
                  <Button variant="outline" onClick={onUpdate}>
                    Update
                  </Button>
                  <Button variant="outline" onClick={() => setShowUnpublishDialog(true)}>
                    Unpublish
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={onPublish}>
                  Publish
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 下线确认对话框 */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this site?</AlertDialogTitle>
            <AlertDialogDescription>
              Your site will be taken offline and visitors will see a 404 page.
              You can republish at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onUnpublish()
                setShowUnpublishDialog(false)
              }}
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The site and all its data will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete()
                setShowDeleteDialog(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
