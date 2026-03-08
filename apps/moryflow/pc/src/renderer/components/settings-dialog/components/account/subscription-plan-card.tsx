import { Button } from '@moryflow/ui/components/button';
import { Badge } from '@moryflow/ui/components/badge';
import { Check, Loader } from 'lucide-react';
import { getTierInfo } from '@moryflow/api';
import { useTranslation } from '@/lib/i18n';
import { COMMON_FEATURE_LIMIT } from './subscription-dialog.constants';
import type { ProductInfo } from '@/lib/server/types';
import type {
  AccentColor,
  BillingCycle,
  PlanConfig,
  SubscriptionTier,
} from './subscription-dialog.types';

const ACCENT_STYLES: Record<AccentColor, { icon: string; iconBg: string }> = {
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-400/10',
  },
  sky: {
    icon: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-400/10',
  },
  zinc: {
    icon: 'text-zinc-700 dark:text-zinc-300',
    iconBg: 'bg-zinc-100 dark:bg-zinc-700',
  },
};

type SubscriptionPlanCardProps = {
  plan: PlanConfig;
  product: ProductInfo | undefined;
  billingCycle: BillingCycle;
  isCurrentPlan: boolean;
  isPurchasing: boolean;
  onSubscribe: (tier: SubscriptionTier) => void;
};

export const SubscriptionPlanCard = ({
  plan,
  product,
  billingCycle,
  isCurrentPlan,
  isPurchasing,
  onSubscribe,
}: SubscriptionPlanCardProps) => {
  const { t } = useTranslation('settings');
  const PlanIcon = plan.icon;
  const tierInfo = getTierInfo(plan.tier);
  const accent = ACCENT_STYLES[plan.accentColor];

  const getEquivalentMonthlyPrice = (priceUsd: number) => (priceUsd / 12).toFixed(2);

  return (
    <div
      data-testid={`subscription-plan-${plan.tier}`}
      data-current={isCurrentPlan ? 'true' : 'false'}
      className={`relative flex h-full flex-col rounded-xl border p-6 transition-[transform,box-shadow,border-color,background-color] duration-200 ${
        isCurrentPlan
          ? 'bg-muted/30 border-border'
          : plan.popular
            ? 'border-t-2 border-primary bg-card hover:-translate-y-0.5 hover:shadow-md'
            : 'bg-card/50 border-border/50 hover:-translate-y-0.5 hover:border-border hover:shadow-md'
      }`}
    >
      {plan.popular ? (
        <Badge className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
          {t('recommended')}
        </Badge>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className={`flex size-8 items-center justify-center rounded-lg ${accent.iconBg}`}>
            <PlanIcon className={`size-4 ${accent.icon}`} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">{t(plan.nameKey)}</h3>
            <p className="text-sm text-muted-foreground">{t(plan.taglineKey)}</p>
          </div>
        </div>

        {isCurrentPlan ? (
          <Badge
            variant="secondary"
            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
          >
            {t('currentPlanBadge')}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-end gap-1.5">
          <span className="text-4xl font-semibold tracking-tight text-foreground">
            {product ? `$${product.priceUsd}` : '-'}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">
            {billingCycle === 'monthly' ? t('perMonth') : t('perYear')}
          </span>
        </div>
        <div className="min-h-5 text-sm text-muted-foreground">
          {billingCycle === 'yearly' && product
            ? t('equivalentMonthly', {
                price: getEquivalentMonthlyPrice(product.priceUsd),
              })
            : plan.popular
              ? t('annualBillingHighlight')
              : '\u00a0'}
        </div>
      </div>

      <ul className="mt-6 mb-6 space-y-3">
        <li className="flex items-start gap-2.5 text-sm text-foreground">
          <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{t('monthlyCredits', { credits: tierInfo.creditsPerMonth.toLocaleString() })}</span>
        </li>
        {tierInfo.features.slice(1, 1 + COMMON_FEATURE_LIMIT).map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        className={`mt-auto h-10 w-full rounded-xl ${
          isCurrentPlan ? 'disabled:opacity-100 disabled:shadow-none' : ''
        }`}
        variant={isCurrentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
        disabled={isCurrentPlan || isPurchasing || !product}
        onClick={() => onSubscribe(plan.tier)}
      >
        {isPurchasing && <Loader className="mr-2 size-4 animate-spin" />}
        {isCurrentPlan ? t('currentPlanCta') : t('subscribeNow')}
      </Button>
      {isCurrentPlan ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">{t('currentPlanHelper')}</p>
      ) : null}
    </div>
  );
};
