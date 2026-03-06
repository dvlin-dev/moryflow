import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StorageCleanupConfirmDialogProps {
  open: boolean;
  pendingTotal: number;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function StorageCleanupConfirmDialog({
  open,
  pendingTotal,
  isLoading,
  onOpenChange,
  onConfirm,
}: StorageCleanupConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认清理</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除 {pendingTotal.toLocaleString()} 条过期记录及其关联的 Span。此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? '处理中...' : '确认清理'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
