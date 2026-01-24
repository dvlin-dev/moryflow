/**
 * [PROVIDES]: usePurchase - 购买/支付通用 hook
 * [DEPENDS]: createCheckout, sonner toast
 * [POS]: 订阅与积分包购买入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createCheckout } from '../api';

export function usePurchase() {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const purchase = useCallback(async (productId: string) => {
    setPurchasingId(productId);
    try {
      const result = await createCheckout({ productId });
      setCheckoutUrl(result.checkoutUrl);
      return result.checkoutUrl;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create checkout link. Please try again.'
      );
      return null;
    } finally {
      setPurchasingId(null);
    }
  }, []);

  const clearCheckoutUrl = useCallback(() => {
    setCheckoutUrl(null);
  }, []);

  return {
    purchase,
    purchasingId,
    isPurchasing: purchasingId !== null,
    checkoutUrl,
    clearCheckoutUrl,
  };
}
