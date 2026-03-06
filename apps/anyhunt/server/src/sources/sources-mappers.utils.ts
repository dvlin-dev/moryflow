/**
 * [PROVIDES]: Sources public response mappers
 * [DEPENDS]: Sources domain records
 * [POS]: Sources controller response mapping helpers
 */

import type { JsonValue } from '../common/utils/json.zod';
import type { KnowledgeSourceRecord } from './knowledge-source.repository';
import type { KnowledgeSourceRevisionRecord } from './knowledge-source-revision.repository';
import type {
  FinalizedKnowledgeSourceRevision,
  SourceUploadSession,
} from './sources.types';
import type {
  FinalizedSourceRevisionResponseDto,
  SourceResponseDto,
  SourceRevisionResponseDto,
} from './dto';

function toNullableRecord(value: unknown): Record<string, JsonValue> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : null;
}

export function toSourceResponse(
  source: KnowledgeSourceRecord,
): SourceResponseDto {
  return {
    id: source.id,
    source_type: source.sourceType,
    external_id: source.externalId,
    user_id: source.userId,
    agent_id: source.agentId,
    app_id: source.appId,
    run_id: source.runId,
    org_id: source.orgId,
    project_id: source.projectId,
    title: source.title,
    display_path: source.displayPath,
    mime_type: source.mimeType,
    metadata: toNullableRecord(source.metadata),
    current_revision_id: source.currentRevisionId,
    status: source.status,
    created_at: source.createdAt.toISOString(),
    updated_at: source.updatedAt.toISOString(),
  };
}

export function toSourceRevisionResponse(
  revision: KnowledgeSourceRevisionRecord,
  uploadSession?: SourceUploadSession,
): SourceRevisionResponseDto {
  return {
    id: revision.id,
    source_id: revision.sourceId,
    ingest_mode: revision.ingestMode,
    checksum: revision.checksum,
    user_id: revision.userId,
    agent_id: revision.agentId,
    app_id: revision.appId,
    run_id: revision.runId,
    org_id: revision.orgId,
    project_id: revision.projectId,
    content_bytes: revision.contentBytes,
    content_tokens: revision.contentTokens,
    normalized_text_r2_key: revision.normalizedTextR2Key,
    blob_r2_key: revision.blobR2Key,
    mime_type: revision.mimeType,
    status: revision.status,
    error: revision.error,
    pending_upload_expires_at:
      revision.pendingUploadExpiresAt?.toISOString() ?? null,
    created_at: revision.createdAt.toISOString(),
    updated_at: revision.updatedAt.toISOString(),
    indexed_at: revision.indexedAt?.toISOString() ?? null,
    upload_session: uploadSession
      ? {
          upload_url: uploadSession.uploadUrl,
          headers: uploadSession.headers,
          expires_at: uploadSession.expiresAt,
          revision_id: uploadSession.revisionId,
        }
      : undefined,
  };
}

export function toFinalizedSourceRevisionResponse(
  result: FinalizedKnowledgeSourceRevision,
): FinalizedSourceRevisionResponseDto {
  return {
    revision_id: result.revisionId,
    source_id: result.sourceId,
    chunk_count: result.chunkCount,
    content_bytes: result.contentBytes,
    content_tokens: result.contentTokens,
    checksum: result.checksum,
    normalized_text_r2_key: result.normalizedTextR2Key,
  };
}
