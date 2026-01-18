/**
 * [PROPS]: UserCreditsSheetProps - open/onOpenChange/userId
 * [EMITS]: onOpenChange(open) - 控制 Sheet 开关
 * [POS]: Admin Users 页的“Grant credits”侧边面板（仅增不减）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Coins01Icon, ArrowRight01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icon,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui';
import { formatRelativeTime } from '@anyhunt/ui/lib';
import { useUser, useCreditGrants, useGrantCredits } from '../hooks';

const grantCreditsFormSchema = z.object({
  amount: z.coerce.number().int().min(1).max(1_000_000),
  reason: z.string().min(1).max(500),
});

type GrantCreditsFormValues = z.infer<typeof grantCreditsFormSchema>;

export interface UserCreditsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
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
    defaultValues: {
      amount: 100,
      reason: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setConfirmOpen(false);
      setPendingGrant(null);
    }
  }, [form, open]);

  useEffect(() => {
    if (!open) return;
    form.reset();
    setConfirmOpen(false);
    setPendingGrant(null);
  }, [form, open, userId]);

  const onSubmit = async (values: GrantCreditsFormValues) => {
    if (!userId) return;
    setPendingGrant(values);
    setConfirmOpen(true);
  };

  const confirmGrant = async () => {
    if (!userId || !pendingGrant) return;
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

  const quota = userQuery.data?.quota;
  const purchasedQuota = quota?.purchasedQuota ?? 0;
  const pendingAfter = pendingGrant ? purchasedQuota + pendingGrant.amount : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon icon={Coins01Icon} className="h-5 w-5" />
            Credits
          </SheetTitle>
          <SheetDescription>
            Grant credits for internal testing (adds to purchased credits).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User</CardTitle>
            </CardHeader>
            <CardContent>
              {userQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : userQuery.isError ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Failed to load user.</div>
                  <Button variant="outline" size="sm" onClick={() => userQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : userQuery.data ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{userQuery.data.email}</div>
                    {userQuery.data.isAdmin && (
                      <Badge variant="destructive" className="text-xs">
                        Admin
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {userQuery.data.tier}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">ID: {userQuery.data.id}</div>
                  <div className="text-sm text-muted-foreground">
                    Purchased credits:{' '}
                    <span className="font-medium text-foreground">{purchasedQuota}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">User not found</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon icon={ArrowUp01Icon} className="h-4 w-4" />
                Grant credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} step={1} inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Why do you grant credits?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={!userId || grantMutation.isPending}>
                    <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
                    {grantMutation.isPending ? 'Granting…' : 'Grant'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent grants</CardTitle>
            </CardHeader>
            <CardContent>
              {grantsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : grantsQuery.isError ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Failed to load grants.</div>
                  <Button variant="outline" size="sm" onClick={() => grantsQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : !grantsQuery.data?.length ? (
                <div className="text-sm text-muted-foreground">No grants yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grantsQuery.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelativeTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">+{row.amount}</TableCell>
                        <TableCell className="text-sm">
                          {row.balanceBefore} → {row.balanceAfter}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm grant credits?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add <strong>{pendingGrant?.amount ?? 0}</strong> credits to{' '}
                <strong>{userQuery.data?.email ?? 'this user'}</strong>.
                {pendingAfter !== null && (
                  <span className="block mt-2 text-muted-foreground">
                    Purchased credits: {purchasedQuota} → {pendingAfter}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={grantMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmGrant();
                }}
                disabled={grantMutation.isPending || !pendingGrant}
              >
                {grantMutation.isPending ? 'Granting…' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
