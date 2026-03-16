/**
 * [PROPS]: open, code, isPending, onOpenChange, onSubmit
 * [EMITS]: onOpenChange(open), onSubmit(values)
 * [POS]: Edit dialog for redemption codes (RHF + zod/v3)
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
  Input,
  Switch,
} from '@moryflow/ui';
import type { RedemptionCode } from '../types';
import { updateRedemptionCodeSchema, type UpdateRedemptionCodeFormValues } from '../schemas';

const DEFAULT_FORM_VALUES: UpdateRedemptionCodeFormValues = {
  maxRedemptions: 1,
  expiresAt: '',
  isActive: true,
  note: '',
};

export interface EditRedemptionCodeDialogProps {
  open: boolean;
  code: RedemptionCode | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateRedemptionCodeFormValues) => void;
}

export function EditRedemptionCodeDialog({
  open,
  code,
  isPending,
  onOpenChange,
  onSubmit,
}: EditRedemptionCodeDialogProps) {
  const form = useForm<UpdateRedemptionCodeFormValues>({
    resolver: zodResolver(updateRedemptionCodeSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!code) {
      form.reset(DEFAULT_FORM_VALUES);
      return;
    }

    form.reset({
      maxRedemptions: code.maxRedemptions,
      expiresAt: code.expiresAt
        ? new Date(code.expiresAt)
            .toLocaleString('sv-SE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
            .replace(' ', 'T')
        : '',
      isActive: code.isActive,
      note: code.note ?? '',
    });
  }, [form, open, code]);

  const handleSubmit = (values: UpdateRedemptionCodeFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Redemption Code</DialogTitle>
          <DialogDescription>
            Update settings for code <code className="font-mono">{code?.code}</code>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="maxRedemptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Redemptions</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Whether this code can be redeemed
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Internal note" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !code}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
