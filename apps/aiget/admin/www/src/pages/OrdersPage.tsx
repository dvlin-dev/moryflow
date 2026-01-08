/**
 * Orders 页面
 * 订单管理
 */
import { useState } from 'react';
import { PageHeader, SimplePagination } from '@aiget/ui/composed';
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
} from '@aiget/ui/primitives';
import { formatRelativeTime } from '@aiget/ui/lib';
import { Search } from 'lucide-react';
import { useOrders } from '@/features/orders';
import type { OrderQuery, OrderStatus, OrderType } from '@/features/orders';

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'completed', 'failed', 'refunded'];
const TYPE_OPTIONS: OrderType[] = ['subscription', 'quota_purchase'];

export default function OrdersPage() {
  const [query, setQuery] = useState<OrderQuery>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useOrders(query);

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, page: 1, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleFilterStatus = (status: string) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      status: status === 'all' ? undefined : (status as OrderStatus),
    }));
  };

  const handleFilterType = (type: string) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      type: type === 'all' ? undefined : (type as OrderType),
    }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'refunded':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'default';
      case 'quota_purchase':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
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
                      {status}
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
                      {type === 'subscription' ? '订阅' : '配额购买'}
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
                    <TableHead>配额数量</TableHead>
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
                          <p className="text-sm text-muted-foreground">{order.userEmail || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(order.type)}>
                          {order.type === 'subscription' ? '订阅' : '配额购买'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(order.amount, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {order.quotaAmount ? (
                          <span>{order.quotaAmount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
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
