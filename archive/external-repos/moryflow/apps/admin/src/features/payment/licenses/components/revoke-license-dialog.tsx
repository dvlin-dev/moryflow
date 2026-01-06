/**
 * 撤销 License 确认弹窗
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
import type { License } from '@/types/payment'

interface RevokeLicenseDialogProps {
  license: License | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading?: boolean
}

export function RevokeLicenseDialog({
  license,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RevokeLicenseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认撤销 License</AlertDialogTitle>
          <AlertDialogDescription>
            确定要撤销此 License 吗？撤销后用户将无法使用永久授权功能。
            <br />
            <span className="font-mono text-xs mt-2 block">
              {license?.licenseKey}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? '撤销中...' : '确认撤销'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
