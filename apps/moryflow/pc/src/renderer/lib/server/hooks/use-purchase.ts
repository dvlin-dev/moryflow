/**
 * [PROVIDES]: usePurchase - 购买/支付通用 hook
 * [DEPENDS]: createCheckout, sonner toast
 * [POS]: 订阅与积分包购买入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function usePurchase() {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const purchase = useCallback(async (_productId: string) => {
    toast.info('Purchasing is not available during beta. Join our Discord for redemption codes!');
    return null;
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
