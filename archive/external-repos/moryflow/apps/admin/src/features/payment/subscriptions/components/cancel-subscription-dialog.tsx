/**
 * 取消订阅确认弹窗
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Subscription } from '@/types/payment'

interface CancelSubscriptionDialogProps {
  subscription: Subscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading?: boolean
}

export function CancelSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: CancelSubscriptionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认取消订阅</AlertDialogTitle>
          <AlertDialogDescription>
            确定要取消此订阅吗？订阅将在当前计费周期结束后失效。
            <br />
            <span className="font-mono text-xs mt-2 block">
              订阅 ID: {subscription?.id}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>返回</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? '取消中...' : '确认取消'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
