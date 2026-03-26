import { startTransition, useEffect, useState } from 'react';
import { AlertCircle, Coins, RefreshCw } from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { fetchCreditHistory, type CreditLedgerItem } from '@/lib/server';
import { cn } from '@/lib/utils';

const HISTORY_PAGE_SIZE = 8;

const formatLedgerDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const statusToneClass: Record<'APPLIED' | 'SKIPPED' | 'FAILED', string> = {
  APPLIED: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  SKIPPED: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
  FAILED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

const deltaToneClass = (value: number) => {
  if (value > 0) {
    return 'text-emerald-600';
  }
  if (value < 0) {
    return 'text-foreground';
  }
  return 'text-muted-foreground';
};

type PanelState = 'loading' | 'ready' | 'error';

const CreditHistoryRow = ({ item }: { item: CreditLedgerItem }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background/80 px-4 py-3">
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-medium text-foreground">{item.summary}</p>
        <Badge variant="outline" className={cn('text-[11px]', statusToneClass[item.status])}>
          {item.status}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{formatTimestamp(item.createdAt)}</span>
        {item.modelId ? <span>{item.modelId}</span> : null}
        {item.totalTokens ? <span>{item.totalTokens} tokens</span> : null}
        {item.anomalyCode ? <span>{item.anomalyCode}</span> : null}
      </div>
    </div>
    <div
      className={cn(
        'shrink-0 text-sm font-semibold tabular-nums',
        deltaToneClass(item.creditsDelta)
      )}
    >
      {formatLedgerDelta(item.creditsDelta)}
    </div>
  </div>
);

export const CreditHistoryPanel = () => {
  const [items, setItems] = useState<CreditLedgerItem[]>([]);
  const [status, setStatus] = useState<PanelState>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let disposed = false;
    startTransition(() => {
      setStatus('loading');
    });

    void fetchCreditHistory({ limit: HISTORY_PAGE_SIZE, offset: 0 })
      .then((response) => {
        if (disposed) {
          return;
        }
        setItems(response.items);
        setStatus('ready');
      })
      .catch(() => {
        if (disposed) {
          return;
        }
        setStatus('error');
      });

    return () => {
      disposed = true;
    };
  }, [retryKey]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <Coins className="size-4" />
            Credit History
          </h5>
          <p className="text-xs text-muted-foreground">Recent credit movements for this account.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setRetryKey((value) => value + 1)}
        >
          <RefreshCw className="mr-1 size-3.5" />
          Refresh
        </Button>
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            Failed to load credit history.
          </div>
        </div>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          No credit events yet.
        </div>
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <CreditHistoryRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
};
