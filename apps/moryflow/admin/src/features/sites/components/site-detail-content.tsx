import { Link } from 'react-router-dom';
import { TierBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { Calendar, File, Globe, SquareArrowUpRight, User } from 'lucide-react';
import { SiteStatusBadge } from './SiteStatusBadge';
import { SiteTypeBadge } from './SiteTypeBadge';
import type { SiteDetail } from '../types';

interface SiteDetailContentProps {
  site: SiteDetail;
}

export function SiteDetailContent({ site }: SiteDetailContentProps) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
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
                <Link to={`/users/${site.owner.id}`} className="mt-1 text-blue-600 hover:underline block">
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
                <p className="mt-1 text-sm">{site.publishedAt ? formatDateTime(site.publishedAt) : '未发布'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">过期时间</p>
                <p className="mt-1 text-sm">{site.expiresAt ? formatDateTime(site.expiresAt) : '永久'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <TableCell className="text-sm text-muted-foreground">{page.localFilePath || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(page.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">暂无页面数据</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
