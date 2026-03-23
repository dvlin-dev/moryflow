import type { MemoryKnowledgeStatusItem, MemoryOverview } from '@shared/ipc';

export type KnowledgeSummaryState = 'SCANNING' | 'NEEDS_ATTENTION' | 'INDEXING' | 'READY';

export interface KnowledgeSummary {
  state: KnowledgeSummaryState;
  sourceCount: number;
  indexedSourceCount: number;
  indexingSourceCount: number;
  attentionSourceCount: number;
  derivedCount: number;
  lastIndexedAt: string | null;
}

interface DeriveKnowledgeSummaryInput {
  overview: MemoryOverview | null;
  loading: boolean;
  attentionItems?: MemoryKnowledgeStatusItem[];
  indexingItems?: MemoryKnowledgeStatusItem[];
}

const countItems = (items: MemoryKnowledgeStatusItem[] | undefined): number => items?.length ?? 0;

export function deriveKnowledgeSummary({
  overview,
  loading,
  attentionItems,
  indexingItems,
}: DeriveKnowledgeSummaryInput): KnowledgeSummary {
  if (loading || !overview) {
    return {
      state: 'SCANNING',
      sourceCount: 0,
      indexedSourceCount: 0,
      indexingSourceCount: 0,
      attentionSourceCount: 0,
      derivedCount: 0,
      lastIndexedAt: null,
    };
  }

  const attentionSourceCount = Math.max(
    overview.indexing.attentionSourceCount,
    countItems(attentionItems)
  );
  const indexingSourceCount = Math.max(
    overview.indexing.indexingSourceCount,
    countItems(indexingItems)
  );
  const bootstrapScanning =
    (overview.bootstrap.pending || overview.projection.pending) &&
    attentionSourceCount === 0 &&
    indexingSourceCount === 0;

  const state: KnowledgeSummaryState =
    bootstrapScanning
      ? 'SCANNING'
      : attentionSourceCount > 0
        ? 'NEEDS_ATTENTION'
        : indexingSourceCount > 0
          ? 'INDEXING'
          : 'READY';

  return {
    state,
    sourceCount: overview.indexing.sourceCount,
    indexedSourceCount: overview.indexing.indexedSourceCount,
    indexingSourceCount,
    attentionSourceCount,
    derivedCount: overview.facts.derivedCount,
    lastIndexedAt: overview.indexing.lastIndexedAt,
  };
}
