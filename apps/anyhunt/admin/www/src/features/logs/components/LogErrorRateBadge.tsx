/**
 * [PROPS]: errorRate
 * [EMITS]: none
 * [POS]: Logs 错误率徽标
 */

import { Badge } from '@moryflow/ui';
import { LOG_ERROR_RATE_WARNING_THRESHOLD } from '../constants';

export interface LogErrorRateBadgeProps {
  errorRate: number;
}

export function LogErrorRateBadge({ errorRate }: LogErrorRateBadgeProps) {
  const variant = errorRate >= LOG_ERROR_RATE_WARNING_THRESHOLD ? 'destructive' : 'secondary';
  const text = `${(errorRate * 100).toFixed(2)}%`;

  return <Badge variant={variant}>{text}</Badge>;
}
