import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createCheckout } from '../api'

/**
 * 购买/支付通用 hook
 * 用于订阅和积分包购买
 * 返回 checkoutUrl 供 PaymentDialog 使用
 */
export function usePurchase() {
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  const purchase = useCallback(async (productId: string) => {
    setPurchasingId(productId)
    try {
      const result = await createCheckout({ productId })
      setCheckoutUrl(result.checkoutUrl)
      return result.checkoutUrl
    } catch (error) {
      console.error('Failed to create checkout:', error)
      toast.error(
        error instanceof Error ? error.message : '创建支付链接失败，请稍后重试'
      )
      return null
    } finally {
      setPurchasingId(null)
    }
  }, [])

  const clearCheckoutUrl = useCallback(() => {
    setCheckoutUrl(null)
  }, [])

  return {
    purchase,
    purchasingId,
    isPurchasing: purchasingId !== null,
    checkoutUrl,
    clearCheckoutUrl,
  }
}
