/**
 * ProfilePersistenceService 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import {
  ProfilePersistenceService,
  ProfilePersistenceNotConfiguredError,
} from '../persistence/profile.service';

describe('ProfilePersistenceService', () => {
  it('throws when storage is not configured', async () => {
    const service = new ProfilePersistenceService(
      {
        exportStorage: vi.fn(),
        importStorage: vi.fn(),
      } as any,
      { isConfigured: () => false } as any,
    );

    await expect(
      service.saveProfile('user', {} as BrowserContext, {} as Page, {
        includeSessionStorage: false,
      }),
    ).rejects.toBeInstanceOf(ProfilePersistenceNotConfiguredError);
  });

  it('saves and loads profile via R2', async () => {
    const storagePersistence = {
      exportStorage: vi.fn().mockResolvedValue({
        cookies: [],
        localStorage: {},
        exportedAt: new Date().toISOString(),
      }),
      importStorage: vi.fn().mockResolvedValue({
        imported: { cookies: 1, localStorage: 1, sessionStorage: 0 },
      }),
    };

    const profilePayload = {
      cookies: [
        {
          name: 'a',
          value: 'b',
          domain: 'example.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      localStorage: { 'https://example.com': { a: '1' } },
    };

    const r2Service = {
      isConfigured: () => true,
      uploadFile: vi.fn().mockResolvedValue(undefined),
      downloadFile: vi
        .fn()
        .mockResolvedValue(Buffer.from(JSON.stringify(profilePayload))),
    };

    const service = new ProfilePersistenceService(
      storagePersistence as any,
      r2Service as any,
    );

    const saveResult = await service.saveProfile(
      'user-1',
      {} as BrowserContext,
      {} as Page,
      { profileId: 'profile-1', includeSessionStorage: true },
    );

    expect(saveResult.profileId).toBe('profile-1');
    expect(r2Service.uploadFile).toHaveBeenCalled();

    const loadResult = await service.loadProfile(
      'user-1',
      {} as BrowserContext,
      {} as Page,
      { profileId: 'profile-1' },
    );

    expect(loadResult.imported.cookies).toBe(1);
    expect(storagePersistence.importStorage).toHaveBeenCalled();
  });
});
