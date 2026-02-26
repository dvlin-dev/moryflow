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
import type { SiteActionType } from '../types';

interface SiteActionConfirmDialogProps {
  actionType: SiteActionType | null;
  siteSubdomain?: string;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function getActionTitle(actionType: SiteActionType | null): string {
  switch (actionType) {
    case 'offline':
      return '确认下线站点？';
    case 'online':
      return '确认上线站点？';
    case 'delete':
      return '确认删除站点？';
    default:
      return '确认操作？';
  }
}

function getActionDescription(actionType: SiteActionType | null, siteSubdomain?: string) {
  const target = siteSubdomain ?? '-';

  switch (actionType) {
    case 'offline':
      return `站点 ${target} 将被下线，用户将无法访问。`;
    case 'online':
      return `站点 ${target} 将恢复上线。`;
    case 'delete':
      return `站点 ${target} 的所有数据和文件将被永久删除，此操作不可恢复！`;
    default:
      return '请确认后继续。';
  }
}

function getConfirmButtonClass(actionType: SiteActionType | null): string | undefined {
  if (actionType === 'delete') {
    return 'bg-red-600 hover:bg-red-700';
  }
  return undefined;
}

export function SiteActionConfirmDialog({
  actionType,
  siteSubdomain,
  isLoading,
  open,
  onOpenChange,
  onConfirm,
}: SiteActionConfirmDialogProps) {
  const description = getActionDescription(actionType, siteSubdomain);
  const isDelete = actionType === 'delete';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getActionTitle(actionType)}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete ? <span className="text-red-600">{description}</span> : description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={getConfirmButtonClass(actionType)}
          >
            {isLoading ? '处理中...' : '确认'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
