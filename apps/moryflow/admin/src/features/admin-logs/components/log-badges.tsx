import { Badge } from '@/components/ui/badge';
import { LOG_CATEGORY_CONFIG, LOG_LEVEL_CONFIG } from './log-config';

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

export function LogCategoryBadge({ category }: { category: string }) {
  const config = LOG_CATEGORY_CONFIG[category];
  return <Badge className={config?.color || DEFAULT_COLOR}>{config?.label || category}</Badge>;
}

export function LogLevelBadge({ level }: { level: string }) {
  const config = LOG_LEVEL_CONFIG[level];
  return <Badge className={config?.color || DEFAULT_COLOR}>{config?.label || level}</Badge>;
}
