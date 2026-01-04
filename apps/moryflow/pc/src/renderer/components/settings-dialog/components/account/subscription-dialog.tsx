import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@aiget/ui/components/dialog'
import { Button } from '@aiget/ui/components/button'
import { Badge } from '@aiget/ui/components/badge'
import { Tabs, TabsList, TabsTrigger } from '@aiget/ui/components/tabs'
import { Check, Loader2, Crown, Sparkles, Zap, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { fetchProducts } from '@/lib/server/api'
import { usePurchase } from '@/lib/server/hooks'
import { useAuth } from '@/lib/server'
import { PaymentDialog } from '@/components/payment-dialog'
import { getTierInfo } from '@aiget/api'
import { useTranslation } from '@/lib/i18n'
import type { ProductInfo, UserTier } from '@/lib/server/types'

type SubscriptionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier: UserTier
}

type BillingCycle = 'monthly' | 'yearly'

/** 可订阅的会员层级（UserTier 的子集） */
type SubscriptionTier = Extract<UserTier, 'starter' | 'basic' | 'pro'>

/** 订阅计划配置 */
const SUBSCRIPTION_PLANS = [
  {
    tier: 'starter' as const,
    nameKey: 'starterPlan' as const,
    icon: Zap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    tier: 'basic' as const,
    nameKey: 'basicPlan' as const,
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    tier: 'pro' as const,
    nameKey: 'proPlan' as const,
    icon: Crown,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    popular: true,
  },
] satisfies Array<{
  tier: SubscriptionTier
  nameKey: string
  icon: typeof Zap
  color: string
  bgColor: string
  borderColor: string
  popular?: boolean
}>

/** 年付相比月付的折扣比例（约 17%） */
const YEARLY_DISCOUNT_PERCENT = 17

export const SubscriptionDialog = ({
  open,
  onOpenChange,
  currentTier,
}: SubscriptionDialogProps) => {
  const { t } = useTranslation('settings')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { purchase, purchasingId, checkoutUrl, clearCheckoutUrl } = usePurchase()
  const { refresh } = useAuth()

  // 加载产品列表
  useEffect(() => {
    if (open) {
      setIsLoading(true)
      setError(null)
      fetchProducts()
        .then((res) => setProducts(res.products))
        .catch((err) => {
          console.error('Failed to fetch products:', err)
          setError(t('loadProductsFailed'))
        })
        .finally(() => setIsLoading(false))
    }
  }, [open, t])

  // 根据 tier 和 billing cycle 查找产品
  const findProduct = useCallback(
    (tier: SubscriptionTier, cycle: BillingCycle) => {
      return products.find(
        (p) =>
          p.type === 'subscription' &&
          p.name.toLowerCase().includes(tier) &&
          p.billingCycle === cycle
      )
    },
    [products]
  )

  // 处理订阅购买
  const handleSubscribe = async (tier: SubscriptionTier) => {
    const product = findProduct(tier, billingCycle)
    if (product) {
      const url = await purchase(product.id)
      if (url) {
        setPaymentOpen(true)
      }
    }
  }

  // 支付成功回调
  const handlePaymentSuccess = useCallback(() => {
    clearCheckoutUrl()
    refresh()
    toast.success(t('subscriptionSuccess'))
    onOpenChange(false)
  }, [clearCheckoutUrl, refresh, onOpenChange, t])

  // 支付弹窗关闭回调
  const handlePaymentOpenChange = useCallback(
    (open: boolean) => {
      setPaymentOpen(open)
      if (!open) {
        clearCheckoutUrl()
      }
    },
    [clearCheckoutUrl]
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-destructive">
          <AlertCircle className="size-6" />
          <p className="text-sm">{error}</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-3 gap-4 mt-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const Icon = plan.icon
          const product = findProduct(plan.tier, billingCycle)
          const tierInfo = getTierInfo(plan.tier)
          const isCurrentPlan = currentTier === plan.tier
          const isPurchasing = purchasingId === product?.id

          return (
            <div
              key={plan.tier}
              className={`relative rounded-xl border p-5 ${plan.borderColor} ${
                plan.popular ? 'ring-2 ring-purple-500/50' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500">
                  {t('recommended')}
                </Badge>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`rounded-lg p-2 ${plan.bgColor}`}>
                  <Icon className={`size-5 ${plan.color}`} />
                </div>
                <h3 className="font-semibold">{t(plan.nameKey)}</h3>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {product ? `$${product.priceUsd}` : '-'}
                </span>
                <span className="text-muted-foreground">
                  {billingCycle === 'monthly' ? t('perMonth') : t('perYear')}
                </span>
              </div>

              <div className="text-sm text-muted-foreground mb-4">
                {t('monthlyCredits', { credits: tierInfo.creditsPerMonth.toLocaleString() })}
              </div>

              <ul className="space-y-2 mb-6">
                {tierInfo.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className={`size-4 ${plan.color}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                className="w-full"
                variant={isCurrentPlan ? 'outline' : 'default'}
                disabled={isCurrentPlan || isPurchasing || !product}
                onClick={() => handleSubscribe(plan.tier)}
              >
                {isPurchasing && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isCurrentPlan ? t('currentPlanBadge') : t('subscribeNow')}
              </Button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('upgradeMembership')}</DialogTitle>
            <DialogDescription>{t('choosePlanDescription')}</DialogDescription>
          </DialogHeader>

          {/* 付费周期切换 */}
          <div className="flex justify-center">
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as BillingCycle)}
            >
              <TabsList>
                <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
                <TabsTrigger value="yearly" className="relative">
                  {t('yearly')}
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-green-500/20 text-green-600 text-xs"
                  >
                    {t('savePercent', { percent: YEARLY_DISCOUNT_PERCENT })}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {renderContent()}

          {/* 底部说明 */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {t('subscriptionNote')}
          </p>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={handlePaymentOpenChange}
        checkoutUrl={checkoutUrl}
        onSuccess={handlePaymentSuccess}
      />
    </>
  )
}
