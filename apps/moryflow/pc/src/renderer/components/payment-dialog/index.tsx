import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@anyhunt/ui/components/dialog';
import { Button } from '@anyhunt/ui/components/button';
import { ArrowUpRight, Loader } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

type PaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutUrl: string | null;
  onSuccess: () => void;
};

/**
 * 支付引导弹窗
 * 在系统浏览器中打开支付页面，监听 Deep Link 回调获取支付结果
 */
export const PaymentDialog = ({
  open,
  onOpenChange,
  checkoutUrl,
  onSuccess,
}: PaymentDialogProps) => {
  const { t } = useTranslation('settings');

  // 打开支付页面
  const handleOpenCheckout = useCallback(() => {
    if (checkoutUrl) {
      window.desktopAPI.payment.openCheckout(checkoutUrl);
    }
  }, [checkoutUrl]);

  // 监听支付成功 Deep Link 回调
  useEffect(() => {
    if (!open) return;

    const unsubscribe = window.desktopAPI.payment.onSuccess(() => {
      onSuccess();
      onOpenChange(false);
    });

    return unsubscribe;
  }, [open, onSuccess, onOpenChange]);

  // 弹窗打开时自动打开支付页面
  useEffect(() => {
    if (open && checkoutUrl) {
      handleOpenCheckout();
    }
  }, [open, checkoutUrl, handleOpenCheckout]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('completePayment')}</DialogTitle>
          <DialogDescription>{t('paymentOpenedInBrowser')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Loader className="size-8 animate-spin text-primary" />
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">{t('waitingForPayment')}</p>
            <p className="text-xs text-muted-foreground">{t('paymentSuccessWillRedirect')}</p>
          </div>

          <Button variant="outline" onClick={handleOpenCheckout} className="gap-2">
            <ArrowUpRight className="size-4" />
            {t('reopenPaymentPage')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
