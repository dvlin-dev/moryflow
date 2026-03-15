import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@moryflow/ui/components/sheet';
import { cn } from '@/lib/utils';
import type { VaultTreeNode } from '@shared/ipc';
import { MEMORY_SEARCH_MIN_QUERY_LENGTH } from './const';
import { isMemorySearchFileOpenable, toMemorySearchFileNode } from './helpers';
import type { useMemoryPageState } from './use-memory';

type SearchSheetProps = {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchState: ReturnType<typeof useMemoryPageState>['searchState'];
  onFactClick: (factId: string) => void;
  onFileOpen: (node: VaultTreeNode) => void;
};

export const SearchSheet = ({
  open,
  onClose,
  searchQuery,
  setSearchQuery,
  searchState,
  onFactClick,
  onFileOpen,
}: SearchSheetProps) => {
  const result = searchState.data;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Search Memory</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory files or facts..."
            autoFocus
          />

          {searchState.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Searching memory...
            </div>
          ) : null}

          {searchState.error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {searchState.error}
              </div>
            </div>
          ) : null}

          {searchQuery.trim().length > 0 &&
          searchQuery.trim().length < MEMORY_SEARCH_MIN_QUERY_LENGTH ? (
            <p className="text-sm text-muted-foreground">
              Type at least {MEMORY_SEARCH_MIN_QUERY_LENGTH} characters to search.
            </p>
          ) : null}

          {result ? (
            <div className={cn(searchState.loading && 'opacity-60 pointer-events-none')}>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 pr-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Files</h3>
                      <Badge variant="outline">{result.groups.files.returnedCount}</Badge>
                    </div>
                    <div className="space-y-2">
                      {result.groups.files.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No matching files.</p>
                      ) : null}
                      {result.groups.files.items.map((item) => {
                        const openable = isMemorySearchFileOpenable(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={!openable}
                            className={cn(
                              'flex w-full flex-col rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left',
                              openable
                                ? 'hover:border-foreground/20'
                                : 'cursor-not-allowed opacity-60'
                            )}
                            onClick={() => {
                              if (!openable) return;
                              const node = toMemorySearchFileNode(item);
                              if (node) onFileOpen(node);
                            }}
                          >
                            <span className="text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                            <span className="mt-1 text-xs text-muted-foreground">
                              {openable
                                ? item.snippet || item.path || 'Memory file result'
                                : 'Not available locally'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Facts</h3>
                      <Badge variant="outline">{result.groups.facts.returnedCount}</Badge>
                    </div>
                    <div className="space-y-2">
                      {result.groups.facts.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No matching facts.</p>
                      ) : null}
                      {result.groups.facts.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={item.text}
                          className="flex w-full flex-col rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left hover:border-foreground/20"
                          onClick={() => onFactClick(item.id)}
                        >
                          <span className="text-sm font-medium text-foreground">{item.text}</span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            {item.kind} · score {item.score.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
