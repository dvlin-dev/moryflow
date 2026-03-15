import { useState } from 'react';
import { AlertCircle, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Textarea } from '@moryflow/ui/components/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@moryflow/ui/components/sheet';
import { AnimatedCollapse } from '@moryflow/ui/animate/primitives/base/animated-collapse';
import type { MemoryFact } from '@shared/ipc';
import { cn } from '@/lib/utils';
import { MemoryFactCard } from './memory-fact-card';

type MemoriesSheetProps = {
  open: boolean;
  onClose: () => void;
  facts: MemoryFact[];
  loading: boolean;
  error: string | null;
  factDraft: string;
  onFactDraftChange: (value: string) => void;
  onCreateFact: () => void;
  selectedFact: MemoryFact | null;
  selectedFactDraft: string;
  onSelectedFactDraftChange: (value: string) => void;
  factDetailLoading: boolean;
  onOpenFact: (factId: string) => void;
  onSaveFact: () => void;
  onDeleteFact: () => void;
  onMarkUseful: () => void;
  selectedFactIds: string[];
  onToggleSelection: (factId: string) => void;
  onDeleteSelected: () => void;
};

export const MemoriesSheet = ({
  open,
  onClose,
  facts,
  loading,
  error,
  factDraft,
  onFactDraftChange,
  onCreateFact,
  selectedFact,
  selectedFactDraft,
  onSelectedFactDraftChange,
  factDetailLoading,
  onOpenFact,
  onSaveFact,
  onDeleteFact,
  onMarkUseful,
  selectedFactIds,
  onToggleSelection,
  onDeleteSelected,
}: MemoriesSheetProps) => {
  const [filterText, setFilterText] = useState('');
  const filtered = filterText.trim()
    ? facts.filter((f) => f.text.toLowerCase().includes(filterText.toLowerCase()))
    : facts;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>All Memories</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4 min-h-0 flex-1">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter..."
                className="pl-9"
              />
            </div>
            {selectedFactIds.length > 0 ? (
              <Button variant="outline" size="sm" onClick={onDeleteSelected}>
                <Trash2 className="mr-1 size-3.5" />
                Delete {selectedFactIds.length}
              </Button>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            </div>
          ) : null}

          {loading && facts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading memories...
            </div>
          ) : null}

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 pr-3">
              {filtered.map((fact) => (
                <div key={fact.id} className="flex items-start gap-2">
                  {!fact.readOnly ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${fact.text}`}
                      checked={selectedFactIds.includes(fact.id)}
                      onChange={() => onToggleSelection(fact.id)}
                      className="mt-3.5"
                    />
                  ) : (
                    <div className="w-4" />
                  )}
                  <div className="flex-1">
                    <MemoryFactCard
                      fact={fact}
                      onClick={() => onOpenFact(fact.id)}
                      compact={selectedFact?.id !== fact.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Fact detail panel — rendered outside the list so it is always
              visible regardless of filtering, pagination, or deep links. */}
          <AnimatedCollapse open={selectedFact !== null}>
            {selectedFact ? (
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant={selectedFact.readOnly ? 'outline' : 'default'}>
                    {selectedFact.kind}
                  </Badge>
                  {selectedFact.readOnly ? <Badge variant="outline">Read only</Badge> : null}
                  {factDetailLoading ? (
                    <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                {selectedFact.readOnly ? (
                  <p className="text-sm text-foreground">{selectedFact.text}</p>
                ) : (
                  <Textarea
                    rows={3}
                    value={selectedFactDraft}
                    onChange={(e) => onSelectedFactDraftChange(e.target.value)}
                  />
                )}
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-2',
                    !selectedFact.readOnly && 'mt-3'
                  )}
                >
                  <Button size="sm" variant="secondary" onClick={onMarkUseful}>
                    Mark useful
                  </Button>
                  {!selectedFact.readOnly ? (
                    <>
                      <Button size="sm" variant="outline" onClick={onSaveFact}>
                        Save changes
                      </Button>
                      <Button size="sm" variant="destructive" onClick={onDeleteFact}>
                        Delete
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </AnimatedCollapse>
        </div>
      </SheetContent>
    </Sheet>
  );
};
