import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@moryflow/ui/components/dialog';
import { Button } from '@moryflow/ui/components/button';
import { Badge } from '@moryflow/ui/components/badge';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, Coins, Gem, Loader, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { fetchProducts } from '@/lib/server/api';
import { usePurchase } from '@/lib/server/hooks';
import { useAuth } from '@/lib/server';
import { PaymentDialog } from '@/components/payment-dialog';
import { useTranslation } from '@/lib/i18n';
import type { ProductInfo } from '@/lib/server/types';
import { BetaNotice } from './beta-notice';

type CreditPacksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CREDIT_PACKS_CONFIG: Array<{
  credits: number;
  icon: LucideIcon;
  popular?: boolean;
}> = [
  { credits: 5000, icon: Coins },
  { credits: 10000, icon: Sparkles, popular: true },
  { credits: 50000, icon: Gem },
];

export const CreditPacksDialog = ({ open, onOpenChange }: CreditPacksDialogProps) => {
  const { t } = useTranslation('settings');
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
        .then((res) => {
          setProducts(res.products.filter((p: ProductInfo) => p.type === 'credits'));
        })
        .catch((err) => {
          console.error('Failed to fetch products:', err);
          setError(t('loadProductsFailed'));
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, t]);

  const findProduct = useCallback(
    (credits: number) => products.find((p) => p.credits === credits),
    [products]
  );

  const handlePurchase = async (credits: number) => {
    const product = findProduct(credits);
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
    toast.success(t('creditPackPaymentSuccess'));
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
        <div className="flex items-center justify-center py-16">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-destructive">
          <CircleAlert className="size-6" />
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-6">
        {CREDIT_PACKS_CONFIG.map((pack) => {
          const PackIcon = pack.icon;
          const product = findProduct(pack.credits);
          const isPurchasing = purchasingId === product?.id;

          return (
            <div
              key={pack.credits}
              className={`relative flex flex-col rounded-xl border p-8 transition-[transform,box-shadow,border-color] duration-200 ${
                pack.popular
                  ? 'border-primary bg-card hover:-translate-y-0.5 hover:shadow-md'
                  : 'border-border/50 bg-card/50 hover:-translate-y-0.5 hover:border-border hover:shadow-md'
              }`}
            >
              {pack.popular ? (
                <Badge className="absolute top-4 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                  {t('creditPackPopular')}
                </Badge>
              ) : null}

              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <PackIcon className="size-[18px] text-muted-foreground" />
              </div>

              <p className="mt-6 whitespace-nowrap text-sm text-muted-foreground">
                {t('creditPackCredits', { credits: pack.credits.toLocaleString() })}
              </p>

              <span className="mt-1.5 text-4xl font-semibold tracking-tight text-foreground">
                {product ? `$${product.priceUsd}` : '-'}
              </span>

              <Button
                type="button"
                className="mt-10 h-11 w-full rounded-xl"
                variant={pack.popular ? 'default' : 'outline'}
                disabled={isPurchasing || !product}
                onClick={() => handlePurchase(pack.credits)}
              >
                {isPurchasing && <Loader className="mr-2 size-4 animate-spin" />}
                {t('creditPackBuyNow')}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[50vw] min-w-[720px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-2xl">
          <DialogTitle className="sr-only">{t('buyCredits')}</DialogTitle>

          <div className="space-y-8 px-12 pt-12 pb-10">
            {renderContent()}

            <div className="flex justify-center">
              <BetaNotice />
            </div>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {t('creditPackExpiry')} {t('creditPackUsageOrder')}
            </p>
          </div>
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
