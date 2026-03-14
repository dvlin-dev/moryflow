import { Badge } from '@moryflow/ui/components/badge';
import type { MemoryFact } from '@shared/ipc';
import { cn } from '@/lib/utils';

type MemoryFactCardProps = {
  fact: MemoryFact;
  onClick?: () => void;
  compact?: boolean;
};

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const getSourceLabel = (fact: MemoryFact): string =>
  fact.kind === 'manual' ? 'Added by you' : 'Learned from notes';

export const MemoryFactCard = ({ fact, onClick, compact = false }: MemoryFactCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full flex-col rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-foreground/20',
      compact && 'gap-1'
    )}
  >
    <p className={cn('text-sm font-medium text-foreground', compact && 'line-clamp-2')}>
      {fact.text}
    </p>
    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
      <span>{getSourceLabel(fact)}</span>
      <span>·</span>
      <span>{formatRelativeTime(fact.updatedAt)}</span>
      {fact.categories[0] ? (
        <>
          <span>·</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {fact.categories[0]}
          </Badge>
        </>
      ) : null}
    </div>
  </button>
);
