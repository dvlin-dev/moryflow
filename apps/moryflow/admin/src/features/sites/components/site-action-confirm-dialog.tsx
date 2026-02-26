import { useState } from 'react';
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
import { useDeleteSite, useOfflineSite, useOnlineSite } from '../hooks';
import { sitesListMethods } from '../methods';
import { useSitesListStore } from '../store';
import type { SiteActionType } from '../types';

interface SiteActionConfirmDialogProps {
  actionType?: SiteActionType | null;
  siteSubdomain?: string;
  isLoading?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void | Promise<void>;
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

function getActionDescription(actionType: SiteActionType | null, siteSubdomain?: string): string {
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

export function SiteActionConfirmDialog(props: SiteActionConfirmDialogProps) {
  const storeActionType = useSitesListStore((state) => state.actionType);
  const storeSiteSubdomain = useSitesListStore((state) => state.actionSite?.subdomain);

  const offlineMutation = useOfflineSite();
  const onlineMutation = useOnlineSite();
  const deleteMutation = useDeleteSite();

  const fallbackLoading =
    offlineMutation.isPending || onlineMutation.isPending || deleteMutation.isPending;

  const actionType = props.actionType ?? storeActionType;
  const siteSubdomain = props.siteSubdomain ?? storeSiteSubdomain;
  const open = props.open ?? Boolean(actionType);
  const isLoading = props.isLoading ?? fallbackLoading;

  const description = getActionDescription(actionType, siteSubdomain);
  const isDelete = actionType === 'delete';
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setConfirmError(null);

    if (props.onConfirm) {
      try {
        await props.onConfirm();
      } catch (error) {
        const message = error instanceof Error ? error.message : '操作失败，请稍后重试。';
        setConfirmError(message || '操作失败，请稍后重试。');
      }
      return;
    }

    try {
      await sitesListMethods.confirmSiteAction({
        offline: offlineMutation.mutateAsync,
        online: onlineMutation.mutateAsync,
        remove: deleteMutation.mutateAsync,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请稍后重试。';
      setConfirmError(message || '操作失败，请稍后重试。');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmError(null);
    }

    if (props.onOpenChange) {
      props.onOpenChange(isOpen);
      return;
    }

    if (!isOpen) {
      sitesListMethods.closeSiteActionDialog();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getActionTitle(actionType)}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete ? <span className="text-red-600">{description}</span> : description}
          </AlertDialogDescription>
          {confirmError ? <p className="text-sm text-red-600">{confirmError}</p> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void handleConfirm();
            }}
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
