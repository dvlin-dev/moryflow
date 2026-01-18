/**
 * UserService 单元测试
 *
 * 测试用户服务的核心功能：
 * - 获取用户资料
 * - 更新用户资料
 * - 修改密码
 * - 删除账户
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user.service';

// Mock better-auth/crypto
vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { hashPassword, verifyPassword } from 'better-auth/crypto';

// Mock 类型定义
type MockPrismaService = {
  user: {
    findUnique: Mock;
    update: Mock;
  };
  account: {
    findFirst: Mock;
    update: Mock;
  };
  accountDeletionRecord: {
    create: Mock;
  };
  session: {
    deleteMany: Mock;
  };
  $transaction: Mock;
};

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: MockPrismaService;
  let mockQuotaService: {
    ensureExists: Mock;
    getStatus: Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
    createdAt: new Date('2024-01-01'),
    deletedAt: null,
    subscription: {
      tier: 'PRO',
    },
    quota: {
      monthlyLimit: 1000,
      monthlyUsed: 500,
      purchasedQuota: 0,
      periodEndAt: new Date('2024-02-01'),
    },
  };

  const mockAccount = {
    id: 'account-1',
    userId: 'user-1',
    providerId: 'credential',
    password: 'hashed-password',
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      account: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      accountDeletionRecord: {
        create: vi.fn(),
      },
      session: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockQuotaService = {
      ensureExists: vi.fn(),
      getStatus: vi.fn(),
    };

    mockQuotaService.getStatus.mockResolvedValue({
      daily: {
        limit: 0,
        used: 0,
        remaining: 0,
        resetsAt: new Date('2024-01-01T00:00:00Z'),
      },
      monthly: { limit: 1000, used: 500, remaining: 500 },
      purchased: 0,
      totalRemaining: 500,
      periodStartsAt: new Date('2024-01-01T00:00:00Z'),
      periodEndsAt: new Date('2024-02-01T00:00:00Z'),
    });

    service = new UserService(mockPrisma as any, mockQuotaService as any);

    // Reset mocks
    vi.mocked(hashPassword).mockReset();
    vi.mocked(verifyPassword).mockReset();
  });

  describe('getUserProfile', () => {
    it('should return formatted user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserProfile('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { subscription: true, quota: true },
      });
      expect(result).toMatchObject({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'PRO',
        isAdmin: false,
        quota: {
          dailyLimit: 0,
          dailyUsed: 0,
          dailyRemaining: 0,
          monthlyLimit: 1000,
          monthlyUsed: 500,
          monthlyRemaining: 500,
          purchasedQuota: 0,
        },
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return FREE tier when no subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        subscription: null,
      });

      const result = await service.getUserProfile('user-1');

      expect(result.tier).toBe('FREE');
    });

    it('should ensure quota exists even when quota record is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        quota: null,
      });

      const result = await service.getUserProfile('user-1');

      expect(mockQuotaService.ensureExists).toHaveBeenCalled();
      expect(result.quota).not.toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      });

      const result = await service.updateProfile('user-1', {
        name: 'New Name',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
        include: { subscription: true, quota: true },
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(hashPassword).mockResolvedValue('new-hashed-password');
      mockPrisma.account.update.mockResolvedValue({});

      await service.changePassword('user-1', {
        currentPassword: 'current-pass',
        newPassword: 'new-pass',
      });

      expect(verifyPassword).toHaveBeenCalledWith({
        password: 'current-pass',
        hash: 'hashed-password',
      });
      expect(hashPassword).toHaveBeenCalledWith('new-pass');
      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        data: { password: 'new-hashed-password' },
      });
    });

    it('should throw BadRequestException when no credential account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'current-pass',
          newPassword: 'new-pass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-pass',
          newPassword: 'new-pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account when confirmation matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const txMock = {
          accountDeletionRecord: { create: vi.fn() },
          user: { update: vi.fn() },
          session: { deleteMany: vi.fn() },
        };
        await fn(txMock);
      });

      await service.deleteAccount('user-1', {
        confirmation: 'test@example.com',
        reason: 'found_alternative',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAccount('user-1', {
          confirmation: 'test@example.com',
          reason: 'found_alternative',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(
        service.deleteAccount('user-1', {
          confirmation: 'test@example.com',
          reason: 'found_alternative',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when confirmation does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.deleteAccount('user-1', {
          confirmation: 'wrong@example.com',
          reason: 'found_alternative',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record deletion reason and feedback', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        capturedTx = {
          accountDeletionRecord: { create: vi.fn() },
          user: { update: vi.fn() },
          session: { deleteMany: vi.fn() },
        };
        await fn(capturedTx);
      });

      await service.deleteAccount('user-1', {
        confirmation: 'test@example.com',
        reason: 'other',
        feedback: 'Too many emails',
      });

      expect(capturedTx.accountDeletionRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          email: 'test@example.com',
          reason: 'other',
          feedback: 'Too many emails',
        },
      });
    });
  });
});
