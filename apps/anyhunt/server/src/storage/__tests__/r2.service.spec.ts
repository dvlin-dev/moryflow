/**
 * R2Service 单元测试
 *
 * 测试 R2 存储服务的核心功能：
 * - 配置检查
 * - URL 生成
 * - 错误类型
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { R2Service, StorageException, StorageErrorCode } from '../r2.service';

describe('R2Service', () => {
  let mockConfig: Record<string, string>;

  beforeEach(() => {
    mockConfig = {
      R2_ACCOUNT_ID: 'test-account-id',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://cdn.example.com',
    };
  });

  function createService(configOverrides: Record<string, string> = {}) {
    const config = { ...mockConfig, ...configOverrides };
    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        return config[key] ?? defaultValue ?? '';
      }),
    };
    return new R2Service(mockConfigService as unknown as ConfigService);
  }

  describe('isConfigured', () => {
    it('should return true when all required config is present', () => {
      const service = createService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when account ID is missing', () => {
      const service = createService({ R2_ACCOUNT_ID: '' });
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when access key is missing', () => {
      const service = createService({ R2_ACCESS_KEY_ID: '' });
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when secret key is missing', () => {
      const service = createService({ R2_SECRET_ACCESS_KEY: '' });
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when all config is missing', () => {
      const service = createService({
        R2_ACCOUNT_ID: '',
        R2_ACCESS_KEY_ID: '',
        R2_SECRET_ACCESS_KEY: '',
      });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('getPublicUrl', () => {
    it('should generate correct public URL', () => {
      const service = createService();
      const url = service.getPublicUrl('user-1', 'vault-1', 'file-1');

      expect(url).toBe('https://cdn.example.com/user-1/vault-1/file-1');
    });

    it('should handle special characters in IDs', () => {
      const service = createService();
      const url = service.getPublicUrl('user-abc', 'vault-xyz', 'file-123.jpg');

      expect(url).toBe(
        'https://cdn.example.com/user-abc/vault-xyz/file-123.jpg',
      );
    });
  });

  describe('StorageException', () => {
    it('should create exception with correct properties', () => {
      const error = new StorageException(
        'Test error',
        StorageErrorCode.FILE_NOT_FOUND,
        new Error('Cause'),
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(StorageErrorCode.FILE_NOT_FOUND);
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.name).toBe('StorageException');
    });

    it('should support all error codes', () => {
      expect(StorageErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(StorageErrorCode.SERVICE_ERROR).toBe('SERVICE_ERROR');
      expect(StorageErrorCode.NOT_CONFIGURED).toBe('NOT_CONFIGURED');
      expect(StorageErrorCode.UPLOAD_FAILED).toBe('UPLOAD_FAILED');
      expect(StorageErrorCode.DOWNLOAD_FAILED).toBe('DOWNLOAD_FAILED');
    });
  });

  describe('client initialization', () => {
    it('should throw StorageException when trying to use unconfigured service', async () => {
      const service = createService({
        R2_ACCOUNT_ID: '',
        R2_ACCESS_KEY_ID: '',
        R2_SECRET_ACCESS_KEY: '',
      });

      // isConfigured 应该返回 false
      expect(service.isConfigured()).toBe(false);

      // uploadFile 应该抛出 StorageException
      await expect(
        service.uploadFile('user-1', 'vault-1', 'file-1', Buffer.from('test')),
      ).rejects.toThrow(StorageException);
    });
  });
});
