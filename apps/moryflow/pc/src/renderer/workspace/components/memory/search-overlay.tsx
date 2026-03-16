import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowLeft, FileText, Loader2, MessageSquare, Search } from 'lucide-react';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import type { MemorySearchResult, MemorySearchFileItem } from '@shared/ipc';
import { MEMORY_SEARCH_MIN_QUERY_LENGTH, MEMORY_SEARCH_DEBOUNCE_MS } from './const';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  results: MemorySearchResult | null;
  loading: boolean;
  onSearch: (query: string) => void;
  onSelectFact: (id: string) => void;
  onOpenFile: (item: MemorySearchFileItem) => void;
}

export function SearchOverlay({
  open,
  onClose,
  results,
  loading,
  onSearch,
  onSelectFact,
  onOpenFile,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
    }
  }, [open]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MEMORY_SEARCH_MIN_QUERY_LENGTH) return;
    debounceRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, MEMORY_SEARCH_DEBOUNCE_MS);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const personalFacts = results?.groups.facts.items.filter((f) => f.factScope === 'personal') ?? [];
  const files = results?.groups.files.items ?? [];

  const queryTooShort = query.trim().length < MEMORY_SEARCH_MIN_QUERY_LENGTH;
  const hasResults = !queryTooShort && (personalFacts.length > 0 || files.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-background">
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
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search memories and files..."
              className="h-9 rounded-lg pl-8 text-sm"
            />
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl p-4">
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Empty state */}
            {!loading && queryTooShort && (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Type at least {MEMORY_SEARCH_MIN_QUERY_LENGTH} characters to search.
              </p>
            )}

            {/* No results */}
            {!loading && !queryTooShort && results && !hasResults && (
              <p className="py-12 text-center text-xs text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;.
              </p>
            )}

            {/* Results groups */}
            {!loading && hasResults && (
              <div className="flex flex-col gap-6">
                {/* Memories */}
                {personalFacts.length > 0 && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <MessageSquare className="size-3" />
                      Memories
                    </h3>
                    <div className="flex flex-col gap-0.5">
                      {personalFacts.map((fact) => (
                        <button
                          key={fact.id}
                          type="button"
                          onClick={() => onSelectFact(fact.id)}
                          className="rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                        >
                          {fact.text}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileText className="size-3" />
                      Files
                    </h3>
                    <div className="flex flex-col gap-0.5">
                      {files.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => onOpenFile(file)}
                          disabled={file.disabled}
                          className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
                        >
                          <span className="truncate text-sm font-medium text-foreground">
                            {file.title}
                          </span>
                          {file.path && (
                            <span className="truncate text-xs text-muted-foreground">
                              {file.path}
                            </span>
                          )}
                          {file.snippet && (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {file.snippet}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
