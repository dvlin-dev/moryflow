import { describe, expect, it } from 'vitest';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';

describe('MemoxSourceBridgeService', () => {
  const service = new MemoxSourceBridgeService();

  it('maps Moryflow file identity to Memox source identity payload', () => {
    const result = service.buildSourceIdentityInput({
      userId: 'user-1',
      vaultId: 'vault-1',
      fileId: 'file-1',
      title: 'Doc',
      displayPath: '/Doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-1',
      storageRevision: 'rev-1',
    });

    expect(result).toEqual({
      sourceType: 'note_markdown',
      externalId: 'file-1',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: 'hash-1',
          storage_revision: 'rev-1',
        },
      },
    });
  });

  it('can build a stable identity payload without lifecycle metadata', () => {
    const result = service.buildSourceIdentityInput(
      {
        userId: 'user-1',
        vaultId: 'vault-1',
        fileId: 'file-1',
        title: 'Doc',
        displayPath: '/Doc.md',
        mimeType: 'text/markdown',
        contentHash: 'hash-1',
        storageRevision: 'rev-1',
      },
      {
        includeLifecycleMetadata: false,
      },
    );

    expect(result).toEqual({
      sourceType: 'note_markdown',
      externalId: 'file-1',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_sync',
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

  it('locks file search to note_markdown sources', () => {
    const result = service.buildSourcesSearchRequest({
      userId: 'user-1',
      query: 'hello',
      topK: 5,
      vaultId: 'vault-1',
    });

    expect(result).toEqual({
      query: 'hello',
      top_k: 5,
      include_graph_context: false,
      source_types: ['note_markdown'],
      user_id: 'user-1',
      project_id: 'vault-1',
    });
  });
});
