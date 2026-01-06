/**
 * Orders 页面
 * 订单管理
 */
import { useState } from 'react';
import { PageHeader, SimplePagination } from '@memai/ui/composed';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memai/ui/primitives';
import { formatRelativeTime } from '@memai/ui/lib';
import { Search } from 'lucide-react';
import { useOrders } from '@/features/orders';
import type { OrderQuery, OrderStatus, OrderType } from '@/features/orders';
import { formatAmount } from '@/lib/formatters';
import { getOrderTypeLabel, getOrderStatusLabel } from '@/lib/labels';
import {
  getOrderStatusBadgeVariant,
  getOrderTypeBadgeVariant,
} from '@/lib/badge-variants';

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'completed', 'failed', 'refunded'];
const TYPE_OPTIONS: OrderType[] = ['subscription', 'usage_billing'];
const DEFAULT_LIMIT = 20;

export default function OrdersPage() {
  const [query, setQuery] = useState<OrderQuery>({ offset: 0, limit: DEFAULT_LIMIT });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useOrders(query);

  // 计算当前页码和总页数
  const currentPage = Math.floor((query.offset ?? 0) / DEFAULT_LIMIT) + 1;
  const totalPages = data ? Math.ceil(data.pagination.total / DEFAULT_LIMIT) : 1;

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, offset: 0, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, offset: (page - 1) * DEFAULT_LIMIT }));
  };

  const handleFilterStatus = (status: string) => {
    setQuery((prev) => ({
      ...prev,
      offset: 0,
      status: status === 'all' ? undefined : (status as OrderStatus),
    }));
  };

  const handleFilterType = (type: string) => {
    setQuery((prev) => ({
      ...prev,
      offset: 0,
      type: type === 'all' ? undefined : (type as OrderType),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="查看支付订单" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>订单列表</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={query.status || 'all'} onValueChange={handleFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getOrderStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={query.type || 'all'} onValueChange={handleFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getOrderTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="搜索用户..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-48"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">没有找到订单</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{order.creemOrderId}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.userName || '未设置'}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.userEmail || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOrderTypeBadgeVariant(order.type)}>
                          {getOrderTypeLabel(order.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(order.amount, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
