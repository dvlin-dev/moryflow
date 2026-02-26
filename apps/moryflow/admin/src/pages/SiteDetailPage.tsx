/**
 * 站点详情页面
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSiteDetail,
  useOfflineSite,
  useOnlineSite,
  useDeleteSite,
  SiteDetailContent,
  SiteActionConfirmDialog,
  resolveSiteDetailViewState,
  type SiteActionType,
  type SiteStatus,
} from '@/features/sites';
import { ArrowLeft, Delete, ToggleLeft, ToggleRight, View } from 'lucide-react';

function StatusActionButton({
  status,
  onOffline,
  onOnline,
}: {
  status: SiteStatus;
  onOffline: () => void;
  onOnline: () => void;
}) {
  if (status === 'ACTIVE') {
    return (
      <Button variant="outline" onClick={onOffline}>
        <ToggleLeft className="h-4 w-4 mr-2" />
        下线
      </Button>
    );
  }

  if (status === 'OFFLINE') {
    return (
      <Button variant="outline" onClick={onOnline}>
        <ToggleRight className="h-4 w-4 mr-2" />
        上线
      </Button>
    );
  }

  return null;
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [actionType, setActionType] = useState<SiteActionType | null>(null);

  const { data: site, isLoading, error } = useSiteDetail(id);
  const offlineMutation = useOfflineSite();
  const onlineMutation = useOnlineSite();
  const deleteMutation = useDeleteSite();

  const viewState = resolveSiteDetailViewState({
    isLoading,
    error,
    hasSite: !!site,
  });

  const handleConfirmAction = () => {
    if (!id || !actionType) return;

    switch (actionType) {
      case 'offline':
        offlineMutation.mutate(id);
        break;
      case 'online':
        onlineMutation.mutate(id);
        break;
      case 'delete':
        deleteMutation.mutate(id, {
          onSuccess: () => navigate('/sites'),
        });
        break;
    }

    setActionType(null);
  };

  const isActionLoading =
    offlineMutation.isPending || onlineMutation.isPending || deleteMutation.isPending;

  if (viewState === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">站点详情加载失败，请稍后重试</p>
        <Button variant="link" onClick={() => navigate('/sites')}>
          返回站点列表
        </Button>
      </div>
    );
  }

  if (viewState === 'not-found') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">站点不存在</p>
        <Button variant="link" onClick={() => navigate('/sites')}>
          返回站点列表
        </Button>
      </div>
    );
  }

  if (!site) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="站点详情"
        description={site.subdomain}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/sites')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
            <Button variant="outline" asChild>
              <a href={site.url} target="_blank" rel="noopener noreferrer">
                <View className="h-4 w-4 mr-2" />
                预览站点
              </a>
            </Button>
            <StatusActionButton
              status={site.status}
              onOffline={() => setActionType('offline')}
              onOnline={() => setActionType('online')}
            />
            <Button variant="destructive" onClick={() => setActionType('delete')}>
              <Delete className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        }
      />

      <SiteDetailContent site={site} />

      <SiteActionConfirmDialog
        actionType={actionType}
        siteSubdomain={site.subdomain}
        isLoading={isActionLoading}
        open={!!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null);
          }
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
