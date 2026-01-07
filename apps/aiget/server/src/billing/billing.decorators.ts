/**
 * [PROVIDES]: `@BillingKey` 装饰器（标记需要扣费的接口）
 * [DEPENDS]: NestJS metadata
 * [POS]: 为 Controller handler 绑定稳定的 billingKey
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/aiget/server/CLAUDE.md
 */

import { SetMetadata } from '@nestjs/common';
import type { BillingKey } from './billing.rules';

export const BILLING_KEY_METADATA = 'aiget.billingKey';

export function BillingKey(key: BillingKey) {
  return SetMetadata(BILLING_KEY_METADATA, key);
}
