import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import { useAuth } from '@/lib/server';
import { redeemCode } from '@/lib/server/api';
import { useTranslation } from '@/lib/i18n';

const redeemFormSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

type RedeemFormValues = z.infer<typeof redeemFormSchema>;

type RedeemCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const RedeemCodeDialog = ({ open, onOpenChange }: RedeemCodeDialogProps) => {
  const { t } = useTranslation('auth');
  const { refresh } = useAuth();
  const [isRedeeming, setIsRedeeming] = useState(false);

  const form = useForm<RedeemFormValues>({
    resolver: zodResolver(redeemFormSchema),
    defaultValues: { code: '' },
  });

  const handleSubmit = async (values: RedeemFormValues) => {
    setIsRedeeming(true);
    try {
      const result = await redeemCode({ code: values.code });
      if (result.type === 'CREDITS' && result.creditsAmount) {
        toast.success(t('receivedCredits', { amount: result.creditsAmount }));
      } else if (result.type === 'MEMBERSHIP' && result.membershipTier) {
        toast.success(
          t('receivedMembership', {
            tier: result.membershipTier,
            days: result.membershipDays ?? 30,
          })
        );
      } else {
        toast.success(t('redeemSuccess'));
      }
      await refresh();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to redeem code');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) form.reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t('redeemCode')}
          </DialogTitle>
          <DialogDescription>{t('enterRedemptionCode')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('redeemCode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="MF-XXXX-XXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRedeeming}>
                {isRedeeming ? t('redeeming') : t('redeem')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
