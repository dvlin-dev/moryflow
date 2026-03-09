/**
 * [PROPS]: FullAccessUpgradeDialogProps - 首次权限审批升级提示弹窗
 * [EMITS]: onKeepAsk/onEnableFullAccess
 * [POS]: Chat Pane 首次授权升级提示（仅展示一次）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@moryflow/ui/components/alert-dialog';
import { Button } from '@moryflow/ui/components/button';

type FullAccessUpgradeDialogProps = {
  open: boolean;
  title: string;
  description: string;
  riskNote: string;
  keepAskLabel: string;
  enableFullAccessLabel: string;
  onKeepAsk: () => void;
  onEnableFullAccess: () => void;
};

export const FullAccessUpgradeDialog = ({
  open,
  title,
  description,
  riskNote,
  keepAskLabel,
  enableFullAccessLabel,
  onKeepAsk,
  onEnableFullAccess,
}: FullAccessUpgradeDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onKeepAsk()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{description}</p>
              <p className="text-xs text-muted-foreground">{riskNote}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onKeepAsk}>
            {keepAskLabel}
          </Button>
          <Button onClick={onEnableFullAccess}>{enableFullAccessLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
