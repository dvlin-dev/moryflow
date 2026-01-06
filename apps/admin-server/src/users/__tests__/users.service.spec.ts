/**
 * UsersService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';
import { testUsers } from '../../../test/fixtures/seed';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      const users = [testUsers.normalUser, testUsers.proUser];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter by search query', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUsers.normalUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      await service.listUsers({ page: 1, limit: 20, search: 'user@' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'user@', mode: 'insensitive' } },
              { name: { contains: 'user@', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should filter by tier', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUsers.proUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      await service.listUsers({ page: 1, limit: 20, tier: 'PRO' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tier: 'PRO',
          }),
        })
      );
    });

    it('should filter by isAdmin', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUsers.admin]);
      mockPrisma.user.count.mockResolvedValue(1);

      await service.listUsers({ page: 1, limit: 20, isAdmin: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isAdmin: true,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(45);

      const result = await service.listUsers({ page: 2, limit: 20 });

      expect(result.totalPages).toBe(3);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });
  });

  describe('getUserById', () => {
    it('should return user detail', async () => {
      const userWithRelations = {
        ...testUsers.normalUser,
        profile: null,
        _count: {
          sessions: 2,
          subscriptions: 1,
          orders: 3,
          credits: 10,
        },
      };
      mockPrisma.user.findUnique.mockResolvedValue(userWithRelations);

      const result = await service.getUserById(testUsers.normalUser.id);

      expect(result.id).toBe(testUsers.normalUser.id);
      expect(result.email).toBe(testUsers.normalUser.email);
      expect(result._count.sessions).toBe(2);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUsers.normalUser.id },
        include: {
          profile: true,
          _count: {
            select: {
              sessions: true,
              subscriptions: true,
              orders: true,
              credits: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should include profile if exists', async () => {
      const userWithProfile = {
        ...testUsers.normalUser,
        profile: {
          nickname: 'TestNick',
          avatar: 'https://example.com/avatar.jpg',
          locale: 'en-US',
          timezone: 'America/New_York',
        },
        _count: { sessions: 0, subscriptions: 0, orders: 0, credits: 0 },
      };
      mockPrisma.user.findUnique.mockResolvedValue(userWithProfile);

      const result = await service.getUserById(testUsers.normalUser.id);

      expect(result.profile).toEqual({
        nickname: 'TestNick',
        avatar: 'https://example.com/avatar.jpg',
        locale: 'en-US',
        timezone: 'America/New_York',
      });
    });
  });

  describe('setTier', () => {
    const adminUser = {
      id: testUsers.admin.id,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      emailVerified: testUsers.admin.emailVerified,
      tier: testUsers.admin.tier as 'FREE' | 'STARTER' | 'PRO' | 'MAX',
      creditBalance: testUsers.admin.creditBalance,
      isAdmin: true,
    };

    it('should update user tier', async () => {
      const user = { ...testUsers.normalUser };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user) // 第一次查询
        .mockResolvedValueOnce({
          // getUserById 查询
          ...user,
          tier: 'PRO',
          profile: null,
          _count: { sessions: 0, subscriptions: 0, orders: 0, credits: 0 },
        });
      mockPrisma.user.update.mockResolvedValue({ ...user, tier: 'PRO' });
      mockPrisma.adminLog.create.mockResolvedValue({});

      const result = await service.setTier(user.id, { tier: 'PRO', reason: 'Upgrade' }, adminUser);

      expect(result.tier).toBe('PRO');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { tier: 'PRO' },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SET_TIER',
          level: 'INFO',
          details: expect.objectContaining({
            oldTier: 'FREE',
            newTier: 'PRO',
          }),
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setTier('non-existent', { tier: 'PRO', reason: 'Test' }, adminUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('grantCredits', () => {
    const adminUser = {
      id: testUsers.admin.id,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      emailVerified: testUsers.admin.emailVerified,
      tier: testUsers.admin.tier as 'FREE' | 'STARTER' | 'PRO' | 'MAX',
      creditBalance: testUsers.admin.creditBalance,
      isAdmin: true,
    };

    it('should add credits to user balance', async () => {
      const user = { ...testUsers.normalUser, creditBalance: 100 };
      mockPrisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce({
        ...user,
        creditBalance: 600,
        profile: null,
        _count: { sessions: 0, subscriptions: 0, orders: 0, credits: 0 },
      });
      mockPrisma.user.update.mockResolvedValue({ ...user, creditBalance: 600 });
      mockPrisma.creditTransaction.create.mockResolvedValue({});
      mockPrisma.adminLog.create.mockResolvedValue({});

      const result = await service.grantCredits(
        user.id,
        { amount: 500, reason: 'Compensation' },
        adminUser
      );

      expect(result.creditBalance).toBe(600);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { creditBalance: 600 },
      });
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          type: 'BONUS',
          amount: 500,
          balance: 600,
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.grantCredits('non-existent', { amount: 100, reason: 'Test' }, adminUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    const adminUser = {
      id: testUsers.admin.id,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      emailVerified: testUsers.admin.emailVerified,
      tier: testUsers.admin.tier as 'FREE' | 'STARTER' | 'PRO' | 'MAX',
      creditBalance: testUsers.admin.creditBalance,
      isAdmin: true,
    };

    it('should soft delete user and remove sessions', async () => {
      const user = { ...testUsers.normalUser };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, deletedAt: new Date() });
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.adminLog.create.mockResolvedValue({});

      await service.deleteUser(user.id, adminUser);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE_USER',
          level: 'WARN',
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('non-existent', adminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('restoreUser', () => {
    const adminUser = {
      id: testUsers.admin.id,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      emailVerified: testUsers.admin.emailVerified,
      tier: testUsers.admin.tier as 'FREE' | 'STARTER' | 'PRO' | 'MAX',
      creditBalance: testUsers.admin.creditBalance,
      isAdmin: true,
    };

    it('should restore soft-deleted user', async () => {
      const deletedUser = { ...testUsers.normalUser, deletedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValueOnce(deletedUser).mockResolvedValueOnce({
        ...deletedUser,
        deletedAt: null,
        profile: null,
        _count: { sessions: 0, subscriptions: 0, orders: 0, credits: 0 },
      });
      mockPrisma.user.update.mockResolvedValue({ ...deletedUser, deletedAt: null });
      mockPrisma.adminLog.create.mockResolvedValue({});

      const result = await service.restoreUser(deletedUser.id, adminUser);

      expect(result.deletedAt).toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: deletedUser.id },
        data: { deletedAt: null },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'RESTORE_USER',
          level: 'INFO',
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.restoreUser('non-existent', adminUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
