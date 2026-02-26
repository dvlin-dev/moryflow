/**
 * [PROPS]: SiteListProps - 站点列表与发布入口回调
 * [EMITS]: onPublishNew() - 发布新站点
 * [POS]: 站点发布列表与管理入口（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 * [UPDATE]: 2026-02-09 - 显式启用 autoRefresh，避免 hook 默认在后台隐式拉取站点列表
 * [UPDATE]: 2026-02-26 - 多状态渲染收敛为 view-state + switch，并拆分 SiteListCard
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
import type { Site } from '../../../shared/ipc/site-publish';
import { useSitePublish } from './use-site-publish';
import { SiteListCard } from './site-list-card';

type SiteListProps = {
  className?: string;
  onPublishNew?: () => void;
};

type SiteListViewState = 'loading' | 'error' | 'empty' | 'ready';

export function SiteList({ className, onPublishNew }: SiteListProps) {
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
        Retry
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Globe className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">No sites published yet</p>
        <p className="text-sm text-muted-foreground">
          Publish your docs as a site and share with others.
        </p>
      </div>
      {onPublishNew && <Button onClick={onPublishNew}>Publish your first site</Button>}
    </div>
  );

  const renderReadyState = () => (
    <div className={cn('space-y-6', className)}>
      {groupedSites.active.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Online sites ({groupedSites.active.length})
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
            Offline sites ({groupedSites.offline.length})
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
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{deleteTarget?.title || deleteTarget?.subdomain}</strong> and all its pages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader className="mr-2 size-4 animate-spin" /> : <Delete className="mr-2 size-4" />}
              Delete
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

