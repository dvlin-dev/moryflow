export interface SourceMemoryProjectionJobPayload {
  apiKeyId: string;
  sourceId: string;
  revisionId: string;
}

export interface SourceMemoryProjectionResult {
  status: 'PROJECTED' | 'SKIPPED';
  sourceId: string;
  revisionId: string;
  upsertedCount: number;
  deletedCount: number;
}
