/**
 * Profile Persistence Service
 *
 * [INPUT]: 会话存储数据
 * [OUTPUT]: Profile 持久化结果
 * [POS]: 将会话存储持久化到 R2，用于跨会话复用登录态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { BrowserContext, Page } from 'playwright';
import { R2Service } from '../../storage/r2.service';
import { StoragePersistenceService } from './storage.service';
import { ImportStorageSchema } from '../dto';
import type { SaveProfileInput, LoadProfileInput } from '../dto';

const PROFILE_VAULT = 'browser-profiles';

export class ProfilePersistenceNotConfiguredError extends Error {
  constructor() {
    super('Storage not configured for profile persistence');
    this.name = 'ProfilePersistenceNotConfiguredError';
  }
}

@Injectable()
export class ProfilePersistenceService {
  private readonly logger = new Logger(ProfilePersistenceService.name);

  constructor(
    private readonly storagePersistence: StoragePersistenceService,
    private readonly r2Service: R2Service,
  ) {}

  async saveProfile(
    userId: string,
    context: BrowserContext,
    page: Page,
    input: SaveProfileInput,
  ): Promise<{ profileId: string; storedAt: string; size: number }> {
    if (!this.r2Service.isConfigured()) {
      throw new ProfilePersistenceNotConfiguredError();
    }

    const profileId = input.profileId ?? randomUUID();
    const exportResult = await this.storagePersistence.exportStorage(
      context,
      page,
      {
        include: {
          cookies: true,
          localStorage: true,
          sessionStorage: input.includeSessionStorage ?? false,
        },
      },
    );

    const payload = Buffer.from(JSON.stringify(exportResult), 'utf8');

    await this.r2Service.uploadFile(
      userId,
      PROFILE_VAULT,
      profileId,
      payload,
      'application/json',
      { filename: `profile-${profileId}.json` },
    );

    this.logger.debug(`Saved profile ${profileId} for user ${userId}`);

    return {
      profileId,
      storedAt: new Date().toISOString(),
      size: payload.length,
    };
  }

  async loadProfile(
    userId: string,
    context: BrowserContext,
    page: Page,
    input: LoadProfileInput,
  ): Promise<{
    imported: { cookies: number; localStorage: number; sessionStorage: number };
  }> {
    if (!this.r2Service.isConfigured()) {
      throw new ProfilePersistenceNotConfiguredError();
    }

    const payload = await this.r2Service.downloadFile(
      userId,
      PROFILE_VAULT,
      input.profileId,
    );

    const data = JSON.parse(payload.toString('utf8')) as unknown;
    const parsed = ImportStorageSchema.parse(data);

    return this.storagePersistence.importStorage(context, page, parsed);
  }
}
