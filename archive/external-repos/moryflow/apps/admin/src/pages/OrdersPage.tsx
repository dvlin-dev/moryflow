/**
 * 订单管理页面
 */
import { useState } from 'react'
import {
  PageHeader,
  TableSkeleton,
  SimplePagination,
  StatusBadge,
  ORDER_STATUS_CONFIG,
} from '@/components/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks'
import { formatDate, formatCurrency } from '@/lib/format'
import {
  useOrders,
  ORDER_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  PRODUCT_TYPE_LABEL,
  ORDER_TABLE_COLUMNS,
  OrderDetailDialog,
} from '@/features/payment'
import type { PaymentOrder } from '@/types/payment'
import { Eye } from 'lucide-react'

const PAGE_SIZE = 20

export default function OrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE })

  const { data, isLoading } = useOrders({
    page,
    pageSize: PAGE_SIZE,
    status: selectedStatus,
    productType: selectedType,
  })

  const orders = data?.orders || []
  const totalPages = getTotalPages(data?.pagination.count || 0)

  const handleFilterChange = (type: 'status' | 'productType', value: string) => {
    if (type === 'status') setSelectedStatus(value)
    else setSelectedType(value)
    resetPage()
  }

  const handleViewDetail = (order: PaymentOrder) => {
    setSelectedOrder(order)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="订单管理" description="查看所有支付订单" />

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Select
          value={selectedStatus}
          onValueChange={(v) => handleFilterChange('status', v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedType}
          onValueChange={(v) => handleFilterChange('productType', v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 订单列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单 ID</TableHead>
              <TableHead>用户 ID</TableHead>
              <TableHead>产品类型</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>优惠码</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={ORDER_TABLE_COLUMNS} />
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                  <TableCell className="font-mono text-xs">{order.userId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PRODUCT_TYPE_LABEL[order.productType] || order.productType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} configMap={ORDER_STATUS_CONFIG} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.discountCode || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  暂无订单数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {orders.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 详情弹窗 */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
