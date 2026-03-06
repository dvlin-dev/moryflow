/**
 * [DEFINES]: Sources domain input/output types
 * [USED_BY]: sources services / future controllers
 * [POS]: Memox 知识源领域内部类型
 */

export interface SourceScope {
  userId?: string | null;
  agentId?: string | null;
  appId?: string | null;
  runId?: string | null;
  orgId?: string | null;
  projectId?: string | null;
}

export interface CreateKnowledgeSourceInput extends SourceScope {
  sourceType: string;
  externalId?: string | null;
  title: string;
  displayPath?: string | null;
  mimeType?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateInlineKnowledgeSourceRevisionInput {
  content: string;
  mimeType?: string | null;
}

export interface CreateUploadBlobKnowledgeSourceRevisionInput {
  mimeType?: string | null;
  filename?: string | null;
}

export interface SourceChunkDraft {
  headingPath: string[];
  content: string;
  tokenCount: number;
  keywords: string[];
}

export interface SourceUploadSession {
  uploadUrl: string;
  expiresAt: number;
  headers: Record<string, string>;
  revisionId: string;
}

export interface FinalizedKnowledgeSourceRevision {
  revisionId: string;
  sourceId: string;
  chunkCount: number;
  contentBytes: number;
  contentTokens: number;
  checksum: string;
  normalizedTextR2Key: string;
}
