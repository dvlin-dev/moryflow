/**
 * 订阅详情弹窗
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge, SUBSCRIPTION_STATUS_CONFIG } from '@/components/shared'
import { formatDateTime } from '@/lib/format'
import type { Subscription } from '@/types/payment'

interface SubscriptionDetailDialogProps {
  subscription: Subscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubscriptionDetailDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDetailDialogProps) {
  if (!subscription) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>订阅详情</DialogTitle>
          <DialogDescription>查看订阅的详细信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">订阅 ID</div>
              <div className="font-mono">{subscription.id}</div>
            </div>
            <div>
              <div className="text-muted-foreground">用户 ID</div>
              <div className="font-mono">{subscription.userId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">产品 ID</div>
              <div className="font-mono">{subscription.productId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">状态</div>
              <StatusBadge status={subscription.status} configMap={SUBSCRIPTION_STATUS_CONFIG} />
            </div>
            <div>
              <div className="text-muted-foreground">Creem 订阅 ID</div>
              <div className="font-mono text-xs">{subscription.creemSubscriptionId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Creem 客户 ID</div>
              <div className="font-mono text-xs">{subscription.creemCustomerId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">当前周期开始</div>
              <div>{formatDateTime(subscription.currentPeriodStart)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">当前周期结束</div>
              <div>{formatDateTime(subscription.currentPeriodEnd)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">创建时间</div>
              <div>{formatDateTime(subscription.createdAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">周期结束时取消</div>
              <div>{subscription.cancelAtPeriodEnd ? '是' : '否'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
