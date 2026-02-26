/**
 * [PROPS]: viewModel/actions（确认弹窗状态 + 待充值数据）
 * [EMITS]: onOpenChange/onConfirm
 * [POS]: user credits 充值确认弹窗
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
import type { GrantCreditsFormValues } from './schemas';

export interface GrantConfirmDialogProps {
  viewModel: GrantConfirmDialogViewModel;
  actions: GrantConfirmDialogActions;
}

export interface GrantConfirmDialogViewModel {
  open: boolean;
  pendingGrant: GrantCreditsFormValues | null;
  userEmail: string | undefined;
  purchasedQuota: number;
  pendingAfter: number | null;
  isPending: boolean;
}

export interface GrantConfirmDialogActions {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function GrantConfirmDialog({ viewModel, actions }: GrantConfirmDialogProps) {
  const { open, pendingGrant, userEmail, purchasedQuota, pendingAfter, isPending } = viewModel;
  const { onOpenChange, onConfirm } = actions;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm grant credits?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add <strong>{pendingGrant?.amount ?? 0}</strong> credits to{' '}
            <strong>{userEmail ?? 'this user'}</strong>.
            {pendingAfter !== null && (
              <span className="block mt-2 text-muted-foreground">
                Purchased credits: {purchasedQuota} → {pendingAfter}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            disabled={isPending || !pendingGrant}
          >
            {isPending ? 'Granting…' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
