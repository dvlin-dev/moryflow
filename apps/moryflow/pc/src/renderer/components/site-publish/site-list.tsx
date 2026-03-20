/**
 * [PROPS]: SiteListProps - 站点列表与发布入口回调
 * [EMITS]: onPublishNew() - 发布新站点
 * [POS]: 站点发布列表与管理入口（Lucide 图标）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo, useState } from 'react';
import { Delete, Globe, Loader } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
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
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Site } from '../../../shared/ipc/site-publish';
import { useSitePublish } from './use-site-publish';
import { SiteListCard } from './site-list-card';

type SiteListProps = {
  className?: string;
  onPublishNew?: () => void;
};

type SiteListViewState = 'loading' | 'error' | 'empty' | 'ready';

export function SiteList({ className, onPublishNew }: SiteListProps) {
  const { t } = useTranslation('workspace');
  const { sites, loading, error, refreshSites, deleteSite, offlineSite, onlineSite } =
    useSitePublish({ autoRefresh: true });

  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groupedSites = useMemo(() => {
    const active = sites.filter((site) => site.status === 'ACTIVE');
    const offline = sites.filter((site) => site.status === 'OFFLINE');
    return { active, offline };
  }, [sites]);

  const viewState: SiteListViewState = useMemo(() => {
    if (loading && sites.length === 0) {
      return 'loading';
    }
    if (error) {
      return 'error';
    }
    if (sites.length === 0) {
      return 'empty';
    }
    return 'ready';
  }, [error, loading, sites.length]);

  const handleCopyLink = async (site: Site) => {
    await navigator.clipboard.writeText(site.url);
    setCopiedId(site.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await deleteSite(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (site: Site) => {
    if (site.status === 'ACTIVE') {
      await offlineSite(site.id);
      return;
    }
    await onlineSite(site.id);
  };

  const renderLoadingState = () => (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <Loader className="size-6 animate-spin text-muted-foreground" />
    </div>
  );

  const renderErrorState = () => (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" size="sm" onClick={refreshSites}>
        {t('retry')}
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Globe className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">{t('publishSiteListNoSites')}</p>
        <p className="text-sm text-muted-foreground">{t('publishSiteListDescription')}</p>
      </div>
      {onPublishNew && <Button onClick={onPublishNew}>{t('publishSiteListPublishFirst')}</Button>}
    </div>
  );

  const renderReadyState = () => (
    <div className={cn('space-y-6', className)}>
      {groupedSites.active.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('publishSiteListOnlineSites', { count: groupedSites.active.length })}
          </h3>
          <div className="space-y-2">
            {groupedSites.active.map((site) => (
              <SiteListCard
                key={site.id}
                site={site}
                copiedId={copiedId}
                onCopyLink={() => handleCopyLink(site)}
                onToggleStatus={() => handleToggleStatus(site)}
                onDelete={() => setDeleteTarget(site)}
              />
            ))}
          </div>
        </section>
      )}

      {groupedSites.offline.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('publishSiteListOfflineSites', { count: groupedSites.offline.length })}
          </h3>
          <div className="space-y-2">
            {groupedSites.offline.map((site) => (
              <SiteListCard
                key={site.id}
                site={site}
                copiedId={copiedId}
                onCopyLink={() => handleCopyLink(site)}
                onToggleStatus={() => handleToggleStatus(site)}
                onDelete={() => setDeleteTarget(site)}
              />
            ))}
          </div>
        </section>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('publishSiteListDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('publishSiteListDeleteDescription', {
                name: deleteTarget?.title || deleteTarget?.subdomain || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('filePickerCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader className="mr-2 size-4 animate-spin" />
              ) : (
                <Delete className="mr-2 size-4" />
              )}
              {t('sitesDeleteSite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderContentByState = () => {
    switch (viewState) {
      case 'loading':
        return renderLoadingState();
      case 'error':
        return renderErrorState();
      case 'empty':
        return renderEmptyState();
      case 'ready':
      default:
        return renderReadyState();
    }
  };

  return renderContentByState();
}
