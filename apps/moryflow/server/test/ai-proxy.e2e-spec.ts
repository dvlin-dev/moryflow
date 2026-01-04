/**
 * AI Proxy Module E2E Tests
 * 测试 AI 代理功能
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

describe('AI Proxy Controller (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUserId = 'test-user-ai-proxy-e2e';
  let userSession: { token: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // 清理并创建测试用户
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.subscriptionCredits.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.purchasedCredits.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'ai-proxy-test@example.com',
        name: 'AI Proxy Test User',
        tier: 'pro',
        isAdmin: false,
      },
    });

    // 创建 session
    const session = await prisma.session.create({
      data: {
        userId: testUserId,
        token: `ai-proxy-test-token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    userSession = { token: session.token };

    // 授予积分
    await prisma.purchasedCredits.create({
      data: {
        userId: testUserId,
        amount: 100,
        remaining: 100,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.subscriptionCredits.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.purchasedCredits.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await app.close();
  });

  describe('GET /v1/models', () => {
    it('未认证时应该返回 401', async () => {
      await request(app.getHttpServer()).get('/v1/models').expect(401);
    });

    it('应该返回可用模型列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/models')
        .set('Authorization', `Bearer ${userSession.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('object', 'list');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /v1/chat/completions', () => {
    it('未认证时应该返回 401', async () => {
      await request(app.getHttpServer())
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(401);
    });

    it('缺少必需参数时应该返回 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${userSession.token}`)
        .send({})
        .expect(400);

      // 错误响应可能有不同格式
      expect(response.body).toHaveProperty('error');
    });
  });
});
