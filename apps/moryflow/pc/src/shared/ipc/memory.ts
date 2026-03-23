import type { SyncEngineStatus } from './cloud-sync';

export type MemoryBindingDisabledReason =
  | 'login_required'
  | 'profile_unavailable'
  | 'workspace_unavailable';

export type MemoryOverview = {
  scope: {
    workspaceId: string | null;
    workspaceName: string | null;
    localPath: string | null;
    vaultId: string | null;
    projectId: string | null;
  };
  binding: {
    loggedIn: boolean;
    bound: boolean;
    disabledReason?: MemoryBindingDisabledReason;
  };
  bootstrap: {
    pending: boolean;
    hasLocalDocuments: boolean;
  };
  projection: {
    pending: boolean;
    unresolvedEventCount: number;
  };
  sync: {
    engineStatus: SyncEngineStatus;
    lastSyncAt: number | null;
    storageUsedBytes: number;
  };
  indexing: {
    sourceCount: number;
    indexedSourceCount: number;
    indexingSourceCount: number;
    attentionSourceCount: number;
    lastIndexedAt: string | null;
  };
  facts: {
    manualCount: number;
    derivedCount: number;
  };
  graph: {
    entityCount: number;
    relationCount: number;
    projectionStatus: 'disabled' | 'idle' | 'building' | 'ready' | 'failed';
    lastProjectedAt: string | null;
  };
};

export type MemoryGatewayOverview = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  projection: MemoryOverview['projection'];
  indexing: MemoryOverview['indexing'];
  facts: MemoryOverview['facts'];
  graph: MemoryOverview['graph'];
};

export type MemoryKnowledgeStatusFilter = 'attention' | 'indexing';

export type MemoryKnowledgeStatusItem = {
  documentId: string;
  title: string;
  path: string | null;
  state: 'INDEXING' | 'NEEDS_ATTENTION';
  userFacingReason: string | null;
  lastAttemptAt: string | null;
};

export type MemoryKnowledgeStatusesInput = {
  filter?: MemoryKnowledgeStatusFilter;
};

export type MemoryKnowledgeStatusesResult = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  items: MemoryKnowledgeStatusItem[];
};

export type MemoryFactKind = 'all' | 'manual' | 'derived';

export type MemoryFactScope = 'personal' | 'knowledge';

export type MemoryFact = {
  id: string;
  text: string;
  kind: 'manual' | 'source-derived';
  readOnly: boolean;
  metadata: Record<string, unknown> | null;
  categories: string[];
  sourceId: string | null;
  sourceRevisionId: string | null;
  sourceType: string | null;
  derivedKey: string | null;
  expirationDate: string | null;
  factScope: MemoryFactScope;
  createdAt: string;
  updatedAt: string;
};

export type MemorySearchInput = {
  query: string;
  limitPerGroup?: number;
  includeGraphContext?: boolean;
};

export type MemorySearchFileItem = {
  id: string;
  fileId: string;
  vaultId: string | null;
  sourceId: string;
  title: string;
  path: string | null;
  localPath?: string;
  disabled: boolean;
  snippet: string;
  score: number;
};

export type MemorySearchFactItem = {
  id: string;
  text: string;
  kind: 'manual' | 'source-derived';
  readOnly: boolean;
  metadata: Record<string, unknown> | null;
  score: number;
  sourceId: string | null;
  sourceType: string | null;
  factScope: MemoryFactScope;
};

export type MemorySearchResult = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  query: string;
  groups: {
    files: {
      items: MemorySearchFileItem[];
      returnedCount: number;
      hasMore: boolean;
    };
    facts: {
      items: MemorySearchFactItem[];
      returnedCount: number;
      hasMore: boolean;
    };
  };
};

export type MemoryListFactsInput = {
  kind?: MemoryFactKind;
  page?: number;
  pageSize?: number;
  query?: string;
  categories?: string[];
};

export type MemoryListFactsResult = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  page: number;
  pageSize: number;
  hasMore: boolean;
  items: MemoryFact[];
};

export type MemoryCreateFactInput = {
  text: string;
  metadata?: Record<string, unknown>;
  categories?: string[];
};

export type MemoryUpdateFactInput = {
  factId: string;
  text: string;
  metadata?: Record<string, unknown>;
};

export type MemoryBatchUpdateFactsInput = {
  facts: Array<{
    factId: string;
    text: string;
  }>;
};

export type MemoryBatchDeleteFactsInput = {
  factIds: string[];
};

export type MemoryFactHistoryItem = {
  id: string;
  factId: string;
  event: string;
  oldText: string | null;
  newText: string | null;
  metadata?: unknown;
  input?: unknown;
  createdAt: string;
  userId?: string | null;
};

export type MemoryFactHistory = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  items: MemoryFactHistoryItem[];
};

export type MemoryFeedbackInput = {
  factId: string;
  feedback: 'positive' | 'negative' | 'very_negative';
  reason?: string;
};

export type MemoryFeedbackResult = {
  id: string;
  feedback: 'positive' | 'negative' | 'very_negative' | null;
  reason: string | null;
};

export type MemoryGraphQueryInput = {
  query?: string;
  limit?: number;
  entityTypes?: string[];
  relationTypes?: string[];
};

export type MemoryGraphEntity = {
  id: string;
  entityType: string;
  canonicalName: string;
  aliases: string[];
  metadata: Record<string, unknown> | null;
  lastSeenAt: string | null;
};

export type MemoryGraphRelation = {
  id: string;
  relationType: string;
  confidence: number;
  from: {
    id: string;
    entityType: string;
    canonicalName: string;
    aliases: string[];
  };
  to: {
    id: string;
    entityType: string;
    canonicalName: string;
    aliases: string[];
  };
};

export type MemoryGraphEvidenceSummary = {
  observationCount: number;
  sourceCount: number;
  memoryFactCount: number;
  latestObservedAt: string | null;
};

export type MemoryGraphQueryResult = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  entities: MemoryGraphEntity[];
  relations: MemoryGraphRelation[];
  evidenceSummary: MemoryGraphEvidenceSummary;
};

export type MemoryGraphObservation = {
  id: string;
  observationType: string;
  confidence: number | null;
  evidenceSourceId: string | null;
  evidenceRevisionId: string | null;
  evidenceChunkId: string | null;
  evidenceMemoryId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type MemoryEntityDetailInput = {
  entityId: string;
};

export type MemoryEntityDetail = {
  entity: MemoryGraphEntity & {
    incomingRelations: MemoryGraphRelation[];
    outgoingRelations: MemoryGraphRelation[];
  };
  evidenceSummary: MemoryGraphEvidenceSummary;
  recentObservations: MemoryGraphObservation[];
};

export type MemoryExportResult = {
  exportId: string;
};

export type MemoryExportData = {
  scope: {
    vaultId: string | null;
    projectId: string;
  };
  items: MemoryFact[];
};

export type KnowledgeReadInput = {
  /** Primary key. documentId from knowledge_search results (preferred) */
  documentId?: string;
  /** Fallback input. Must be mapped through registry, rejects absolute paths */
  path?: string;
  /** Start reading from this character offset, default 0 */
  offsetChars?: number;
  /** Maximum characters to return, default 20000, max 50000 */
  maxChars?: number;
};

export type KnowledgeReadOutput = {
  content: string;
  truncated: boolean;
  nextOffset: number | null;
  mimeType: string;
  totalBytes: number;
  relativePath: string;
};
