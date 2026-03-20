import { useState, useMemo, useEffect, type KeyboardEvent } from 'react';
import { ArrowLeft, MessageSquare, Pencil, Plus, Trash2, ThumbsUp, X } from 'lucide-react';
import { Sheet, SheetContent } from '@moryflow/ui/components/sheet';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Badge } from '@moryflow/ui/components/badge';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@moryflow/ui/components/alert-dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { MemoryFact } from '@shared/ipc';
import { relativeTime } from './helpers';

type FilterTab = 'all' | 'conversations' | 'manual';

function isAiSaved(fact: MemoryFact): boolean {
  return fact.metadata?.origin === 'agent_tool';
}

function isNewAiFact(fact: MemoryFact): boolean {
  if (!isAiSaved(fact)) return false;
  const dayMs = 24 * 60 * 60 * 1000;
  return Date.now() - new Date(fact.createdAt).getTime() < dayMs;
}

interface MemoriesPanelProps {
  open: boolean;
  onClose: () => void;
  facts: MemoryFact[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  selectedFactId: string | null;
  onSelectFact: (id: string | null) => void;
  onCreateFact: (text: string) => void;
  onUpdateFact: (id: string, text: string) => void;
  onDeleteFact: (id: string) => void;
  onBatchDeleteFacts: (ids: string[]) => void;
  onFeedbackFact: (id: string, feedback: 'positive' | 'negative' | 'very_negative') => void;
}

export function MemoriesPanel({
  open,
  onClose,
  facts,
  hasMore,
  onLoadMore,
  selectedFactId,
  onSelectFact,
  onCreateFact,
  onUpdateFact,
  onDeleteFact,
  onBatchDeleteFacts,
  onFeedbackFact,
}: MemoriesPanelProps) {
  const { t } = useTranslation('workspace');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [newFactText, setNewFactText] = useState('');
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [deleteDialogTarget, setDeleteDialogTarget] = useState<string | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  useEffect(() => {
    if (!open) {
      setBatchSelected(new Set());
      setIsEditing(false);
      setEditText('');
    }
  }, [open]);

  const filteredFacts = useMemo(() => {
    switch (filterTab) {
      case 'conversations':
        return facts.filter((f) => f.metadata?.origin === 'agent_tool');
      case 'manual':
        return facts.filter((f) => f.kind === 'manual' && f.metadata?.origin !== 'agent_tool');
      default:
        return facts;
    }
  }, [facts, filterTab]);

  const selectedFact = useMemo(
    () => (selectedFactId ? (facts.find((f) => f.id === selectedFactId) ?? null) : null),
    [facts, selectedFactId]
  );

  const handleCreateKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newFactText.trim().length > 0) {
      e.preventDefault();
      onCreateFact(newFactText.trim());
      setNewFactText('');
    }
  };

  const handleStartEdit = () => {
    if (!selectedFact) return;
    setEditText(selectedFact.text);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedFact || editText.trim().length === 0) return;
    onUpdateFact(selectedFact.id, editText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const toggleBatchSelect = (factId: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(factId)) {
        next.delete(factId);
      } else {
        next.add(factId);
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    onBatchDeleteFacts([...batchSelected]);
    setBatchSelected(new Set());
    setShowBatchDeleteDialog(false);
  };

  const handleSingleDelete = () => {
    if (deleteDialogTarget) {
      onDeleteFact(deleteDialogTarget);
      if (selectedFactId === deleteDialogTarget) {
        onSelectFact(null);
      }
      setDeleteDialogTarget(null);
    }
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('memoriesFilterAll') },
    { key: 'conversations', label: t('memoriesFilterConversations') },
    { key: 'manual', label: t('memoriesFilterManual') },
  ];

  return (
    <>
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
              <h2 className="text-sm font-semibold text-foreground">{t('memoriesTitle')}</h2>
            </div>

            {/* New fact input */}
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Plus className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  value={newFactText}
                  onChange={(e) => setNewFactText(e.currentTarget.value)}
                  onKeyDown={handleCreateKeyDown}
                  placeholder={t('memoriesAddPlaceholder')}
                  className="h-8 flex-1 rounded-lg border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 border-b border-border/60 px-4 py-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    filterTab === tab.key
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content area: list + detail */}
            <div className="flex min-h-0 flex-1">
              {/* Fact list */}
              <ScrollArea className="w-1/2 border-r border-border/60">
                <div className="flex flex-col p-2">
                  {filteredFacts.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      {t('memoriesNoInCategory')}
                    </p>
                  ) : (
                    filteredFacts.map((fact) => (
                      <button
                        key={fact.id}
                        type="button"
                        onClick={() => {
                          onSelectFact(fact.id);
                          setEditText('');
                          setIsEditing(false);
                        }}
                        className={cn(
                          'flex items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                          selectedFactId === fact.id ? 'bg-accent' : 'hover:bg-accent/50'
                        )}
                      >
                        {/* Batch checkbox */}
                        <input
                          type="checkbox"
                          checked={batchSelected.has(fact.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleBatchSelect(fact.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 size-3.5 shrink-0 rounded border-border accent-primary"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-foreground">{fact.text}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {isAiSaved(fact) ? (
                              <MessageSquare className="size-3 text-muted-foreground" />
                            ) : (
                              <Pencil className="size-3 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {relativeTime(fact.updatedAt)}
                            </span>
                            {fact.categories.length > 0 && (
                              <Badge variant="secondary" className="rounded px-1 py-0 text-[10px]">
                                {fact.categories[0]}
                              </Badge>
                            )}
                            {isNewAiFact(fact) && (
                              <Badge
                                variant="secondary"
                                className="rounded bg-primary/10 px-1 py-0 text-[10px] text-primary"
                              >
                                {t('memoriesNew')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {hasMore && onLoadMore && (
                  <div className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={onLoadMore}
                    >
                      {t('memoriesLoadMore')}
                    </Button>
                  </div>
                )}
              </ScrollArea>

              {/* Fact detail */}
              <div className="flex w-1/2 flex-col">
                {selectedFact ? (
                  <div className="flex flex-1 flex-col p-4">
                    {/* Metadata */}
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      {selectedFact.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="rounded text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {selectedFact.readOnly && (
                        <Badge variant="outline" className="rounded text-xs">
                          {t('memoriesReadOnly')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isAiSaved(selectedFact) ? t('memoriesSavedByAi') : t('memoriesAddedByYou')}
                      </span>
                    </div>

                    {/* Source info */}
                    {selectedFact.sourceType && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t('memoriesSource')}: {selectedFact.sourceType}
                        {selectedFact.sourceId ? ` (${selectedFact.sourceId})` : ''}
                      </p>
                    )}

                    {/* Text or edit */}
                    {isEditing ? (
                      <div className="mb-3 flex flex-col gap-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.currentTarget.value)}
                          className="min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} className="rounded-lg">
                            {t('memoriesSave')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="rounded-lg"
                          >
                            {t('memoriesCancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 flex-1 text-sm text-foreground">{selectedFact.text}</p>
                    )}

                    {/* Created time */}
                    <p className="mb-4 text-xs text-muted-foreground">
                      {t('memoriesCreated', { time: relativeTime(selectedFact.createdAt) })}
                    </p>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          onClick={() => onFeedbackFact(selectedFact.id, 'positive')}
                        >
                          <ThumbsUp className="mr-1 size-3.5" />
                          {t('memoriesMarkUseful')}
                        </Button>
                        {!selectedFact.readOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={handleStartEdit}
                          >
                            <Pencil className="mr-1 size-3.5" />
                            {t('memoriesEdit')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialogTarget(selectedFact.id)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          {t('memoriesDelete')}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-xs text-muted-foreground">
                      {t('memoriesSelectToSeeDetails')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Batch delete bar */}
            {batchSelected.size > 0 && (
              <div className="flex items-center justify-between border-t border-border/60 bg-muted/50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t('memoriesSelected', { count: batchSelected.size })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBatchSelected(new Set())}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-lg"
                  onClick={() => setShowBatchDeleteDialog(true)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  {t('memoriesDeleteSelected')}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Single delete confirmation */}
      <AlertDialog
        open={deleteDialogTarget !== null}
        onOpenChange={(v) => !v && setDeleteDialogTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('memoriesDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('memoriesDeleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('memoriesCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('memoriesDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch delete confirmation */}
      <AlertDialog
        open={showBatchDeleteDialog}
        onOpenChange={(v) => !v && setShowBatchDeleteDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('memoriesBatchDeleteTitle', { count: batchSelected.size })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('memoriesBatchDeleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('memoriesCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('memoriesDeleteAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
