/**
 * 站点详情页面
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, TierBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDateTime } from '@/lib/format';
import {
  useSiteDetail,
  useOfflineSite,
  useOnlineSite,
  useDeleteSite,
  SiteStatusBadge,
  SiteTypeBadge,
} from '@/features/sites';
import {
  ArrowLeft,
  Calendar,
  Delete,
  File,
  Globe,
  SquareArrowUpRight,
  ToggleLeft,
  ToggleRight,
  User,
  View,
} from 'lucide-react';

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [actionType, setActionType] = useState<'offline' | 'online' | 'delete' | null>(null);

  const { data: site, isLoading } = useSiteDetail(id);
  const offlineMutation = useOfflineSite();
  const onlineMutation = useOnlineSite();
  const deleteMutation = useDeleteSite();

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

  if (isLoading) {
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

  if (!site) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">站点不存在</p>
        <Button variant="link" onClick={() => navigate('/sites')}>
          返回站点列表
        </Button>
      </div>
    );
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
            {site.status === 'ACTIVE' && (
              <Button variant="outline" onClick={() => setActionType('offline')}>
                <ToggleLeft className="h-4 w-4 mr-2" />
                下线
              </Button>
            )}
            {site.status === 'OFFLINE' && (
              <Button variant="outline" onClick={() => setActionType('online')}>
                <ToggleRight className="h-4 w-4 mr-2" />
                上线
              </Button>
            )}
            <Button variant="destructive" onClick={() => setActionType('delete')}>
              <Delete className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">站点 ID</p>
                <p className="font-mono text-xs mt-1 break-all">{site.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">子域名</p>
                <p className="mt-1 font-medium">{site.subdomain}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">类型</p>
                <div className="mt-1">
                  <SiteTypeBadge type={site.type} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">状态</p>
                <div className="mt-1">
                  <SiteStatusBadge status={site.status} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">标题</p>
                <p className="mt-1">{site.title || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">水印</p>
                <p className="mt-1">{site.showWatermark ? '显示' : '隐藏'}</p>
              </div>
            </div>
            {site.description && (
              <div>
                <p className="text-sm text-muted-foreground">描述</p>
                <p className="mt-1 text-sm">{site.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">URL</p>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {site.url}
                <SquareArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 所有者信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              所有者信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">用户 ID</p>
                <Link
                  to={`/users/${site.owner.id}`}
                  className="font-mono text-xs mt-1 text-blue-600 hover:underline break-all block"
                >
                  {site.owner.id}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">邮箱</p>
                <Link
                  to={`/users/${site.owner.id}`}
                  className="mt-1 text-blue-600 hover:underline block"
                >
                  {site.owner.email}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">用户等级</p>
                <div className="mt-1">
                  <TierBadge tier={site.owner.subscriptionTier} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">注册时间</p>
                <p className="mt-1 text-sm">{formatDateTime(site.owner.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              时间信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p className="mt-1 text-sm">{formatDateTime(site.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">更新时间</p>
                <p className="mt-1 text-sm">{formatDateTime(site.updatedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">发布时间</p>
                <p className="mt-1 text-sm">
                  {site.publishedAt ? formatDateTime(site.publishedAt) : '未发布'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">过期时间</p>
                <p className="mt-1 text-sm">
                  {site.expiresAt ? formatDateTime(site.expiresAt) : '永久'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 页面列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <File className="h-4 w-4" />
            页面列表 ({site.pages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {site.pages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>路径</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>本地文件</TableHead>
                  <TableHead>更新时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {site.pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-mono text-sm">{page.path}</TableCell>
                    <TableCell>{page.title || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {page.localFilePath || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(page.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无页面数据</p>
          )}
        </CardContent>
      </Card>

      {/* 操作确认对话框 */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'offline' && '确认下线站点？'}
              {actionType === 'online' && '确认上线站点？'}
              {actionType === 'delete' && '确认删除站点？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'offline' && `站点 ${site.subdomain} 将被下线，用户将无法访问。`}
              {actionType === 'online' && `站点 ${site.subdomain} 将恢复上线。`}
              {actionType === 'delete' && (
                <span className="text-red-600">
                  站点 {site.subdomain} 的所有数据和文件将被永久删除，此操作不可恢复！
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActionLoading}
              className={actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isActionLoading ? '处理中...' : '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
