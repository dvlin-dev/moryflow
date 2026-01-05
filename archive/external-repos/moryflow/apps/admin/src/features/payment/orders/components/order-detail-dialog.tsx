/**
 * 订单详情弹窗
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, ORDER_STATUS_CONFIG } from '@/components/shared'
import { formatDateTime, formatCurrency } from '@/lib/format'
import { PRODUCT_TYPE_LABEL } from '../const'
import type { PaymentOrder } from '@/types/payment'

interface OrderDetailDialogProps {
  order: PaymentOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
          <DialogDescription>查看订单的详细信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">订单 ID</div>
              <div className="font-mono">{order.id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">用户 ID</div>
              <div className="font-mono">{order.userId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">产品 ID</div>
              <div className="font-mono">{order.productId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">产品类型</div>
              <Badge variant="outline">
                {PRODUCT_TYPE_LABEL[order.productType] || order.productType}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground">金额</div>
              <div className="font-medium">{formatCurrency(order.amount, order.currency)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">状态</div>
              <StatusBadge status={order.status} configMap={ORDER_STATUS_CONFIG} />
            </div>
            <div>
              <div className="text-muted-foreground">Creem Checkout ID</div>
              <div className="font-mono text-xs">{order.creemCheckoutId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Creem Order ID</div>
              <div className="font-mono text-xs">{order.creemOrderId || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">优惠码</div>
              <div>{order.discountCode || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">创建时间</div>
              <div>{formatDateTime(order.createdAt)}</div>
            </div>
            {order.completedAt && (
              <div className="col-span-2">
                <div className="text-muted-foreground">完成时间</div>
                <div>{formatDateTime(order.completedAt)}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
