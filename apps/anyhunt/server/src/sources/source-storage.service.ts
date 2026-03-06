/**
 * [INPUT]: apiKeyId + revisionId + normalized text/blob payload
 * [OUTPUT]: R2 keys + normalized text payloads
 * [POS]: Sources 内容存储服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { R2Service, StorageClient } from '../storage';

const SOURCE_NORMALIZED_TEXT_VAULT = '00000000-0000-4000-8000-000000000101';
const SOURCE_BLOB_TEXT_VAULT = '00000000-0000-4000-8000-000000000102';

@Injectable()
export class SourceStorageService {
  constructor(
    private readonly r2Service: R2Service,
    private readonly storageClient: StorageClient,
  ) {}

  async uploadNormalizedText(
    apiKeyId: string,
    revisionId: string,
    text: string,
  ): Promise<string> {
    const location = this.buildLocation(
      apiKeyId,
      SOURCE_NORMALIZED_TEXT_VAULT,
      revisionId,
    );

    await this.r2Service.uploadStream(
      location.tenantId,
      location.vaultId,
      location.fileId,
      Readable.from(Buffer.from(text, 'utf8')),
      'text/plain; charset=utf-8',
      Buffer.byteLength(text, 'utf8'),
    );

    return location.key;
  }

  async downloadText(r2Key: string): Promise<string> {
    const location = this.parseKey(r2Key);
    const result = await this.r2Service.downloadStream(
      location.tenantId,
      location.vaultId,
      location.fileId,
    );
    const chunks: Buffer[] = [];

    for await (const chunk of result.stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }

      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf8'));
        continue;
      }

      if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
        continue;
      }

      throw new Error('Unsupported source text stream chunk type');
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  async deleteObjects(r2Keys: string[]): Promise<void> {
    const uniqueKeys = [
      ...new Set(r2Keys.filter((value) => value.trim().length > 0)),
    ];
    if (uniqueKeys.length === 0) {
      return;
    }

    const groups = new Map<
      string,
      { tenantId: string; vaultId: string; fileIds: string[] }
    >();

    for (const r2Key of uniqueKeys) {
      const location = this.parseKey(r2Key);
      const groupKey = `${location.tenantId}/${location.vaultId}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.fileIds.push(location.fileId);
        continue;
      }

      groups.set(groupKey, {
        tenantId: location.tenantId,
        vaultId: location.vaultId,
        fileIds: [location.fileId],
      });
    }

    for (const group of groups.values()) {
      const deleted = await this.storageClient.deleteFiles(
        group.tenantId,
        group.vaultId,
        group.fileIds,
      );
      if (!deleted) {
        throw new Error(
          `Failed to delete source storage objects for ${group.tenantId}/${group.vaultId}`,
        );
      }
    }
  }

  createUploadSession(
    apiKeyId: string,
    revisionId: string,
    params?: {
      contentType?: string | null;
      filename?: string | null;
    },
  ): {
    blobR2Key: string;
    uploadUrl: string;
    expiresAt: number;
    headers: Record<string, string>;
  } {
    const location = this.buildLocation(
      apiKeyId,
      SOURCE_BLOB_TEXT_VAULT,
      revisionId,
    );
    const [session] = this.storageClient.getBatchUrls(
      location.tenantId,
      location.vaultId,
      [
        {
          fileId: location.fileId,
          action: 'upload',
          contentType: params?.contentType ?? 'application/octet-stream',
          filename: params?.filename ?? undefined,
        },
      ],
    ).urls;

    if (!session) {
      throw new Error('Failed to create source upload session');
    }

    return {
      blobR2Key: location.key,
      uploadUrl: session.url,
      expiresAt: session.expiresAt,
      headers: {
        'content-type': params?.contentType ?? 'application/octet-stream',
      },
    };
  }

  private buildLocation(apiKeyId: string, vaultId: string, fileId: string) {
    const tenantId = `src${createHash('sha256').update(apiKeyId).digest('hex').slice(0, 24)}`;
    return {
      tenantId,
      vaultId,
      fileId,
      key: `${tenantId}/${vaultId}/${fileId}`,
    };
  }

  private parseKey(r2Key: string) {
    const [tenantId, vaultId, ...rest] = r2Key.split('/');
    if (!tenantId || !vaultId || rest.length === 0) {
      throw new Error(`Invalid source R2 key: ${r2Key}`);
    }

    return {
      tenantId,
      vaultId,
      fileId: rest.join('/'),
    };
  }
}
