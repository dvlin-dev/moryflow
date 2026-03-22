import type {
  WorkspaceContentDeletePayload,
  WorkspaceContentUpsertPayload,
} from '../memox/memox-source-contract';

type InlineRevisionSnapshot = {
  mode: 'INLINE_TEXT';
  contentHash: string;
  contentText: string | null;
  contentBytes?: number | null;
};

type SyncObjectRefRevisionSnapshot = {
  mode: 'SYNC_OBJECT_REF';
  contentHash: string;
  syncObjectKey: string | null;
  storageRevision: string | null;
};

type CanonicalRevisionSnapshot =
  | InlineRevisionSnapshot
  | SyncObjectRefRevisionSnapshot;

type CanonicalDocumentSnapshot = {
  documentId: string;
  path: string;
  title: string;
  mimeType?: string | null;
};

function parseSyncObjectKey(syncObjectKey: string): {
  vaultId: string;
  fileId: string;
  storageRevision: string;
} {
  const segments = syncObjectKey.split('/');
  if (
    segments.length !== 3 ||
    segments.some((segment) => segment.length === 0)
  ) {
    throw new Error('Workspace document revision syncObjectKey is invalid');
  }

  const [vaultId, fileId, storageRevision] = segments;
  return { vaultId, fileId, storageRevision };
}

export function buildWorkspaceContentUpsertOutboxPayload(params: {
  userId: string;
  workspaceId: string;
  document: CanonicalDocumentSnapshot;
  revision: CanonicalRevisionSnapshot;
}): WorkspaceContentUpsertPayload {
  const base = {
    userId: params.userId,
    workspaceId: params.workspaceId,
    documentId: params.document.documentId,
    path: params.document.path,
    title: params.document.title,
    mimeType: params.document.mimeType ?? undefined,
    contentHash: params.revision.contentHash,
  };

  if (params.revision.mode === 'INLINE_TEXT') {
    return {
      ...base,
      mode: 'inline_text',
      content: params.revision.contentText ?? '',
    };
  }

  if (!params.revision.syncObjectKey || !params.revision.storageRevision) {
    throw new Error(
      'Workspace document revision sync object reference is incomplete',
    );
  }

  const syncRef = parseSyncObjectKey(params.revision.syncObjectKey);
  return {
    ...base,
    mode: 'sync_object_ref',
    vaultId: syncRef.vaultId,
    fileId: syncRef.fileId,
    storageRevision: params.revision.storageRevision,
  };
}

export function buildWorkspaceContentDeleteOutboxPayload(params: {
  userId: string;
  workspaceId: string;
  documentId: string;
}): WorkspaceContentDeletePayload {
  return {
    userId: params.userId,
    workspaceId: params.workspaceId,
    documentId: params.documentId,
  };
}
