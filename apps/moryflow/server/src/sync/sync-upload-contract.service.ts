/**
 * [INPUT]: SyncActionDto[]
 * [OUTPUT]: 带预签名 URL 的 action contract
 * [POS]: Sync 上传/下载对象合同服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageClient } from '../storage';
import { getMimeType, getFileName } from '../storage/mime-utils';
import type { SyncActionSeedDto } from './dto';

@Injectable()
export class SyncUploadContractService {
  constructor(private readonly storageClient: StorageClient) {}

  generatePresignUrls(
    userId: string,
    vaultId: string,
    actions: SyncActionSeedDto[],
  ): SyncActionSeedDto[] {
    const needUrls = actions.filter(
      (action) =>
        action.action === 'upload' ||
        action.action === 'download' ||
        action.action === 'conflict',
    );

    if (needUrls.length === 0) return actions;

    if (!this.storageClient.isConfigured()) {
      throw new ServiceUnavailableException('Storage not configured');
    }

    const urlRequests: Array<{
      fileId: string;
      action: 'upload' | 'download';
      contentType?: string;
      filename?: string;
      size?: number;
      storageRevision?: string;
      contentHash?: string;
    }> = [];
    const uploadRevisionMap = new Map<string, string>();
    const conflictCopyRevisionMap = new Map<string, string>();

    for (const action of needUrls) {
      if (action.action === 'conflict') {
        const originalRevision = randomUUID();
        uploadRevisionMap.set(action.fileId, originalRevision);

        urlRequests.push({
          fileId: action.fileId,
          action: 'download',
          contentType: getMimeType(action.path),
          filename: getFileName(action.path),
          size: action.size,
          contentHash: action.contentHash,
          storageRevision: action.remoteStorageRevision,
        });
        urlRequests.push({
          fileId: action.fileId,
          action: 'upload',
          contentType: getMimeType(action.path),
          filename: getFileName(action.path),
          size: action.uploadSize ?? action.size,
          contentHash: action.uploadContentHash,
          storageRevision: originalRevision,
        });

        if (action.conflictCopyId && action.conflictRename) {
          const conflictCopyRevision = randomUUID();
          conflictCopyRevisionMap.set(
            action.conflictCopyId,
            conflictCopyRevision,
          );
          urlRequests.push({
            fileId: action.conflictCopyId,
            action: 'upload',
            contentType: getMimeType(action.conflictRename),
            filename: getFileName(action.conflictRename),
            size: action.size,
            contentHash: action.contentHash,
            storageRevision: conflictCopyRevision,
          });
        }
        continue;
      }

      const storageRevision =
        action.action === 'upload' ? randomUUID() : action.storageRevision;
      if (action.action === 'upload') {
        uploadRevisionMap.set(action.fileId, storageRevision!);
      }
      urlRequests.push({
        fileId: action.fileId,
        action: action.action === 'upload' ? 'upload' : 'download',
        contentType: getMimeType(action.path),
        filename: getFileName(action.path),
        size: action.size,
        contentHash: action.contentHash,
        storageRevision,
      });
    }

    const result = this.storageClient.getBatchUrls(
      userId,
      vaultId,
      urlRequests,
    );

    const urlMap = new Map<string, string>();
    urlRequests.forEach((request, index) => {
      const url = result.urls[index]?.url;
      if (url) {
        urlMap.set(`${request.fileId}:${request.action}`, url);
      }
    });

    return actions.map((action) => {
      if (action.action === 'conflict') {
        return {
          ...action,
          url: urlMap.get(`${action.fileId}:download`),
          uploadUrl: urlMap.get(`${action.fileId}:upload`),
          storageRevision: uploadRevisionMap.get(action.fileId),
          conflictCopyUploadUrl: action.conflictCopyId
            ? urlMap.get(`${action.conflictCopyId}:upload`)
            : undefined,
          conflictCopyStorageRevision: action.conflictCopyId
            ? conflictCopyRevisionMap.get(action.conflictCopyId)
            : undefined,
        };
      }
      if (action.action === 'upload') {
        return {
          ...action,
          url: urlMap.get(`${action.fileId}:upload`),
          storageRevision: uploadRevisionMap.get(action.fileId),
        };
      }
      return { ...action, url: urlMap.get(`${action.fileId}:download`) };
    });
  }
}
