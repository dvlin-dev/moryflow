import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@anyhunt/ui/components/dialog'
import { Button } from '@anyhunt/ui/components/button'
import { Badge } from '@anyhunt/ui/components/badge'
import { Loader2, Coins, Sparkles, Gem, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { fetchProducts } from '@/lib/server/api'
import { usePurchase } from '@/lib/server/hooks'
import { useAuth } from '@/lib/server'
import { PaymentDialog } from '@/components/payment-dialog'
import type { ProductInfo } from '@/lib/server/types'

type CreditPacksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 积分包配置 */
const CREDIT_PACKS_CONFIG: Array<{
  credits: number
  icon: typeof Coins
  color: string
  bgColor: string
  borderColor: string
  popular?: boolean
}> = [
  {
    credits: 5000,
    icon: Coins,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    credits: 10000,
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    popular: true,
  },
  {
    credits: 50000,
    icon: Gem,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
]

export const CreditPacksDialog = ({ open, onOpenChange }: CreditPacksDialogProps) => {
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
        .then((res) => {
          setProducts(res.products.filter((p: ProductInfo) => p.type === 'credits'))
        })
        .catch((err) => {
          console.error('Failed to fetch products:', err)
          setError('加载产品列表失败，请稍后重试')
        })
        .finally(() => setIsLoading(false))
    }
  }, [open])

  // 根据积分数量查找产品
  const findProduct = useCallback(
    (credits: number) => products.find((p) => p.credits === credits),
    [products]
  )

  // 处理购买
  const handlePurchase = async (credits: number) => {
    const product = findProduct(credits)
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
    toast.success('支付成功，积分已到账')
    onOpenChange(false)
  }, [clearCheckoutUrl, refresh, onOpenChange])

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
        {CREDIT_PACKS_CONFIG.map((pack) => {
          const Icon = pack.icon
          const product = findProduct(pack.credits)
          const isPurchasing = purchasingId === product?.id

          return (
            <div
              key={pack.credits}
              className={`relative rounded-xl border p-5 ${pack.borderColor} ${
                pack.popular ? 'ring-2 ring-blue-500/50' : ''
              }`}
            >
              {pack.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500">
                  热门
                </Badge>
              )}

              <div className="flex items-center justify-center mb-4">
                <div className={`rounded-full p-4 ${pack.bgColor}`}>
                  <Icon className={`size-8 ${pack.color}`} />
                </div>
              </div>

              <div className="text-center mb-2">
                <span className="text-2xl font-bold">
                  {pack.credits.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-1">积分</span>
              </div>

              <div className="text-center text-sm text-muted-foreground mb-4">
                {product ? `$${product.priceUsd}` : '暂不可用'}
              </div>

              <Button
                type="button"
                className="w-full"
                variant={pack.popular ? 'default' : 'outline'}
                disabled={isPurchasing || !product}
                onClick={() => handlePurchase(pack.credits)}
              >
                {isPurchasing && <Loader2 className="mr-2 size-4 animate-spin" />}
                立即购买
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>购买积分</DialogTitle>
            <DialogDescription>
              积分可用于所有 AI 模型调用，有效期 365 天
            </DialogDescription>
          </DialogHeader>

          {renderContent()}

          {/* 底部说明 */}
          <div className="text-center text-xs text-muted-foreground mt-4 space-y-1">
            <p>积分有效期 365 天，从购买之日起计算</p>
            <p>消费优先级：每日免费积分 → 订阅积分 → 购买积分</p>
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
  )
}
