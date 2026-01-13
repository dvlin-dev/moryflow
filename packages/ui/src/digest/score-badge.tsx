/**
 * ScoreBadge - 评分徽章组件
 *
 * [PROPS]: score (0-100), variant (relevance/overall/quality)
 * [POS]: 用于 Digest 内容卡片的评分展示
 */

import { Badge } from '../components/badge';
import { cn } from '../lib/utils';

export interface ScoreBadgeProps {
  score: number;
  variant?: 'relevance' | 'overall' | 'quality' | 'impact';
  showLabel?: boolean;
  className?: string;
}

const variantLabels = {
  relevance: 'Relevance',
  overall: 'Score',
  quality: 'Quality',
  impact: 'Impact',
} as const;

function getScoreVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 40) return 'outline';
  return 'destructive';
}

export function ScoreBadge({
  score,
  variant = 'overall',
  showLabel = false,
  className,
}: ScoreBadgeProps) {
  const badgeVariant = getScoreVariant(score);
  const label = variantLabels[variant];

  return (
    <Badge variant={badgeVariant} className={cn('tabular-nums', className)}>
      {showLabel ? `${label}: ${score}` : score}
    </Badge>
  );
}
