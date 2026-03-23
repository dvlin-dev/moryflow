import path from 'node:path';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { normalizeSyncPath } from '@moryflow/sync';
import { membershipBridge } from '../membership/bridge.js';
import { getActiveVaultInfo } from '../vault/index.js';
import { fetchCurrentUserId } from '../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../workspace-meta/identity.js';
import { workspaceProfileApi } from '../workspace-profile/api/client.js';
import {
  resolveActiveWorkspaceProfileContext,
  type WorkspaceProfileContextResult,
} from '../workspace-profile/context.js';
import { workspaceProfileService } from '../workspace-profile/service.js';
import { workspaceDocRegistry } from '../workspace-doc-registry/index.js';
import { getSyncMirrorEntry } from '../cloud-sync/sync-mirror-state.js';
import { memoryIndexingProfileState } from './profile-state.js';
import {
  workspaceContentApi,
  WorkspaceContentApiError,
  type WorkspaceContentDocument,
} from './api/client.js';
import { createMemoryIndexingState } from './state.js';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

const isMarkdownFile = (filePath: string): boolean =>
  MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const computeContentHash = (content: string): string =>
  crypto.createHash('sha256').update(content).digest('hex');

interface WorkspaceDocumentRegistryEntry {
  documentId: string;
  path: string;
  fingerprint: string;
}

interface ResolvedMemoryProfileContext {
  activeVault: {
    path: string;
  };
  userId: string;
  profileKey: string;
  profile: {
    workspaceId: string;
    syncEnabled: boolean;
    syncVaultId: string | null;
  };
}

export interface MemoryIndexingEngineDeps {
  profiles: {
    resolveActiveProfile: () => Promise<WorkspaceProfileContextResult>;
  };
  documentRegistry: {
    ensureDocumentId: (workspacePath: string, relativePath: string) => Promise<string>;
    getByPath: (
      workspacePath: string,
      relativePath: string
    ) => Promise<WorkspaceDocumentRegistryEntry | null>;
    getByDocumentId: (
      workspacePath: string,
      documentId: string
    ) => Promise<WorkspaceDocumentRegistryEntry | null>;
    delete: (workspacePath: string, relativePath: string) => Promise<string | null>;
  };
  syncMirror: {
    getEntry: (
      workspacePath: string,
      profileKey: string,
      documentId: string
    ) =>
      | {
          lastSyncedHash: string | null;
          lastSyncedStorageRevision: string | null;
        }
      | null
      | undefined;
  };
  uploadedDocuments: {
    markUploadedDocument: (
      workspacePath: string,
      profileKey: string,
      workspaceId: string,
      documentId: string
    ) => Promise<void>;
    removeUploadedDocument: (
      workspacePath: string,
      profileKey: string,
      workspaceId: string,
      documentId: string
    ) => Promise<void>;
  };
  api: {
    batchUpsert: typeof workspaceContentApi.batchUpsert;
    batchDelete: typeof workspaceContentApi.batchDelete;
  };
  files: {
    readText: (absolutePath: string) => Promise<string>;
  };
  state: ReturnType<typeof createMemoryIndexingState>;
}

const defaultDeps: Omit<MemoryIndexingEngineDeps, 'state'> = {
  profiles: {
    resolveActiveProfile: () =>
      resolveActiveWorkspaceProfileContext(
        {},
        {
          membership: membershipBridge,
          vault: { getActiveVaultInfo },
          user: { fetchCurrentUserId },
          workspaceMeta: { ensureWorkspaceIdentity },
          profileService: workspaceProfileService,
          api: workspaceProfileApi,
        }
      ),
  },
  documentRegistry: workspaceDocRegistry,
  syncMirror: {
    getEntry: getSyncMirrorEntry,
  },
  uploadedDocuments: memoryIndexingProfileState,
  api: workspaceContentApi,
  files: {
    readText: (absolutePath: string) => readFile(absolutePath, 'utf8'),
  },
};

const toRelativePath = (workspacePath: string, absolutePath: string): string =>
  normalizeSyncPath(path.relative(workspacePath, absolutePath));

const buildTaskKey = (workspacePath: string, profileKey: string, documentId: string): string =>
  `${workspacePath}:${profileKey}:${documentId}`;

const reportAsyncFailure = (scope: string, error: unknown): void => {
  console.error(`[memory-indexing] ${scope}`, error);
};

const RETRYABLE_HTTP_STATUSES = new Set([401, 408, 429]);

const isNonRetryable = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    if ('code' in error && (error as { code: string }).code === 'ENOENT') return true;
    if (error instanceof WorkspaceContentApiError) {
      return (
        error.status >= 400 && error.status < 500 && !RETRYABLE_HTTP_STATUSES.has(error.status)
      );
    }
  }
  return false;
};

const buildUploadSignature = (document: WorkspaceContentDocument): string => {
  if (document.mode === 'inline_text') {
    return JSON.stringify({
      mode: document.mode,
      documentId: document.documentId,
      path: document.path,
      mimeType: document.mimeType ?? null,
      contentHash: document.contentHash,
      contentBytes: document.contentBytes ?? null,
    });
  }

  return JSON.stringify({
    mode: document.mode,
    documentId: document.documentId,
    path: document.path,
    mimeType: document.mimeType ?? null,
    contentHash: document.contentHash,
    vaultId: document.vaultId,
    fileId: document.fileId,
    storageRevision: document.storageRevision,
  });
};

export const createMemoryIndexingEngine = (deps?: Partial<MemoryIndexingEngineDeps>) => {
  const resolvedDeps: MemoryIndexingEngineDeps = {
    ...defaultDeps,
    state: deps?.state ?? createMemoryIndexingState(),
    ...deps,
  };
  let generation = 0;

  const isCurrentGeneration = (value: number): boolean => value === generation;

  const resolveCurrentContextForWorkspace = async (
    workspacePath: string
  ): Promise<ResolvedMemoryProfileContext | null> => {
    const context = await resolvedDeps.profiles.resolveActiveProfile();
    if (
      !context.loggedIn ||
      !context.userId ||
      !context.activeVault?.path ||
      !context.profile?.workspaceId ||
      !context.profileKey ||
      context.activeVault.path !== workspacePath
    ) {
      return null;
    }
    return {
      activeVault: {
        path: context.activeVault.path,
      },
      userId: context.userId,
      profileKey: context.profileKey,
      profile: {
        workspaceId: context.profile.workspaceId,
        syncEnabled: context.profile.syncEnabled,
        syncVaultId: context.profile.syncVaultId,
      },
    };
  };

  const persistUploadedDocument = async (params: {
    workspacePath: string;
    profileKey: string;
    workspaceId: string;
    documentId: string;
  }): Promise<void> => {
    await resolvedDeps.uploadedDocuments.markUploadedDocument(
      params.workspacePath,
      params.profileKey,
      params.workspaceId,
      params.documentId
    );
  };

  const clearUploadedDocument = async (params: {
    workspacePath: string;
    profileKey: string;
    workspaceId: string;
    documentId: string;
  }): Promise<void> => {
    await resolvedDeps.uploadedDocuments.removeUploadedDocument(
      params.workspacePath,
      params.profileKey,
      params.workspaceId,
      params.documentId
    );
  };

  const scheduleFlushDocumentRetry = (taskKey: string, runner: () => Promise<void>): boolean =>
    resolvedDeps.state.scheduleRetry(taskKey, () => {
      void runner().catch((retryError) => {
        reportAsyncFailure('retry flushDocument failed', retryError);
      });
    });

  const scheduleFlushDeleteRetry = (taskKey: string, runner: () => Promise<void>): boolean =>
    resolvedDeps.state.scheduleRetry(taskKey, () => {
      void runner().catch((retryError) => {
        reportAsyncFailure('retry flushDelete failed', retryError);
      });
    });

  const finalizeRemoteDeletion = async (params: {
    workspacePath: string;
    relativePath: string;
    documentId: string;
    taskKey: string;
    generation: number;
    expectedProfileKey: string;
    expectedUserId: string;
    removeRegistryEntry: boolean;
  }): Promise<void> => {
    if (!isCurrentGeneration(params.generation)) {
      pendingPaths.add(path.join(params.workspacePath, params.relativePath));
      return;
    }

    const context = await resolveCurrentContextForWorkspace(params.workspacePath);
    if (
      !context ||
      !isCurrentGeneration(params.generation) ||
      context.profileKey !== params.expectedProfileKey ||
      context.userId !== params.expectedUserId
    ) {
      pendingPaths.add(path.join(params.workspacePath, params.relativePath));
      return;
    }

    if (!resolvedDeps.state.hasRemoteDelete(params.taskKey)) {
      await resolvedDeps.api.batchDelete({
        workspaceId: context.profile.workspaceId,
        documents: [{ documentId: params.documentId }],
      });
      resolvedDeps.state.markRemoteDeleted(params.taskKey);
    }

    await clearUploadedDocument({
      workspacePath: params.workspacePath,
      profileKey: context.profileKey,
      workspaceId: context.profile.workspaceId,
      documentId: params.documentId,
    });

    if (!isCurrentGeneration(params.generation)) {
      return;
    }

    resolvedDeps.state.markDeleted(params.taskKey);
    resolvedDeps.state.resetTask(params.taskKey);
    if (params.removeRegistryEntry && !context.profile.syncEnabled) {
      await resolvedDeps.documentRegistry.delete(params.workspacePath, params.relativePath);
    }
  };

  const flushDocument = async (params: {
    absolutePath: string;
    workspacePath: string;
    relativePath: string;
    documentId: string;
    taskKey: string;
    generation: number;
    expectedProfileKey: string;
    expectedUserId: string;
  }): Promise<void> => {
    if (!isCurrentGeneration(params.generation)) {
      pendingPaths.add(params.absolutePath);
      return;
    }

    const context = await resolveCurrentContextForWorkspace(params.workspacePath);
    if (
      !context ||
      !isCurrentGeneration(params.generation) ||
      context.profileKey !== params.expectedProfileKey ||
      context.userId !== params.expectedUserId
    ) {
      pendingPaths.add(params.absolutePath);
      return;
    }

    const relativePath = toRelativePath(params.workspacePath, params.absolutePath);
    let contentText: string;
    try {
      contentText = await resolvedDeps.files.readText(params.absolutePath);
    } catch (readError) {
      if (isNonRetryable(readError)) {
        await flushDelete({
          workspacePath: params.workspacePath,
          relativePath: params.relativePath,
          documentId: params.documentId,
          taskKey: params.taskKey,
          generation: params.generation,
          expectedProfileKey: params.expectedProfileKey,
          expectedUserId: params.expectedUserId,
        });
        return;
      }
      throw readError;
    }
    const contentHash = computeContentHash(contentText);

    const syncMirrorEntry = resolvedDeps.syncMirror.getEntry(
      params.workspacePath,
      context.profileKey,
      params.documentId
    );

    const document: WorkspaceContentDocument =
      context.profile.syncEnabled &&
      context.profile.syncVaultId &&
      syncMirrorEntry?.lastSyncedHash === contentHash &&
      typeof syncMirrorEntry.lastSyncedStorageRevision === 'string' &&
      syncMirrorEntry.lastSyncedStorageRevision.length > 0
        ? {
            documentId: params.documentId,
            path: relativePath,
            mimeType: 'text/markdown',
            contentHash,
            mode: 'sync_object_ref',
            vaultId: context.profile.syncVaultId,
            fileId: params.documentId,
            storageRevision: syncMirrorEntry.lastSyncedStorageRevision,
          }
        : {
            documentId: params.documentId,
            path: relativePath,
            mimeType: 'text/markdown',
            contentHash,
            contentBytes: Buffer.byteLength(contentText),
            mode: 'inline_text',
            contentText,
          };

    const signature = buildUploadSignature(document);
    const uploadStateParams = {
      workspacePath: params.workspacePath,
      profileKey: context.profileKey,
      workspaceId: context.profile.workspaceId,
      documentId: params.documentId,
    } as const;
    const hasCommittedUpload =
      resolvedDeps.state.getLastUploadedSignature(params.taskKey) === signature;
    let uploadCommitted = hasCommittedUpload;

    try {
      if (!hasCommittedUpload) {
        await resolvedDeps.api.batchUpsert({
          workspaceId: context.profile.workspaceId,
          documents: [document],
        });
        uploadCommitted = true;
        resolvedDeps.state.markRemoteUploaded(params.taskKey, signature);
      }

      await persistUploadedDocument(uploadStateParams);
      resolvedDeps.state.markUploaded(params.taskKey, signature);
    } catch (error) {
      if (uploadCommitted) {
        if (!isCurrentGeneration(params.generation)) {
          pendingPaths.add(params.absolutePath);
          return;
        }
        const scheduled = scheduleFlushDocumentRetry(params.taskKey, () => flushDocument(params));
        if (!scheduled) {
          throw error;
        }
        return;
      }

      if (!isCurrentGeneration(params.generation)) {
        pendingPaths.add(params.absolutePath);
        return;
      }

      if (isNonRetryable(error)) {
        if (document.mode === 'sync_object_ref') {
          let fallbackSignature: string | null = null;
          try {
            const freshContent = await resolvedDeps.files.readText(params.absolutePath);
            const freshHash = computeContentHash(freshContent);
            const fallbackDoc: WorkspaceContentDocument = {
              documentId: params.documentId,
              path: relativePath,
              mimeType: 'text/markdown',
              contentHash: freshHash,
              contentBytes: Buffer.byteLength(freshContent),
              mode: 'inline_text',
              contentText: freshContent,
            };
            await resolvedDeps.api.batchUpsert({
              workspaceId: context.profile.workspaceId,
              documents: [fallbackDoc],
            });
            fallbackSignature = buildUploadSignature(fallbackDoc);
            resolvedDeps.state.markRemoteUploaded(params.taskKey, fallbackSignature);
            await persistUploadedDocument(uploadStateParams);
            if (!isCurrentGeneration(params.generation)) {
              pendingPaths.add(params.absolutePath);
              return;
            }
            resolvedDeps.state.markUploaded(params.taskKey, fallbackSignature);
            return;
          } catch (fallbackError) {
            if (
              fallbackSignature &&
              resolvedDeps.state.getLastUploadedSignature(params.taskKey) === fallbackSignature
            ) {
              if (!isCurrentGeneration(params.generation)) {
                pendingPaths.add(params.absolutePath);
                return;
              }
              const scheduled = scheduleFlushDocumentRetry(params.taskKey, () =>
                flushDocument(params)
              );
              if (scheduled) return;
            }
            if (!isNonRetryable(fallbackError)) {
              // Transient failure (network/5xx) — let normal retry handle it
              const scheduled = scheduleFlushDocumentRetry(params.taskKey, () =>
                flushDocument(params)
              );
              if (scheduled) return;
            }
            // Permanent failure or retries exhausted — proceed to cleanup
          }
        }
        try {
          await finalizeRemoteDeletion({
            workspacePath: params.workspacePath,
            relativePath: params.relativePath,
            documentId: params.documentId,
            taskKey: params.taskKey,
            generation: params.generation,
            expectedProfileKey: params.expectedProfileKey,
            expectedUserId: params.expectedUserId,
            removeRegistryEntry: false,
          });
        } catch (cleanupError) {
          const scheduled = scheduleFlushDeleteRetry(params.taskKey, () =>
            finalizeRemoteDeletion({
              workspacePath: params.workspacePath,
              relativePath: params.relativePath,
              documentId: params.documentId,
              taskKey: params.taskKey,
              generation: params.generation,
              expectedProfileKey: params.expectedProfileKey,
              expectedUserId: params.expectedUserId,
              removeRegistryEntry: false,
            })
          );
          if (scheduled) {
            return;
          }
          resolvedDeps.state.resetTask(params.taskKey);
          throw cleanupError;
        }
        return;
      }

      const scheduled = scheduleFlushDocumentRetry(params.taskKey, () => flushDocument(params));
      if (!scheduled) {
        resolvedDeps.state.resetTask(params.taskKey);
        throw error;
      }
    }
  };

  const flushDelete = async (params: {
    workspacePath: string;
    relativePath: string;
    documentId: string;
    taskKey: string;
    generation: number;
    expectedProfileKey: string;
    expectedUserId: string;
  }): Promise<void> => {
    if (!isCurrentGeneration(params.generation)) {
      pendingPaths.add(path.join(params.workspacePath, params.relativePath));
      return;
    }

    const currentEntry = await resolvedDeps.documentRegistry.getByDocumentId(
      params.workspacePath,
      params.documentId
    );
    if (currentEntry && currentEntry.path !== params.relativePath) {
      await flushDocument({
        absolutePath: path.join(params.workspacePath, currentEntry.path),
        workspacePath: params.workspacePath,
        relativePath: currentEntry.path,
        documentId: params.documentId,
        taskKey: params.taskKey,
        generation: params.generation,
        expectedProfileKey: params.expectedProfileKey,
        expectedUserId: params.expectedUserId,
      });
      return;
    }

    try {
      await finalizeRemoteDeletion({
        workspacePath: params.workspacePath,
        relativePath: params.relativePath,
        documentId: params.documentId,
        taskKey: params.taskKey,
        generation: params.generation,
        expectedProfileKey: params.expectedProfileKey,
        expectedUserId: params.expectedUserId,
        removeRegistryEntry: true,
      });
    } catch (error) {
      if (!isCurrentGeneration(params.generation)) {
        return;
      }
      const scheduled = scheduleFlushDeleteRetry(params.taskKey, () =>
        finalizeRemoteDeletion({
          workspacePath: params.workspacePath,
          relativePath: params.relativePath,
          documentId: params.documentId,
          taskKey: params.taskKey,
          generation: params.generation,
          expectedProfileKey: params.expectedProfileKey,
          expectedUserId: params.expectedUserId,
          removeRegistryEntry: true,
        })
      );
      if (!scheduled) {
        resolvedDeps.state.resetTask(params.taskKey);
        throw error;
      }
    }
  };

  const pendingPaths = new Set<string>();

  return {
    /** Paths that couldn't be processed due to profile unavailability or stop(). */
    getPendingPaths(): string[] {
      return [...pendingPaths];
    },
    getBootstrapState(vaultPath: string): { pending: boolean; hasLocalDocuments: boolean } {
      return resolvedDeps.state.getBootstrapState(vaultPath);
    },
    markBootstrapStarted(vaultPath: string): symbol {
      return resolvedDeps.state.markBootstrapStarted(vaultPath);
    },
    markBootstrapDocuments(vaultPath: string, token: symbol, hasLocalDocuments: boolean): void {
      resolvedDeps.state.markBootstrapDocuments(vaultPath, token, hasLocalDocuments);
    },
    markBootstrapFinished(vaultPath: string, token: symbol): void {
      resolvedDeps.state.markBootstrapFinished(vaultPath, token);
    },
    clearPendingPaths(): void {
      pendingPaths.clear();
    },
    /** Clear only pending paths that belong to the given vault prefix. */
    clearPendingPathsForVault(vaultPrefix: string): void {
      for (const p of pendingPaths) {
        if (p.startsWith(vaultPrefix)) {
          pendingPaths.delete(p);
        }
      }
    },
    handleFileChange(type: 'add' | 'change' | 'unlink', absolutePath: string): void {
      if (!isMarkdownFile(absolutePath)) {
        return;
      }

      void (async () => {
        const scheduledGeneration = generation;
        const context = await resolvedDeps.profiles.resolveActiveProfile();
        if (
          !context.loggedIn ||
          !context.userId ||
          !context.activeVault?.path ||
          !context.profile?.workspaceId ||
          !context.profileKey ||
          !isCurrentGeneration(scheduledGeneration)
        ) {
          // Profile not ready — save path for later reconcile replay
          pendingPaths.add(absolutePath);
          return;
        }

        const workspacePath = context.activeVault.path;
        const currentProfileKey = context.profileKey;
        const currentUserId = context.userId;
        const relativePath = toRelativePath(workspacePath, absolutePath);
        const taskGeneration = scheduledGeneration;

        if (type === 'unlink') {
          const existing = await resolvedDeps.documentRegistry.getByPath(
            workspacePath,
            relativePath
          );
          if (!existing) {
            return;
          }
          if (!isCurrentGeneration(taskGeneration)) {
            pendingPaths.add(absolutePath);
            return;
          }
          const taskKey = buildTaskKey(workspacePath, currentProfileKey, existing.documentId);
          resolvedDeps.state.schedule(
            taskKey,
            () => {
              void flushDelete({
                workspacePath,
                relativePath,
                documentId: existing.documentId,
                taskKey,
                generation: taskGeneration,
                expectedProfileKey: currentProfileKey,
                expectedUserId: currentUserId,
              }).catch((error) => {
                reportAsyncFailure('scheduled flushDelete failed', error);
              });
            },
            absolutePath,
            workspacePath
          );
          return;
        }

        const documentId = await resolvedDeps.documentRegistry.ensureDocumentId(
          workspacePath,
          relativePath
        );
        if (!isCurrentGeneration(taskGeneration)) {
          pendingPaths.add(absolutePath);
          return;
        }
        const taskKey = buildTaskKey(workspacePath, currentProfileKey, documentId);
        resolvedDeps.state.schedule(
          taskKey,
          () => {
            void flushDocument({
              absolutePath,
              workspacePath,
              relativePath,
              documentId,
              taskKey,
              generation: taskGeneration,
              expectedProfileKey: currentProfileKey,
              expectedUserId: currentUserId,
            }).catch((error) => {
              reportAsyncFailure('scheduled flushDocument failed', error);
            });
          },
          absolutePath,
          workspacePath
        );
      })().catch((error) => {
        reportAsyncFailure('handleFileChange bootstrap failed', error);
      });
    },
    stop(): void {
      // Preserve pending timer paths before clearing, then reset.
      // Note: pendingPaths is cleared on next reconcile replay, which will
      // re-validate paths against the current vault before processing.
      for (const p of resolvedDeps.state.getPendingPaths()) {
        pendingPaths.add(p);
      }
      generation += 1;
      resolvedDeps.state.reset();
    },
  };
};

export const memoryIndexingEngine = createMemoryIndexingEngine();
