/**
 * [PROPS]: 对话框开关、目标用户、删除状态与回调
 * [EMITS]: onOpenChange/onConfirm
 * [POS]: users 删除确认弹窗
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
} from '@moryflow/ui';
import type { UserListItem } from '../types';

export interface UserDeleteDialogProps {
  open: boolean;
  user: UserListItem | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function UserDeleteDialog({
  open,
  user,
  isDeleting,
  onOpenChange,
  onConfirm,
}: UserDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将软删除用户 <strong>{user?.email}</strong>
            ，用户将无法登录，但数据会保留。此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? '删除中...' : '删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
