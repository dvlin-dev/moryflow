/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Orders 页面 - 订单管理（Lucide icons direct render）
 */
import { Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import {
  getOrderTypeLabel,
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  OrdersListContent,
  type OrdersContentState,
  useOrders,
} from '@/features/orders';
import type { OrderQuery, OrderStatus, OrderType } from '@/features/orders';
import { usePagedSearchQuery } from '@/lib/usePagedSearchQuery';

function resolveOrdersContentState(params: {
  isLoading: boolean;
  itemCount: number;
}): OrdersContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.itemCount > 0) {
    return 'ready';
  }

  return 'empty';
}

export default function OrdersPage() {
  const {
    query,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
    setQueryFilter,
  } = usePagedSearchQuery<OrderQuery>({
    initialQuery: { page: 1, limit: 20 },
  });

  const { data, isLoading } = useOrders(query);

  const handleFilterStatus = (status: string) => {
    setQueryFilter('status', status === 'all' ? undefined : (status as OrderStatus));
  };

  const handleFilterType = (type: string) => {
    setQueryFilter('type', type === 'all' ? undefined : (type as OrderType));
  };

  const ordersContentState = resolveOrdersContentState({
    isLoading,
    itemCount: data?.items.length ?? 0,
  });

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
                  {ORDER_STATUS_OPTIONS.map((status) => (
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
                  {ORDER_TYPE_OPTIONS.map((type) => (
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
                onKeyDown={handleSearchKeyDown}
                className="w-48"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OrdersListContent
            state={ordersContentState}
            data={data}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
