/**
 * [INPUT]: vaultId + affected fileIds
 * [OUTPUT]: 归属已校验的 existing file map
 * [POS]: Sync 对象归属与当前事实校验服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  StorageClient,
  STORAGE_METADATA_CONTENT_HASH,
  STORAGE_METADATA_STORAGE_REVISION,
} from '../storage';
import type { VectorClock } from '@moryflow/sync';

export interface ExistingSyncFileState {
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
  isDeleted: boolean;
}

export class SyncUploadedObjectNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: 'Uploaded object is missing',
      code: 'SYNC_UPLOADED_OBJECT_NOT_FOUND',
    });
  }
}

export class SyncUploadedObjectContractMismatchException extends ConflictException {
  constructor() {
    super({
      message: 'Uploaded object contract mismatch',
      code: 'SYNC_UPLOADED_OBJECT_CONTRACT_MISMATCH',
    });
  }
}

@Injectable()
export class SyncObjectVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageClient: StorageClient,
  ) {}

  async loadOwnedExistingFiles(
    vaultId: string,
    affectedFileIds: string[],
  ): Promise<Map<string, ExistingSyncFileState>> {
    if (affectedFileIds.length === 0) {
      return new Map();
    }

    const existingFiles = await this.prisma.syncFile.findMany({
      where: {
        id: { in: affectedFileIds },
      },
      select: {
        id: true,
        vaultId: true,
        path: true,
        title: true,
        size: true,
        contentHash: true,
        storageRevision: true,
        vectorClock: true,
        isDeleted: true,
      },
    });

    const invalidOwner = existingFiles.find((file) => file.vaultId !== vaultId);
    if (invalidOwner) {
      throw new ForbiddenException('File does not belong to current vault');
    }

    return new Map(
      existingFiles.map((file) => [
        file.id,
        {
          path: file.path,
          title: file.title,
          size: file.size,
          contentHash: file.contentHash,
          storageRevision: file.storageRevision,
          vectorClock: (file.vectorClock as VectorClock) ?? {},
          isDeleted: file.isDeleted,
        },
      ]),
    );
  }

  async verifyUploadedObject(
    userId: string,
    vaultId: string,
    fileId: string,
    storageRevision: string,
    contentHash: string,
  ): Promise<void> {
    const head = await this.storageClient.headSyncFile(
      userId,
      vaultId,
      fileId,
      storageRevision,
    );

    if (!head) {
      throw new SyncUploadedObjectNotFoundException();
    }

    const remoteRevision =
      head.metadata[STORAGE_METADATA_STORAGE_REVISION] ?? null;
    const remoteHash = head.metadata[STORAGE_METADATA_CONTENT_HASH] ?? null;

    if (remoteRevision !== storageRevision || remoteHash !== contentHash) {
      throw new SyncUploadedObjectContractMismatchException();
    }
  }
}
