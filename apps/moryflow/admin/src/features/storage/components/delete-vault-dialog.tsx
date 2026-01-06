/**
 * 删除 Vault 确认弹窗
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
import type { VaultListItem } from '@/types/storage'

interface DeleteVaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vault: VaultListItem | null
  onConfirm: () => void
  isDeleting: boolean
}

export function DeleteVaultDialog({
  open,
  onOpenChange,
  vault,
  onConfirm,
  isDeleting,
}: DeleteVaultDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除 Vault？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              即将删除 Vault <strong>"{vault?.name}"</strong>
            </p>
            <p>此操作将：</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>删除 Vault 中的所有文件（R2 存储）</li>
              <li>删除所有设备注册信息</li>
              <li>删除数据库中的元数据记录</li>
            </ul>
            <p className="text-destructive font-medium">此操作不可恢复！</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
