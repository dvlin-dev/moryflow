import type { UnifiedScope } from '../common/utils/unified-scope.utils';

export type SourceIngestScope = UnifiedScope;

export type SourceIngestState = 'READY' | 'INDEXING' | 'NEEDS_ATTENTION';
export type SourceIngestListFilter = 'attention' | 'indexing';
export type SourceIngestListState = Exclude<SourceIngestState, 'READY'>;

export interface SourceIngestOverview {
  sourceCount: number;
  indexedSourceCount: number;
  indexingSourceCount: number;
  attentionSourceCount: number;
  lastIndexedAt: string | null;
}

export interface SourceIngestStatusItem {
  documentId: string;
  title: string;
  path: string | null;
  state: SourceIngestListState;
  userFacingReason: string | null;
  lastAttemptAt: string | null;
}
