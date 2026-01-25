/**
 * Admin Module E2E Tests
 * 测试管理功能端点
 */

// Note: supertest response.body is typed as 'any', these rules are disabled for e2e tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthTokensService } from '../src/auth/auth.tokens.service';
import { PrismaService } from '../src/prisma';

describe('Admin Controller (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokensService: AuthTokensService;

  // 测试用户数据
  const testAdminId = 'test-admin-e2e';
  const testUserId = 'test-user-admin-e2e';
  let adminAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    tokensService = app.get(AuthTokensService);

    // 清理测试数据
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          { userId: testAdminId },
          { userId: testUserId },
          { targetUserId: testAdminId },
          { targetUserId: testUserId },
        ],
      },
    });
    await prisma.subscription.deleteMany({
      where: { userId: { in: [testAdminId, testUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testAdminId, testUserId] } },
    });

    // 创建管理员用户
    await prisma.user.create({
      data: {
        id: testAdminId,
        email: 'admin-test@example.com',
        name: 'Admin Test User',
        isAdmin: true,
      },
    });

    // 创建普通用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'user-admin-test@example.com',
        name: 'Regular Test User',
        isAdmin: false,
      },
    });

    const access = await tokensService.createAccessToken(testAdminId);
    adminAccessToken = access.token;
  });

  afterAll(async () => {
    // 清理
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          { userId: testAdminId },
          { userId: testUserId },
          { targetUserId: testAdminId },
          { targetUserId: testUserId },
        ],
      },
    });
    await prisma.subscription.deleteMany({
      where: { userId: { in: [testAdminId, testUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testAdminId, testUserId] } },
    });
    await app.close();
  });

  describe('GET /api/admin/users', () => {
    it('应该返回用户列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('应该支持分页', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .query({ limit: 5, offset: 0 })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('应该返回用户详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUserId);
    });
  });

  describe('PUT /api/admin/users/:id/tier', () => {
    it('应该更新用户等级', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${testUserId}/tier`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ tier: 'basic' })
        .expect(200);

      expect(response.body.subscriptionTier).toBe('basic');
    });
  });

  describe('POST /api/admin/users/:id/credits', () => {
    it('应该发放积分', async () => {
      await request(app.getHttpServer())
        .post(`/api/admin/users/${testUserId}/credits`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ type: 'purchased', amount: 100 })
        .expect(204);
    });
  });

  describe('GET /api/admin/logs', () => {
    it('应该返回操作日志', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.logs)).toBe(true);
    });
  });
});
