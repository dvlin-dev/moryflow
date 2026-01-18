/**
 * [INPUT]: unknown Prisma JsonValue（quotaBreakdown）
 * [OUTPUT]: DeductResult.breakdown | null
 * [POS]: 解析/校验 DB 中的 quotaBreakdown（用于 worker 失败退费）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/anyhunt/server/CLAUDE.md
 */

import type { DeductResult } from '../quota/quota.types';
import { QuotaSource } from '../../generated/prisma-main/client';

export function parseQuotaBreakdown(
  value: unknown,
): DeductResult['breakdown'] | null {
  if (!Array.isArray(value)) return null;

  const allowedSources = new Set<string>(Object.values(QuotaSource));
  const parsed: DeductResult['breakdown'] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;

    const item = raw as Record<string, unknown>;
    const source = item.source;
    const amount = item.amount;
    const transactionId = item.transactionId;
    const balanceBefore = item.balanceBefore;
    const balanceAfter = item.balanceAfter;

    if (typeof source !== 'string' || !allowedSources.has(source)) continue;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)
      continue;
    if (typeof transactionId !== 'string' || transactionId.length === 0)
      continue;
    if (
      typeof balanceBefore !== 'number' ||
      !Number.isFinite(balanceBefore) ||
      typeof balanceAfter !== 'number' ||
      !Number.isFinite(balanceAfter)
    ) {
      continue;
    }

    parsed.push({
      source: source as DeductResult['breakdown'][number]['source'],
      amount,
      transactionId,
      balanceBefore,
      balanceAfter,
    });
  }

  return parsed.length > 0 ? parsed : null;
}
