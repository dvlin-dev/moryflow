/**
 * StorageController 单元测试
 * 覆盖 sync download 的快照错误语义
 */

import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import { StorageClient } from './storage.client';
import { StorageController } from './storage.controller';
import { R2Service, StorageErrorCode, type HeadFileResult } from './r2.service';

const STORAGE_API_SECRET = 'test-storage-secret';
const USER_ID = 'abcdefghijklmnopqrst';
const VAULT_ID = '550e8400-e29b-41d4-a716-446655440000';
const FILE_ID = '550e8400-e29b-41d4-a716-446655440001';
const STORAGE_REVISION = '550e8400-e29b-41d4-a716-446655440002';

function signDownload(params: {
  userId?: string;
  vaultId?: string;
  fileId?: string;
  expires?: string;
  contentHash?: string;
  storageRevision?: string;
}): string {
  const expires = params.expires ?? String(Date.now() + 60_000);
  const data = JSON.stringify({
    action: 'download',
    userId: params.userId ?? USER_ID,
    vaultId: params.vaultId ?? VAULT_ID,
    fileId: params.fileId ?? FILE_ID,
    expires: parseInt(expires, 10),
    contentType: '',
    filename: '',
    contentHash: params.contentHash ?? '',
    storageRevision: params.storageRevision ?? '',
    expectedSize: null,
  });

  return createHmac('sha256', STORAGE_API_SECRET).update(data).digest('hex');
}

function createResponseMock() {
  const res = {
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
}

function createController(overrides?: {
  isConfigured?: boolean;
  headSyncFile?:
    | typeof R2Service.prototype.headSyncFile
    | HeadFileResult
    | null;
}) {
  const r2Service = {
    isConfigured: vi.fn().mockReturnValue(overrides?.isConfigured ?? true),
    headSyncFile:
      typeof overrides?.headSyncFile === 'function'
        ? vi.fn(overrides.headSyncFile)
        : vi.fn().mockResolvedValue(overrides?.headSyncFile ?? null),
    downloadSyncStream: vi.fn().mockResolvedValue({
      stream: {
        pipe: vi.fn(),
        on: vi.fn(),
      },
      contentLength: 0,
      contentType: 'text/markdown',
      metadata: {},
    }),
  } as unknown as R2Service;

  const configService = {
    get: vi.fn((key: string, fallback?: string) =>
      key === 'STORAGE_API_SECRET' ? STORAGE_API_SECRET : fallback,
    ),
  } as unknown as ConfigService;

  return {
    controller: new StorageController(r2Service, configService),
    r2Service,
  };
}

describe('StorageController.downloadFile', () => {
  it('returns 404 when the requested sync snapshot object does not exist', async () => {
    const { controller, r2Service } = createController({
      headSyncFile: null,
    });
    const res = createResponseMock();
    const expires = String(Date.now() + 60_000);
    const signature = signDownload({
      expires,
      storageRevision: STORAGE_REVISION,
    });

    await controller.downloadFile(
      USER_ID,
      VAULT_ID,
      FILE_ID,
      expires,
      signature,
      undefined,
      undefined,
      undefined,
      STORAGE_REVISION,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'File not found',
      code: StorageErrorCode.FILE_NOT_FOUND,
    });
    expect(
      (r2Service as unknown as { downloadSyncStream: ReturnType<typeof vi.fn> })
        .downloadSyncStream,
    ).not.toHaveBeenCalled();
  });

  it('returns 409 when the object still exists but content hash no longer matches', async () => {
    const { controller, r2Service } = createController({
      headSyncFile: {
        eTag: '"etag-current"',
        metadata: {
          storagerevision: STORAGE_REVISION,
          contenthash: 'hash-current',
        },
      },
    });
    const res = createResponseMock();
    const expires = String(Date.now() + 60_000);
    const signature = signDownload({
      expires,
      contentHash: 'hash-expected',
      storageRevision: STORAGE_REVISION,
    });

    await controller.downloadFile(
      USER_ID,
      VAULT_ID,
      FILE_ID,
      expires,
      signature,
      undefined,
      undefined,
      'hash-expected',
      STORAGE_REVISION,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Download contract no longer matches current object',
      code: 'SNAPSHOT_MISMATCH',
    });
    expect(
      (r2Service as unknown as { downloadSyncStream: ReturnType<typeof vi.fn> })
        .downloadSyncStream,
    ).not.toHaveBeenCalled();
  });

  it('accepts signed download URLs generated from batch contracts even when action size is present', async () => {
    const { controller, r2Service } = createController({
      headSyncFile: {
        eTag: '"etag-current"',
        metadata: {
          storagerevision: STORAGE_REVISION,
          contenthash: 'hash-current',
        },
      },
    });
    const configService = {
      get: vi.fn((key: string, fallback?: string) =>
        key === 'STORAGE_API_SECRET'
          ? STORAGE_API_SECRET
          : key === 'SERVER_URL'
            ? 'http://localhost:3000'
            : fallback,
      ),
    } as unknown as ConfigService;
    const storageClient = new StorageClient(configService, r2Service);
    const res = createResponseMock();
    const [{ url }] = storageClient.getBatchUrls(USER_ID, VAULT_ID, [
      {
        fileId: FILE_ID,
        action: 'download',
        size: 123,
        contentHash: 'hash-current',
        storageRevision: STORAGE_REVISION,
      },
    ]).urls;
    const signedUrl = new URL(url);

    await controller.downloadFile(
      USER_ID,
      VAULT_ID,
      FILE_ID,
      signedUrl.searchParams.get('expires') ?? '',
      signedUrl.searchParams.get('sig') ?? '',
      signedUrl.searchParams.get('contentType') ?? undefined,
      signedUrl.searchParams.get('filename') ?? undefined,
      signedUrl.searchParams.get('contentHash') ?? undefined,
      signedUrl.searchParams.get('storageRevision') ?? undefined,
      res,
    );

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(
      (r2Service as unknown as { downloadSyncStream: ReturnType<typeof vi.fn> })
        .downloadSyncStream,
    ).toHaveBeenCalledWith(USER_ID, VAULT_ID, FILE_ID, STORAGE_REVISION);
  });
});
