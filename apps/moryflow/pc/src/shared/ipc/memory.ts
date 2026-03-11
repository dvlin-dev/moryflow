import type { SyncEngineStatus } from './cloud-sync';

export type MemoryBindingDisabledReason =
  | 'login_required'
  | 'vault_not_bound'
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
  sync: {
    engineStatus: SyncEngineStatus;
    lastSyncAt: number | null;
    storageUsedBytes: number;
  };
  indexing: {
    sourceCount: number;
    indexedSourceCount: number;
    pendingSourceCount: number;
    failedSourceCount: number;
    lastIndexedAt: string | null;
  };
  facts: {
    manualCount: number;
    derivedCount: number;
  };
  graph: {
    entityCount: number;
    relationCount: number;
    projectionStatus: 'idle' | 'building' | 'ready';
    lastProjectedAt: string | null;
  };
};

export type MemoryGatewayOverview = {
  scope: {
    vaultId: string;
    projectId: string;
  };
  indexing: MemoryOverview['indexing'];
  facts: MemoryOverview['facts'];
  graph: MemoryOverview['graph'];
};

export type MemoryFactKind = 'all' | 'manual' | 'derived';

export type MemoryFact = {
  id: string;
  text: string;
  kind: 'manual' | 'source-derived';
  readOnly: boolean;
  metadata: Record<string, unknown> | null;
  categories: string[];
  sourceId: string | null;
  sourceRevisionId: string | null;
  derivedKey: string | null;
  expirationDate: string | null;
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
};

export type MemorySearchResult = {
  scope: {
    vaultId: string;
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
    vaultId: string;
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
    vaultId: string;
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
  metadata?: Record<string, unknown>;
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
    vaultId: string;
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
  metadata?: Record<string, unknown>;
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
    vaultId: string;
    projectId: string;
  };
  items: MemoryFact[];
};
