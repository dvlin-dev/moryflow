/**
 * LicenseService 单元测试
 *
 * 测试 License 的验证、激活、停用、撤销等业务逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseService } from './license.service';
import { PrismaService } from '../prisma';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import {
  createMockLicense,
  createMockLicenseActivation,
  LicenseStatus,
  LicenseActivationStatus,
} from '../testing/factories';

describe('LicenseService', () => {
  let service: LicenseService;
  let prismaMock: MockPrismaService;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<LicenseService>(LicenseService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== validateLicense ====================

  describe('validateLicense', () => {
    it('有效的 License 应返回 valid: true', async () => {
      const license = createMockLicense({
        status: LicenseStatus.active,
        activationCount: 1,
        activationLimit: 2,
      });
      prismaMock.license.findUnique.mockResolvedValue(license);

      const result = await service.validateLicense(license.licenseKey);

      expect(result.valid).toBe(true);
      expect(result.status).toBe('active');
    });

    it('不存在的 License 应返回 status: not_found', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      const result = await service.validateLicense('INVALID-KEY');

      expect(result.valid).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('已撤销的 License 应返回 status: revoked', async () => {
      const license = createMockLicense({ status: LicenseStatus.revoked });
      prismaMock.license.findUnique.mockResolvedValue(license);

      const result = await service.validateLicense(license.licenseKey);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('revoked');
    });

    // 注意：当前 validateLicense 实现不检查 expired 状态，只检查 revoked
  });

  // ==================== activateLicense ====================

  describe('activateLicense', () => {
    it('新设备激活应成功', async () => {
      const license = createMockLicense({
        status: LicenseStatus.active,
        activationCount: 0,
        activationLimit: 2,
      });
      prismaMock.license.findUnique.mockResolvedValue(license);
      prismaMock.licenseActivation.findFirst.mockResolvedValue(null);

      const activation = createMockLicenseActivation({
        licenseId: license.id,
        instanceName: 'My MacBook',
      });
      prismaMock.licenseActivation.create.mockResolvedValue(activation);
      prismaMock.license.update.mockResolvedValue({
        ...license,
        activationCount: 1,
      });

      const result = await service.activateLicense({
        licenseKey: license.licenseKey,
        instanceName: 'My MacBook',
      });

      expect(result.valid).toBe(true);
      expect(result.status).toBe('active');
      expect(result.instanceId).toBeDefined();
      expect(prismaMock.licenseActivation.create).toHaveBeenCalled();
    });

    it('达到激活限制时应返回 limit_exceeded', async () => {
      const license = createMockLicense({
        status: LicenseStatus.active,
        activationCount: 2,
        activationLimit: 2,
      });
      prismaMock.license.findUnique.mockResolvedValue(license);
      prismaMock.licenseActivation.findFirst.mockResolvedValue(null);

      const result = await service.activateLicense({
        licenseKey: license.licenseKey,
        instanceName: 'New Device',
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe('limit_exceeded');
    });

    it('已停用的设备重新激活应成功', async () => {
      const license = createMockLicense({
        status: LicenseStatus.active,
        activationCount: 1,
        activationLimit: 2,
      });
      prismaMock.license.findUnique.mockResolvedValue(license);

      const existingActivation = createMockLicenseActivation({
        licenseId: license.id,
        instanceName: 'My MacBook',
        status: LicenseActivationStatus.deactivated,
        deactivatedAt: new Date(),
      });
      prismaMock.licenseActivation.findFirst.mockResolvedValue(
        existingActivation,
      );
      prismaMock.licenseActivation.update.mockResolvedValue({
        ...existingActivation,
        status: LicenseActivationStatus.active,
        deactivatedAt: null,
      });
      prismaMock.license.update.mockResolvedValue({
        ...license,
        activationCount: 2,
      });

      const result = await service.activateLicense({
        licenseKey: license.licenseKey,
        instanceName: 'My MacBook',
      });

      expect(result.valid).toBe(true);
      expect(result.instanceId).toBe(existingActivation.instanceId);
    });

    it('不存在的 License 应返回 not_found', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      const result = await service.activateLicense({
        licenseKey: 'INVALID-KEY',
        instanceName: 'My Device',
      });

      expect(result.valid).toBe(false);
      expect(result.status).toBe('not_found');
    });
  });

  // ==================== deactivateLicense ====================

  describe('deactivateLicense', () => {
    it('停用激活的设备应成功', async () => {
      const license = createMockLicense({ activationCount: 1 });
      const activation = createMockLicenseActivation({
        licenseId: license.id,
        status: LicenseActivationStatus.active,
      });

      prismaMock.license.findUnique.mockResolvedValue(license);
      prismaMock.licenseActivation.findFirst.mockResolvedValue(activation);
      prismaMock.licenseActivation.update.mockResolvedValue({
        ...activation,
        status: LicenseActivationStatus.deactivated,
        deactivatedAt: new Date(),
      });
      prismaMock.license.update.mockResolvedValue({
        ...license,
        activationCount: 0,
      });

      const result = await service.deactivateLicense(
        license.licenseKey,
        activation.instanceId,
      );

      expect(result).toBe(true);
      expect(prismaMock.licenseActivation.update).toHaveBeenCalled();
    });

    it('不存在的激活记录应返回 false', async () => {
      const license = createMockLicense();
      prismaMock.license.findUnique.mockResolvedValue(license);
      prismaMock.licenseActivation.findFirst.mockResolvedValue(null);

      const result = await service.deactivateLicense(
        license.licenseKey,
        'non-existent-instance',
      );

      expect(result).toBe(false);
    });

    it('不存在的 License 应返回 false', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      const result = await service.deactivateLicense(
        'INVALID-KEY',
        'any-instance',
      );

      expect(result).toBe(false);
    });
  });

  // ==================== revokeLicense ====================

  describe('revokeLicense', () => {
    it('撤销 License 应同时停用所有激活', async () => {
      const license = createMockLicense({ status: LicenseStatus.active });
      prismaMock.license.findUnique.mockResolvedValue(license);
      prismaMock.license.update.mockResolvedValue({
        ...license,
        status: LicenseStatus.revoked,
      });
      prismaMock.licenseActivation.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.revokeLicense(license.id);

      expect(result).toBe(true);
      expect(prismaMock.licenseActivation.updateMany).toHaveBeenCalled();
    });

    it('不存在的 License 应返回 false', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);

      const result = await service.revokeLicense('non-existent-id');

      expect(result).toBe(false);
    });
  });

  // ==================== getUserLicenses ====================

  describe('getUserLicenses', () => {
    it('应返回用户所有 License 及激活信息', async () => {
      const userId = 'user-123';
      const activation1 = createMockLicenseActivation();
      const activation2 = createMockLicenseActivation();
      const licenses = [
        { ...createMockLicense({ userId }), activations: [activation1] },
        { ...createMockLicense({ userId }), activations: [activation2] },
      ];
      prismaMock.license.findMany.mockResolvedValue(
        licenses as Parameters<
          typeof prismaMock.license.findMany.mockResolvedValue
        >[0],
      );

      const result = await service.getUserLicenses(userId);

      expect(result).toHaveLength(2);
    });

    it('无 License 时应返回空数组', async () => {
      prismaMock.license.findMany.mockResolvedValue([]);

      const result = await service.getUserLicenses('user-without-license');

      expect(result).toEqual([]);
    });
  });

  // ==================== listLicenses ====================

  describe('listLicenses', () => {
    it('应返回分页结果和总数', async () => {
      const activation = createMockLicenseActivation();
      const licenses = [
        { ...createMockLicense(), activations: [activation] },
        { ...createMockLicense(), activations: [] },
      ];

      prismaMock.$transaction.mockResolvedValue([licenses, 10] as const);

      const result = await service.listLicenses({
        status: LicenseStatus.active,
        limit: 10,
        offset: 0,
      });

      expect(result.licenses).toHaveLength(2);
      expect(result.pagination.count).toBe(10);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
    });
  });

  // ==================== createLicense ====================

  describe('createLicense', () => {
    it('应创建新的 License 并返回详情', async () => {
      const license = createMockLicense({
        userId: 'user-123',
        licenseKey: 'NEW-LICENSE-KEY',
        tier: 'pro',
      });
      prismaMock.license.create.mockResolvedValue({
        ...license,
        activations: [],
      });

      const result = await service.createLicense({
        userId: 'user-123',
        licenseKey: 'NEW-LICENSE-KEY',
        orderId: 'order-123',
        tier: 'pro',
        activationLimit: 3,
      });

      expect(result.licenseKey).toBe('NEW-LICENSE-KEY');
      expect(prismaMock.license.create).toHaveBeenCalled();
    });
  });
});
