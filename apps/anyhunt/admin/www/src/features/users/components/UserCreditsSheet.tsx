/**
 * [PROPS]: UserCreditsSheetProps - open/onOpenChange/userId
 * [EMITS]: onOpenChange(open) - 控制 Sheet 开关
 * [POS]: Admin Users 页的“Grant credits”侧边面板（仅增不减，Lucide icons direct render）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Coins } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@moryflow/ui';
import { useCreditGrants, useGrantCredits, useUser } from '../hooks';
import {
  type CreditGrantsState,
  CreditGrantsCard,
  type GrantCreditsFormValues,
  grantCreditsFormSchema,
  GrantConfirmDialog,
  GrantCreditsFormCard,
  GRANT_CREDITS_DEFAULT_VALUES,
  type UserSummaryState,
  UserSummaryCard,
} from './user-credits-sheet';

export interface UserCreditsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

function resolveUserSummaryState(params: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): UserSummaryState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.hasData) {
    return 'ready';
  }

  return 'not_found';
}

function resolveCreditGrantsState(params: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): CreditGrantsState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.isError) {
    return 'error';
  }

  if (params.hasData) {
    return 'ready';
  }

  return 'empty';
}

export function UserCreditsSheet({ open, onOpenChange, userId }: UserCreditsSheetProps) {
  const resolvedUserId = userId ?? '';

  const userQuery = useUser(resolvedUserId);
  const grantsQuery = useCreditGrants(resolvedUserId, { limit: 20 });
  const grantMutation = useGrantCredits();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingGrant, setPendingGrant] = useState<GrantCreditsFormValues | null>(null);

  const form = useForm<GrantCreditsFormValues>({
    resolver: zodResolver(grantCreditsFormSchema),
    defaultValues: GRANT_CREDITS_DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setConfirmOpen(false);
      setPendingGrant(null);
      return;
    }

    form.reset();
    setConfirmOpen(false);
    setPendingGrant(null);
  }, [form, open, userId]);

  const handleSubmit = (values: GrantCreditsFormValues) => {
    if (!userId) {
      return;
    }

    setPendingGrant(values);
    setConfirmOpen(true);
  };

  const handleConfirmGrant = async () => {
    if (!userId || !pendingGrant) {
      return;
    }

    try {
      await grantMutation.mutateAsync({
        userId,
        data: {
          amount: pendingGrant.amount,
          reason: pendingGrant.reason,
        },
      });
      form.reset();
      setConfirmOpen(false);
      setPendingGrant(null);
    } catch {
      // 错误提示由 mutation 的 onError 负责；保持对话框打开，方便用户调整后重试
    }
  };

  const purchasedQuota = userQuery.data?.quota?.purchasedQuota ?? 0;
  const pendingAfter = pendingGrant ? purchasedQuota + pendingGrant.amount : null;

  const userSummaryState = resolveUserSummaryState({
    isLoading: userQuery.isLoading,
    isError: userQuery.isError,
    hasData: Boolean(userQuery.data),
  });

  const creditGrantsState = resolveCreditGrantsState({
    isLoading: grantsQuery.isLoading,
    isError: grantsQuery.isError,
    hasData: Boolean(grantsQuery.data?.length),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credits
          </SheetTitle>
          <SheetDescription>
            Grant credits for internal testing (adds to purchased credits).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <UserSummaryCard
            state={userSummaryState}
            user={userQuery.data}
            purchasedQuota={purchasedQuota}
            onRetry={() => userQuery.refetch()}
          />

          <GrantCreditsFormCard
            form={form}
            canSubmit={Boolean(userId)}
            isPending={grantMutation.isPending}
            onSubmit={handleSubmit}
          />

          <CreditGrantsCard
            state={creditGrantsState}
            grants={grantsQuery.data}
            onRetry={() => grantsQuery.refetch()}
          />
        </div>

        <GrantConfirmDialog
          open={confirmOpen}
          pendingGrant={pendingGrant}
          userEmail={userQuery.data?.email}
          purchasedQuota={purchasedQuota}
          pendingAfter={pendingAfter}
          isPending={grantMutation.isPending}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmGrant}
        />
      </SheetContent>
    </Sheet>
  );
}
