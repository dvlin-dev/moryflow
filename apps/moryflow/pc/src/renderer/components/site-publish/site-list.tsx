/**
 * [PROPS]: SiteListProps - 站点列表与发布入口回调
 * [EMITS]: onPublishNew() - 发布新站点
 * [POS]: 站点发布列表与管理入口（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 * [UPDATE]: 2026-02-09 - 显式启用 autoRefresh，避免 hook 默认在后台隐式拉取站点列表
 */

import { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Copy,
  Delete,
  File,
  Globe,
  Loader,
  Ellipsis,
  Power,
  Check,
} from 'lucide-react';
import { Button } from '@anyhunt/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@anyhunt/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui/components/alert-dialog';
import { cn } from '@/lib/utils';
import type { Site } from '../../../shared/ipc/site-publish';
import { useSitePublish } from './use-site-publish';

interface SiteListProps {
  className?: string;
  onPublishNew?: () => void;
}

export function SiteList({ className, onPublishNew }: SiteListProps) {
  const { sites, loading, error, refreshSites, deleteSite, offlineSite, onlineSite } =
    useSitePublish({ autoRefresh: true });

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 复制链接
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 复制链接
  const handleCopyLink = async (site: Site) => {
    await navigator.clipboard.writeText(site.url);
    setCopiedId(site.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 删除站点
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteSite(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // 切换上下线
  const handleToggleStatus = async (site: Site) => {
    if (site.status === 'ACTIVE') {
      await offlineSite(site.id);
    } else {
      await onlineSite(site.id);
    }
  };

  // 按状态分组
  const groupedSites = useMemo(() => {
    const active = sites.filter((s) => s.status === 'ACTIVE');
    const offline = sites.filter((s) => s.status === 'OFFLINE');
    return { active, offline };
  }, [sites]);

  if (loading && sites.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 gap-4', className)}>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={refreshSites}>
          Retry
        </Button>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 gap-4', className)}>
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
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
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 在线站点 */}
      {groupedSites.active.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Online sites ({groupedSites.active.length})
          </h3>
          <div className="space-y-2">
            {groupedSites.active.map((site) => (
              <SiteCard
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

      {/* 离线站点 */}
      {groupedSites.offline.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Offline sites ({groupedSites.offline.length})
          </h3>
          <div className="space-y-2">
            {groupedSites.offline.map((site) => (
              <SiteCard
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

      {/* 删除确认对话框 */}
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
              {deleting ? <Loader className="size-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 站点卡片
interface SiteCardProps {
  site: Site;
  copiedId: string | null;
  onCopyLink: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function SiteCard({ site, copiedId, onCopyLink, onToggleStatus, onDelete }: SiteCardProps) {
  const isOffline = site.status === 'OFFLINE';

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border bg-card transition-colors',
        isOffline && 'opacity-60'
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          'size-10 rounded-lg flex items-center justify-center',
          isOffline ? 'bg-muted' : 'bg-primary/10'
        )}
      >
        <Globe className={cn('size-5', isOffline ? 'text-muted-foreground' : 'text-primary')} />
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{site.title || site.subdomain}</h4>
          {isOffline && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Offline</span>}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground hover:underline truncate"
          >
            {site.url.replace('https://', '')}
          </a>
          <span className="flex items-center gap-1">
            <File className="size-3" />
            {site.pageCount === 1 ? '1 page' : `${site.pageCount} pages`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(site.updatedAt)}
          </span>
        </div>
      </div>

      {/* 操作 */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCopyLink} className="size-8">
          {copiedId === site.id ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" asChild className="size-8">
          <a href={site.url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleStatus}>
              {isOffline ? (
                <>
                  <Power className="size-4 mr-2" />
                  Go online
                </>
              ) : (
                <>
                  <Power className="size-4 mr-2" />
                  Take offline
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Delete className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// 格式化日期
function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
