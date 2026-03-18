/**
 * [PROPS]: { site, onBack, onPublish, onUpdate, onUnpublish, onSettingsChange, onDelete }
 * [EMITS]: onBack(), onPublish(), onUpdate(), onUnpublish(), onSettingsChange(settings), onDelete()
 * [POS]: Sites CMS 的站点详情页组件（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, Copy, LoaderCircle, Check } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Textarea } from '@moryflow/ui/components/textarea';
import { Checkbox } from '@moryflow/ui/components/checkbox';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@moryflow/ui/components/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { SiteDetailProps } from './const';
import { formatRelativeTime, isSiteOnline } from './const';

export function SiteDetail({
  site,
  onBack,
  onPublish,
  onUpdate,
  onUnpublish,
  onSettingsChange,
  onDelete,
}: SiteDetailProps) {
  const { t } = useTranslation('workspace');
  const [title, setTitle] = useState(site.title || '');
  const [description, setDescription] = useState(site.description || '');
  const [showWatermark, setShowWatermark] = useState(site.showWatermark);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);

  const isOnline = isSiteOnline(site);

  // 同步 site 变化
  useEffect(() => {
    setTitle(site.title || '');
    setDescription(site.description || '');
    setShowWatermark(site.showWatermark);
  }, [site]);

  // 检查是否有变更
  const hasChanges =
    title !== (site.title || '') ||
    description !== (site.description || '') ||
    showWatermark !== site.showWatermark;

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await onSettingsChange({
        title: title || undefined,
        description: description || undefined,
        showWatermark,
      });
      toast.success(t('sitesSettingsSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('sitesFailedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(site.url);
    setCopied(true);
    toast.success(t('sitesLinkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSite = () => {
    window.open(site.url, '_blank');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-6 py-4">
        <Button variant="ghost" size="icon" className="size-8" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">{site.subdomain}</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* 状态信息 */}
          <div className="rounded-xl border border-border/60 shadow-xs bg-card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('sitesStatus')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                    )}
                  />
                  <span className="text-sm font-medium">
                    {isOnline ? t('sitesOnline') : t('sitesOffline')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('sitesUrl')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="truncate text-sm">{site.url}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="size-3.5 text-success" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={handleOpenSite}
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('sitesPages')}</p>
                <p className="mt-1 text-sm">
                  {site.pageCount === 1
                    ? t('sitesPageOne', { count: site.pageCount })
                    : t('sitesPageOther', { count: site.pageCount })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('sitesLastUpdated')}</p>
                <p className="mt-1 text-sm">{formatRelativeTime(site.updatedAt, t)}</p>
              </div>
            </div>
          </div>

          {/* 设置 */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium">{t('sitesSettingsTitle')}</h2>

            <div className="space-y-4 rounded-xl border border-border/60 shadow-xs bg-card p-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="site-title" className="text-xs text-muted-foreground">
                  {t('sitesTitleLabel')}
                </Label>
                <Input
                  id="site-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('sitesTitlePlaceholder')}
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="site-description" className="text-xs text-muted-foreground">
                  {t('sitesDescriptionLabel')}
                </Label>
                <Textarea
                  id="site-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('sitesDescriptionPlaceholder')}
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
                <Label htmlFor="show-watermark" className="text-sm font-normal cursor-pointer">
                  {t('sitesShowWatermark')}
                </Label>
              </div>

              {/* Save Button */}
              {hasChanges && (
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      {t('sitesSaving')}
                    </>
                  ) : (
                    t('sitesSaveChanges')
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 操作 */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium">{t('sitesActionsTitle')}</h2>

            <div className="flex flex-wrap gap-2">
              {isOnline ? (
                <>
                  <Button variant="outline" onClick={onUpdate}>
                    {t('sitesUpdate')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowUnpublishDialog(true)}>
                    {t('sitesUnpublish')}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={onPublish}>
                  {t('sitesPublish')}
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteDialog(true)}
              >
                {t('sitesDeleteSite')}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 下线确认对话框 */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sitesUnpublishTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sitesUnpublishDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('filePickerCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onUnpublish();
                setShowUnpublishDialog(false);
              }}
            >
              {t('sitesUnpublish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sitesDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sitesDeleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('filePickerCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('sitesDeleteSite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
