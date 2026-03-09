import { Badge } from '@moryflow/ui/components/badge';
import { Tabs, TabsList, TabsTrigger } from '@moryflow/ui/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { YEARLY_DISCOUNT_PERCENT } from './subscription-dialog.constants';
import type { BillingCycle } from './subscription-dialog.types';

type SubscriptionBillingToggleProps = {
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
};

export const SubscriptionBillingToggle = ({
  billingCycle,
  onBillingCycleChange,
}: SubscriptionBillingToggleProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-1 shadow-sm">
      <Tabs value={billingCycle} onValueChange={(v) => onBillingCycleChange(v as BillingCycle)}>
        <TabsList className="h-auto gap-1 rounded-xl border-0 bg-transparent p-0">
          <TabsTrigger
            value="monthly"
            onClick={() => onBillingCycleChange('monthly')}
            className="rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none after:hidden"
          >
            {t('monthly')}
          </TabsTrigger>
          <TabsTrigger
            value="yearly"
            onClick={() => onBillingCycleChange('yearly')}
            className="rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none after:hidden"
          >
            <span>{t('yearly')}</span>
            <Badge
              variant="secondary"
              className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
            >
              {t('savePercent', { percent: YEARLY_DISCOUNT_PERCENT })}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
