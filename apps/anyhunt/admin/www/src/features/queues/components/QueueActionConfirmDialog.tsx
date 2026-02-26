/**
 * [PROPS]: open/action/queueName/onOpenChange/onConfirm
 * [EMITS]: onOpenChange/onConfirm
 * [POS]: Queues 操作确认弹窗
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
import { getQueueConfirmDescription, type QueueConfirmAction } from '../constants';
import type { QueueName } from '../types';

export interface QueueActionConfirmDialogProps {
  open: boolean;
  action: QueueConfirmAction | null;
  selectedQueue: QueueName;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function QueueActionConfirmDialog({
  open,
  action,
  selectedQueue,
  onOpenChange,
  onConfirm,
}: QueueActionConfirmDialogProps) {
  const description = action ? getQueueConfirmDescription(action, selectedQueue) : '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认操作</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
