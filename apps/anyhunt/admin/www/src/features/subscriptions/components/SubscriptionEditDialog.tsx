/**
 * [PROPS]: dialog 开关、编辑目标、提交回调与提交状态
 * [EMITS]: onOpenChange(open), onSubmit(values)
 * [POS]: subscriptions 编辑弹窗（RHF + zod/v3）
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import type { SubscriptionListItem } from '../types';
import { SUBSCRIPTION_STATUS_OPTIONS, SUBSCRIPTION_TIER_OPTIONS } from '../constants';
import { subscriptionEditFormSchema, type SubscriptionEditFormValues } from '../schemas';

const DEFAULT_FORM_VALUES: SubscriptionEditFormValues = {
  tier: 'FREE',
  status: 'ACTIVE',
};

export interface SubscriptionEditDialogProps {
  open: boolean;
  subscription: SubscriptionListItem | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SubscriptionEditFormValues) => void;
}

export function SubscriptionEditDialog({
  open,
  subscription,
  isPending,
  onOpenChange,
  onSubmit,
}: SubscriptionEditDialogProps) {
  const form = useForm<SubscriptionEditFormValues>({
    resolver: zodResolver(subscriptionEditFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!subscription) {
      form.reset(DEFAULT_FORM_VALUES);
      return;
    }

    form.reset({
      tier: subscription.tier,
      status: subscription.status,
    });
  }, [form, open, subscription]);

  const handleSubmit = (values: SubscriptionEditFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑订阅</DialogTitle>
          <DialogDescription>修改用户 {subscription?.userEmail} 的订阅信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>订阅层级</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBSCRIPTION_TIER_OPTIONS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>订阅状态</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isPending || !subscription}>
                {isPending ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
