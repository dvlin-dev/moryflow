import { describe, expect, it } from 'vitest';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';

describe('MemoxSourceBridgeService', () => {
  const service = new MemoxSourceBridgeService();

  it('maps workspace document identity to Memox source identity payload', () => {
    const result = service.buildSourceIdentityInput({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      displayPath: '/Doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-1',
    });

    expect(result).toEqual({
      sourceType: 'moryflow_workspace_markdown_v1',
      externalId: 'document-1',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'workspace-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_workspace_content',
          content_hash: 'hash-1',
        },
      },
    });
  });

  it('can build a stable identity payload without lifecycle metadata', () => {
    const result = service.buildSourceIdentityInput(
      {
        userId: 'user-1',
        workspaceId: 'workspace-1',
        documentId: 'document-1',
        title: 'Doc',
        displayPath: '/Doc.md',
        mimeType: 'text/markdown',
        contentHash: 'hash-1',
      },
      {
        includeLifecycleMetadata: false,
      },
    );

    expect(result).toEqual({
      sourceType: 'moryflow_workspace_markdown_v1',
      externalId: 'document-1',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'workspace-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_workspace_content',
        },
      },
    });
  });

  it('builds a stable idempotency family from one root key', () => {
    const family = service.buildLifecycleIdempotencyFamily('evt_1');

    expect(family).toEqual({
      sourceIdentity: 'evt_1:source-identity',
      sourceIdentityMaterialize: 'evt_1:source-identity-materialize',
      revisionCreate: 'evt_1:revision-create',
      revisionFinalize: 'evt_1:revision-finalize',
      sourceDelete: 'evt_1:source-delete',
    });
  });

  it('locks document search to workspace markdown sources', () => {
    const result = service.buildSourcesSearchRequest({
      userId: 'user-1',
      query: 'hello',
      topK: 5,
      workspaceId: 'workspace-1',
    });

    expect(result).toEqual({
      query: 'hello',
      top_k: 5,
      include_graph_context: false,
      source_types: ['moryflow_workspace_markdown_v1'],
      user_id: 'user-1',
      project_id: 'workspace-1',
    });
  });
});
