/**
 * Admin Module E2E Tests
 * 测试管理功能端点
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Note: supertest response.body is typed as 'any', these rules are disabled for e2e tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

describe('Admin Controller (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 测试用户数据
  const testAdminId = 'test-admin-e2e';
  const testUserId = 'test-user-admin-e2e';
  let adminSession: { token: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // 清理测试数据
    await prisma.adminLog.deleteMany({
      where: {
        OR: [{ operatorId: testAdminId }, { targetUserId: testUserId }],
      },
    });
    await prisma.session.deleteMany({
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
        tier: 'pro',
        isAdmin: true,
      },
    });

    // 创建普通用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'user-admin-test@example.com',
        name: 'Regular Test User',
        tier: 'free',
        isAdmin: false,
      },
    });

    // 创建管理员 session
    const session = await prisma.session.create({
      data: {
        userId: testAdminId,
        token: `admin-test-token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    adminSession = { token: session.token };
  });

  afterAll(async () => {
    // 清理
    await prisma.adminLog.deleteMany({
      where: {
        OR: [{ operatorId: testAdminId }, { targetUserId: testUserId }],
      },
    });
    await prisma.session.deleteMany({
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
        .set('Authorization', `Bearer ${adminSession.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('应该支持分页', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .query({ limit: 5, offset: 0 })
        .set('Authorization', `Bearer ${adminSession.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('应该返回用户详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminSession.token}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUserId);
    });
  });

  describe('PUT /api/admin/users/:id/tier', () => {
    it('应该更新用户等级', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${testUserId}/tier`)
        .set('Authorization', `Bearer ${adminSession.token}`)
        .send({ tier: 'basic' })
        .expect(200);

      expect(response.body.tier).toBe('basic');
    });
  });

  describe('POST /api/admin/users/:id/credits', () => {
    it('应该发放积分', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/admin/users/${testUserId}/credits`)
        .set('Authorization', `Bearer ${adminSession.token}`)
        .send({ type: 'purchased', amount: 100 })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/logs', () => {
    it('应该返回操作日志', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminSession.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
