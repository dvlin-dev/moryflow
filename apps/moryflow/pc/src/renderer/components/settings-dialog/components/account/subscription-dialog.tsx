import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@moryflow/ui/components/dialog';
import { CircleAlert, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { fetchProducts } from '@/lib/server/api';
import { usePurchase } from '@/lib/server/hooks';
import { useAuth } from '@/lib/server';
import { PaymentDialog } from '@/components/payment-dialog';
import { useTranslation } from '@/lib/i18n';
import type { ProductInfo } from '@/lib/server/types';
import { SUBSCRIPTION_PLANS } from './subscription-dialog.constants';
import { SubscriptionBillingToggle } from './subscription-billing-toggle';
import { SubscriptionPlanCard } from './subscription-plan-card';
import type {
  BillingCycle,
  SubscriptionDialogProps,
  SubscriptionTier,
} from './subscription-dialog.types';

export const SubscriptionDialog = ({
  open,
  onOpenChange,
  currentTier,
}: SubscriptionDialogProps) => {
  const { t } = useTranslation('settings');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { purchase, purchasingId, checkoutUrl, clearCheckoutUrl } = usePurchase();
  const { refresh } = useAuth();

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      fetchProducts()
        .then((res) => setProducts(res.products))
        .catch((err) => {
          console.error('Failed to fetch products:', err);
          setError(t('loadProductsFailed'));
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, t]);

  const findProduct = useCallback(
    (tier: SubscriptionTier, cycle: BillingCycle) => {
      return products.find(
        (p) =>
          p.type === 'subscription' &&
          p.name.toLowerCase().includes(tier) &&
          p.billingCycle === cycle
      );
    },
    [products]
  );

  const handleSubscribe = async (tier: SubscriptionTier) => {
    const product = findProduct(tier, billingCycle);
    if (product) {
      const url = await purchase(product.id);
      if (url) {
        setPaymentOpen(true);
      }
    }
  };

  const handlePaymentSuccess = useCallback(() => {
    clearCheckoutUrl();
    refresh();
    toast.success(t('subscriptionSuccess'));
    onOpenChange(false);
  }, [clearCheckoutUrl, refresh, onOpenChange, t]);

  const handlePaymentOpenChange = useCallback(
    (open: boolean) => {
      setPaymentOpen(open);
      if (!open) {
        clearCheckoutUrl();
      }
    },
    [clearCheckoutUrl]
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-destructive">
          <CircleAlert className="size-6" />
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          data-testid="subscription-dialog-plan-grid"
          className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {SUBSCRIPTION_PLANS.map((plan) => {
            const product = findProduct(plan.tier, billingCycle);
            const isCurrentPlan = currentTier === plan.tier;
            const isPurchasing = purchasingId === product?.id;

            return (
              <SubscriptionPlanCard
                key={plan.tier}
                plan={plan}
                product={product}
                billingCycle={billingCycle}
                isCurrentPlan={isCurrentPlan}
                isPurchasing={isPurchasing}
                onSubscribe={handleSubscribe}
              />
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">{t('subscriptionNote')}</p>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid="subscription-dialog-surface"
          className="w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] sm:max-w-[1160px] overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-2xl"
        >
          <DialogTitle className="sr-only">{t('upgradeMembership')}</DialogTitle>

          <div className="flex justify-center px-6 pt-6 pb-2">
            <SubscriptionBillingToggle
              billingCycle={billingCycle}
              onBillingCycleChange={setBillingCycle}
            />
          </div>

          <div className="px-6 pb-6">{renderContent()}</div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={handlePaymentOpenChange}
        checkoutUrl={checkoutUrl}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
