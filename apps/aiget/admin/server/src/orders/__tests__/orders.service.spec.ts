/**
 * OrdersService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';
import { testOrders, testUsers } from '../../../test/fixtures/seed';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('listOrders', () => {
    it('should return paginated order list', async () => {
      const orders = [testOrders.successOrder, testOrders.pendingOrder];
      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.order.count.mockResolvedValue(2);

      const result = await service.listOrders({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([testOrders.successOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      await service.listOrders({ page: 1, limit: 20, status: 'PAID' });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PAID',
          }),
        })
      );
    });

    it('should filter by type', async () => {
      mockPrisma.order.findMany.mockResolvedValue([testOrders.successOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      await service.listOrders({ page: 1, limit: 20, type: 'SUBSCRIPTION' });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'SUBSCRIPTION',
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.order.findMany.mockResolvedValue([testOrders.successOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      await service.listOrders({ page: 1, limit: 20, userId: testUsers.proUser.id });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUsers.proUser.id,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(75);

      const result = await service.listOrders({ page: 4, limit: 20 });

      expect(result.totalPages).toBe(4);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 60,
          take: 20,
        })
      );
    });

    it('should convert dates to ISO strings', async () => {
      const order = { ...testOrders.successOrder };
      mockPrisma.order.findMany.mockResolvedValue([order]);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.listOrders({ page: 1, limit: 20 });

      expect(typeof result.items[0].createdAt).toBe('string');
      expect(typeof result.items[0].updatedAt).toBe('string');
    });
  });

  describe('getOrderById', () => {
    it('should return order with user and subscription', async () => {
      const order = {
        ...testOrders.successOrder,
        subscription: null,
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await service.getOrderById(order.id);

      expect(result.id).toBe(order.id);
      expect(result.user).toBeDefined();
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: order.id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          subscription: true,
        },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
