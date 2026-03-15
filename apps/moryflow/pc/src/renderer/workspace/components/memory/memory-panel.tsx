import { AlertCircle, Brain, Plus } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Badge } from '@moryflow/ui/components/badge';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@moryflow/ui/components/empty';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import type { MemoryFact } from '@shared/ipc';
import { MemoryFactCard } from './memory-fact-card';
import { MEMORY_DASHBOARD_FACT_PREVIEW_LIMIT } from './const';

type MemoryPanelProps = {
  facts: MemoryFact[];
  totalCount: number;
  loading: boolean;
  error?: string | null;
  factDraft: string;
  onFactDraftChange: (value: string) => void;
  onCreateFact: () => void;
  onFactClick: (factId: string) => void;
  onSeeAll: () => void;
};

export const MemoryPanel = ({
  facts,
  totalCount,
  loading,
  error,
  factDraft,
  onFactDraftChange,
  onCreateFact,
  onFactClick,
  onSeeAll,
}: MemoryPanelProps) => {
  const preview = facts.slice(0, MEMORY_DASHBOARD_FACT_PREVIEW_LIMIT);
  const hasMore = totalCount > preview.length;

  return (
    <div className="flex w-1/2 min-h-0 flex-col border-r border-border/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Memories</h2>
          <Badge variant="outline">{totalCount}</Badge>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Input
          value={factDraft}
          onChange={(e) => onFactDraftChange(e.target.value)}
          placeholder="Add a memory..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && factDraft.trim().length > 0) {
              onCreateFact();
            }
          }}
          className="flex-1"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={onCreateFact}
          disabled={factDraft.trim().length === 0}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {error && facts.length === 0 ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        </div>
      ) : loading && facts.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : facts.length === 0 ? (
        <Empty className="flex-1 py-8">
          <EmptyMedia variant="icon">
            <Brain />
          </EmptyMedia>
          <EmptyTitle>Your AI's memory is empty</EmptyTitle>
          <EmptyDescription>
            Add facts manually or let your AI learn from your notes.
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 pr-3">
              {preview.map((fact) => (
                <MemoryFactCard
                  key={fact.id}
                  fact={fact}
                  compact
                  onClick={() => onFactClick(fact.id)}
                />
              ))}
            </div>
          </ScrollArea>
          {hasMore ? (
            <button
              type="button"
              onClick={onSeeAll}
              className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
            >
              Showing {preview.length} of {totalCount} · See all memories →
            </button>
          ) : null}
        </>
      )}
    </div>
  );
};
