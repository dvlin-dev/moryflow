/**
 * [PROPS]: subscriptionId
 * [POS]: Run history list tab in subscription settings (Lucide icons direct render)
 */

import { useState } from 'react';
import {
  ScrollArea,
  Button,
  Badge,
  Skeleton,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@moryflow/ui';
import { CircleCheck, X, ChevronDown } from 'lucide-react';
import { useRuns } from '@/features/digest/hooks';
import { formatDate } from '@/lib/date';
import type { Run } from '@/features/digest/types';

interface RunHistoryTabProps {
  subscriptionId: string;
}

function RunItem({ run }: { run: Run }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSuccess = run.status === 'SUCCEEDED';
  const isFailed = run.status === 'FAILED';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border p-3">
        <CollapsibleTrigger className="flex w-full items-start justify-between text-left">
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CircleCheck className="size-4 text-green-500" />
            ) : isFailed ? (
              <X className="size-4 text-destructive" />
            ) : (
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <span className="text-sm font-medium">{formatDate(run.scheduledAt)}</span>
            <Badge variant={isSuccess ? 'default' : isFailed ? 'destructive' : 'secondary'}>
              {run.status}
            </Badge>
          </div>
          <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        {isSuccess && run.result && (
          <p className="mt-1 text-xs text-muted-foreground">
            Search {run.result.itemsCandidate} → Scrape {run.result.itemsSelected} → Deliver{' '}
            {run.result.itemsDelivered}
          </p>
        )}

        {isFailed && run.error && (
          <p className="mt-1 text-xs text-destructive">Error: {run.error}</p>
        )}

        <CollapsibleContent className="pt-3">
          <div className="space-y-2 text-sm">
            {run.result && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Candidates:</span>{' '}
                    {run.result.itemsCandidate}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Selected:</span>{' '}
                    {run.result.itemsSelected}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivered:</span>{' '}
                    {run.result.itemsDelivered}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dedup Skipped:</span>{' '}
                    {run.result.itemsDedupSkipped}
                  </div>
                </div>
              </>
            )}

            {run.billing && (
              <div className="rounded bg-muted/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Credits Used:</span>
                  <span className="font-medium">{run.billing.totalCredits}</span>
                </div>
              </div>
            )}

            {run.startedAt && (
              <div className="text-xs text-muted-foreground">
                Started: {formatDate(run.startedAt)}
                {run.finishedAt && <> · Finished: {formatDate(run.finishedAt)}</>}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function RunHistoryTab({ subscriptionId }: RunHistoryTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRuns(subscriptionId, { page, limit: 10 });

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-md border p-3">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No run history yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Runs will appear here after your subscription executes
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-6">
        <h3 className="mb-4 text-sm font-medium">Run History</h3>
        {data.items.map((run) => (
          <RunItem key={run.id} run={run} />
        ))}

        {data.totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, data.totalPages))}
              disabled={page >= data.totalPages}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
