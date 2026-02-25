/**
 * License Module E2E Tests
 * 测试 License 模块的完整业务流程
 */

// Note: supertest response.body is typed as 'any', these rules are disabled for e2e tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma';

describe('License Controller (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 测试数据
  const testUserId = 'test-user-license-e2e';
  const testLicenseKey = 'TEST-E2E-LICENSE-KEY';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/(.*)'],
    });
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    prisma = app.get(PrismaService);

    // 清理测试数据
    await prisma.licenseActivation.deleteMany({
      where: { license: { licenseKey: testLicenseKey } },
    });
    await prisma.license.deleteMany({
      where: { licenseKey: testLicenseKey },
    });

    // 创建测试用户
    await prisma.user.upsert({
      where: { id: testUserId },
      create: {
        id: testUserId,
        email: 'license-test@example.com',
        name: 'License Test User',
      },
      update: {},
    });

    // 创建测试 License
    await prisma.license.create({
      data: {
        userId: testUserId,
        licenseKey: testLicenseKey,
        orderId: 'test-order-e2e',
        tier: 'standard',
        status: 'active',
        activationLimit: 2,
      },
    });
  });

  afterAll(async () => {
    // 清理
    await prisma.licenseActivation.deleteMany({
      where: { license: { licenseKey: testLicenseKey } },
    });
    await prisma.license.deleteMany({
      where: { licenseKey: testLicenseKey },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await app.close();
  });

  describe('POST /api/v1/license/validate', () => {
    it('应该验证有效的 License', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/license/validate')
        .send({ licenseKey: testLicenseKey })
        .expect(201);

      expect(response.body.valid).toBe(true);
      expect(response.body.status).toBe('active');
      // 注意：validateLicense 返回的是 LicenseValidationResultDto，不包含 tier
    });

    it('应该返回 not_found 对于无效的 License Key', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/license/validate')
        .send({ licenseKey: 'INVALID-LICENSE-KEY' })
        .expect(201);

      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe('not_found');
    });
  });

  describe('POST /api/v1/license/activate', () => {
    it('应该激活 License', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/license/activate')
        .send({
          licenseKey: testLicenseKey,
          instanceName: 'E2E Test Device',
        })
        .expect(201);

      expect(response.body.valid).toBe(true);
      expect(response.body.status).toBe('active');
      expect(response.body.instanceId).toBeDefined();
    });

    it('达到激活限制时应该返回 limit_exceeded', async () => {
      // 激活第二个设备
      await request(app.getHttpServer()).post('/api/v1/license/activate').send({
        licenseKey: testLicenseKey,
        instanceName: 'E2E Test Device 2',
      });

      // 尝试激活第三个设备
      const response = await request(app.getHttpServer())
        .post('/api/v1/license/activate')
        .send({
          licenseKey: testLicenseKey,
          instanceName: 'E2E Test Device 3',
        })
        .expect(201);

      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe('limit_exceeded');
    });
  });

  describe('POST /api/v1/license/deactivate', () => {
    it('应该停用 License 激活', async () => {
      // 获取激活信息
      const license = await prisma.license.findUnique({
        where: { licenseKey: testLicenseKey },
        include: { activations: { where: { status: 'active' } } },
      });

      if (license?.activations[0]) {
        await request(app.getHttpServer())
          .post('/api/v1/license/deactivate')
          .send({
            licenseKey: testLicenseKey,
            instanceId: license.activations[0].instanceId,
          })
          .expect(204);
      }
    });
  });
});
