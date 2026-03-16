import { useState, useMemo, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowLeft, Check, AlertCircle, FileText, Loader2, Search } from 'lucide-react';
import { Sheet, SheetContent } from '@moryflow/ui/components/sheet';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import type { MemoryOverview, MemoryFact, MemorySearchResult } from '@shared/ipc';
import { MEMORY_SEARCH_MIN_QUERY_LENGTH, MEMORY_SEARCH_DEBOUNCE_MS } from './const';
import { relativeTime } from './helpers';

interface KnowledgePanelProps {
  open: boolean;
  onClose: () => void;
  overview: MemoryOverview | null;
  facts: MemoryFact[];
  searchResults: MemorySearchResult | null;
  searchLoading: boolean;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
}

export function KnowledgePanel({
  open,
  onClose,
  overview,
  facts,
  searchResults,
  searchLoading,
  onSearch,
  onClearSearch,
}: KnowledgePanelProps) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const knowledgeFacts = useMemo(() => facts.filter((f) => f.factScope === 'knowledge'), [facts]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MEMORY_SEARCH_MIN_QUERY_LENGTH) {
      onClearSearch();
      return;
    }
    debounceRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, MEMORY_SEARCH_DEBOUNCE_MS);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      onClearSearch();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const indexing = overview?.indexing;
  const sourceCount = indexing?.sourceCount ?? 0;
  const indexedSourceCount = indexing?.indexedSourceCount ?? 0;
  const pendingSourceCount = indexing?.pendingSourceCount ?? 0;
  const failedSourceCount = indexing?.failedSourceCount ?? 0;
  const lastIndexedAt = indexing?.lastIndexedAt ?? null;
  const percentage = sourceCount > 0 ? Math.round((indexedSourceCount / sourceCount) * 100) : 0;

  const isIndexing = pendingSourceCount > 0;
  const hasFailed = failedSourceCount > 0;
  const insightsCount = overview?.facts.derivedCount ?? 0;

  const searchFiles = searchResults?.groups.files.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[60vw] p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">Knowledge</h2>
          </div>

          {/* Status card */}
          <div className="border-b border-border/60 px-4 py-3">
            <div className="rounded-xl border border-border/60 p-3">
              <div className="flex flex-col gap-2">
                {/* Indexed count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isIndexing ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : hasFailed ? (
                      <AlertCircle className="size-4 text-destructive" />
                    ) : (
                      <Check className="size-4 text-success" />
                    )}
                    <span className="text-sm text-foreground">
                      {indexedSourceCount} / {sourceCount} files indexed
                    </span>
                  </div>
                  {lastIndexedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last indexed {relativeTime(lastIndexedAt)}
                    </span>
                  )}
                </div>

                {/* Progress bar when indexing */}
                {isIndexing && (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {pendingSourceCount} pending &middot; {percentage}%
                    </span>
                  </div>
                )}

                {/* Failed count */}
                {hasFailed && (
                  <p className="text-xs text-destructive">
                    {failedSourceCount} {failedSourceCount === 1 ? 'file' : 'files'} failed
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{insightsCount} insights extracted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search input */}
          <div className="border-b border-border/60 px-4 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleQueryChange(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search knowledge..."
                className="h-8 rounded-lg pl-8 text-sm"
              />
              {searchLoading && (
                <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 p-4">
              {/* Insights section */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Insights
                </h3>
                {knowledgeFacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No insights extracted yet. Knowledge will appear as files are indexed.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {knowledgeFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
                      >
                        <p className="text-sm text-foreground">{fact.text}</p>
                        {fact.sourceId && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="size-3" />
                            <span className="truncate">{fact.sourceId}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Files section */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Files
                </h3>
                {searchResults && searchFiles.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {searchFiles.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">
                            {file.title}
                          </span>
                        </div>
                        {file.path && (
                          <p className="ml-5 truncate text-xs text-muted-foreground">{file.path}</p>
                        )}
                        {file.snippet && (
                          <p className="ml-5 mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {file.snippet}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchResults ? (
                  <p className="text-xs text-muted-foreground">No matching files found.</p>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    <p>
                      {sourceCount} total files &middot; {indexedSourceCount} indexed
                    </p>
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
