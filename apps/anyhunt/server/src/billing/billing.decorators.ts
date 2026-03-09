/**
 * [PROVIDES]: `@BillingKey` 装饰器（标记需要扣费的接口）
 * [DEPENDS]: NestJS metadata
 * [POS]: 为 Controller handler 绑定稳定的 billingKey
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { SetMetadata } from '@nestjs/common';
import type { BillingKey } from './billing.rules';

export const BILLING_KEY_METADATA = 'anyhunt.billingKey';

export function BillingKey(key: BillingKey) {
  return SetMetadata(BILLING_KEY_METADATA, key);
}
