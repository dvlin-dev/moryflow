import { useEffect, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@moryflow/ui/components/dialog';
import { Button } from '@moryflow/ui/components/button';
import { ArrowUpRight, CircleAlert, Loader } from 'lucide-react';
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
  const [checkoutOpenState, setCheckoutOpenState] = useState<
    'idle' | 'opening' | 'opened' | 'failed'
  >('idle');
  const [checkoutOpenError, setCheckoutOpenError] = useState<string | null>(null);

  // 打开支付页面
  const handleOpenCheckout = useCallback(async () => {
    if (!checkoutUrl) {
      setCheckoutOpenState('failed');
      setCheckoutOpenError('Payment URL is unavailable. Please try again.');
      return;
    }

    setCheckoutOpenState('opening');
    setCheckoutOpenError(null);

    try {
      await window.desktopAPI.payment.openCheckout(checkoutUrl);
      setCheckoutOpenState('opened');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to open payment page. Please try again.';
      setCheckoutOpenState('failed');
      setCheckoutOpenError(message);
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
      void handleOpenCheckout();
    }
  }, [open, checkoutUrl, handleOpenCheckout]);

  useEffect(() => {
    if (!open) {
      setCheckoutOpenState('idle');
      setCheckoutOpenError(null);
    }
  }, [open]);

  const renderContentByState = () => {
    switch (checkoutOpenState) {
      case 'failed':
        return (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <CircleAlert className="size-8 text-destructive" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-destructive">Failed to open payment page</p>
              <p className="text-xs text-muted-foreground">{checkoutOpenError}</p>
            </div>
          </>
        );
      case 'idle':
      case 'opening':
      case 'opened':
      default:
        return (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Loader className="size-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">{t('waitingForPayment')}</p>
              <p className="text-xs text-muted-foreground">{t('paymentSuccessWillRedirect')}</p>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('completePayment')}</DialogTitle>
          <DialogDescription>{t('paymentOpenedInBrowser')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-8">
          {renderContentByState()}

          <Button
            variant="outline"
            onClick={() => void handleOpenCheckout()}
            className="gap-2"
            disabled={!checkoutUrl || checkoutOpenState === 'opening'}
          >
            <ArrowUpRight className="size-4" />
            {t('reopenPaymentPage')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
