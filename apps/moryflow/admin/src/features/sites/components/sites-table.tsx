import { Link } from 'react-router-dom';
import { TableSkeleton, TierBadge, type ColumnConfig } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { Delete, Ellipsis, SquareArrowUpRight, ToggleLeft, ToggleRight, View } from 'lucide-react';
import { SiteStatusBadge } from './SiteStatusBadge';
import { SiteTypeBadge } from './SiteTypeBadge';
import type { SiteActionType, SiteListItem } from '../types';
import type { SitesListViewState } from '../view-state';

interface SitesTableProps {
  sites: SiteListItem[];
  viewState: SitesListViewState;
  onAction: (site: SiteListItem, action: SiteActionType) => void;
}

const SITES_TABLE_COLUMNS: ColumnConfig[] = [
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
  { width: 'w-full' },
];

function SitesTableRow({ site, onAction }: { site: SiteListItem; onAction: SitesTableProps['onAction'] }) {
  return (
    <TableRow key={site.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{site.subdomain}</span>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <SquareArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        {site.title && <div className="text-xs text-muted-foreground">{site.title}</div>}
      </TableCell>
      <TableCell>
        <SiteTypeBadge type={site.type} />
      </TableCell>
      <TableCell>
        <SiteStatusBadge status={site.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link to={`/users/${site.owner.id}`} className="text-sm hover:underline">
            {site.owner.email}
          </Link>
          <TierBadge tier={site.owner.subscriptionTier} short />
        </div>
      </TableCell>
      <TableCell>{site.pageCount}</TableCell>
      <TableCell className="text-muted-foreground">{site.publishedAt ? formatDate(site.publishedAt) : '-'}</TableCell>
      <TableCell className="text-muted-foreground">{site.expiresAt ? formatDate(site.expiresAt) : '永久'}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/sites/${site.id}`}>
                <View className="mr-2 h-4 w-4" />
                查看详情
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {site.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={() => onAction(site, 'offline')}>
                <ToggleLeft className="mr-2 h-4 w-4" />
                强制下线
              </DropdownMenuItem>
            )}
            {site.status === 'OFFLINE' && (
              <DropdownMenuItem onClick={() => onAction(site, 'online')}>
                <ToggleRight className="mr-2 h-4 w-4" />
                恢复上线
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600" onClick={() => onAction(site, 'delete')}>
              <Delete className="mr-2 h-4 w-4" />
              删除站点
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function SitesTable({ sites, viewState, onAction }: SitesTableProps) {
  const renderRowsByState = () => {
    switch (viewState) {
      case 'loading':
        return <TableSkeleton columns={SITES_TABLE_COLUMNS} rows={5} />;
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-destructive">
              站点列表加载失败，请稍后重试
            </TableCell>
          </TableRow>
        );
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              暂无站点数据
            </TableCell>
          </TableRow>
        );
      case 'ready':
        return sites.map((site) => <SitesTableRow key={site.id} site={site} onAction={onAction} />);
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>子域名</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>所有者</TableHead>
            <TableHead>页面数</TableHead>
            <TableHead>发布时间</TableHead>
            <TableHead>过期时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderRowsByState()}</TableBody>
      </Table>
    </div>
  );
}
