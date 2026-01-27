/**
 * 站点管理页面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, TierBadge, SimplePagination } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePagination } from '@/hooks';
import { formatDate } from '@/lib/format';
import {
  useSites,
  useOfflineSite,
  useOnlineSite,
  useDeleteSite,
  SiteStatusBadge,
  SiteTypeBadge,
  type SiteListItem,
} from '@/features/sites';
import {
  Delete,
  SquareArrowUpRight,
  Ellipsis,
  Search,
  ToggleLeft,
  ToggleRight,
  View,
} from 'lucide-react';

const PAGE_SIZE = 20;

// 筛选选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'ACTIVE', label: '活跃' },
  { value: 'OFFLINE', label: '下线' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'MARKDOWN', label: 'Markdown' },
  { value: 'GENERATED', label: 'AI 生成' },
];

const TIER_OPTIONS = [
  { value: 'all', label: '全部等级' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'license', label: 'License' },
];

const EXPIRY_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'expiring', label: '即将过期' },
  { value: 'expired', label: '已过期' },
];

export default function SitesPage() {
  // 筛选状态
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  // 操作状态
  const [actionSite, setActionSite] = useState<SiteListItem | null>(null);
  const [actionType, setActionType] = useState<'offline' | 'online' | 'delete' | null>(null);

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  // 数据查询
  const { data, isLoading } = useSites({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    userTier: tierFilter !== 'all' ? tierFilter : undefined,
    expiryFilter: expiryFilter !== 'all' ? expiryFilter : undefined,
  });

  // Mutations
  const offlineMutation = useOfflineSite();
  const onlineMutation = useOnlineSite();
  const deleteMutation = useDeleteSite();

  const sites = data?.sites || [];
  const totalPages = getTotalPages(data?.pagination.total || 0);

  // 处理搜索
  const handleSearch = () => {
    setSearch(searchInput);
    resetPage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理操作
  const handleAction = (site: SiteListItem, action: typeof actionType) => {
    setActionSite(site);
    setActionType(action);
  };

  const handleConfirmAction = () => {
    if (!actionSite || !actionType) return;

    const id = actionSite.id;
    switch (actionType) {
      case 'offline':
        offlineMutation.mutate(id);
        break;
      case 'online':
        onlineMutation.mutate(id);
        break;
      case 'delete':
        deleteMutation.mutate(id);
        break;
    }

    setActionSite(null);
    setActionType(null);
  };

  const isActionLoading =
    offlineMutation.isPending || onlineMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="站点管理" description="查看和管理用户发布的站点" />

      {/* 搜索和筛选 */}
      <div className="flex flex-wrap gap-2">
        {/* 搜索框 */}
        <div className="flex gap-2">
          <Input
            placeholder="搜索子域名、标题、邮箱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-64"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* 状态筛选 */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 类型筛选 */}
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 用户等级筛选 */}
        <Select
          value={tierFilter}
          onValueChange={(value) => {
            setTierFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 过期筛选 */}
        <Select
          value={expiryFilter}
          onValueChange={(value) => {
            setExpiryFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 站点列表 */}
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
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sites.length > 0 ? (
              sites.map((site) => (
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
                    {site.title && (
                      <div className="text-xs text-muted-foreground">{site.title}</div>
                    )}
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
                  <TableCell className="text-muted-foreground">
                    {site.publishedAt ? formatDate(site.publishedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {site.expiresAt ? formatDate(site.expiresAt) : '永久'}
                  </TableCell>
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
                          <DropdownMenuItem onClick={() => handleAction(site, 'offline')}>
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            强制下线
                          </DropdownMenuItem>
                        )}
                        {site.status === 'OFFLINE' && (
                          <DropdownMenuItem onClick={() => handleAction(site, 'online')}>
                            <ToggleRight className="mr-2 h-4 w-4" />
                            恢复上线
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleAction(site, 'delete')}
                        >
                          <Delete className="mr-2 h-4 w-4" />
                          删除站点
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  暂无站点数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {sites.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

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
              {actionType === 'offline' &&
                `站点 ${actionSite?.subdomain} 将被下线，用户将无法访问。`}
              {actionType === 'online' && `站点 ${actionSite?.subdomain} 将恢复上线。`}
              {actionType === 'delete' && (
                <span className="text-red-600">
                  站点 {actionSite?.subdomain} 的所有数据和文件将被永久删除，此操作不可恢复！
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
